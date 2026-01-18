import type {
  UsageSummary,
  UsageSeriesPoint,
  SessionSummary,
  BlockSummary
} from '../types'

type Totals = {
  inputTokens?: number
  outputTokens?: number
  cacheCreationTokens?: number
  cacheReadTokens?: number
  totalTokens?: number
  totalCost?: number
  totalCostUSD?: number
}

type DailyEntry = {
  date: string
  inputTokens?: number
  outputTokens?: number
  cacheCreationTokens?: number
  cacheReadTokens?: number
  totalTokens?: number
  totalCost?: number
  costUSD?: number
  modelsUsed?: string[]
  models?: string[]
}

type WeeklyEntry = {
  week: string
  inputTokens?: number
  outputTokens?: number
  cacheCreationTokens?: number
  cacheReadTokens?: number
  totalTokens?: number
  totalCost?: number
  costUSD?: number
  modelsUsed?: string[]
  models?: string[]
}

type MonthlyEntry = {
  month: string
  inputTokens?: number
  outputTokens?: number
  cacheCreationTokens?: number
  cacheReadTokens?: number
  totalTokens?: number
  totalCost?: number
  costUSD?: number
  modelsUsed?: string[]
  models?: string[]
}

type SessionEntry = {
  sessionId?: string
  sessionID?: string
  lastActivity: string
  inputTokens?: number
  outputTokens?: number
  cacheCreationTokens?: number
  cacheReadTokens?: number
  totalTokens?: number
  totalCost?: number
  costUSD?: number
  modelsUsed?: string[]
  models?: string[]
  parentID?: string | null
  parentSessionId?: string | null
}

type BlockEntry = {
  id: string
  startTime: string
  endTime: string
  isActive: boolean
  tokenCounts?: {
    inputTokens?: number
    outputTokens?: number
    cacheCreationInputTokens?: number
    cacheReadInputTokens?: number
  }
  totalTokens?: number
  costUSD?: number
  models?: string[]
}

export type NormalizedData = {
  summary: UsageSummary | null
  series: UsageSeriesPoint[]
  sessions: SessionSummary[]
  blocks: BlockSummary[]
}

function sum(values: Array<number | undefined>): number {
  return values.reduce((total: number, value) => total + (value ?? 0), 0)
}

function buildSummary(
  period: 'daily' | 'weekly' | 'monthly',
  start: string,
  totals: Totals
): UsageSummary {
  return {
    period,
    start,
    totalTokens: totals.totalTokens ?? 0,
    totalInputTokens: totals.inputTokens ?? 0,
    totalOutputTokens: totals.outputTokens ?? 0,
    totalCostUSD: totals.totalCostUSD ?? totals.totalCost ?? 0
  }
}

function computeTotalsFromEntries(entries: Array<DailyEntry | WeeklyEntry | MonthlyEntry>): Totals {
  const totalTokens = sum(entries.map((entry) => entry.totalTokens))
  const inputTokens = sum(entries.map((entry) => entry.inputTokens))
  const outputTokens = sum(entries.map((entry) => entry.outputTokens))
  const cacheCreationTokens = sum(entries.map((entry) => entry.cacheCreationTokens))
  const cacheReadTokens = sum(entries.map((entry) => entry.cacheReadTokens))
  const cost = sum(entries.map((entry) => entry.totalCost ?? entry.costUSD))
  return {
    inputTokens,
    outputTokens,
    cacheCreationTokens,
    cacheReadTokens,
    totalTokens: totalTokens || inputTokens + outputTokens + cacheCreationTokens + cacheReadTokens,
    totalCost: cost
  }
}

export function normalizeDaily(raw: unknown): NormalizedData {
  const entries = Array.isArray(raw)
    ? (raw as DailyEntry[])
    : ((raw as { daily?: DailyEntry[] }).daily ?? [])
  const totals = (raw as { totals?: Totals }).totals ?? computeTotalsFromEntries(entries)
  const series: UsageSeriesPoint[] = entries.map((entry) => ({
    label: entry.date,
    costUSD: entry.totalCost ?? entry.costUSD ?? 0,
    totalTokens:
      entry.totalTokens ??
      sum([entry.inputTokens, entry.outputTokens, entry.cacheCreationTokens, entry.cacheReadTokens])
  }))
  const latestEntry = entries.length > 0 ? entries[entries.length - 1] : null
  const summary =
    latestEntry
      ? buildSummary('daily', latestEntry.date, {
          inputTokens: latestEntry.inputTokens,
          outputTokens: latestEntry.outputTokens,
          cacheCreationTokens: latestEntry.cacheCreationTokens,
          cacheReadTokens: latestEntry.cacheReadTokens,
          totalTokens:
            latestEntry.totalTokens ??
            sum([
              latestEntry.inputTokens,
              latestEntry.outputTokens,
              latestEntry.cacheCreationTokens,
              latestEntry.cacheReadTokens
            ]),
          totalCost: latestEntry.totalCost ?? latestEntry.costUSD
        })
      : null

  return { summary, series, sessions: [], blocks: [] }
}

