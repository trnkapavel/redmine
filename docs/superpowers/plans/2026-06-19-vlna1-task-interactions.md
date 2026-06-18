# Vlna 1 — Task Interactions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Přidat komentáře, tlačítko "Pracuji na tom" a quick hover akce do Redmine Focus.

**Architecture:** Tři nové Rust funkce (`fetch_statuses`, `add_note`, rozšíření `Config`), dvě nové Tauri commands, rozšíření Zustand store o globální statusy, úpravy TaskDetail/TaskItem/Settings/App komponent.

**Tech Stack:** Tauri 2, Rust (reqwest, mockito pro testy), React 18, TypeScript, Zustand, lucide-react

---

### Task 1: Rust — `fetch_statuses` a `add_note` v `redmine.rs`

**Files:**
- Modify: `src-tauri/src/redmine.rs`

- [ ] **Step 1: Přidej Serialize derive na `IssueStatus`**

`IssueStatus` již má `Serialize`. Ověř že má také správný `serde(rename_all = "camelCase")`:

```rust
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct IssueStatus {
    pub id: u32,
    pub name: String,
}
```

Toto je již v souboru — pouze vizuální kontrola, žádná změna.

- [ ] **Step 2: Přidej `AddNoteRequest` a `AddNoteBody` struktury za `UpdateIssueBody`**

Najdi blok `struct UpdateIssueBody` a za jeho uzavírací `}` přidej:

```rust
#[derive(Serialize)]
struct AddNoteRequest {
    issue: AddNoteBody,
}

#[derive(Serialize)]
struct AddNoteBody {
    notes: String,
}
```

- [ ] **Step 3: Napiš failing test pro `fetch_statuses`**

Do `#[cfg(test)] mod tests` na konec souboru přidej:

```rust
#[tokio::test]
async fn test_fetch_statuses_returns_all() {
    let mut server = Server::new_async().await;
    server.mock("GET", "/issue_statuses.json")
        .with_status(200)
        .with_header("content-type", "application/json")
        .with_body(r#"{"issue_statuses": [
            {"id": 1, "name": "New", "is_closed": false},
            {"id": 2, "name": "In Progress", "is_closed": false},
            {"id": 3, "name": "Resolved", "is_closed": true}
        ]}"#)
        .create_async().await;

    let statuses = fetch_statuses(&server.url(), "test-key").await.unwrap();

    assert_eq!(statuses.len(), 3);
    assert_eq!(statuses[0].name, "New");
    assert_eq!(statuses[2].name, "Resolved");
}
```

- [ ] **Step 4: Spusť test — ověř že failuje**

```bash
cd src-tauri && cargo test test_fetch_statuses_returns_all 2>&1 | tail -5
```

Expected: `error[E0425]: cannot find function 'fetch_statuses'`

- [ ] **Step 5: Implementuj `fetch_statuses`**

Za funkci `fetch_projects` přidej:

```rust
pub async fn fetch_statuses(base_url: &str, api_key: &str) -> Result<Vec<IssueStatus>, RedmineError> {
    let client = Client::new();
    let url = format!("{}/issue_statuses.json", base_url.trim_end_matches('/'));
    let resp = client.get(&url).header("X-Redmine-API-Key", api_key).send().await?;
    if resp.status() == 401 { return Err(RedmineError::Unauthorized); }
    if !resp.status().is_success() { return Err(RedmineError::Api(resp.status().to_string())); }
    let raw: RawIssueStatusesResponse = resp.json().await?;
    Ok(raw.issue_statuses.into_iter()
        .map(|s| IssueStatus { id: s.id, name: s.name })
        .collect())
}
```

- [ ] **Step 6: Spusť test — ověř že prochází**

```bash
cd src-tauri && cargo test test_fetch_statuses_returns_all 2>&1 | tail -5
```

Expected: `test test_fetch_statuses_returns_all ... ok`

- [ ] **Step 7: Napiš failing test pro `add_note`**

