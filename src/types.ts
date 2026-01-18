// API Response Types

export type Agent = 'claude' | 'opencode'
export type Period = 'daily' | 'weekly' | 'monthly' | 'session' | 'blocks'
export type CostMode = 'auto' | 'calculate' | 'display'
export type Timezone = 'local' | 'UTC'

export interface UsageSummary {
  period: 'daily' | 'weekly' | 'monthly'
  start: string
  totalTokens: number
  totalInputTokens: number
  totalOutputTokens: number
  totalCostUSD: number
}

export interface UsageSeriesPoint {
  label: string
  costUSD: number
  totalTokens: number
}

export interface SessionSummary {
  sessionId: string
  agent: Agent
  lastActivity: string
  totalTokens: number
  totalCostUSD: number
  modelsUsed: string[]
  parentSessionId?: string
}

export interface BlockSummary {
  blockId: string
  startTime: string
  endTime: string
  isActive: boolean
  totalTokens: number
  costUSD: number
  models: string[]
}

export interface EmptyState {
  isEmpty: boolean
  missingPaths: string[]
  checklist: string[]
}

export interface UsageResponse {
  agent: Agent
  period: Period
  summary: UsageSummary | null
  series: UsageSeriesPoint[]
  sessions: SessionSummary[]
  blocks: BlockSummary[]
  emptyState: EmptyState
  errors: string[]
}

// Local Settings (persisted in localStorage)
export interface LocalSettings {
  defaultAgent: Agent
  costMode: CostMode
  startOfWeek: string
  timezone: Timezone
  showBreakdown: boolean
}

// Initial State for SSR hydration
export interface InitialState {
  overview?: {
    daily: UsageResponse | null
    weekly: UsageResponse | null
    monthly: UsageResponse | null
    sessions: UsageResponse | null
  }
  agentReports?: {
    daily: UsageResponse | null
    weekly: UsageResponse | null
    monthly: UsageResponse | null
    session: UsageResponse | null
    blocks: UsageResponse | null
  }
  sessionDetail?: SessionSummary | null
  report?: UsageResponse | null
}
