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
  const { setIssues, setProjects } = useTasksStore()
  const { load } = useConfigStore()

  useEffect(() => {
    load()
  }, [])

  useEffect(() => {
    const unlistenTasks = listen<RedmineIssue[]>('tasks-updated', (event) => {
      setIssues(event.payload)
    })
    const unlistenProjects = listen<RedmineProject[]>('projects-updated', (event) => {
      setProjects(event.payload)
    })
    const unlistenSettings = listen('show-settings', () => {
      setShowSettings(true)
    })
    return () => {
      unlistenTasks.then(fn => fn())
      unlistenProjects.then(fn => fn())
      unlistenSettings.then(fn => fn())
    }
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
