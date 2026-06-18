# Vlna 1 — Task Interactions Design

**Datum:** 2026-06-19  
**Stav:** Schváleno

## Přehled

Tři vzájemně nezávislé vylepšení interakcí s tasky:
1. Přidat komentář v detailu tasku
2. Tlačítko "Pracuji na tom" (nastaví In Progress status)
3. Quick hover akce v task listu (✓ Vyřeším, ▶ Pracuji)

---

## 1. Přidat komentář

### Co se změní

**Rust (`redmine.rs`, `commands.rs`):**
- Nová funkce `add_note(url, key, id, notes)` → `PUT /issues/:id.json` s body `{ "issue": { "notes": "..." } }`
- Nový Tauri command `add_note_cmd(id: u32, notes: String) → Result<(), String>`

**Frontend (`TaskDetail.tsx`):**
- Textarea nad footer (mezi body a footer)
- Tlačítko "Odeslat" vpravo od textarey
- Po odeslání: `fetch_now()` + znovu načte detail (journals se aktualizují), textarea se vyprázdní
- Textarea je disabled během odesílání

### Chování
- Prázdnou poznámku nelze odeslat (tlačítko disabled)
- Chyba se zobrazí stejně jako existující `task-detail-error`
- Po úspěchu zůstane detail otevřený (uživatel vidí svůj komentář v journals)

---

## 2. "Pracuji na tom" status

### Nový typ dat

**`AppConfig`** (TypeScript `types.ts` + Rust `store.rs`):
```
inProgressStatusId: number | null  // default: null
```

### Rust (`redmine.rs`, `commands.rs`):**
- Nová funkce `fetch_statuses(url, key)` → `GET /issue_statuses.json` → vrátí `Vec<IssueStatus>`
- Nový Tauri command `fetch_statuses_cmd() → Result<Vec<IssueStatus>, String>`
- `update_issue` již existuje — žádná změna

### Frontend — Settings (`Settings.tsx`)
- Při otevření Settings: `fetch_statuses_cmd()` → seznam statusů
- Nová sekce "WORKFLOW": dropdown "Status při práci" se všemi statusy
- Auto-detect defaultu: první status jehož název (lowercase) obsahuje "progress", "řeší", "přijat", "probíhá", "in progress"
- Pokud žádný nevyhovuje: placeholder "— nevybráno —"
- Uloží `inProgressStatusId` do configu

### Frontend — TaskDetail (`TaskDetail.tsx`)
- Nové tlačítko "▶ Pracuji" ve footeru vedle "Vyřeším"
- Viditelné pouze pokud `config.inProgressStatusId !== null`
- Skryté pokud `detail.statusId === config.inProgressStatusId` (task již má tento status)
- Po kliknutí: `update_issue_cmd(id, inProgressStatusId, null)` → `fetch_now()` → zavře detail

---

## 3. Quick hover akce v listu

### Globální statusy v Zustand store

**`store/tasks.ts`:**
- Nové pole `allStatuses: IssueStatus[]`
- Nová akce `setAllStatuses(statuses: IssueStatus[])`

**`App.tsx`:**
- Po načtení configu (pokud URL + key jsou vyplněny): `fetch_statuses_cmd()` → `setAllStatuses()`
- Také při `listen('tasks-updated')` aby byly statusy vždy aktuální

### Frontend — TaskItem (`TaskItem.tsx`)

Na hover tasku se zobrazí ikonky vpravo (před ExternalLink ikonou):

- **✓ (Check)** — Vyřeším:
  - Viditelné pokud `allStatuses` obsahuje alespoň jeden closed status
  - Kliknutí: `update_issue_cmd(id, firstClosedStatus.id, null)` → `fetch_now()`
  - Zabrání propagaci kliknutí na task (neotevře detail)
- **▶ (Play)** — Pracuji na tom:
  - Viditelné pokud `config.inProgressStatusId !== null`
  - Kliknutí: `update_issue_cmd(id, inProgressStatusId, null)` → `fetch_now()`
  - Zabrání propagaci kliknutí na task

Ikonky mají `stopPropagation` aby neotevíraly detail. Během zpracování se zobrazí spinner místo ikonky (nebo disabled stav).

### Props změny TaskItem
```ts
interface Props {
  issue: RedmineIssue
  onSelect: (id: number) => void
  // nové:
  firstClosedStatusId: number | null
  inProgressStatusId: number | null
  onQuickResolve: (id: number) => void
  onQuickInProgress: (id: number) => void
}
```

TaskList předá tyto props z Zustand store a config.

---

## Pořadí implementace

1. `fetch_statuses` Rust funkce + command (sdílená závislost pro všechny 3 featury)
2. `inProgressStatusId` do AppConfig (Rust + TypeScript)
3. Komentář — `add_note` Rust + UI v TaskDetail
4. "Pracuji na tom" — Settings dropdown + tlačítko v TaskDetail
5. Globální statusy v Zustand store + quick hover akce v TaskItem

---

## Co se nemění

- Existující `update_issue_cmd` — žádná změna
- Logika `fetch_issue_detail` — žádná změna  
- "Předat" zůstává pouze v detailu (vyžaduje výběr osoby)
- Animace slide-in detailu — žádná změna
