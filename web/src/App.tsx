import { useMonitors } from './hooks/useMonitors'
import { MonitorCard } from './components/MonitorCard'
import { AddMonitorForm } from './components/AddMonitorForm'
import './styles/App.css'

export default function App() {
  const { monitors, addMonitor, removeMonitor, refreshMonitor } = useMonitors()

  const upCount = monitors.filter(m => m.results[0]?.ok === true).length
  const downCount = monitors.filter(m => m.results[0]?.ok === false).length
  const allUp = monitors.length > 0 && downCount === 0

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-brand">
          <h1>Uptime</h1>
          {monitors.length > 0 && (
            <span className={`overall-badge ${allUp ? 'up' : 'down'}`}>
              {allUp ? 'All systems operational' : `${downCount} service${downCount !== 1 ? 's' : ''} down`}
            </span>
          )}
        </div>
        {monitors.length > 0 && (
          <div className="header-stats">
            <div className="hstat">
              <span className="hstat-num">{monitors.length}</span>
              <span className="hstat-label">monitored</span>
            </div>
            <div className="hstat">
              <span className="hstat-num text-up">{upCount}</span>
              <span className="hstat-label">up</span>
            </div>
            {downCount > 0 && (
              <div className="hstat">
                <span className="hstat-num text-down">{downCount}</span>
                <span className="hstat-label">down</span>
              </div>
            )}
          </div>
        )}
      </header>

      <main className="app-main">
        {monitors.length === 0 ? (
          <div className="empty-state">
            <p>No monitors yet.</p>
            <p className="empty-sub">Add a URL below to start tracking uptime.</p>
          </div>
        ) : (
          <div className="monitor-grid">
            {monitors.map(monitor => (
              <MonitorCard
                key={monitor.id}
                monitor={monitor}
                onRemove={removeMonitor}
                onRefresh={refreshMonitor}
              />
            ))}
          </div>
        )}

        <div className="add-section">
          <AddMonitorForm onAdd={addMonitor} />
        </div>
      </main>
    </div>
  )
}
