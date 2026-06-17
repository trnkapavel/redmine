import { useState } from 'react'
import { useConfigStore } from '../store/config'
import { AppConfig } from '../types'

interface Props {
  onClose: () => void
}

export function Settings({ onClose }: Props) {
  const { config, save } = useConfigStore()
  const [form, setForm] = useState<AppConfig>(config)

  const handleSave = async () => {
    await save(form)
    onClose()
  }

  const toggle = (key: keyof AppConfig) =>
    setForm(f => ({ ...f, [key]: !f[key] }))

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

        <div className="settings-actions">
          <button className="settings-btn-cancel" onClick={onClose}>Zrušit</button>
          <button className="settings-btn-save" onClick={handleSave}>Uložit</button>
        </div>
      </div>
    </div>
  )
}
