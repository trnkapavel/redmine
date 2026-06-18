# Icon & UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Nahradit app/tray ikonu čistým indigo designem (Linear styl) a přepsat UI layout ze sidebar+projekty na tři taby (Moje tasky / Urgentní / Vše) s vyšším kontrastem a nastavitelnou velikostí písma.

**Architecture:** Ikona se mění v `src-tauri/icons/` (SVG→PNG) + `main.rs` (template image). UI: `Sidebar.tsx` se odstraní, přibyde `Tabs.tsx`; `store/tasks.ts` vymění `activeProjectId` za `activeTab`; `AppConfig` dostane `fontSize`; `index.css` dostane CSS proměnnou `--task-font-size` a lepší kontrast.

**Tech Stack:** React 18, TypeScript, Zustand, Tauri 2 (Rust), Vitest + Testing Library, SVG, @resvg/resvg-js-cli (SVG→PNG konverze)

---

## Soubory — přehled změn

| Akce | Soubor |
|------|--------|
| Vytvořit | `src-tauri/icons/icon.svg` |
| Vytvořit | `src-tauri/icons/tray-icon.svg` |
| Generovat | `src-tauri/icons/` (PNG sada přes `npx tauri icon`) |
| Generovat | `src-tauri/icons/tray-icon.png` + `tray-icon@2x.png` |
| Upravit | `src-tauri/src/main.rs` |
| Upravit | `src/types.ts` |
| Upravit | `src/store/tasks.ts` |
| Upravit | `src/store/tasks.test.ts` |
| Upravit | `src/components/TaskList.tsx` |
| Upravit | `src/components/TaskList.test.tsx` |
| Vytvořit | `src/components/Tabs.tsx` |
| Vytvořit | `src/components/Tabs.test.tsx` |
| Upravit | `src/App.tsx` |
| Smazat | `src/components/Sidebar.tsx` |
| Smazat | `src/components/Sidebar.test.tsx` |
| Upravit | `src/index.css` |

---

## Task 1: App icon — SVG master + generování PNG

**Files:**
- Create: `src-tauri/icons/icon.svg`

- [ ] **Step 1: Nainstalovat CLI pro SVG→PNG konverzi**

```bash
npm install --save-dev @resvg/resvg-js
```

Ověřit: `node -e "require('@resvg/resvg-js'); console.log('ok')"` → `ok`

- [ ] **Step 2: Vytvořit master SVG app ikony**

Vytvořit `src-tauri/icons/icon.svg`:

```svg
<svg width="1024" height="1024" viewBox="0 0 1024 1024" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="1024" height="1024" rx="224" fill="#4F46E5"/>
  <circle cx="512" cy="512" r="288" fill="white"/>
  <clipPath id="circ">
    <circle cx="512" cy="512" r="272"/>
  </clipPath>
  <g clip-path="url(#circ)">
    <line x1="128" y1="640" x2="544" y2="224" stroke="#4F46E5" stroke-width="88" stroke-linecap="round"/>
    <line x1="240" y1="768" x2="656" y2="352" stroke="#4F46E5" stroke-width="88" stroke-linecap="round"/>
    <line x1="368" y1="832" x2="784" y2="416" stroke="#4F46E5" stroke-width="88" stroke-linecap="round"/>
  </g>
  <circle cx="704" cy="704" r="160" fill="#4F46E5"/>
  <polyline points="624,704 672,768 784,640" stroke="white" stroke-width="48" fill="none"
    stroke-linecap="round" stroke-linejoin="round"/>
</svg>
```

- [ ] **Step 3: Konvertovat SVG na 1024×1024 PNG**

Vytvořit skript `scripts/svg-to-png.js`:

```js
const { Resvg } = require('@resvg/resvg-js')
const fs = require('fs')
const path = require('path')

const [,, src, dest, size = '1024'] = process.argv
const svg = fs.readFileSync(path.resolve(src), 'utf8')
const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: parseInt(size) } })
const png = resvg.render().asPng()
fs.writeFileSync(path.resolve(dest), png)
console.log(`${src} → ${dest} (${size}px)`)
```

Spustit:

```bash
node scripts/svg-to-png.js src-tauri/icons/icon.svg /tmp/icon-1024.png 1024
```

Ověřit: soubor `/tmp/icon-1024.png` existuje a má správné rozměry.

- [ ] **Step 4: Vygenerovat všechny formáty ikonek přes Tauri**

