import { useEffect, useState } from 'react'
import { listen } from '@tauri-apps/api/event'
import { invoke } from '@tauri-apps/api/core'
import { useTasksStore } from './store/tasks'
import { useConfigStore } from './store/config'
import { Sidebar } from './components/Sidebar'
import { TaskList } from './components/TaskList'
import { Settings } from './components/Settings'
import { RedmineIssue, RedmineProject } from './types'
import './index.css'

export default function App() {
  const [showSettings, setShowSettings] = useState(false)
  const { setIssues, setProjects } = useTasksStore()
  const { load } = useConfigStore()

  useEffect(() => {
    load()
  }, [])

  useEffect(() => {
    let unlisteners: (() => void)[] = []

    // listen() is async — wait for all to resolve before fetching
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
        <TaskList />
      </div>

      {showSettings && <Settings onClose={() => setShowSettings(false)} />}
    </div>
  )
}
