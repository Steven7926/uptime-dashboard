import { useState } from 'react'
import type { Monitor } from '../types'

interface Props {
  onAdd: (monitor: Omit<Monitor, 'id'>) => void
}

const INTERVALS = [
  { label: '30 seconds', value: 30_000 },
  { label: '1 minute', value: 60_000 },
  { label: '2 minutes', value: 120_000 },
  { label: '5 minutes', value: 300_000 },
  { label: '10 minutes', value: 600_000 },
  { label: '30 minutes', value: 1_800_000 },
]

export function AddMonitorForm({ onAdd }: Props) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [interval, setInterval] = useState(60_000)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !url.trim()) return
    onAdd({ name: name.trim(), url: url.trim(), interval })
    setName('')
    setUrl('')
    setInterval(60_000)
    setOpen(false)
  }

  if (!open) {
    return (
      <button className="add-btn" onClick={() => setOpen(true)}>
        + Add Monitor
      </button>
    )
  }

  return (
    <form className="add-form" onSubmit={handleSubmit}>
      <h2>Add Monitor</h2>
      <div className="form-fields">
        <label className="form-field">
          <span>Name</span>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="My API"
            required
            autoFocus
          />
        </label>
        <label className="form-field">
          <span>URL</span>
          <input
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="https://api.example.com/health"
            type="url"
            required
          />
        </label>
        <label className="form-field">
          <span>Check every</span>
          <select value={interval} onChange={e => setInterval(Number(e.target.value))}>
            {INTERVALS.map(i => (
              <option key={i.value} value={i.value}>{i.label}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="form-actions">
        <button type="button" onClick={() => setOpen(false)}>Cancel</button>
        <button type="submit" className="primary">Add Monitor</button>
      </div>
    </form>
  )
}
