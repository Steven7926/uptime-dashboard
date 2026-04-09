import { useState, useEffect, useCallback } from 'react'
import type { Monitor, MonitorState } from '../types'
import * as api from '../api'

const POLL_INTERVAL = 15_000

export function useMonitors() {
  const [data, setData] = useState<Omit<MonitorState, 'checking'>[]>([])
  const [checking, setChecking] = useState<Set<number>>(new Set())

  const fetchAll = useCallback(async () => {
    const monitors = await api.fetchMonitors()
    setData(monitors)
  }, [])

  useEffect(() => {
    fetchAll()
    const id = setInterval(fetchAll, POLL_INTERVAL)
    return () => clearInterval(id)
  }, [fetchAll])

  const addMonitor = useCallback(async (body: Omit<Monitor, 'id'>) => {
    await api.createMonitor(body)
    await fetchAll()
  }, [fetchAll])

  const removeMonitor = useCallback(async (id: number) => {
    await api.deleteMonitor(id)
    setData(prev => prev.filter(m => m.id !== id))
  }, [])

  const refreshMonitor = useCallback(async (id: number) => {
    setChecking(prev => new Set(prev).add(id))
    try {
      await api.triggerCheck(id)
      await fetchAll()
    } finally {
      setChecking(prev => { const next = new Set(prev); next.delete(id); return next })
    }
  }, [fetchAll])

  const monitors: MonitorState[] = data.map(m => ({ ...m, checking: checking.has(m.id) }))

  return { monitors, addMonitor, removeMonitor, refreshMonitor }
}