```bash
export PATH="$PATH:/Users/paveltrnka/Library/Caches/puccinialin/rustup/toolchains/stable-aarch64-apple-darwin/bin/"
npm run tauri icon /tmp/icon-1024.png
```

Ověřit: `src-tauri/icons/icon.icns`, `128x128.png`, `128x128@2x.png`, `32x32.png` byly aktualizovány.

- [ ] **Step 5: Commit**

```bash
git add src-tauri/icons/ scripts/svg-to-png.js package.json package-lock.json
git commit -m "feat: new indigo app icon — linear-style with checkmark badge"
```

---

## Task 2: Tray template image + Rust update

**Files:**
- Create: `src-tauri/icons/tray-icon.svg`
- Generate: `src-tauri/icons/tray-icon.png`, `src-tauri/icons/tray-icon@2x.png`
- Modify: `src-tauri/src/main.rs:32-33`

- [ ] **Step 1: Vytvořit SVG tray ikony (monochromatická)**

Vytvořit `src-tauri/icons/tray-icon.svg` — černá ikona na průhledném pozadí, macOS ji automaticky přizpůsobí light/dark mode:

```svg
<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
  <clipPath id="circ">
    <circle cx="16" cy="16" r="14"/>
  </clipPath>
  <mask id="lines-mask">
    <rect width="32" height="32" fill="white"/>
    <line x1="2"  y1="22" x2="16" y2="6"  stroke="black" stroke-width="3.5" stroke-linecap="round"/>
    <line x1="8"  y1="27" x2="22" y2="11" stroke="black" stroke-width="3.5" stroke-linecap="round"/>
    <line x1="14" y1="29" x2="28" y2="13" stroke="black" stroke-width="3.5" stroke-linecap="round"/>
  </mask>
  <g clip-path="url(#circ)">
    <circle cx="16" cy="16" r="14" fill="black" mask="url(#lines-mask)"/>
  </g>
  <mask id="check-mask">
    <rect width="32" height="32" fill="white"/>
    <polyline points="18,22 21,26 27,19" stroke="black" stroke-width="2"
      fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  </mask>
  <circle cx="22" cy="22" r="9" fill="black" mask="url(#check-mask)"/>
</svg>
```

- [ ] **Step 2: Konvertovat na PNG (32px a 64px @2x)**

```bash
node scripts/svg-to-png.js src-tauri/icons/tray-icon.svg src-tauri/icons/tray-icon.png 32
node scripts/svg-to-png.js src-tauri/icons/tray-icon.svg src-tauri/icons/tray-icon@2x.png 64
```

- [ ] **Step 3: Aktualizovat `main.rs` — načíst tray ikonu a nastavit template mode**

Změnit `src-tauri/src/main.rs` — nahradit řádek s `.icon(app.default_window_icon()...)`:

```rust
// Přidat na začátek setup closure (za let config = ...):
let tray_icon = tauri::image::Image::from_bytes(
    include_bytes!("../icons/tray-icon.png")
).expect("tray icon must load");
```

A v `TrayIconBuilder`:

```rust
TrayIconBuilder::with_id("main")
    .icon(tray_icon)
    .icon_as_template(true)   // macOS: automaticky invertuje pro dark mode
    .tooltip("Redmine Focus")
    // ... zbytek beze změny
```

- [ ] **Step 4: Buildnout a ověřit kompilaci**

```bash
export PATH="$PATH:/Users/paveltrnka/Library/Caches/puccinialin/rustup/toolchains/stable-aarch64-apple-darwin/bin/"
cd src-tauri && cargo check 2>&1 | tail -5
```

Očekávaný výstup: `Finished` bez chyb.

- [ ] **Step 5: Commit**

```bash
git add src-tauri/icons/tray-icon.svg src-tauri/icons/tray-icon.png src-tauri/icons/tray-icon@2x.png src-tauri/src/main.rs
git commit -m "feat: monochrome tray template image with light/dark mode support"
```

---

## Task 3: `activeTab` v tasks store — nahradit `activeProjectId`

**Files:**
- Modify: `src/store/tasks.ts`
- Modify: `src/store/tasks.test.ts`

- [ ] **Step 1: Napsat nové failing testy**