```rust
#[tokio::test]
async fn test_add_note_sends_put() {
    let mut server = Server::new_async().await;
    let mock = server.mock("PUT", "/issues/42.json")
        .with_status(200)
        .create_async().await;

    let result = add_note(&server.url(), "test-key", 42, "Testovací poznámka".to_string()).await;

    assert!(result.is_ok());
    mock.assert_async().await;
}
```

- [ ] **Step 8: Spusť test — ověř že failuje**

```bash
cd src-tauri && cargo test test_add_note_sends_put 2>&1 | tail -5
```

Expected: `error[E0425]: cannot find function 'add_note'`

- [ ] **Step 9: Implementuj `add_note`**

Za funkci `update_issue` přidej:

```rust
pub async fn add_note(base_url: &str, api_key: &str, id: u32, notes: String) -> Result<(), RedmineError> {
    let client = Client::new();
    let url = format!("{}/issues/{}.json", base_url.trim_end_matches('/'), id);
    let body = AddNoteRequest { issue: AddNoteBody { notes } };
    let resp = client.put(&url)
        .header("X-Redmine-API-Key", api_key)
        .header("Content-Type", "application/json")
        .json(&body)
        .send().await?;
    if resp.status() == 401 { return Err(RedmineError::Unauthorized); }
    if !resp.status().is_success() { return Err(RedmineError::Api(resp.status().to_string())); }
    Ok(())
}
```

- [ ] **Step 10: Spusť všechny Rust testy**

```bash
cd src-tauri && cargo test 2>&1 | tail -10
```

Expected: všechny testy `ok`, žádné `FAILED`

- [ ] **Step 11: Commit**

```bash
git add src-tauri/src/redmine.rs
git commit -m "feat(rust): add fetch_statuses and add_note API functions"
```

---

### Task 2: Rust — přidej `in_progress_status_id` do Config v `store.rs`

**Files:**
- Modify: `src-tauri/src/store.rs`

- [ ] **Step 1: Přidej pole do `Config` struct**

Za `font_size: u32,` přidej:

```rust
#[serde(default)]
pub in_progress_status_id: Option<u32>,
```

- [ ] **Step 2: Přidej default do `impl Default for Config`**

Za `font_size: default_font_size(),` v bloku `Default` přidej:

```rust
in_progress_status_id: None,
```

- [ ] **Step 3: Přidej načítání z `load_config`**

Za blok `let font_size = ...` v `load_config` přidej:

```rust
let in_progress_status_id = store.get("inProgressStatusId")
    .and_then(|v| v.as_u64())
    .map(|v| v as u32);
```

Do návratového `Config { ... }` přidej:

```rust
in_progress_status_id,
```

- [ ] **Step 4: Přidej ukládání do `save_config`**

Za `store.set("fontSize", config.font_size);` přidej:

```rust
match config.in_progress_status_id {
    Some(id) => store.set("inProgressStatusId", id),
    None => { let _ = store.delete("inProgressStatusId"); }
}
```

- [ ] **Step 5: Ověř kompilaci**

```bash
cd src-tauri && cargo check 2>&1 | tail -5
```

Expected: `Finished`

- [ ] **Step 6: Commit**

```bash
git add src-tauri/src/store.rs
git commit -m "feat(rust): add in_progress_status_id to Config"
```

---

### Task 3: Rust — nové commands v `commands.rs` + registrace v `main.rs`

**Files:**
- Modify: `src-tauri/src/commands.rs`
- Modify: `src-tauri/src/main.rs`

- [ ] **Step 1: Přidej importy do `commands.rs`**

Na začátek souboru, za existující `use crate::redmine::{...}`:

```rust
use crate::redmine::{fetch_issues, fetch_projects, fetch_issue_detail, update_issue, add_note, fetch_statuses, IssueDetail, IssueStatus, Priority};
```

Nahraď stávající `use crate::redmine` řádek tímto.

- [ ] **Step 2: Přidej `fetch_statuses_cmd` za `update_issue_cmd`**

```rust
#[tauri::command]
pub async fn fetch_statuses_cmd(state: State<'_, AppState>) -> Result<Vec<IssueStatus>, String> {
    let (url, key) = require_config(&state)?;
    fetch_statuses(&url, &key).await.map_err(|e| e.to_string())
}
```

