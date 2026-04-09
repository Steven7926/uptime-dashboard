import type { CheckResult, Monitor, MonitorState } from './types'

const BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? '/api'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

export function fetchMonitors(): Promise<MonitorState[]> {
  return request<MonitorState[]>('/monitors')
}

export function createMonitor(data: Omit<Monitor, 'id'>): Promise<Monitor> {
  return request<Monitor>('/monitors', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function deleteMonitor(id: number): Promise<void> {
  return request<void>(`/monitors/${id}`, { method: 'DELETE' })
}

export function triggerCheck(id: number): Promise<CheckResult> {
  return request<CheckResult>(`/monitors/${id}/check`, { method: 'POST' })
}
