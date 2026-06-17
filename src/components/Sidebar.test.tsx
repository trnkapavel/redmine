import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Sidebar } from './Sidebar'
import { useTasksStore } from '../store/tasks'

const projects = [
  { id: 1, name: 'Backend' },
  { id: 2, name: 'Frontend' },
]

beforeEach(() => {
  useTasksStore.setState({ issues: [], projects, activeProjectId: null, sortMode: 'priority' })
})

describe('Sidebar', () => {
  it('renders all projects', () => {
    render(<Sidebar />)
    expect(screen.getByText('Backend')).toBeTruthy()
    expect(screen.getByText('Frontend')).toBeTruthy()
  })

  it('renders "Vše" option', () => {
    render(<Sidebar />)
    expect(screen.getByText('Vše')).toBeTruthy()
  })

  it('clicking project sets active project', () => {
    render(<Sidebar />)
    fireEvent.click(screen.getByText('Backend'))
    expect(useTasksStore.getState().activeProjectId).toBe(1)
  })

  it('clicking sort button changes sort mode', () => {
    render(<Sidebar />)
    fireEvent.click(screen.getByText(/Deadline/i))
    expect(useTasksStore.getState().sortMode).toBe('deadline')
  })
})
