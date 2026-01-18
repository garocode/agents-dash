import { loadDailyUsageData, loadMonthlyUsageData, loadSessionData, loadWeeklyUsageData } from 'ccusage/data-loader'
import type { Agent, Period, UsageResponse } from '../types'
import { detectEmptyState } from './empty-state'
import { getCurrentPeriodDates } from './periods'
import {
  normalizeBlocks,
  normalizeDaily,
  normalizeMonthly,
  normalizeSessions,
  normalizeWeekly
} from './normalize'
import { runCliCommand, runOpenCodeCli } from './cli'

export type LoadOptions = {
  mode?: 'auto' | 'calculate' | 'display'
  timezone?: string
  startOfWeek?: string
  breakdown?: boolean
}

function buildClaudeCommand(period: Period, options: LoadOptions): string {
  const base = ['bunx', 'ccusage@18.0.5', period, '--json', '--offline']

  if (period === 'blocks') {
    base.push('--recent')
    return base.join(' ')
  }

  const { since, until } = getCurrentPeriodDates(period, options.startOfWeek)
  base.push('--since', since, '--until', until)

  if (options.mode) {
    base.push('--mode', options.mode)
  }
  if (options.timezone) {
    base.push('--timezone', options.timezone)
  }
  if (options.startOfWeek && period === 'weekly') {
    base.push('--start-of-week', options.startOfWeek)
  }
  if (options.breakdown) {
    base.push('--breakdown')
  }

  return base.join(' ')
}

function buildOpenCodeCommand(period: Period): string {
  return ['bunx', '@ccusage/opencode@18.0.5', period, '--json'].join(' ')
}

type OpenCodeDaily = { date: string }

type OpenCodeWeekly = { week: string }

type OpenCodeMonthly = { month: string }

type OpenCodeSession = { lastActivity: string }

type OpenCodeReport<T> = { daily?: T[]; weekly?: T[]; monthly?: T[]; sessions?: T[] }

function filterOpenCodeData(raw: unknown, period: Period, since: string, until: string): unknown {
  if (period === 'daily') {
    const entries = (raw as OpenCodeReport<OpenCodeDaily>).daily ?? []
    const filtered = entries.filter((entry) => {
      const date = entry.date.replace(/-/g, '')
      return date >= since && date <= until
    })
    return { daily: filtered }
  }
  if (period === 'weekly') {
    const entries = (raw as OpenCodeReport<OpenCodeWeekly>).weekly ?? []
    const latest = entries.length > 0 ? [entries[entries.length - 1]] : []
    return { weekly: latest }
  }
  if (period === 'monthly') {
    const entries = (raw as OpenCodeReport<OpenCodeMonthly>).monthly ?? []
    const targetMonth = since.slice(0, 4) + '-' + since.slice(4, 6)
    const filtered = entries.filter((entry) => entry.month === targetMonth)
    return { monthly: filtered.length > 0 ? filtered : entries.slice(-1) }
  }
  if (period === 'session') {
    const entries = (raw as OpenCodeReport<OpenCodeSession>).sessions ?? []
    const filtered = entries.filter((entry) => {
      const date = entry.lastActivity.slice(0, 10).replace(/-/g, '')
      return date >= since && date <= until
    })
    return { sessions: filtered }
  }

  return raw
}

export async function loadUsageData(
  agent: Agent,
  period: Period,
  options: LoadOptions = {}
): Promise<UsageResponse> {
  if (agent === 'opencode' && period === 'blocks') {
    return {
      agent,
      period,
      summary: null,
      series: [],
      sessions: [],
      blocks: [],
      emptyState: { isEmpty: true, missingPaths: [], checklist: [] },
      errors: ['Blocks reports not supported for OpenCode']
    }
  }

  const emptyState = detectEmptyState(agent)
  if (emptyState.isEmpty) {
    return {
      agent,
      period,
      summary: null,
      series: [],
      sessions: [],
      blocks: [],
      emptyState,
      errors: []
    }
  }

  try {
    if (agent === 'claude' && ['daily', 'weekly', 'monthly', 'session'].includes(period)) {
      const { since, until } = getCurrentPeriodDates(period, options.startOfWeek)
      const sinceIso = `${since.slice(0, 4)}-${since.slice(4, 6)}-${since.slice(6, 8)}`
      const untilIso = `${until.slice(0, 4)}-${until.slice(4, 6)}-${until.slice(6, 8)}`

      if (period === 'daily') {
        const data = await loadDailyUsageData({ mode: options.mode })
        const filtered = data.filter((entry) => entry.date >= sinceIso && entry.date <= untilIso)
        const normalized = normalizeDaily(filtered)
        return { agent, period, emptyState, errors: [], ...normalized }
      }

      if (period === 'weekly') {
        const data = await loadWeeklyUsageData({
          mode: options.mode,
          startOfWeek: options.startOfWeek as
            | 'sunday'
            | 'monday'
            | 'tuesday'
            | 'wednesday'
            | 'thursday'
            | 'friday'
            | 'saturday'
            | undefined
        })
        const normalized = normalizeWeekly(data)
        return { agent, period, emptyState, errors: [], ...normalized }
      }

      if (period === 'monthly') {
        const data = await loadMonthlyUsageData({ mode: options.mode })
        const targetMonth = sinceIso.slice(0, 7)
        const filtered = data.filter((entry) => entry.month === targetMonth)
        const normalized = normalizeMonthly(filtered.length > 0 ? filtered : data)
        return { agent, period, emptyState, errors: [], ...normalized }
      }

      const data = await loadSessionData({ mode: options.mode })
      const filtered = data.filter((entry) => entry.lastActivity >= sinceIso && entry.lastActivity <= untilIso)
      const normalized = normalizeSessions(filtered, agent)
      return { agent, period, emptyState, errors: [], ...normalized }
    }

    if (agent === 'claude') {
      const command = buildClaudeCommand(period, options)
      const raw = await runCliCommand(command)
      if (period === 'weekly') {
        const normalized = normalizeWeekly(raw)
        return { agent, period, emptyState, errors: [], ...normalized }
      }
      const normalized =
        period === 'blocks'
          ? normalizeBlocks(raw)
          : period === 'monthly'
            ? normalizeMonthly(raw)
            : normalizeDaily(raw)
      return { agent, period, emptyState, errors: [], ...normalized }
    }

    const command = buildOpenCodeCommand(period)
    const raw = await runOpenCodeCli(command)
    const { since, until } = getCurrentPeriodDates(period, options.startOfWeek)
    const filtered = filterOpenCodeData(raw, period, since, until)
    const normalized =
      period === 'weekly'
        ? normalizeWeekly(filtered)
        : period === 'monthly'
          ? normalizeMonthly(filtered)
          : period === 'session'
            ? normalizeSessions(filtered, agent)
            : normalizeDaily(filtered)

    return { agent, period, emptyState, errors: [], ...normalized }
  } catch (error) {
    return {
      agent,
      period,
      summary: null,
      series: [],
      sessions: [],
      blocks: [],
      emptyState,
      errors: [error instanceof Error ? error.message : String(error)]
    }
  }
}
