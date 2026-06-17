import { useEffect, useState } from 'react'
import { listen } from '@tauri-apps/api/event'
import { invoke } from '@tauri-apps/api/core'
import { useTasksStore } from './store/tasks'
import { useConfigStore } from './store/config'
import { Sidebar } from './components/Sidebar'
import { TaskList } from './components/TaskList'
import { TaskDetail } from './components/TaskDetail'
import { Settings } from './components/Settings'
import { RedmineIssue, RedmineProject } from './types'
import './index.css'

export default function App() {
  const [showSettings, setShowSettings] = useState(false)
  const [selectedIssueId, setSelectedIssueId] = useState<number | null>(null)
  const { setIssues, setProjects } = useTasksStore()
  const { load } = useConfigStore()

  useEffect(() => {
    load()
  }, [])

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

  return (
    <div className="app-root">
      <div className="app-body">
        <Sidebar />
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
      </div>

      {showSettings && <Settings onClose={() => setShowSettings(false)} />}
    </div>
  )
}
