import { invoke } from '@tauri-apps/api/core'
import { useConfigStore } from '../store/config'
import { RedmineIssue } from '../types'
import { ExternalLink } from 'lucide-react'

function formatDeadline(dueDate: string | null): { text: string; urgent: boolean; soon: boolean } {
  if (!dueDate) return { text: '—', urgent: false, soon: false }
  const due = new Date(dueDate)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  due.setHours(0, 0, 0, 0)
  const diff = Math.round((due.getTime() - today.getTime()) / 86400000)
  if (diff < 0) return { text: 'po termínu', urgent: true, soon: false }
  if (diff === 0) return { text: 'dnes', urgent: true, soon: false }
  if (diff === 1) return { text: 'zítra', urgent: false, soon: true }
  if (diff <= 7) return { text: due.toLocaleDateString('cs', { weekday: 'short' }), urgent: false, soon: false }
  return { text: due.toLocaleDateString('cs', { day: 'numeric', month: 'short' }), urgent: false, soon: false }
}

interface Props {
  issue: RedmineIssue
  onSelect: (id: number) => void
  onQuickResolve?: (id: number, e: React.MouseEvent) => void
  onQuickWorking?: (id: number, e: React.MouseEvent) => void
  showWorkingBtn?: boolean
}

export function TaskItem({ issue, onSelect, onQuickResolve, onQuickWorking, showWorkingBtn }: Props) {
  const { config } = useConfigStore()

  const handleOpenBrowser = (e: React.MouseEvent) => {
    e.stopPropagation()
    const url = `${config.redmineUrl}/issues/${issue.id}`
    invoke('open_in_browser', { url })
  }

  const deadline = formatDeadline(issue.dueDate)

  return (
    <button className={`task-item priority-${issue.priority}`} onClick={() => onSelect(issue.id)}>
      <div className="task-item-main">
        <span className="task-subject">{issue.subject}</span>
        {issue.dueDate && (
          <span className={`task-deadline${deadline.urgent ? ' urgent' : deadline.soon ? ' soon' : ''}`}>
            {deadline.text}
          </span>
        )}
        <span className="task-hover-icon" onClick={handleOpenBrowser}>
          <ExternalLink size={14} />
        </span>
        <div className="task-quick-actions">
          {showWorkingBtn && onQuickWorking && (
            <button
              className="task-hover-icon task-quick-btn"
              onClick={(e) => onQuickWorking(issue.id, e)}
              title="Pracuji na tom"
            >▶</button>
          )}
          {onQuickResolve && (
            <button
              className="task-hover-icon task-quick-btn task-quick-btn-done"
              onClick={(e) => onQuickResolve(issue.id, e)}
              title="Vyřeším"
            >✓</button>
          )}
        </div>
      </div>
      <div className="task-meta">
        {issue.projectName} · #{issue.id}
      </div>
    </button>
  )
}
