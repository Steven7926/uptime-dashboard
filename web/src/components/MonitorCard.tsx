import type { MonitorState } from '../types'

interface Props {
  monitor: MonitorState
  onRemove: (id: number) => void
  onRefresh: (id: number) => void
}

function formatAge(ts: string | null): string {
  if (!ts) return 'never'
  const secs = Math.floor((Date.now() - new Date(ts).getTime()) / 1000)
  if (secs < 60) return `${secs}s ago`
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`
  return `${Math.floor(secs / 3600)}h ago`
}

function uptimePct(results: MonitorState['results']): string {
  if (!results.length) return '—'
  return ((results.filter(r => r.ok).length / results.length) * 100).toFixed(1) + '%'
}

function avgMs(results: MonitorState['results']): string {
  const times = results.flatMap(r => r.response_time != null ? [r.response_time] : [])
  if (!times.length) return '—'
  return Math.round(times.reduce((a, b) => a + b, 0) / times.length) + 'ms'
}

function intervalLabel(ms: number): string {
  const secs = ms / 1000
  return secs < 60 ? `${secs}s` : `${secs / 60}m`
}

export function MonitorCard({ monitor, onRemove, onRefresh }: Props) {
  const latest = monitor.results[0]
  const status: 'up' | 'down' | 'pending' = latest == null ? 'pending' : latest.ok ? 'up' : 'down'

  return (
    <div className={`monitor-card ${status}`}>
      <div className="card-header">
        <div className="card-title">
          <span className={`status-dot ${status}`} aria-label={status} />
          <h2 className="card-name">{monitor.name}</h2>
        </div>
        <div className="card-actions">
          <button
            className="icon-btn"
            onClick={() => onRefresh(monitor.id)}
            disabled={monitor.checking}
            title="Check now"
            aria-label="Check now"
          >
            {monitor.checking ? '·' : '↻'}
          </button>
          <button
            className="icon-btn danger"
            onClick={() => onRemove(monitor.id)}
            title="Remove monitor"
            aria-label="Remove monitor"
          >
            ×
          </button>
        </div>
      </div>

      <a
        href={monitor.url}
        target="_blank"
        rel="noopener noreferrer"
        className="monitor-url"
      >
        {monitor.url}
      </a>

      <div className="monitor-stats">
        <div className="stat">
          <span className="stat-label">Status</span>
          <span className={`stat-value status-text ${status}`}>
            {status === 'pending' ? '—' : status === 'up' ? 'Up' : 'Down'}
            {latest?.http_status != null ? ` · ${latest.http_status}` : ''}
          </span>
        </div>
        <div className="stat">
          <span className="stat-label">Latency</span>
          <span className="stat-value">
            {latest?.response_time != null ? `${latest.response_time}ms` : '—'}
          </span>
        </div>
        <div className="stat">
          <span className="stat-label">Avg</span>
          <span className="stat-value">{avgMs(monitor.results)}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Uptime</span>
          <span className="stat-value">{uptimePct(monitor.results)}</span>
        </div>
      </div>

      <div className="history-bar" aria-label={`Last ${monitor.results.length} checks`}>
        {Array.from({ length: 30 }, (_, i) => {
          const result = monitor.results[29 - i]
          return (
            <span
              key={i}
              className={`history-block ${result == null ? 'empty' : result.ok ? 'up' : 'down'}`}
              title={
                result
                  ? `${new Date(result.timestamp).toLocaleTimeString()}${result.response_time != null ? ` · ${result.response_time}ms` : ''}`
                  : ''
              }
            />
          )
        })}
      </div>

      <div className="card-footer">
        <span>Checked {formatAge(latest?.timestamp ?? null)}</span>
        <span>Every {intervalLabel(monitor.interval)}</span>
      </div>
    </div>
  )
}
