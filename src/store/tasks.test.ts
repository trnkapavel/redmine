import { describe, it, expect, beforeEach } from 'vitest'
import { useTasksStore } from './tasks'
import { RedmineIssue } from '../types'

const issue1: RedmineIssue = {
  id: 1, subject: 'Fix bug', priority: 'urgent',
  dueDate: '2026-06-20', projectId: 1, projectName: 'Backend',
  status: 'New', updatedOn: '2026-06-17T10:00:00Z',
}
const issue2: RedmineIssue = {
  id: 2, subject: 'Docs', priority: 'normal',
  dueDate: null, projectId: 2, projectName: 'Frontend',
  status: 'New', updatedOn: '2026-06-17T09:00:00Z',
}

beforeEach(() => {
  useTasksStore.setState({ issues: [], projects: [], activeProjectId: null, sortMode: 'priority' })
})

describe('tasks store', () => {
  it('stores issues', () => {
    useTasksStore.getState().setIssues([issue1, issue2])
    expect(useTasksStore.getState().issues).toHaveLength(2)
  })

  it('filters by project', () => {
    useTasksStore.getState().setIssues([issue1, issue2])
    useTasksStore.getState().setActiveProject(1)
    expect(useTasksStore.getState().filteredIssues()).toHaveLength(1)
    expect(useTasksStore.getState().filteredIssues()[0].id).toBe(1)
  })

  it('sorts by priority', () => {
    useTasksStore.getState().setIssues([issue2, issue1])
    useTasksStore.getState().setSortMode('priority')
    const sorted = useTasksStore.getState().filteredIssues()
    expect(sorted[0].priority).toBe('urgent')
  })

  it('returns all issues when no project selected', () => {
    useTasksStore.getState().setIssues([issue1, issue2])
    useTasksStore.getState().setActiveProject(null)
    expect(useTasksStore.getState().filteredIssues()).toHaveLength(2)
  })
})