Nahradit obsah `src/store/tasks.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { useTasksStore } from './tasks'
import { RedmineIssue } from '../types'

const urgentIssue: RedmineIssue = {
  id: 1, subject: 'Fix bug', priority: 'urgent',
  dueDate: '2026-06-20', projectId: 1, projectName: 'Backend',
  status: 'New', updatedOn: '2026-06-17T10:00:00Z',
}
const highIssue: RedmineIssue = {
  id: 2, subject: 'High task', priority: 'high',
  dueDate: null, projectId: 2, projectName: 'Frontend',
  status: 'New', updatedOn: '2026-06-17T09:00:00Z',
}
const normalIssue: RedmineIssue = {
  id: 3, subject: 'Normal task', priority: 'normal',
  dueDate: null, projectId: 1, projectName: 'Backend',
  status: 'New', updatedOn: '2026-06-17T08:00:00Z',
}

beforeEach(() => {
  useTasksStore.setState({
    issues: [],
    activeTab: 'mine',
    sortMode: 'priority',
  })
})

describe('tasks store', () => {
  it('stores issues', () => {
    useTasksStore.getState().setIssues([urgentIssue, normalIssue])
    expect(useTasksStore.getState().issues).toHaveLength(2)
  })

  it('tab mine shows all issues', () => {
    useTasksStore.getState().setIssues([urgentIssue, highIssue, normalIssue])
    useTasksStore.getState().setActiveTab('mine')
    expect(useTasksStore.getState().filteredIssues()).toHaveLength(3)
  })

  it('tab urgent shows only urgent and high priority', () => {
    useTasksStore.getState().setIssues([urgentIssue, highIssue, normalIssue])
    useTasksStore.getState().setActiveTab('urgent')
    const result = useTasksStore.getState().filteredIssues()
    expect(result).toHaveLength(2)
    expect(result.map(i => i.id)).toContain(1)
    expect(result.map(i => i.id)).toContain(2)
    expect(result.map(i => i.id)).not.toContain(3)
  })

  it('tab all shows all issues', () => {
    useTasksStore.getState().setIssues([urgentIssue, highIssue, normalIssue])
    useTasksStore.getState().setActiveTab('all')
    expect(useTasksStore.getState().filteredIssues()).toHaveLength(3)
  })

  it('sorts by priority within tab', () => {
    useTasksStore.getState().setIssues([normalIssue, urgentIssue])
    useTasksStore.getState().setActiveTab('mine')
    useTasksStore.getState().setSortMode('priority')
    const sorted = useTasksStore.getState().filteredIssues()
    expect(sorted[0].priority).toBe('urgent')
  })
})
```

- [ ] **Step 2: Spustit testy — ověřit že failují**

```bash
npx vitest run src/store/tasks.test.ts
```

Očekávaný výsledek: FAIL (activeTab neexistuje v store).

- [ ] **Step 3: Aktualizovat `src/store/tasks.ts`**

```ts
import { create } from 'zustand'
import { RedmineIssue, RedmineProject, SortMode, PRIORITY_ORDER } from '../types'

export type ActiveTab = 'mine' | 'urgent' | 'all'

interface TasksState {
  issues: RedmineIssue[]
  projects: RedmineProject[]
  activeTab: ActiveTab
  sortMode: SortMode
  setIssues: (issues: RedmineIssue[]) => void
  setProjects: (projects: RedmineProject[]) => void
  setActiveTab: (tab: ActiveTab) => void
  setSortMode: (mode: SortMode) => void
  filteredIssues: () => RedmineIssue[]
  urgentCount: () => number
}

export const useTasksStore = create<TasksState>((set, get) => ({
  issues: [],
  projects: [],
  activeTab: 'mine',
  sortMode: 'priority',

  setIssues: (issues) => set({ issues }),
  setProjects: (projects) => set({ projects }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  setSortMode: (mode) => set({ sortMode: mode }),

  filteredIssues: () => {
    const { issues, activeTab, sortMode } = get()

    const filtered = activeTab === 'urgent'
      ? issues.filter(i => i.priority === 'urgent' || i.priority === 'high')
      : issues

    return [...filtered].sort((a, b) => {
      if (sortMode === 'priority') {
        const pd = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
        if (pd !== 0) return pd
        if (!a.dueDate && !b.dueDate) return 0
        if (!a.dueDate) return 1
        if (!b.dueDate) return -1
        return a.dueDate.localeCompare(b.dueDate)
      } else {
        if (!a.dueDate && !b.dueDate) return 0
        if (!a.dueDate) return 1
        if (!b.dueDate) return -1
        const dd = a.dueDate.localeCompare(b.dueDate)
        if (dd !== 0) return dd
        return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
      }
    })
  },

  urgentCount: () => get().issues.filter(i => i.priority === 'urgent').length,
}))
```

- [ ] **Step 4: Spustit testy — ověřit že procházejí**

