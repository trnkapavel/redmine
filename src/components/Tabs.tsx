import { Settings2 } from 'lucide-react'
import { useTasksStore, ActiveTab } from '../store/tasks'

const TABS: { id: ActiveTab; label: string }[] = [
  { id: 'mine',   label: 'Moje tasky' },
  { id: 'urgent', label: 'Urgentní' },
  { id: 'all',    label: 'Vše' },
]

interface Props {
  onShowSettings: () => void
}

export function Tabs({ onShowSettings }: Props) {
  const { activeTab, setActiveTab } = useTasksStore()

  return (
    <div className="tabs">
      <div className="tabs-list">
        {TABS.map(tab => (
          <button
            key={tab.id}
            className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <button
        className="tabs-settings-btn"
        onClick={onShowSettings}
        aria-label="Nastavení"
      >
        <Settings2 size={14} />
      </button>
    </div>
  )
}
