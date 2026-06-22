# Keychain + Notarization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Přesunout API klíč z JSON souboru do macOS Keychain a nakonfigurovat notarizaci pro firemní distribuci.

**Architecture:** API klíč se uloží do macOS Keychain přes `keyring` crate (service: `cz.redminefocus.app`, account: `api_key`). Ostatní nastavení zůstanou v tauri-plugin-store. Při načítání se provede migrace ze store do Keychain, pokud ještě nebyla provedena. Notarizace se nakonfiguruje v `tauri.conf.json`.

**Tech Stack:** Rust `keyring` crate v3, Tauri 2 bundle notarize config, Apple app-specific password

---

### Task 1: Přidat `keyring` do závislostí

**Files:**
- Modify: `src-tauri/Cargo.toml`

- [ ] **Step 1: Přidat keyring do Cargo.toml**

V sekci `[dependencies]` přidat:

```toml
keyring = "3"
```

- [ ] **Step 2: Zkontrolovat, že se závislost stáhne**

```bash
export PATH="$PATH:/Users/paveltrnka/Library/Caches/puccinialin/rustup/toolchains/stable-aarch64-apple-darwin/bin/"
cd src-tauri && cargo fetch 2>&1 | tail -5
```

Očekáváno: žádná chyba, `keyring` se stáhne.

- [ ] **Step 3: Commit**

```bash
git add src-tauri/Cargo.toml src-tauri/Cargo.lock
git commit -m "chore: add keyring crate for macOS Keychain support"
```

---

### Task 2: Přesunout API klíč do Keychain

**Files:**
- Modify: `src-tauri/src/store.rs`

- [ ] **Step 1: Přidat Keychain helpery do store.rs**

Za `use serde::{Deserialize, Serialize};` přidat import:

```rust
use keyring::Entry;

const KEYCHAIN_SERVICE: &str = "cz.redminefocus.app";
const KEYCHAIN_ACCOUNT: &str = "api_key";

fn keychain_set(value: &str) {
    if let Ok(entry) = Entry::new(KEYCHAIN_SERVICE, KEYCHAIN_ACCOUNT) {
        let _ = entry.set_password(value);
    }
}

fn keychain_get() -> Option<String> {
    Entry::new(KEYCHAIN_SERVICE, KEYCHAIN_ACCOUNT)
        .ok()
        .and_then(|e| e.get_password().ok())
        .filter(|s| !s.is_empty())
}

fn keychain_delete() {
    if let Ok(entry) = Entry::new(KEYCHAIN_SERVICE, KEYCHAIN_ACCOUNT) {
        let _ = entry.delete_credential();
    }
}
```

- [ ] **Step 2: Upravit load_config — načíst api_key z Keychain, migrovat ze store**

Najít řádek s `let api_key = store.get("api_key")...` a nahradit:

```rust
// Načteme z Keychain; pokud tam není, zkusíme migrovat ze store
let api_key = keychain_get().unwrap_or_else(|| {
    let from_store = store.get("api_key")
        .and_then(|v| v.as_str().map(|s| s.to_string()))
        .unwrap_or_default();
    if !from_store.is_empty() {
        keychain_set(&from_store);
        let _ = store.delete("api_key");
        let _ = store.save();
    }
    from_store
});
```

- [ ] **Step 3: Upravit save_config — api_key uložit do Keychain, ne do store**

Najít řádek `store.set("api_key", config.api_key.clone());` a nahradit:

```rust
keychain_set(&config.api_key);
```

- [ ] **Step 4: Zkompilovat a ověřit**

```bash
export PATH="$PATH:/Users/paveltrnka/Library/Caches/puccinialin/rustup/toolchains/stable-aarch64-apple-darwin/bin/"
cd src-tauri && cargo build 2>&1 | grep -E "error|warning: unused" | head -20
```

Očekáváno: žádná chyba kompilace.

- [ ] **Step 5: Commit**

```bash
git add src-tauri/src/store.rs
git commit -m "feat: store API key in macOS Keychain instead of JSON file"
```

---

### Task 3: Nakonfigurovat notarizaci

**Files:**
- Modify: `src-tauri/tauri.conf.json`

- [ ] **Step 1: Přidat notarize config do tauri.conf.json**

V sekci `bundle.macOS` přidat `"notarize"`:

```json
"macOS": {
  "infoPlist": "Info.plist",
  "signingIdentity": "Developer ID Application: Pavel Trnka (62GWGUTKL7)",
  "notarize": {
    "teamId": "62GWGUTKL7"
  }
}
```

- [ ] **Step 2: Připravit env proměnné pro build**

Před buildem je potřeba nastavit (app-specific heslo z appleid.apple.com → Security → App-Specific Passwords):

```bash
export APPLE_ID="tvůj@apple.id"
export APPLE_PASSWORD="xxxx-xxxx-xxxx-xxxx"  # app-specific heslo
```

Tyto hodnoty se NEZAVAZUJÍ do gitu — používají se jen v terminálu před buildem.

- [ ] **Step 3: Commit konfigurace**

```bash
git add src-tauri/tauri.conf.json
git commit -m "feat: configure notarization for macOS distribution"
```

---

### Task 4: Build a ověření

- [ ] **Step 1: Nastavit env proměnné a spustit build**

```bash
export PATH="$PATH:/Users/paveltrnka/Library/Caches/puccinialin/rustup/toolchains/stable-aarch64-apple-darwin/bin/"
export APPLE_ID="tvůj@apple.id"
export APPLE_PASSWORD="xxxx-xxxx-xxxx-xxxx"
npm run tauri build 2>&1 | tail -30
```

Očekáváno: build projde, notarizace proběhne automaticky (trvá 1–5 minut), DMG obsahuje notarizační ticket.

- [ ] **Step 2: Ověřit podpis a notarizaci DMG**

```bash
DMG="src-tauri/target/release/bundle/dmg/Redmine Focus_0.1.0_aarch64.dmg"
codesign --verify --deep --strict "$DMG" && echo "Podpis OK"
spctl --assess --type open --context context:primary-signature "$DMG" && echo "Notarizace OK"
```

Očekáváno: oba příkazy vypíšou OK bez chyb.

- [ ] **Step 3: Ověřit Keychain po instalaci**

Po instalaci a prvním uložení API klíče v Settings ověřit:

```bash
security find-generic-password -s "cz.redminefocus.app" -a "api_key" -w
```

Očekáváno: API klíč je viditelný v Keychain (po potvrzení heslem).
