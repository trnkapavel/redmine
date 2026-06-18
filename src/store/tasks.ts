import { create } from 'zustand'
import { RedmineIssue, RedmineProject, SortMode, PRIORITY_ORDER } from '../types'

export type ActiveTab = 'mine' | 'urgent' | 'all'

interface TasksState {
  issues: RedmineIssue[]
  projects: RedmineProject[]
  activeTab: ActiveTab
  sortMode: SortMode
  setIssues: (issues: RedmineIssue[]) => void
  setProjects: (projects: RedmineProject[]) => void
  setActiveTab: (tab: ActiveTab) => void
  setSortMode: (mode: SortMode) => void
  filteredIssues: () => RedmineIssue[]
  urgentCount: () => number
}

export const useTasksStore = create<TasksState>((set, get) => ({
  issues: [],
  projects: [],
  activeTab: 'mine',
  sortMode: 'priority',

  setIssues: (issues) => set({ issues }),
  setProjects: (projects) => set({ projects }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  setSortMode: (mode) => set({ sortMode: mode }),

  filteredIssues: () => {
    const { issues, activeTab, sortMode } = get()

    const filtered = activeTab === 'urgent'
      ? issues.filter(i => i.priority === 'urgent' || i.priority === 'high')
      : issues

    return [...filtered].sort((a, b) => {
      if (sortMode === 'priority') {
        const pd = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
        if (pd !== 0) return pd
        if (!a.dueDate && !b.dueDate) return 0
        if (!a.dueDate) return 1
        if (!b.dueDate) return -1
        return a.dueDate.localeCompare(b.dueDate)
      } else {
        if (!a.dueDate && !b.dueDate) return 0
        if (!a.dueDate) return 1
        if (!b.dueDate) return -1
        const dd = a.dueDate.localeCompare(b.dueDate)
        if (dd !== 0) return dd
        return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
      }
    })
  },

  urgentCount: () => get().issues.filter(i => i.priority === 'urgent').length,
}))