- [ ] **Step 3: Přidej `add_note_cmd` za `fetch_statuses_cmd`**

```rust
#[tauri::command]
pub async fn add_note_cmd(state: State<'_, AppState>, id: u32, notes: String) -> Result<(), String> {
    let (url, key) = require_config(&state)?;
    add_note(&url, &key, id, notes).await.map_err(|e| e.to_string())
}
```

- [ ] **Step 4: Registruj nové commands v `main.rs`**

Najdi blok `.invoke_handler(tauri::generate_handler![` a přidej za `update_issue_cmd`:

```rust
redmine_focus_lib::commands::fetch_statuses_cmd,
redmine_focus_lib::commands::add_note_cmd,
```

- [ ] **Step 5: Ověř kompilaci**

```bash
cd src-tauri && cargo check 2>&1 | tail -5
```

Expected: `Finished`

- [ ] **Step 6: Commit**

```bash
git add src-tauri/src/commands.rs src-tauri/src/main.rs
git commit -m "feat(rust): add fetch_statuses_cmd and add_note_cmd Tauri commands"
```

---

### Task 4: TypeScript — rozšiř `AppConfig` a `DEFAULT_CONFIG` v `types.ts`

**Files:**
- Modify: `src/types.ts`

- [ ] **Step 1: Přidej pole do `AppConfig`**

Za `fontSize: number` přidej:

```typescript
inProgressStatusId: number | null
```

- [ ] **Step 2: Přidej default do `DEFAULT_CONFIG`**

Za `fontSize: 14,` přidej:

```typescript
inProgressStatusId: null,
```

- [ ] **Step 3: Ověř TypeScript**

```bash
npx tsc --noEmit 2>&1
```

Expected: žádný výstup (0 chyb)

- [ ] **Step 4: Commit**

```bash
git add src/types.ts
git commit -m "feat(ts): add inProgressStatusId to AppConfig"
```

---

### Task 5: Zustand + typy — `allStatuses` v store + `isClosed` v IssueStatus

**Kontext:** `fetch_statuses` musí vracet příznak `is_closed`, aby store věděl které statusy jsou closed (pro quick resolve). Tento task upraví Rust struct, TypeScript typ i store najednou.

**Files:**
- Modify: `src-tauri/src/redmine.rs`
- Modify: `src/types.ts`
- Modify: `src/store/tasks.ts`

- [ ] **Step 1: Přidej `is_closed` do Rust `IssueStatus` struct v `redmine.rs`**

Najdi:
```rust
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct IssueStatus {
    pub id: u32,
    pub name: String,
}
```

Nahraď:
```rust
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct IssueStatus {
    pub id: u32,
    pub name: String,
    pub is_closed: bool,
}
```

- [ ] **Step 2: Uprav `fetch_statuses` v `redmine.rs` aby mapoval `is_closed`**

Najdi (v `fetch_statuses`):
```rust
Ok(raw.issue_statuses.into_iter()
    .map(|s| IssueStatus { id: s.id, name: s.name })
    .collect())
```

Nahraď:
```rust
Ok(raw.issue_statuses.into_iter()
    .map(|s| IssueStatus { id: s.id, name: s.name, is_closed: s.is_closed.unwrap_or(false) })
    .collect())
```

- [ ] **Step 3: Uprav `fetch_issue_detail` v `redmine.rs` aby zahrnul `is_closed: true`**

Najdi (v `fetch_issue_detail`, blok `closed_statuses`):
```rust
.map(|s| IssueStatus { id: s.id, name: s.name })
```

Nahraď:
```rust
.map(|s| IssueStatus { id: s.id, name: s.name, is_closed: true })
```

- [ ] **Step 4: Ověř Rust kompilaci a testy**

```bash
cd src-tauri && cargo test 2>&1 | tail -10
```

Expected: všechny testy `ok`

- [ ] **Step 5: Přidej `isClosed` do TypeScript `IssueStatus` v `types.ts`**

Najdi:
```typescript
export interface IssueStatus {
  id: number
  name: string
}
```

Nahraď:
```typescript
export interface IssueStatus {
  id: number
  name: string
  isClosed?: boolean
}
```

