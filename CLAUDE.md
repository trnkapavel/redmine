# Redmine Focus — Claude Code Context

macOS tray appka zobrazující Redmine issues přiřazené přihlášenému uživateli.

## Tech stack
- **Tauri 2** (Rust backend) + **React 18** + **TypeScript** frontend
- **Vite** + **Vitest** (testy)
- **Zustand** (state management)
- **lucide-react** v1.20.0 (ikony)
- `macOSPrivateApi: true` → HudWindow vibrancy efekt

## Build
```bash
export PATH="$PATH:/Users/paveltrnka/Library/Caches/puccinialin/rustup/toolchains/stable-aarch64-apple-darwin/bin/"
npm run tauri build
```
Výstup: `src-tauri/target/release/bundle/dmg/Redmine Focus_0.1.0_aarch64.dmg`

Pokud selže na `bundle_dmg.sh`: `brew install create-dmg`

## Testy
```bash
npx vitest run        # všechny testy
npx tsc --noEmit      # TypeScript check
```

## Architektura

### Rust backend (`src-tauri/src/`)
| Soubor | Účel |
|--------|------|
| `redmine.rs` | Redmine API klient, typy (IssueDetail, Journal, Member…) |
| `commands.rs` | Tauri commands + `require_config` helper |
| `main.rs` | Window setup, tray, polling start, focus→hide |
| `poller.rs` | Polling service |
| `store.rs` | Config persistence (tauri-plugin-store) |

### Frontend (`src/`)
| Soubor | Účel |
|--------|------|
| `App.tsx` | Root, event listeners, `selectedIssueId` state |
| `components/TaskList.tsx` | Priority groups, `onSelectTask?` prop |
| `components/TaskItem.tsx` | Task button, ExternalLink s `stopPropagation` |
| `components/TaskDetail.tsx` | Slide-in detail panel (Vyřeším + Předat) |
| `components/Sidebar.tsx` | Project filter |
| `components/Settings.tsx` | Settings form |
| `store/tasks.ts` | Zustand issues/projects |
| `store/config.ts` | Zustand config |
| `types.ts` | Všechny TS typy |
| `index.css` | Kompletní styling, CSS variables |

## Tauri commands
- `get_config`, `save_config_cmd`
- `open_in_browser(url)`
- `fetch_now`
- `get_issue_detail(id: u32) → IssueDetail`
- `update_issue_cmd(id, status_id?, assigned_to_id?)`

## Kritické technické detaily
- `#[serde(rename_all = "camelCase")]` na všech Rust struct — nutné pro Tauri bridge
- Race condition fix: `Promise.all([listen(...)])`.then(() => `invoke('fetch_now')`)
- Window se schová při ztrátě focusu: `Focused(false) → window.hide()`
- Dev build (`npm run tauri dev`) má problém s vibrancy — pro testování UI používat release build

## Redmine API
- `GET /issues.json?assigned_to_id=me&status_id=open`
- `GET /projects.json`
- `GET /issues/:id.json?include=journals`
- `GET /issue_statuses.json`
- `GET /projects/:id/memberships.json`
- `PUT /issues/:id.json`

## Otevřené problémy
- Task detail klik nefunguje v produkčním buildu (debugování přerušeno)
- Deprecated: `tauri_plugin_shell::Shell::open` (použít `tauri-plugin-opener`)
- Unused fn `make_issue` v `poller.rs`
