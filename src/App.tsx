import { useEffect, useState } from 'react'
import { listen } from '@tauri-apps/api/event'
import { useTasksStore } from './store/tasks'
import { useConfigStore } from './store/config'
import { Sidebar } from './components/Sidebar'
import { TaskList } from './components/TaskList'
import { Settings } from './components/Settings'
import { RedmineIssue, RedmineProject } from './types'
import './index.css'

export default function App() {
  const [showSettings, setShowSettings] = useState(false)
  const [lastSync, setLastSync] = useState<string | null>(null)
  const { setIssues, setProjects } = useTasksStore()
  const { load, loaded } = useConfigStore()

  useEffect(() => {
    load()
  }, [])

  useEffect(() => {
    const unlistenTasks = listen<RedmineIssue[]>('tasks-updated', (event) => {
      setIssues(event.payload)
      setLastSync(new Date().toLocaleTimeString('cs', { hour: '2-digit', minute: '2-digit' }))
    })
    const unlistenProjects = listen<RedmineProject[]>('projects-updated', (event) => {
      setProjects(event.payload)
    })
    return () => {
      unlistenTasks.then(fn => fn())
      unlistenProjects.then(fn => fn())
    }
  }, [])

  if (!loaded) return null

  return (
    <div>
      <div className="titlebar">
        <div className="titlebar-controls">
          <span className="titlebar-dot close" />
          <span className="titlebar-dot minimize" />
          <span className="titlebar-dot maximize" />
        </div>
        <span className="titlebar-title">Redmine Focus</span>
        <div className="titlebar-right">
          {lastSync && <span>↻ {lastSync}</span>}
          <button className="titlebar-settings-btn" onClick={() => setShowSettings(true)}>⚙</button>
        </div>
      </div>

      <div className="app-body">
        <Sidebar />
        <TaskList />
      </div>

      {showSettings && <Settings onClose={() => setShowSettings(false)} />}
    </div>
  )
}
