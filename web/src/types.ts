export interface Monitor {
  id: number
  name: string
  url: string
  interval: number // ms
  query_params?: string
}

export interface CheckResult {
  id: number
  monitor_id: number
  timestamp: string
  ok: boolean
  response_time: number | null  // ms
  http_status: number | null
}

export interface MonitorState extends Monitor {
  results: CheckResult[]
  checking: boolean
}
