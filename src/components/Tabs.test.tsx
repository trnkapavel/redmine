import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Tabs } from './Tabs'
import { useTasksStore } from '../store/tasks'

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }))

beforeEach(() => {
  useTasksStore.setState({ issues: [], activeTab: 'mine', sortMode: 'priority', projects: [] })
})

describe('Tabs', () => {
  it('renders all three tabs', () => {
    render(<Tabs onShowSettings={() => {}} />)
    expect(screen.getByText('Moje tasky')).toBeTruthy()
    expect(screen.getByText('Urgentní')).toBeTruthy()
    expect(screen.getByText('Vše')).toBeTruthy()
  })

  it('active tab has active class', () => {
    render(<Tabs onShowSettings={() => {}} />)
    const mineBtn = screen.getByText('Moje tasky').closest('button')
    expect(mineBtn?.className).toContain('active')
  })

  it('clicking tab updates store', () => {
    render(<Tabs onShowSettings={() => {}} />)
    fireEvent.click(screen.getByText('Urgentní'))
    expect(useTasksStore.getState().activeTab).toBe('urgent')
  })

  it('calls onShowSettings when settings button clicked', () => {
    const handler = vi.fn()
    render(<Tabs onShowSettings={handler} />)
    fireEvent.click(screen.getByLabelText('Nastavení'))
    expect(handler).toHaveBeenCalledOnce()
  })
})