```bash
npx vitest run src/store/tasks.test.ts
```

Očekávaný výsledek: PASS (5 testů).

- [ ] **Step 5: Aktualizovat `src/components/TaskList.tsx` — odebrat odkaz na `activeProjectId`**

`TaskList.tsx` obsahuje `const { filteredIssues, activeProjectId } = useTasksStore()` — `activeProjectId` bude odstraněno. Nahradit celý soubor:

```tsx
import { AlertCircle, TrendingUp, Circle, Minus } from 'lucide-react'
import type { ReactElement } from 'react'
import { useTasksStore } from '../store/tasks'
import { TaskItem } from './TaskItem'
import { Priority, PRIORITY_ORDER } from '../types'

const PRIORITY_LABELS: Record<Priority, string> = {
  urgent: 'URGENTNÍ',
  high: 'VYSOKÁ',
  normal: 'NORMÁLNÍ',
  low: 'NÍZKÁ',
  unknown: 'OSTATNÍ',
}

const PRIORITY_ICONS: Record<Priority, ReactElement> = {
  urgent: <AlertCircle size={12} />,
  high: <TrendingUp size={12} />,
  normal: <Circle size={12} />,
  low: <Minus size={12} />,
  unknown: <Minus size={12} />,
}

const PRIORITY_ORDER_KEYS = Object.keys(PRIORITY_ORDER) as Priority[]

interface Props {
  onSelectTask?: (id: number) => void
}

export function TaskList({ onSelectTask }: Props) {
  const { filteredIssues } = useTasksStore()
  const sorted = filteredIssues()

  const grouped = PRIORITY_ORDER_KEYS.reduce((acc, priority) => {
    const items = sorted.filter(i => i.priority === priority)
    if (items.length > 0) acc[priority] = items
    return acc
  }, {} as Partial<Record<Priority, typeof sorted>>)

  return (
    <div className="task-list">
      {sorted.length === 0 && (
        <div className="task-list-empty">Žádné tasky</div>
      )}

      {PRIORITY_ORDER_KEYS.map(priority => {
        const items = grouped[priority]
        if (!items) return null
        return (
          <div key={priority} className={`task-group priority-group-${priority}`}>
            <div className="task-group-header">
              {PRIORITY_ICONS[priority]}
              {PRIORITY_LABELS[priority]}
            </div>
            {items.map(issue => (
              <TaskItem key={issue.id} issue={issue} onSelect={id => onSelectTask?.(id)} />
            ))}
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 6: Aktualizovat `src/components/TaskList.test.tsx` — opravit beforeEach**

Nahradit `activeProjectId: null` za `activeTab: 'mine'` v `beforeEach`:

```ts
beforeEach(() => {
  useTasksStore.setState({
    issues: [urgentIssue, normalIssue],
    projects: [{ id: 1, name: 'Backend' }],
    activeTab: 'mine',
    sortMode: 'priority',
  })
})
```

Také odebrat test `'shows issue number'` pokud selže — toolbar s počtem byl odstraněn. Ostatní testy zůstávají.

- [ ] **Step 7: Spustit testy — ověřit PASS**

```bash
npx vitest run src/store/tasks.test.ts src/components/TaskList.test.tsx
```

Očekávaný výsledek: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/store/tasks.ts src/store/tasks.test.ts src/components/TaskList.tsx src/components/TaskList.test.tsx
git commit -m "refactor: replace activeProjectId with activeTab (mine/urgent/all)"
```

---

## Task 4: Tabs component + aktualizace App.tsx + smazání Sidebar

**Files:**
- Create: `src/components/Tabs.tsx`
- Create: `src/components/Tabs.test.tsx`
- Modify: `src/App.tsx`
- Delete: `src/components/Sidebar.tsx`
- Delete: `src/components/Sidebar.test.tsx`

- [ ] **Step 1: Napsat failing testy pro Tabs**

