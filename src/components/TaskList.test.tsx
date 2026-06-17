import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TaskList } from './TaskList'
import { useTasksStore } from '../store/tasks'
import { RedmineIssue } from '../types'

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}))

const urgentIssue: RedmineIssue = {
  id: 1, subject: 'Urgentní task', priority: 'urgent',
  dueDate: '2026-06-17', projectId: 1, projectName: 'Backend',
  status: 'New', updatedOn: '2026-06-17T10:00:00Z',
}
const normalIssue: RedmineIssue = {
  id: 2, subject: 'Normální task', priority: 'normal',
  dueDate: null, projectId: 1, projectName: 'Backend',
  status: 'New', updatedOn: '2026-06-17T09:00:00Z',
}

beforeEach(() => {
  useTasksStore.setState({
    issues: [urgentIssue, normalIssue],
    projects: [{ id: 1, name: 'Backend' }],
    activeProjectId: null,
    sortMode: 'priority',
  })
})

describe('TaskList', () => {
  it('renders tasks', () => {
    render(<TaskList />)
    expect(screen.getByText('Urgentní task')).toBeTruthy()
    expect(screen.getByText('Normální task')).toBeTruthy()
  })

  it('renders priority group headers', () => {
    render(<TaskList />)
    expect(screen.getAllByText(/URGENTNÍ/i)).toBeTruthy()
    expect(screen.getAllByText(/NORMÁLNÍ/i)).toBeTruthy()
  })

  it('shows issue number', () => {
    render(<TaskList />)
    expect(screen.getByText(/#1/)).toBeTruthy()
  })

  it('calls onSelectTask with issue id when task item is clicked', () => {
    const onSelectTask = vi.fn()
    render(<TaskList onSelectTask={onSelectTask} />)
    const items = screen.getAllByRole('button')
    const taskButton = items.find(btn => btn.className.includes('task-item'))
    expect(taskButton).toBeTruthy()
    if (taskButton) fireEvent.click(taskButton)
    expect(onSelectTask).toHaveBeenCalledWith(expect.any(Number))
  })

  it('does not call onSelectTask when ExternalLink icon is clicked', () => {
    const onSelectTask = vi.fn()
    render(<TaskList onSelectTask={onSelectTask} />)
    // Find the external link span (task-hover-icon)
    const hoverIcons = document.querySelectorAll('.task-hover-icon')
    if (hoverIcons.length > 0) {
      fireEvent.click(hoverIcons[0])
    }
    expect(onSelectTask).not.toHaveBeenCalled()
  })
})
