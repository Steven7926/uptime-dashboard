import { useState, useEffect, useCallback, useRef } from 'react'
import type { Monitor, CheckResult, MonitorState } from '../types'

const MONITORS_KEY = 'uptime:monitors'
const RESULTS_KEY = 'uptime:results'
const MAX_RESULTS = 50
const TICK_INTERVAL = 10_000

async function ping(url: string): Promise<CheckResult> {
  const start = Date.now()
  try {
    // Try with full CORS to get http status
    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) })
    return { timestamp: start, ok: res.ok, responseTime: Date.now() - start, httpStatus: res.status }
  } catch {
    // Fall back to no-cors
    try {
      await fetch(url, { method: 'HEAD', mode: 'no-cors', signal: AbortSignal.timeout(5_000) })
      return { timestamp: start, ok: true, responseTime: Date.now() - start, httpStatus: null }
    } catch {
      return { timestamp: start, ok: false, responseTime: null, httpStatus: null }
    }
  }
}

function fromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

export function useMonitors() {
  const [monitors, setMonitors] = useState<Monitor[]>(() => fromStorage(MONITORS_KEY, []))
  const [results, setResults] = useState<Record<string, CheckResult[]>>(() => fromStorage(RESULTS_KEY, {}))
  const [lastChecked, setLastChecked] = useState<Record<string, number>>(() => {
    const stored = fromStorage<Record<string, CheckResult[]>>(RESULTS_KEY, {})
    return Object.fromEntries(
      Object.entries(stored).flatMap(([id, checks]) =>
        checks[0]?.timestamp ? [[id, checks[0].timestamp]] : []
      )
    )
  })
  const [checking, setChecking] = useState<Record<string, boolean>>({})

  const monitorsRef = useRef(monitors)
  const lastCheckedRef = useRef(lastChecked)
  monitorsRef.current = monitors
  lastCheckedRef.current = lastChecked

  useEffect(() => {
    localStorage.setItem(MONITORS_KEY, JSON.stringify(monitors))
  }, [monitors])

  useEffect(() => {
    localStorage.setItem(RESULTS_KEY, JSON.stringify(results))
  }, [results])

  const checkMonitor = useCallback(async (id: string, url: string) => {
    setChecking(c => ({ ...c, [id]: true }))
    const result = await ping(url)
    setResults(prev => ({ ...prev, [id]: [result, ...(prev[id] ?? [])].slice(0, MAX_RESULTS) }))
    setLastChecked(prev => ({ ...prev, [id]: Date.now() }))
    setChecking(c => ({ ...c, [id]: false }))
  }, [])

  // Check any monitor that hasn't been checked yet (covers initial mount + new monitors)
  const initializedRef = useRef<Set<string>>(new Set())
  useEffect(() => {
    monitors.forEach(m => {
      if (!initializedRef.current.has(m.id)) {
        initializedRef.current.add(m.id)
        checkMonitor(m.id, m.url)
      }
    })
  }, [monitors, checkMonitor])

  // Polling tick — re-checks monitors when their interval has elapsed
  useEffect(() => {
    const tick = setInterval(() => {
      const now = Date.now()
      monitorsRef.current.forEach(m => {
        const last = lastCheckedRef.current[m.id] ?? 0
        if (now - last >= m.interval) {
          checkMonitor(m.id, m.url)
        }
      })
    }, TICK_INTERVAL)
    return () => clearInterval(tick)
  }, [checkMonitor])

  const addMonitor = useCallback((monitor: Omit<Monitor, 'id'>) => {
    const m: Monitor = { ...monitor, id: crypto.randomUUID() }
    setMonitors(prev => [...prev, m])
  }, [])

  const removeMonitor = useCallback((id: string) => {
    setMonitors(prev => prev.filter(m => m.id !== id))
    setResults(prev => { const { [id]: _, ...rest } = prev; return rest })
    initializedRef.current.delete(id)
  }, [])

  const states: MonitorState[] = monitors.map(m => ({
    ...m,
    results: results[m.id] ?? [],
    lastChecked: lastChecked[m.id] ?? null,
    checking: checking[m.id] ?? false,
  }))

  return { monitors: states, addMonitor, removeMonitor, checkMonitor }
}