Vytvořit `src/components/Tabs.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Tabs } from './Tabs'
import { useTasksStore } from '../store/tasks'

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }))

beforeEach(() => {
  useTasksStore.setState({ issues: [], activeTab: 'mine', sortMode: 'priority', projects: [] })
})

describe('Tabs', () => {
  it('renders all three tabs', () => {
    render(<Tabs onShowSettings={() => {}} />)
    expect(screen.getByText('Moje tasky')).toBeTruthy()
    expect(screen.getByText('Urgentní')).toBeTruthy()
    expect(screen.getByText('Vše')).toBeTruthy()
  })

  it('active tab has active class', () => {
    render(<Tabs onShowSettings={() => {}} />)
    const mineBtn = screen.getByText('Moje tasky').closest('button')
    expect(mineBtn?.className).toContain('active')
  })

  it('clicking tab updates store', () => {
    render(<Tabs onShowSettings={() => {}} />)
    fireEvent.click(screen.getByText('Urgentní'))
    expect(useTasksStore.getState().activeTab).toBe('urgent')
  })

  it('calls onShowSettings when settings button clicked', () => {
    const handler = vi.fn()
    render(<Tabs onShowSettings={handler} />)
    fireEvent.click(screen.getByLabelText('Nastavení'))
    expect(handler).toHaveBeenCalledOnce()
  })
})
```

- [ ] **Step 2: Spustit — ověřit že failují**

```bash
npx vitest run src/components/Tabs.test.tsx
```

Očekávaný výsledek: FAIL (Tabs neexistuje).

- [ ] **Step 3: Vytvořit `src/components/Tabs.tsx`**

```tsx
import { Settings2 } from 'lucide-react'
import { useTasksStore, ActiveTab } from '../store/tasks'

const TABS: { id: ActiveTab; label: string }[] = [
  { id: 'mine',   label: 'Moje tasky' },
  { id: 'urgent', label: 'Urgentní' },
  { id: 'all',    label: 'Vše' },
]

interface Props {
  onShowSettings: () => void
}

export function Tabs({ onShowSettings }: Props) {
  const { activeTab, setActiveTab } = useTasksStore()

  return (
    <div className="tabs">
      <div className="tabs-list">
        {TABS.map(tab => (
          <button
            key={tab.id}
            className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <button
        className="tabs-settings-btn"
        onClick={onShowSettings}
        aria-label="Nastavení"
      >
        <Settings2 size={14} />
      </button>
    </div>
  )
}
```

- [ ] **Step 4: Spustit testy Tabs — ověřit PASS**

```bash
npx vitest run src/components/Tabs.test.tsx
```

Očekávaný výsledek: PASS (4 testy).

- [ ] **Step 5: Aktualizovat `src/App.tsx`**

Nahradit celý obsah:

```tsx
import { useEffect, useState } from 'react'
import { listen } from '@tauri-apps/api/event'
import { invoke } from '@tauri-apps/api/core'
import { useTasksStore } from './store/tasks'
import { useConfigStore } from './store/config'
import { Tabs } from './components/Tabs'
import { TaskList } from './components/TaskList'
import { TaskDetail } from './components/TaskDetail'
import { Settings } from './components/Settings'
import { RedmineIssue, RedmineProject } from './types'
import './index.css'

export default function App() {
  const [showSettings, setShowSettings] = useState(false)
  const [selectedIssueId, setSelectedIssueId] = useState<number | null>(null)
  const { setIssues, setProjects } = useTasksStore()
  const { load, config, save } = useConfigStore()

  useEffect(() => { load() }, [])

  useEffect(() => {
    const fontSize = config.fontSize ?? 14
    document.documentElement.style.setProperty('--task-font-size', `${fontSize}px`)
  }, [config.fontSize])

  useEffect(() => {
    let unlisteners: (() => void)[] = []
    Promise.all([
      listen<RedmineIssue[]>('tasks-updated', (event) => setIssues(event.payload)),
      listen<RedmineProject[]>('projects-updated', (event) => setProjects(event.payload)),
      listen('show-settings', () => setShowSettings(true)),
    ]).then(([a, b, c]) => {
      unlisteners = [a, b, c]
      invoke('fetch_now').catch(() => {})
    })
    return () => { unlisteners.forEach(fn => fn()) }
  }, [])

  const adjustFontSize = (delta: number) => {
    const current = config.fontSize ?? 14
    const next = Math.min(18, Math.max(12, current + delta))
    if (next !== current) save({ ...config, fontSize: next })
  }

  return (
    <div className="app-root">
      <Tabs onShowSettings={() => setShowSettings(true)} />

      <div className="task-list-wrapper">
        <TaskList onSelectTask={setSelectedIssueId} />
        {selectedIssueId !== null && (
          <div className="task-detail-slide">
            <TaskDetail
              issueId={selectedIssueId}
              onBack={() => setSelectedIssueId(null)}
              onActionDone={() => setSelectedIssueId(null)}
            />
          </div>
        )}
      </div>

      <div className="app-footer">
        <div className="footer-font-controls">
          <span className="footer-aa-label">Aa</span>
          <button className="footer-font-btn" onClick={() => adjustFontSize(-1)}>−</button>
          <button className="footer-font-btn" onClick={() => adjustFontSize(1)}>+</button>
        </div>
      </div>

      {showSettings && <Settings onClose={() => setShowSettings(false)} />}
    </div>
  )
}
```