- [ ] **Step 6: Přidej `allStatuses` do Zustand tasks store v `store/tasks.ts`**

Přidej `IssueStatus` do importu:
```typescript
import { RedmineIssue, RedmineProject, SortMode, PRIORITY_ORDER, IssueStatus } from '../types'
```

Do `TasksState` interface za `sortMode: SortMode` přidej:
```typescript
allStatuses: IssueStatus[]
setAllStatuses: (statuses: IssueStatus[]) => void
firstClosedStatusId: () => number | null
```

Do `create<TasksState>` za `setSortMode: (mode) => set({ sortMode: mode }),` přidej:
```typescript
allStatuses: [],
setAllStatuses: (allStatuses) => set({ allStatuses }),
firstClosedStatusId: () => get().allStatuses.find(s => s.isClosed)?.id ?? null,
```

- [ ] **Step 7: Ověř TypeScript**

```bash
npx tsc --noEmit 2>&1
```

Expected: žádné chyby

- [ ] **Step 8: Commit**

```bash
git add src-tauri/src/redmine.rs src/types.ts src/store/tasks.ts
git commit -m "feat: add isClosed to IssueStatus and allStatuses to tasks store"
```

---

### Task 6: App.tsx — načti statusy po startu

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Přidej import**

Za `import { useTasksStore } from './store/tasks'` přidej:

```typescript
import { invoke } from '@tauri-apps/api/core'
import { IssueStatus } from './types'
```

Pozor: `invoke` je již importován v jiných souborech — zkontroluj jestli není duplikát. V App.tsx je `invoke` použit — ověř aktuální importy v souboru a přidej jen co chybí.

- [ ] **Step 2: Přidej `setAllStatuses` do destrukturování store**

Najdi:
```typescript
const { setIssues, setProjects } = useTasksStore()
```

Nahraď:
```typescript
const { setIssues, setProjects, setAllStatuses } = useTasksStore()
```

- [ ] **Step 3: Přidej fetch statusů po načtení configu**

Za `useEffect(() => { load() }, [])` přidej:

```typescript
useEffect(() => {
  if (config.redmineUrl && config.apiKey) {
    invoke<IssueStatus[]>('fetch_statuses_cmd')
      .then(setAllStatuses)
      .catch(() => {})
  }
}, [config.redmineUrl, config.apiKey])
```

- [ ] **Step 4: Ověř TypeScript**

```bash
npx tsc --noEmit 2>&1
```

Expected: žádné chyby

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx
git commit -m "feat: fetch all statuses on startup and store in Zustand"
```

---

### Task 7: Settings.tsx — dropdown "Status při práci"

**Files:**
- Modify: `src/components/Settings.tsx`

- [ ] **Step 1: Přidej importy**

Za stávající importy přidej:

```typescript
import { IssueStatus } from '../types'
```

- [ ] **Step 2: Přidej state pro statusy**

Za `const [version, setVersion] = useState('')` přidej:

```typescript
const [allStatuses, setAllStatuses] = useState<IssueStatus[]>([])
```

- [ ] **Step 3: Načti statusy při otevření Settings**

Za `useEffect(() => { getVersion().then(setVersion) }, [])` přidej:

```typescript
useEffect(() => {
  invoke<IssueStatus[]>('fetch_statuses_cmd')
    .then(statuses => {
      setAllStatuses(statuses)
      if (form.inProgressStatusId === null) {
        const keywords = ['progress', 'řeší', 'řešen', 'přijat', 'probíhá', 'in progress', 'assigned']
        const auto = statuses.find(s =>
          keywords.some(kw => s.name.toLowerCase().includes(kw))
        )
        if (auto) setForm(f => ({ ...f, inProgressStatusId: auto.id }))
      }
    })
    .catch(() => {})
}, [])
```

- [ ] **Step 4: Přidej sekci WORKFLOW do JSX**

Za sekci "Spustit při přihlášení" (před `<section className="settings-section">` se `settings-actions`) a PŘED sekci "O APLIKACI" přidej:

```tsx
<section className="settings-section">
  <div className="settings-section-label">WORKFLOW</div>
  <div className="settings-row">
    <span>Status při práci</span>
    <select
      className="settings-select"
      value={form.inProgressStatusId ?? ''}
      onChange={e => setForm(f => ({
        ...f,
        inProgressStatusId: e.target.value ? Number(e.target.value) : null
      }))}
    >
      <option value="">— nevybráno —</option>
      {allStatuses.map(s => (
        <option key={s.id} value={s.id}>{s.name}</option>
      ))}
    </select>
  </div>
