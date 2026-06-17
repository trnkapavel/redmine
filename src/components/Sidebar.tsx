import { LayoutList, Folder, ArrowUpNarrowWide, CalendarClock } from 'lucide-react'
import { useTasksStore } from '../store/tasks'

export function Sidebar() {
  const { projects, activeProjectId, sortMode, issues, setActiveProject, setSortMode } = useTasksStore()

  const countForProject = (id: number) =>
    issues.filter(i => i.projectId === id).length

  const urgentInProject = (id: number) =>
    issues.filter(i => i.projectId === id && i.priority === 'urgent').length

  return (
    <aside className="sidebar">
      <div className="sidebar-section-label">PROJEKTY</div>

      <button
        className={`sidebar-item ${activeProjectId === null ? 'active' : ''}`}
        onClick={() => setActiveProject(null)}
      >
        <span className="sidebar-item-left">
          <LayoutList size={13} />
          <span className="sidebar-item-name">Vše</span>
        </span>
        <span className="sidebar-item-count">{issues.length}</span>
      </button>

      {projects.map(project => {
        const urgent = urgentInProject(project.id)
        return (
          <button
            key={project.id}
            className={`sidebar-item ${activeProjectId === project.id ? 'active' : ''}`}
            onClick={() => setActiveProject(project.id)}
          >
            <span className="sidebar-item-left">
              <Folder size={13} />
              <span className="sidebar-item-name">{project.name}</span>
            </span>
            <span className={`sidebar-item-count ${urgent > 0 ? 'urgent' : ''}`}>
              {countForProject(project.id)}
            </span>
          </button>
        )
      })}

      <div className="sidebar-section-label" style={{ marginTop: '16px' }}>SEŘADIT</div>

      <button
        className={`sidebar-item ${sortMode === 'priority' ? 'active' : ''}`}
        onClick={() => setSortMode('priority')}
      >
        <span className="sidebar-item-left">
          <ArrowUpNarrowWide size={13} />
          <span className="sidebar-item-name">Priorita</span>
        </span>
      </button>

      <button
        className={`sidebar-item ${sortMode === 'deadline' ? 'active' : ''}`}
        onClick={() => setSortMode('deadline')}
      >
        <span className="sidebar-item-left">
          <CalendarClock size={13} />
          <span className="sidebar-item-name">Deadline</span>
        </span>
      </button>
    </aside>
  )
}