- [ ] **Step 6: Smazat Sidebar soubory**

```bash
rm src/components/Sidebar.tsx src/components/Sidebar.test.tsx
```

- [ ] **Step 7: Spustit TypeScript check**

```bash
npx tsc --noEmit
```

Očekávaný výsledek: bez chyb.

- [ ] **Step 8: Spustit všechny testy**

```bash
npx vitest run
```

Očekávaný výsledek: všechny testy PASS (Sidebar testy jsou smazané).

- [ ] **Step 9: Commit**

```bash
git add src/components/Tabs.tsx src/components/Tabs.test.tsx src/App.tsx
git rm src/components/Sidebar.tsx src/components/Sidebar.test.tsx
git commit -m "feat: replace sidebar with tabs (mine/urgent/all) + fontSize control in footer"
```

---

## Task 5: `fontSize` do AppConfig

**Files:**
- Modify: `src/types.ts`
- Modify: `src/store/config.ts` (žádná změna potřeba — store již persistuje celý `AppConfig`)

- [ ] **Step 1: Přidat `fontSize` do `src/types.ts`**

V interface `AppConfig` přidat pole (za `launchAtLogin`):

```ts
fontSize: number
```

V `DEFAULT_CONFIG` přidat:

```ts
fontSize: 14,
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit
```

Očekávaný výsledek: bez chyb. Pokud Settings.tsx renderuje config fields, nerozpadne se — `fontSize` je optional z pohledu existujícího config objektu ze store.

- [ ] **Step 3: Commit**

```bash
git add src/types.ts
git commit -m "feat: add fontSize to AppConfig (default 14, range 12-18)"
```

---

## Task 6: CSS — kontrast, taby, fontSize variable, remove sidebar

**Files:**
- Modify: `src/index.css`

- [ ] **Step 1: Aktualizovat `src/index.css`**

Nahradit celý obsah souboru:

