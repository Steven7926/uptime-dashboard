export interface Monitor {
  id: string
  name: string
  url: string
  interval: number // ms between checks
}

export interface CheckResult {
  timestamp: number
  ok: boolean
  responseTime: number | null
  httpStatus: number | null
}

export interface MonitorState extends Monitor {
  results: CheckResult[]
  lastChecked: number | null
  checking: boolean
}
