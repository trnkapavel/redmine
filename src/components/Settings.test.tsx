import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Settings } from './Settings'
import { useConfigStore } from '../store/config'
import { DEFAULT_CONFIG } from '../types'

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn().mockResolvedValue(undefined),
}))

beforeEach(() => {
  useConfigStore.setState({
    config: { ...DEFAULT_CONFIG, redmineUrl: 'https://test.redmine.cz', apiKey: 'abc123' },
    loaded: true,
    load: vi.fn(),
    save: vi.fn(),
  })
})

describe('Settings', () => {
  it('renders redmine URL field', () => {
    render(<Settings onClose={() => {}} />)
    expect(screen.getByDisplayValue('https://test.redmine.cz')).toBeTruthy()
  })

  it('renders poll interval options', () => {
    render(<Settings onClose={() => {}} />)
    expect(screen.getByText('15 min')).toBeTruthy()
  })

  it('calls onClose when cancel clicked', () => {
    const onClose = vi.fn()
    render(<Settings onClose={onClose} />)
    fireEvent.click(screen.getByText('Zrušit'))
    expect(onClose).toHaveBeenCalled()
  })
})
