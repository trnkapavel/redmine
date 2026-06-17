import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { TaskDetail } from './TaskDetail'
import type { IssueDetail } from '../types'

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}))

const { invoke } = await import('@tauri-apps/api/core')

const mockDetail: IssueDetail = {
  id: 42,
  subject: 'Fix login bug',
  description: 'Users cannot log in',
  projectId: 3,
  projectName: 'Backend',
  status: 'New',
  statusId: 1,
  priority: 'normal',
  dueDate: null,
  assigneeId: 5,
  assigneeName: 'Pavel',
  journals: [
    { id: 1, notes: 'Looking into it', createdOn: '2026-06-18T10:00:00Z', authorName: 'Pavel' },
  ],
  closedStatuses: [{ id: 3, name: 'Resolved' }],
  members: [
    { id: 5, name: 'Pavel' },
    { id: 6, name: 'Jana' },
  ],
}

describe('TaskDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows loading state initially', () => {
    vi.mocked(invoke).mockReturnValue(new Promise(() => {}))
    render(<TaskDetail issueId={42} onBack={() => {}} onActionDone={() => {}} />)
    expect(screen.getByText('Načítám…')).toBeTruthy()
  })

  it('renders detail after load', async () => {
    vi.mocked(invoke).mockImplementation((cmd) => {
      if (cmd === 'get_issue_detail') return Promise.resolve(mockDetail)
      return Promise.resolve()
    })
    render(<TaskDetail issueId={42} onBack={() => {}} onActionDone={() => {}} />)
    await waitFor(() => screen.getByText('Fix login bug'))
    expect(screen.getByText('Users cannot log in')).toBeTruthy()
    expect(screen.getByText('Looking into it')).toBeTruthy()
    expect(screen.getByText('Backend')).toBeTruthy()
  })

  it('calls onBack when back button clicked', async () => {
    vi.mocked(invoke).mockResolvedValue(mockDetail)
    const onBack = vi.fn()
    render(<TaskDetail issueId={42} onBack={onBack} onActionDone={() => {}} />)
    await waitFor(() => screen.getByText('Fix login bug'))
    fireEvent.click(screen.getByLabelText('Zpět'))
    expect(onBack).toHaveBeenCalledOnce()
  })

  it('calls update_issue_cmd and onActionDone when Vyřeším clicked', async () => {
    vi.mocked(invoke).mockImplementation((cmd) => {
      if (cmd === 'get_issue_detail') return Promise.resolve(mockDetail)
      return Promise.resolve()
    })
    const onActionDone = vi.fn()
    render(<TaskDetail issueId={42} onBack={() => {}} onActionDone={onActionDone} />)
    await waitFor(() => screen.getByText('Fix login bug'))
    fireEvent.click(screen.getByText('Vyřeším'))
    await waitFor(() => expect(onActionDone).toHaveBeenCalledOnce())
    expect(vi.mocked(invoke)).toHaveBeenCalledWith('update_issue_cmd', {
      id: 42,
      statusId: 3,
      assignedToId: null,
    })
  })

  it('shows reassign dropdown and calls update on member click', async () => {
    vi.mocked(invoke).mockImplementation((cmd) => {
      if (cmd === 'get_issue_detail') return Promise.resolve(mockDetail)
      return Promise.resolve()
    })
    const onActionDone = vi.fn()
    render(<TaskDetail issueId={42} onBack={() => {}} onActionDone={onActionDone} />)
    await waitFor(() => screen.getByText('Fix login bug'))
    fireEvent.click(screen.getByText('Předat'))
    expect(screen.getByText('Jana')).toBeTruthy()
    fireEvent.click(screen.getByText('Jana'))
    await waitFor(() => expect(onActionDone).toHaveBeenCalledOnce())
    expect(vi.mocked(invoke)).toHaveBeenCalledWith('update_issue_cmd', {
      id: 42,
      statusId: null,
      assignedToId: 6,
    })
  })
})