</section>
```

- [ ] **Step 5: Přidej CSS pro `settings-select`**

Do `src/index.css` za `.settings-number-input { ... }` přidej:

```css
.settings-select { background: var(--bg-toolbar); border: 1px solid var(--border); border-radius: 4px; padding: 3px 8px; color: var(--text-primary); font-size: 12px; }
```

- [ ] **Step 6: Ověř TypeScript**

```bash
npx tsc --noEmit 2>&1
```

Expected: žádné chyby

- [ ] **Step 7: Commit**

```bash
git add src/components/Settings.tsx src/index.css
git commit -m "feat: add in-progress status selector to Settings"
```

---

### Task 8: TaskDetail.tsx — komentář + tlačítko "Pracuji na tom"

**Files:**
- Modify: `src/components/TaskDetail.tsx`

- [ ] **Step 1: Přidej importy a store**

Za stávající importy přidej:

```typescript
import { useConfigStore } from '../store/config'
import { MessageSquare } from 'lucide-react'
```

- [ ] **Step 2: Přidej state pro komentář a loading**

Za `const [working, setWorking] = useState(false)` přidej:

```typescript
const [note, setNote] = useState('')
const [noteSending, setNoteSending] = useState(false)
const { config } = useConfigStore()
```

- [ ] **Step 3: Implementuj `handleAddNote`**

Za `handleReassign` funkci přidej:

```typescript
const handleAddNote = async () => {
  if (!note.trim()) return
  setNoteSending(true)
  setError(null)
  try {
    await invoke('add_note_cmd', { id: issueId, notes: note.trim() })
    setNote('')
    await invoke('fetch_now')
    // Znovu načti detail aby se journals aktualizovaly
    const d = await invoke<IssueDetail>('get_issue_detail', { id: issueId })
    setDetail(d)
  } catch (e) {
    setError(String(e))
  } finally {
    setNoteSending(false)
  }
}
```

- [ ] **Step 4: Implementuj `handleWorkOnIt`**

Za `handleAddNote` přidej:

```typescript
const handleWorkOnIt = async () => {
  if (!config.inProgressStatusId) return
  setWorking(true)
  setError(null)
  try {
    await invoke('update_issue_cmd', {
      id: issueId,
      statusId: config.inProgressStatusId,
      assignedToId: null,
    })
    await invoke('fetch_now')
    onActionDone()
  } catch (e) {
    setError(String(e))
  } finally {
    setWorking(false)
  }
}
```

- [ ] **Step 5: Přidej textarea nad footer v JSX**

Najdi `<div className="task-detail-footer">` a PŘED něj vlož:

```tsx
<div className="task-detail-note">
  <textarea
    className="task-detail-note-input"
    placeholder="Přidat komentář…"
    value={note}
    onChange={e => setNote(e.target.value)}
    disabled={noteSending}
    rows={2}
  />
  <button
    className="task-detail-note-send"
    onClick={handleAddNote}
    disabled={!note.trim() || noteSending}
  >
    <MessageSquare size={13} />
    Odeslat
  </button>
