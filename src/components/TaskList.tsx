import { invoke } from '@tauri-apps/api/core'
import { AlertCircle, ArrowUp, Circle, Minus } from 'lucide-react'
import type { ReactElement } from 'react'
import { useConfigStore } from '../store/config'
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
  high: <ArrowUp size={12} />,
  normal: <Circle size={12} />,
  low: <Minus size={12} />,
  unknown: <Minus size={12} />,
}

const PRIORITY_ORDER_KEYS = Object.keys(PRIORITY_ORDER) as Priority[]

interface Props {
  onSelectTask?: (id: number) => void
  onShowSettings?: () => void
}

export function TaskList({ onSelectTask, onShowSettings }: Props) {
  const { filteredIssues, firstClosedStatusId } = useTasksStore()
  const { config } = useConfigStore()
  const sorted = filteredIssues()

  const handleQuickResolve = async (issueId: number, e: React.MouseEvent) => {
    e.stopPropagation()
    const statusId = firstClosedStatusId()
    if (!statusId) return
    await invoke('update_issue_cmd', { id: issueId, statusId, assignedToId: undefined })
    invoke('fetch_now').catch(() => {})
  }

  const handleQuickWorking = async (issueId: number, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!config.inProgressStatusId) {
      onShowSettings?.()
      return
    }
    await invoke('update_issue_cmd', { id: issueId, statusId: config.inProgressStatusId, assignedToId: undefined })
    invoke('fetch_now').catch(() => {})
  }

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
              <TaskItem
                key={issue.id}
                issue={issue}
                onSelect={id => onSelectTask?.(id)}
                onQuickResolve={handleQuickResolve}
                onQuickWorking={handleQuickWorking}
              />
            ))}
          </div>
        )
      })}
    </div>
  )
}
