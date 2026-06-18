import { describe, it, expect, beforeEach } from 'vitest'
import { useTasksStore } from './tasks'
import { RedmineIssue } from '../types'

const urgentIssue: RedmineIssue = {
  id: 1, subject: 'Fix bug', priority: 'urgent',
  dueDate: '2026-06-20', projectId: 1, projectName: 'Backend',
  status: 'New', updatedOn: '2026-06-17T10:00:00Z',
}
const highIssue: RedmineIssue = {
  id: 2, subject: 'High task', priority: 'high',
  dueDate: null, projectId: 2, projectName: 'Frontend',
  status: 'New', updatedOn: '2026-06-17T09:00:00Z',
}
const normalIssue: RedmineIssue = {
  id: 3, subject: 'Normal task', priority: 'normal',
  dueDate: null, projectId: 1, projectName: 'Backend',
  status: 'New', updatedOn: '2026-06-17T08:00:00Z',
}

beforeEach(() => {
  useTasksStore.setState({
    issues: [],
    activeTab: 'mine',
    sortMode: 'priority',
  })
})

describe('tasks store', () => {
  it('stores issues', () => {
    useTasksStore.getState().setIssues([urgentIssue, normalIssue])
    expect(useTasksStore.getState().issues).toHaveLength(2)
  })

  it('tab mine shows all issues', () => {
    useTasksStore.getState().setIssues([urgentIssue, highIssue, normalIssue])
    useTasksStore.getState().setActiveTab('mine')
    expect(useTasksStore.getState().filteredIssues()).toHaveLength(3)
  })

  it('tab urgent shows only urgent and high priority', () => {
    useTasksStore.getState().setIssues([urgentIssue, highIssue, normalIssue])
    useTasksStore.getState().setActiveTab('urgent')
    const result = useTasksStore.getState().filteredIssues()
    expect(result).toHaveLength(2)
    expect(result.map(i => i.id)).toContain(1)
    expect(result.map(i => i.id)).toContain(2)
    expect(result.map(i => i.id)).not.toContain(3)
  })

  it('tab all shows all issues', () => {
    useTasksStore.getState().setIssues([urgentIssue, highIssue, normalIssue])
    useTasksStore.getState().setActiveTab('all')
    expect(useTasksStore.getState().filteredIssues()).toHaveLength(3)
  })

  it('sorts by priority within tab', () => {
    useTasksStore.getState().setIssues([normalIssue, urgentIssue])
    useTasksStore.getState().setActiveTab('mine')
    useTasksStore.getState().setSortMode('priority')
    const sorted = useTasksStore.getState().filteredIssues()
    expect(sorted[0].priority).toBe('urgent')
  })
})
