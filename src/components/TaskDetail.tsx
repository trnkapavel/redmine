import React, { useState, useEffect, useRef } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { ArrowLeft, Check, UserCheck } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import type { IssueDetail, Member } from '../types'
import { useConfigStore } from '../store/config'

interface Props {
  issueId: number
  onBack: () => void
  onActionDone: () => void
}

export function TaskDetail({ issueId, onBack, onActionDone }: Props) {
  const [detail, setDetail] = useState<IssueDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reassignOpen, setReassignOpen] = useState(false)
  const [working, setWorking] = useState(false)
  const [note, setNote] = useState('')
  const [noteSending, setNoteSending] = useState(false)
  const reassignRef = useRef<HTMLDivElement>(null)

  const { config } = useConfigStore()

  useEffect(() => {
    setLoading(true)
    setError(null)
    setDetail(null)
    invoke<IssueDetail>('get_issue_detail', { id: issueId })
      .then(d => { setDetail(d); setLoading(false) })
      .catch(e => { setError(String(e)); setLoading(false) })
  }, [issueId])

  useEffect(() => {
    if (!reassignOpen) return
    const handler = (e: MouseEvent) => {
      if (reassignRef.current && !reassignRef.current.contains(e.target as Node)) {
        setReassignOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [reassignOpen])

  const handleResolve = async () => {
    if (!detail || detail.closedStatuses.length === 0) return
    setWorking(true)
    setError(null)
    try {
      await invoke('update_issue_cmd', {
        id: issueId,
        statusId: detail.closedStatuses[0].id,
        assignedToId: null,
      })
      await invoke('fetch_now')
      onActionDone()
    } catch (e) {
      setError(String(e))
    } finally {
      setWorking(false)
    }
  }

  const handleReassign = async (member: Member) => {
    setWorking(true)
    setReassignOpen(false)
    setError(null)
    try {
      await invoke('update_issue_cmd', {
        id: issueId,
        statusId: null,
        assignedToId: member.id,
      })
      await invoke('fetch_now')
      onActionDone()
    } catch (e) {
      setError(String(e))
    } finally {
      setWorking(false)
    }
  }

  const handleWorkingOn = async () => {
    if (!config.inProgressStatusId) return
    setWorking(true)
    try {
      await invoke('update_issue_cmd', { id: issueId, statusId: config.inProgressStatusId, assignedToId: null })
      onActionDone()
    } catch { } finally { setWorking(false) }
  }

  const handleSendNote = async () => {
    if (!note.trim()) return
    setNoteSending(true)
    try {
      await invoke('add_note_cmd', { id: issueId, notes: note.trim() })
      setNote('')
      setDetail(null)
      await invoke<IssueDetail>('get_issue_detail', { id: issueId })
        .then(setDetail)
        .catch(e => setError(String(e)))
    } catch { } finally { setNoteSending(false) }
  }

  return (
    <div className="task-detail">
      <div className="task-detail-header">
        <button className="task-detail-back" onClick={onBack} aria-label="Zpět">
          <ArrowLeft size={14} />
        </button>
        <span className="task-detail-id">#{issueId}</span>
        {detail && <span className="task-detail-project">{detail.projectName}</span>}
      </div>

      {loading && <div className="task-detail-state">Načítám…</div>}
      {error && <div className="task-detail-state task-detail-error">{error}</div>}

      {detail && !loading && (
        <>
          <div className="task-detail-body">
            <div className="task-detail-subject">{detail.subject}</div>

            {detail.description && (
              <div className="task-detail-description">
                <ReactMarkdown
                  components={{
                    a: ({ href, children }: { href?: string; children?: React.ReactNode }) => {
                      const safe = href && /^https?:\/\//i.test(href)
                      return safe
                        ? <a href={href} onClick={e => { e.preventDefault(); invoke('open_in_browser', { url: href }) }}>{children}</a>
                        : <span>{children}</span>
                    }
                  }}
                >{detail.description}</ReactMarkdown>
              </div>
            )}

            {(() => {
              const notes = detail.journals.filter(j => j.notes.trim())
              return notes.length > 0 ? (
                <div className="task-detail-journals">
                  <div className="task-detail-section-label">KOMENTÁŘE</div>
                  {notes.map(j => (
                    <div key={j.id} className="task-detail-journal">
                      <div className="task-detail-journal-meta">
                        {j.authorName} · {formatDate(j.createdOn)}
                      </div>
                      <div className="task-detail-journal-notes">{j.notes}</div>
                    </div>
                  ))}
                </div>
              ) : null
            })()}

            <div className="task-detail-note-form">
              <textarea
                className="task-detail-note-input"
                placeholder="Přidat komentář…"
                value={note}
                onChange={e => setNote(e.target.value)}
                rows={3}
              />
              <button
                className="task-detail-btn task-detail-btn-note"
                onClick={handleSendNote}
                disabled={noteSending || !note.trim()}
              >
                {noteSending ? '…' : 'Odeslat'}
              </button>
            </div>
          </div>

          <div className="task-detail-footer">
            {config.inProgressStatusId !== null && (
              <button
                className="task-detail-btn task-detail-btn-working"
                onClick={handleWorkingOn}
                disabled={working}
              >
                ▶ Pracuji
              </button>
            )}
            {detail.closedStatuses.length > 0 && (
              <button
                className="task-detail-btn task-detail-btn-done"
                onClick={handleResolve}
                disabled={working}
              >
                <Check size={13} />
                Vyřeším
              </button>
            )}
            <div className="task-detail-reassign-wrapper" ref={reassignRef}>
              <button
                className="task-detail-btn task-detail-btn-reassign"
                onClick={() => setReassignOpen(o => !o)}
                disabled={working || detail.members.length === 0}
              >
                <UserCheck size={13} />
                Předat
              </button>
              {reassignOpen && detail.members.length > 0 && (
                <div className="task-detail-dropdown">
                  {detail.members.map(m => (
                    <button
                      key={m.id}
                      className="task-detail-dropdown-item"
                      onClick={() => handleReassign(m)}
                    >
                      {m.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('cs', { day: 'numeric', month: 'short' })
}
