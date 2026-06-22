import { useState, useEffect } from 'react'
import { getVersion } from '@tauri-apps/api/app'
import { invoke } from '@tauri-apps/api/core'
import { useConfigStore } from '../store/config'
import { AppConfig, IssueStatus } from '../types'

interface Props {
  onClose: () => void
}

export function Settings({ onClose }: Props) {
  const { config, save } = useConfigStore()
  const [form, setForm] = useState<AppConfig>(config)
  const [version, setVersion] = useState('')
  const [allStatuses, setAllStatuses] = useState<IssueStatus[]>([])
  const [updateState, setUpdateState] = useState<'idle' | 'checking' | 'available' | 'installing' | 'uptodate' | 'error'>('idle')
  const [updateVersion, setUpdateVersion] = useState<string | null>(null)

  useEffect(() => { getVersion().then(setVersion) }, [])

  useEffect(() => {
    invoke<IssueStatus[]>('fetch_statuses_cmd')
      .then(statuses => {
        setAllStatuses(statuses)
        if (form.inProgressStatusId === null) {
          const keywords = ['progress', 'řeší', 'řešen', 'přijat', 'probíhá', 'in progress', 'assigned']
          const auto = statuses.find(s =>
            keywords.some(kw => s.name.toLowerCase().includes(kw))
          )
          if (auto) setForm(f => ({ ...f, inProgressStatusId: auto.id }))
        }
      })
      .catch(() => {})
  }, [])

  const handleSave = async () => {
    await save(form)
    onClose()
  }

  const toggle = (key: keyof AppConfig) =>
    setForm(f => ({ ...f, [key]: !f[key] }))

  const handleCheckUpdate = async () => {
    setUpdateState('checking')
    try {
      const info = await invoke<{ available: boolean; version: string | null }>('check_update_cmd')
      if (info.available) {
        setUpdateVersion(info.version)
        setUpdateState('available')
      } else {
        setUpdateState('uptodate')
      }
    } catch {
      setUpdateState('error')
    }
  }

  const handleInstallUpdate = async () => {
    setUpdateState('installing')
    try {
      await invoke('install_update_cmd')
    } catch {
      setUpdateState('error')
    }
  }

  return (
    <div className="settings-overlay">
      <div className="settings-panel">
        <h2 className="settings-title">Nastavení</h2>

        <section className="settings-section">
          <div className="settings-section-label">REDMINE</div>
          <label className="settings-field">
            <span>URL instance</span>
            <input
              type="url"
              value={form.redmineUrl}
              onChange={e => setForm(f => ({ ...f, redmineUrl: e.target.value }))}
              placeholder="https://redmine.firma.cz"
            />
          </label>
          <label className="settings-field">
            <span>API klíč</span>
            <input
              type="password"
              value={form.apiKey}
              onChange={e => setForm(f => ({ ...f, apiKey: e.target.value }))}
              placeholder="váš API klíč"
            />
          </label>
        </section>

        <section className="settings-section">
          <div className="settings-section-label">SYNCHRONIZACE</div>
          <div className="settings-row">
            <span>Interval pollingu</span>
            <div className="settings-pill-group">
              {[5, 15, 30].map(min => (
                <button
                  key={min}
                  className={`settings-pill ${form.pollIntervalMinutes === min ? 'active' : ''}`}
                  onClick={() => setForm(f => ({ ...f, pollIntervalMinutes: min }))}
                >
                  {min} min
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="settings-section">
          <div className="settings-section-label">NOTIFIKACE</div>
          {([
            ['notifyNewIssue', 'Nový task přiřazen'],
            ['notifyUpdated', 'Task aktualizován'],
            ['notifyOverdue', 'Po termínu'],
          ] as const).map(([key, label]) => (
            <div key={key} className="settings-row">
              <span>{label}</span>
              <button
                className={`settings-toggle ${form[key] ? 'on' : 'off'}`}
                onClick={() => toggle(key)}
              >
                {form[key] ? 'ON' : 'OFF'}
              </button>
            </div>
          ))}
          <div className="settings-row">
            <span>Deadline za</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <input
                type="number"
                min={1}
                max={14}
                value={form.notifyDeadlineDays}
                onChange={e => setForm(f => ({ ...f, notifyDeadlineDays: Number(e.target.value) }))}
                className="settings-number-input"
              />
              <span>dní</span>
            </div>
          </div>
        </section>

        <section className="settings-section">
          <div className="settings-row">
            <span>Spustit při přihlášení</span>
            <button
              className={`settings-toggle ${form.launchAtLogin ? 'on' : 'off'}`}
              onClick={() => toggle('launchAtLogin')}
            >
              {form.launchAtLogin ? 'ON' : 'OFF'}
            </button>
          </div>
        </section>

        <section className="settings-section">
          <div className="settings-section-label">WORKFLOW</div>
          <div className="settings-row">
            <span>Status při práci</span>
            <select
              className="settings-select"
              value={form.inProgressStatusId ?? ''}
              onChange={e => setForm(f => ({
                ...f,
                inProgressStatusId: e.target.value ? Number(e.target.value) : null
              }))}
            >
              <option value="">— nevybráno —</option>
              {allStatuses.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        </section>

        <section className="settings-section">
          <div className="settings-section-label">AKTUALIZACE</div>
          <div className="settings-row">
            <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
              {updateState === 'idle' && 'Kliknutím zkontroluj dostupné aktualizace'}
              {updateState === 'checking' && 'Kontroluji…'}
              {updateState === 'uptodate' && 'Máš nejnovější verzi'}
              {updateState === 'available' && `Dostupná verze ${updateVersion}`}
              {updateState === 'installing' && 'Stahuji a instaluji…'}
              {updateState === 'error' && 'Nepodařilo se zkontrolovat aktualizace'}
            </span>
            {updateState === 'available' ? (
              <button className="settings-btn-save" style={{ padding: '4px 10px', fontSize: 11 }} onClick={handleInstallUpdate}>
                Instalovat
              </button>
            ) : (
              <button
                className="settings-pill"
                onClick={handleCheckUpdate}
                disabled={updateState === 'checking' || updateState === 'installing'}
              >
                {updateState === 'checking' ? '…' : 'Zkontrolovat'}
              </button>
            )}
          </div>
        </section>

        <section className="settings-section">
          <div className="settings-section-label">O APLIKACI</div>
          <div className="settings-row">
            <div>
              <div style={{ fontWeight: 600 }}>Redmine Focus</div>
              <div style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 2 }}>verze {version} · Pavel Trnka · 2026</div>
            </div>
            <button
              className="about-link"
              onClick={() => invoke('open_in_browser', { url: 'https://github.com/trnkapavel/redmine' })}
            >
              GitHub ↗
            </button>
          </div>
        </section>

        <div className="settings-actions">
          <button className="settings-btn-cancel" onClick={onClose}>Zrušit</button>
          <button className="settings-btn-save" onClick={handleSave}>Uložit</button>
        </div>
      </div>
    </div>
  )
}
