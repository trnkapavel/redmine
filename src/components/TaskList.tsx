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

export function TaskList() {
  const { filteredIssues, activeProjectId } = useTasksStore()
  const sorted = filteredIssues()

  const grouped = PRIORITY_ORDER_KEYS.reduce((acc, priority) => {
    const items = sorted.filter(i => i.priority === priority)
    if (items.length > 0) acc[priority] = items
    return acc
  }, {} as Partial<Record<Priority, typeof sorted>>)

  return (
    <div className="task-list">
      <div className="task-list-toolbar">
        <span className="task-count">
          {activeProjectId ? `Projekt · ` : 'Vše · '}
          {sorted.length} {sorted.length === 1 ? 'task' : 'tasků'}
        </span>
      </div>

      {sorted.length === 0 && (
        <div className="task-list-empty">Žádné přiřazené tasky</div>
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
              <TaskItem key={issue.id} issue={issue} />
            ))}
          </div>
        )
      })}
    </div>
  )
}
