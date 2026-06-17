import { invoke } from '@tauri-apps/api/core'
import { useConfigStore } from '../store/config'
import { RedmineIssue } from '../types'
import { ExternalLink } from 'lucide-react'

function formatDeadline(dueDate: string | null): { text: string; urgent: boolean } {
  if (!dueDate) return { text: '—', urgent: false }
  const due = new Date(dueDate)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  due.setHours(0, 0, 0, 0)
  const diff = Math.round((due.getTime() - today.getTime()) / 86400000)
  if (diff < 0) return { text: 'po termínu', urgent: true }
  if (diff === 0) return { text: 'dnes', urgent: true }
  if (diff === 1) return { text: 'zítra', urgent: false }
  if (diff <= 7) return { text: due.toLocaleDateString('cs', { weekday: 'short' }), urgent: false }
  return { text: due.toLocaleDateString('cs', { day: 'numeric', month: 'short' }), urgent: false }
}

interface Props {
  issue: RedmineIssue
}

export function TaskItem({ issue }: Props) {
  const { config } = useConfigStore()

  const handleClick = () => {
    const url = `${config.redmineUrl}/issues/${issue.id}`
    invoke('open_in_browser', { url })
  }

  const deadline = formatDeadline(issue.dueDate)

  return (
    <button className={`task-item priority-${issue.priority}`} onClick={handleClick}>
      <div className="task-item-main">
        <span className="task-subject">{issue.subject}</span>
        {issue.dueDate && (
          <span className={`task-deadline ${deadline.urgent ? 'urgent' : ''}`}>
            {deadline.text}
          </span>
        )}
        <ExternalLink size={14} className="task-hover-icon" />
      </div>
      <div className="task-meta">
        {issue.projectName} · #{issue.id}
      </div>
    </button>
  )
}
