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