```css
:root {
  --bg-primary: #111;
  --bg-secondary: #141414;
  --bg-toolbar: #1a1a1a;
  --border: #222;
  --border-subtle: #1e1e1e;
  --text-primary: #ffffff;
  --text-secondary: rgba(255,255,255,0.65);
  --text-muted: rgba(255,255,255,0.4);
  --accent: #818cf8;
  --accent-active: #4F46E5;
  --urgent: #f87171;
  --urgent-bg: rgba(248,113,113,0.08);
  --urgent-border: rgba(248,113,113,0.15);
  --high: #fb923c;
  --high-bg: rgba(251,146,60,0.08);
  --high-border: rgba(251,146,60,0.15);
  --normal: #818cf8;
  --low: rgba(255,255,255,0.3);
  --task-font-size: 14px;
}

@media (prefers-color-scheme: light) {
  :root {
    --bg-primary: #fff;
    --bg-secondary: #f9f9f9;
    --bg-toolbar: #f0f0f0;
    --border: #e0e0e0;
    --border-subtle: #f0f0f0;
    --text-primary: #111;
    --text-secondary: #444;
    --text-muted: #999;
    --accent: #4F46E5;
    --accent-active: #3730a3;
    --urgent: #dc2626;
    --urgent-bg: rgba(220,38,38,0.06);
    --urgent-border: rgba(220,38,38,0.2);
    --high: #d97706;
    --high-bg: rgba(217,119,6,0.06);
    --high-border: rgba(217,119,6,0.2);
    --normal: #4F46E5;
    --low: #9ca3af;
  }
}

* { box-sizing: border-box; margin: 0; padding: 0; }
html, body, #root { height: 580px; overflow: hidden; border-radius: 10px; background: transparent; }
body { font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif; font-size: 13px; background: transparent; color: var(--text-primary); overflow: hidden; user-select: none; border-radius: 10px; }
.app-root { display: flex; flex-direction: column; height: 580px; border-radius: 10px; overflow: hidden; background: transparent; border: 1px solid rgba(255,255,255,0.12); }
button { background: none; border: none; cursor: pointer; color: inherit; font-family: inherit; font-size: inherit; text-align: left; }

/* Tabs */
.tabs { display: flex; align-items: center; border-bottom: 1px solid var(--border-subtle); background: rgba(255,255,255,0.03); flex-shrink: 0; }
.tabs-list { display: flex; flex: 1; }
.tab-btn { padding: 9px 14px; font-size: 12px; font-weight: 500; color: var(--text-muted); border-bottom: 2px solid transparent; transition: color 120ms, border-color 120ms; }
.tab-btn:hover { color: var(--text-secondary); }
.tab-btn.active { color: var(--text-primary); border-bottom-color: var(--accent); }
.tabs-settings-btn { padding: 8px 12px; color: var(--text-muted); display: flex; align-items: center; }
.tabs-settings-btn:hover { color: var(--text-secondary); }

/* Task list */
.task-list-wrapper { flex: 1; position: relative; overflow: hidden; display: flex; flex-direction: column; }
.task-list { flex: 1; background: transparent; overflow-y: auto; }
.task-list-empty { padding: 24px 14px; color: var(--text-muted); font-size: 12px; }

.priority-group-urgent { background: var(--urgent-bg); }
.priority-group-high { background: var(--high-bg); }
.task-group-header { padding: 6px 14px 3px; font-size: 10px; font-weight: 700; letter-spacing: 0.08em; display: flex; align-items: center; gap: 6px; }
.priority-group-urgent .task-group-header { color: var(--urgent); }
.priority-group-high .task-group-header { color: var(--high); }
.priority-group-normal .task-group-header { color: var(--normal); }
.priority-group-low .task-group-header { color: var(--low); }
.priority-group-unknown .task-group-header { color: var(--text-muted); }

.task-item { width: 100%; padding: 7px 12px; border-bottom: 1px solid var(--border-subtle); display: flex; flex-direction: column; gap: 2px; }
.task-item:hover { background: rgba(255,255,255,0.06); }
.task-hover-icon { opacity: 0; transition: opacity 150ms ease; color: var(--text-muted); flex-shrink: 0; }
.task-item:hover .task-hover-icon { opacity: 1; }
.priority-group-urgent .task-item { border-bottom-color: var(--urgent-border); }
.priority-group-high .task-item { border-bottom-color: var(--high-border); }
.task-item-main { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
.task-subject { color: var(--text-primary); font-size: var(--task-font-size); flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.task-deadline { color: var(--text-muted); font-size: 11px; flex-shrink: 0; }
.task-deadline.urgent { color: var(--urgent); font-weight: 600; }
.task-meta { color: var(--text-secondary); font-size: 11px; }

/* Footer */
.app-footer { display: flex; align-items: center; justify-content: flex-end; padding: 6px 12px; border-top: 1px solid var(--border-subtle); background: rgba(255,255,255,0.02); flex-shrink: 0; }
.footer-font-controls { display: flex; align-items: center; gap: 4px; }
.footer-aa-label { font-size: 11px; color: var(--text-muted); margin-right: 4px; }
.footer-font-btn { background: rgba(255,255,255,0.08); border-radius: 4px; width: 22px; height: 18px; display: flex; align-items: center; justify-content: center; font-size: 13px; color: var(--text-secondary); }
.footer-font-btn:hover { background: rgba(255,255,255,0.14); color: var(--text-primary); }

/* Settings overlay */
.settings-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 100; display: flex; align-items: center; justify-content: center; }
.settings-panel { background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 8px; width: 360px; max-height: 520px; overflow-y: auto; padding: 20px; }
.settings-title { font-size: 15px; font-weight: 600; margin-bottom: 16px; }
.settings-section { margin-bottom: 20px; padding-bottom: 20px; border-bottom: 1px solid var(--border-subtle); }
.settings-section:last-of-type { border-bottom: none; }
.settings-section-label { color: var(--text-muted); font-size: 10px; letter-spacing: 1px; margin-bottom: 10px; }
.settings-field { display: flex; flex-direction: column; gap: 4px; margin-bottom: 10px; }
.settings-field span { color: var(--text-secondary); font-size: 11px; }
.settings-field input { background: var(--bg-toolbar); border: 1px solid var(--border); border-radius: 4px; padding: 6px 10px; color: var(--text-primary); font-size: 12px; }
.settings-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; color: var(--text-secondary); }
.settings-pill-group { display: flex; gap: 4px; }
.settings-pill { background: var(--bg-toolbar); border: 1px solid var(--border); border-radius: 4px; padding: 3px 8px; color: var(--text-muted); font-size: 11px; }
.settings-pill.active { border-color: var(--accent); color: var(--accent); background: color-mix(in srgb, var(--accent) 10%, transparent); }
.settings-toggle { border-radius: 10px; padding: 2px 10px; font-size: 10px; font-weight: 600; }
.settings-toggle.on { background: color-mix(in srgb, #48bb78 15%, transparent); color: #48bb78; }
.settings-toggle.off { background: var(--bg-toolbar); color: var(--text-muted); }
.settings-number-input { width: 50px; background: var(--bg-toolbar); border: 1px solid var(--border); border-radius: 4px; padding: 3px 8px; color: var(--text-primary); font-size: 12px; text-align: center; }
.settings-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px; }
.settings-btn-cancel { padding: 6px 14px; color: var(--text-muted); border-radius: 4px; }
.settings-btn-save { padding: 6px 14px; background: var(--accent); color: white; border-radius: 4px; font-weight: 500; }

/* Task Detail Panel */
.task-detail-slide { position: absolute; inset: 0; background: rgba(17,17,17,0.92); backdrop-filter: blur(4px); display: flex; flex-direction: column; animation: slideInRight 180ms ease forwards; }
@keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }

.task-detail { display: flex; flex-direction: column; height: 100%; }
.task-detail-header { display: flex; align-items: center; gap: 8px; padding: 10px 14px; border-bottom: 1px solid var(--border-subtle); flex-shrink: 0; }
.task-detail-back { display: flex; align-items: center; color: var(--accent); padding: 2px; }
.task-detail-back:hover { opacity: 0.8; }
.task-detail-id { color: var(--text-muted); font-size: 11px; }
.task-detail-project { color: var(--text-secondary); font-size: 11px; margin-left: auto; }

.task-detail-state { padding: 20px 14px; color: var(--text-muted); font-size: 12px; }
.task-detail-error { color: var(--urgent); }

.task-detail-body { flex: 1; overflow-y: auto; padding: 14px; display: flex; flex-direction: column; gap: 12px; }
.task-detail-subject { font-size: 13px; font-weight: 600; color: var(--text-primary); line-height: 1.4; }
.task-detail-description { font-size: 12px; color: var(--text-secondary); line-height: 1.5; white-space: pre-wrap; }

.task-detail-journals { display: flex; flex-direction: column; gap: 8px; }
.task-detail-section-label { font-size: 10px; font-weight: 600; letter-spacing: 1px; color: var(--text-muted); margin-bottom: 4px; }
.task-detail-journal { background: rgba(255,255,255,0.04); border-radius: 6px; padding: 8px 10px; }
.task-detail-journal-meta { font-size: 10px; color: var(--text-muted); margin-bottom: 4px; }
.task-detail-journal-notes { font-size: 12px; color: var(--text-secondary); white-space: pre-wrap; }

.task-detail-footer { display: flex; align-items: center; gap: 8px; padding: 10px 14px; border-top: 1px solid var(--border-subtle); flex-shrink: 0; }
.task-detail-btn { display: flex; align-items: center; gap: 6px; padding: 6px 14px; border-radius: 6px; font-size: 12px; font-weight: 500; }
.task-detail-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.task-detail-btn-done { background: rgba(72,187,120,0.15); color: #48bb78; }
.task-detail-btn-done:hover:not(:disabled) { background: rgba(72,187,120,0.25); }
.task-detail-btn-reassign { background: rgba(255,255,255,0.08); color: var(--text-secondary); }
```

- [ ] **Step 2: Spustit všechny testy**

```bash
npx vitest run
```

Očekávaný výsledek: všechny PASS.

- [ ] **Step 3: TypeScript check**

```bash
npx tsc --noEmit
```

Očekávaný výsledek: bez chyb.

- [ ] **Step 4: Commit**

```bash
git add src/index.css
git commit -m "style: higher contrast, tabs CSS, font-size CSS variable, remove sidebar styles"
```

---

## Finální ověření

- [ ] **Buildnout release verzi**

```bash
export PATH="$PATH:/Users/paveltrnka/Library/Caches/puccinialin/rustup/toolchains/stable-aarch64-apple-darwin/bin/"
npm run tauri build
```

Ověřit:
- Build proběhne bez chyb
- `src-tauri/target/release/bundle/dmg/Redmine Focus_0.1.0_aarch64.dmg` existuje
- Po instalaci: tray ikona se správně zobrazuje v light i dark mode
- App ikona v Docku: indigo background s čarami a badgem

- [ ] **Commit**

```bash
git add -A
git commit -m "chore: final build verification"
```