export function normalizeWeekly(raw: unknown): NormalizedData {
  const entries = Array.isArray(raw)
    ? (raw as WeeklyEntry[])
    : ((raw as { weekly?: WeeklyEntry[] }).weekly ?? (raw as { data?: WeeklyEntry[] }).data ?? [])
  const totals = (raw as { totals?: Totals }).totals ?? computeTotalsFromEntries(entries)
  const series: UsageSeriesPoint[] = entries.map((entry) => ({
    label: entry.week,
    costUSD: entry.totalCost ?? entry.costUSD ?? 0,
    totalTokens:
      entry.totalTokens ??
      sum([entry.inputTokens, entry.outputTokens, entry.cacheCreationTokens, entry.cacheReadTokens])
  }))
  const summary =
    entries.length > 0
      ? buildSummary('weekly', entries[0].week, {
          ...totals,
          totalTokens:
            totals.totalTokens ??
            sum([totals.inputTokens, totals.outputTokens, totals.cacheCreationTokens, totals.cacheReadTokens])
        })
      : ({
          period: 'weekly',
          start: '',
          totalTokens: 0,
          totalInputTokens: 0,
          totalOutputTokens: 0,
          totalCostUSD: 0
        } as UsageSummary)

  return { summary, series, sessions: [], blocks: [] }
}

export function normalizeMonthly(raw: unknown): NormalizedData {
  const entries = Array.isArray(raw)
    ? (raw as MonthlyEntry[])
    : ((raw as { monthly?: MonthlyEntry[] }).monthly ?? (raw as { data?: MonthlyEntry[] }).data ?? [])
  const totals =
    (raw as { summary?: Totals }).summary ??
    (raw as { totals?: Totals }).totals ??
    computeTotalsFromEntries(entries)
  const series: UsageSeriesPoint[] = entries.map((entry) => ({
    label: entry.month,
    costUSD: entry.totalCost ?? entry.costUSD ?? 0,
    totalTokens:
      entry.totalTokens ??
      sum([entry.inputTokens, entry.outputTokens, entry.cacheCreationTokens, entry.cacheReadTokens])
  }))
  const summary =
    entries.length > 0
      ? buildSummary('monthly', entries[0].month, {
          ...totals,
          totalTokens:
            totals.totalTokens ??
            sum([totals.inputTokens, totals.outputTokens, totals.cacheCreationTokens, totals.cacheReadTokens])
        })
      : ({
          period: 'monthly',
          start: '',
          totalTokens: 0,
          totalInputTokens: 0,
          totalOutputTokens: 0,
          totalCostUSD: 0
        } as UsageSummary)

  return { summary, series, sessions: [], blocks: [] }
}

export function normalizeSessions(raw: unknown, agent: 'claude' | 'opencode'): NormalizedData {
  const entries =
    Array.isArray(raw) ? (raw as SessionEntry[]) : ((raw as { sessions?: SessionEntry[] }).sessions ?? [])
  const sessions: SessionSummary[] = entries.map((entry) => ({
    sessionId: entry.sessionId ?? entry.sessionID ?? '',
    agent,
    lastActivity: entry.lastActivity,
    totalTokens:
      entry.totalTokens ??
      sum([entry.inputTokens, entry.outputTokens, entry.cacheCreationTokens, entry.cacheReadTokens]),
    totalCostUSD: entry.totalCost ?? entry.costUSD ?? 0,
    modelsUsed: entry.modelsUsed ?? entry.models ?? [],
    parentSessionId: entry.parentSessionId ?? entry.parentID ?? undefined
  }))

  return { summary: null, series: [], sessions, blocks: [] }
}

export function normalizeBlocks(raw: unknown): NormalizedData {
  const entries =
    Array.isArray(raw) ? (raw as BlockEntry[]) : ((raw as { blocks?: BlockEntry[] }).blocks ?? [])
  const blocks: BlockSummary[] = entries.map((entry) => ({
    blockId: entry.id,
    startTime: entry.startTime,
    endTime: entry.endTime,
    isActive: entry.isActive,
    totalTokens:
      entry.totalTokens ??
      sum([
        entry.tokenCounts?.inputTokens,
        entry.tokenCounts?.outputTokens,
        entry.tokenCounts?.cacheCreationInputTokens,
        entry.tokenCounts?.cacheReadInputTokens
      ]),
    costUSD: entry.costUSD ?? 0,
    models: entry.models ?? []
  }))

  return { summary: null, series: [], sessions: [], blocks }
}