</div>
```

- [ ] **Step 6: Přidej tlačítko "▶ Pracuji" do footeru**

Najdi `{detail.closedStatuses.length > 0 && (` a PŘED tento blok vlož:

```tsx
{config.inProgressStatusId !== null && detail.statusId !== config.inProgressStatusId && (
  <button
    className="task-detail-btn task-detail-btn-work"
    onClick={handleWorkOnIt}
    disabled={working}
  >
    <Play size={13} />
    Pracuji
  </button>
)}
```

Přidej `Play` do lucide importu: `import { ArrowLeft, Check, UserCheck, Play } from 'lucide-react'`

- [ ] **Step 7: Přidej CSS**

Do `src/index.css` za `.task-detail-footer { ... }` přidej:

```css
.task-detail-note { padding: 8px 14px; border-top: 1px solid var(--border-subtle); display: flex; gap: 8px; align-items: flex-end; }
.task-detail-note-input { flex: 1; background: var(--bg-toolbar); border: 1px solid var(--border); border-radius: 6px; padding: 6px 10px; color: var(--text-primary); font-size: 12px; resize: none; font-family: inherit; line-height: 1.4; }
.task-detail-note-input::placeholder { color: var(--text-muted); }
.task-detail-note-input:disabled { opacity: 0.5; }
.task-detail-note-send { display: flex; align-items: center; gap: 5px; padding: 6px 12px; border-radius: 6px; font-size: 12px; font-weight: 500; background: var(--bg-toolbar); color: var(--text-secondary); flex-shrink: 0; }
.task-detail-note-send:disabled { opacity: 0.4; cursor: not-allowed; }
.task-detail-note-send:not(:disabled):hover { background: var(--border); }
.task-detail-btn-work { background: rgba(129,140,248,0.15); color: var(--accent); }
.task-detail-btn-work:hover:not(:disabled) { background: rgba(129,140,248,0.25); }
```

- [ ] **Step 8: Ověř TypeScript**

```bash
npx tsc --noEmit 2>&1
```

Expected: žádné chyby

- [ ] **Step 9: Commit**

```bash
git add src/components/TaskDetail.tsx src/index.css
git commit -m "feat: add comment textarea and Work On It button to TaskDetail"
```

---

### Task 9: TaskItem.tsx + TaskList.tsx — quick hover akce

**Files:**
- Modify: `src/components/TaskItem.tsx`
- Modify: `src/components/TaskList.tsx`

- [ ] **Step 1: Rozšiř Props v `TaskItem.tsx`**

Nahraď stávající `interface Props`:

```typescript
interface Props {
  issue: RedmineIssue
  onSelect: (id: number) => void
  firstClosedStatusId: number | null
  inProgressStatusId: number | null
  onQuickResolve: (id: number) => void
  onQuickInProgress: (id: number) => void
}
```

- [ ] **Step 2: Přidej nové props do funkce a přidej `useState`**

```typescript
export function TaskItem({ issue, onSelect, firstClosedStatusId, inProgressStatusId, onQuickResolve, onQuickInProgress }: Props) {
  const [actionLoading, setActionLoading] = useState<'resolve' | 'work' | null>(null)
  const { config } = useConfigStore()
```

Přidej `useState` do importu: `import { useState } from 'react'`

- [ ] **Step 3: Přidej handlery pro quick akce**

Za `handleOpenBrowser` přidej:

```typescript
const handleQuickResolve = async (e: React.MouseEvent) => {
  e.stopPropagation()
  if (!firstClosedStatusId || actionLoading) return
  setActionLoading('resolve')
  try {
    await onQuickResolve(issue.id)
  } finally {
    setActionLoading(null)
  }
}

const handleQuickWork = async (e: React.MouseEvent) => {
  e.stopPropagation()
  if (!inProgressStatusId || actionLoading) return
  setActionLoading('work')
  try {
    await onQuickInProgress(issue.id)
  } finally {
    setActionLoading(null)
  }
}
```

- [ ] **Step 4: Přidej ikonky do JSX**

Přidej do lucide importu: `import { ExternalLink, Check, Play } from 'lucide-react'`

Najdi `<span className="task-hover-icon" onClick={handleOpenBrowser}>` a PŘED něj vlož:

```tsx
{inProgressStatusId !== null && (
  <span
    className="task-hover-icon task-quick-action"
    onClick={handleQuickWork}
    title="Pracuji na tom"
  >
    {actionLoading === 'work' ? '…' : <Play size={13} />}
  </span>
)}
{firstClosedStatusId !== null && (
  <span
    className="task-hover-icon task-quick-action"
    onClick={handleQuickResolve}
    title="Vyřeším"
  >
    {actionLoading === 'resolve' ? '…' : <Check size={13} />}
  </span>
)}
```

- [ ] **Step 5: Přidej CSS**

Do `src/index.css` za `.task-item:hover .task-hover-icon { opacity: 1; }` přidej:

```css
.task-quick-action { color: var(--text-muted); }
.task-quick-action:hover { color: var(--text-primary); }
```

- [ ] **Step 6: Aktualizuj `TaskList.tsx`**

Přidej importy:

```typescript
import { useTasksStore } from '../store/tasks'
import { useConfigStore } from '../store/config'
import { invoke } from '@tauri-apps/api/core'
```

Přidej do komponenty:

```typescript
export function TaskList({ onSelectTask }: Props) {
  const { filteredIssues, firstClosedStatusId } = useTasksStore()
  const { config } = useConfigStore()
  const sorted = filteredIssues()

  const handleQuickResolve = async (id: number) => {
    const statusId = firstClosedStatusId()
    if (!statusId) return
    await invoke('update_issue_cmd', { id, statusId, assignedToId: null })
    await invoke('fetch_now')
  }

  const handleQuickInProgress = async (id: number) => {
    if (!config.inProgressStatusId) return
    await invoke('update_issue_cmd', { id, statusId: config.inProgressStatusId, assignedToId: null })
    await invoke('fetch_now')
  }
```

A přidej props do `<TaskItem>`:

```tsx
<TaskItem
  key={issue.id}
  issue={issue}
  onSelect={id => onSelectTask?.(id)}
  firstClosedStatusId={firstClosedStatusId()}
  inProgressStatusId={config.inProgressStatusId}
  onQuickResolve={handleQuickResolve}
  onQuickInProgress={handleQuickInProgress}
/>
```

- [ ] **Step 7: Ověř TypeScript**

```bash
npx tsc --noEmit 2>&1
```

Expected: žádné chyby

- [ ] **Step 8: Spusť Vitest testy**

```bash
npx vitest run 2>&1 | tail -10
```

Expected: všechny testy pass (nebo 0 tests pokud žádné frontend testy nejsou)

- [ ] **Step 9: Commit**

```bash
git add src/components/TaskItem.tsx src/components/TaskList.tsx src/index.css
git commit -m "feat: add quick resolve and work-on-it hover actions to TaskItem"
```

---

### Task 10: Finální build ověření

- [ ] **Step 1: Spusť všechny Rust testy**

```bash
cd src-tauri && cargo test 2>&1 | tail -15
```

Expected: všechny `ok`

- [ ] **Step 2: Spusť TypeScript check**

```bash
npx tsc --noEmit 2>&1
```

Expected: žádný výstup

- [ ] **Step 3: Build pro release**

```bash
export PATH="$PATH:/Users/paveltrnka/Library/Caches/puccinialin/rustup/toolchains/stable-aarch64-apple-darwin/bin/"
export APPLE_ID="trnkapavel@gmail.com"
export APPLE_PASSWORD="<app-specific-password>"
export APPLE_TEAM_ID="62GWGUTKL7"
npm run tauri build 2>&1 | tail -20
```

Expected: `Finished 1 bundle at: .../Redmine Focus_0.1.0_aarch64.dmg`

- [ ] **Step 4: Instalace a smoke test**

```bash
pkill -f "Redmine Focus" 2>/dev/null; sleep 1
hdiutil attach "src-tauri/target/release/bundle/dmg/Redmine Focus_0.1.0_aarch64.dmg" -nobrowse -quiet
rm -rf "/Applications/Redmine Focus.app"
cp -r "/Volumes/Redmine Focus/Redmine Focus.app" "/Applications/"
hdiutil detach "/Volumes/Redmine Focus" -quiet
open "/Applications/Redmine Focus.app"
```

Ověř manuálně:
- Hover na tasku → zobrazí ✓ a ▶ ikonky
- Klik ✓ → task zmizí ze seznamu (byl vyřešen)
- Settings → sekce WORKFLOW → dropdown se statusy
- Klik na task → detail → textarea pro komentář → "Odeslat"
- Klik na task → detail → tlačítko "Pracuji" (pokud je nastaven status)
