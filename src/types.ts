export type Priority = 'urgent' | 'high' | 'normal' | 'low' | 'unknown'

export interface RedmineIssue {
  id: number
  subject: string
  priority: Priority
  dueDate: string | null  // ISO date string "YYYY-MM-DD"
  projectId: number
  projectName: string
  status: string
  updatedOn: string       // ISO datetime
}

export interface RedmineProject {
  id: number
  name: string
}

export type SortMode = 'priority' | 'deadline'

export interface AppConfig {
  redmineUrl: string
  apiKey: string
  pollIntervalMinutes: number
  notifyNewIssue: boolean
  notifyUpdated: boolean
  notifyDeadlineDays: number
  notifyOverdue: boolean
  launchAtLogin: boolean
}

export const DEFAULT_CONFIG: AppConfig = {
  redmineUrl: '',
  apiKey: '',
  pollIntervalMinutes: 15,
  notifyNewIssue: true,
  notifyUpdated: true,
  notifyDeadlineDays: 2,
  notifyOverdue: true,
  launchAtLogin: true,
}

export const PRIORITY_ORDER: Record<Priority, number> = {
  urgent: 0,
  high: 1,
  normal: 2,
  low: 3,
  unknown: 4,
}

export interface Journal {
  id: number
  notes: string
  createdOn: string
  authorName: string
}

export interface IssueStatus {
  id: number
  name: string
}

export interface Member {
  id: number
  name: string
}

export interface IssueDetail {
  id: number
  subject: string
  description: string
  projectId: number
  projectName: string
  status: string
  statusId: number
  priority: Priority
  dueDate: string | null
  assigneeId: number | null
  assigneeName: string | null
  journals: Journal[]
  closedStatuses: IssueStatus[]
  members: Member[]
}
