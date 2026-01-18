import React, { useEffect, useState, useMemo } from 'react'
import { useParams, useSearchParams, Link } from 'react-router-dom'
import { InitialState, Agent, UsageResponse, CostMode, Timezone, Period } from '../types'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

interface ReportDetailsProps {
  initialState?: InitialState['report']
}

interface LocalSettings {
  costMode: CostMode
  timezone: Timezone
  startOfWeek: string
  showBreakdown: boolean
}

const DEFAULT_SETTINGS: LocalSettings = {
  costMode: 'auto',
  timezone: 'local',
  startOfWeek: 'sunday',
  showBreakdown: false
}

export default function ReportDetails({ initialState }: ReportDetailsProps) {
  const { period } = useParams<{ period: string }>()
  const validPeriod = (['daily', 'weekly', 'monthly', 'session', 'blocks'].includes(period || '') ? period : 'daily') as Period
  
  const [searchParams, setSearchParams] = useSearchParams()
  const agentParam = searchParams.get('agent') as Agent | null

  const [settings, setSettings] = useState<LocalSettings>(DEFAULT_SETTINGS)
  const [showSettings, setShowSettings] = useState(false)
  const [isClient, setIsClient] = useState(false)
  const [loading, setLoading] = useState(false)
  
  const [agent, setAgent] = useState<Agent>(() => {
    if (agentParam === 'claude' || agentParam === 'opencode') return agentParam
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('defaultAgent') as Agent
      if (stored) return stored
    }
    return 'claude'
  })

  const [data, setData] = useState<UsageResponse | null>(initialState || null)

  useEffect(() => {
    setIsClient(true)
    const storedMode = localStorage.getItem('costMode') as CostMode
    const storedTz = localStorage.getItem('timezone') as Timezone
    const storedStart = localStorage.getItem('startOfWeek')
    const storedBreakdown = localStorage.getItem('showBreakdown')

    setSettings({
      costMode: storedMode || 'auto',
      timezone: storedTz || 'local',
      startOfWeek: storedStart || 'sunday',
      showBreakdown: storedBreakdown === 'true'
    })
  }, [])

  useEffect(() => {
    const currentParams = new URLSearchParams(searchParams)
    if (currentParams.get('agent') !== agent) {
      currentParams.set('agent', agent)
      setSearchParams(currentParams)
      localStorage.setItem('defaultAgent', agent)
    }
  }, [agent, searchParams, setSearchParams])

  const handleSettingChange = (key: keyof LocalSettings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }))
    localStorage.setItem(key, String(value))
  }

  const fetchData = async () => {
    setLoading(true)
    try {
      const query = new URLSearchParams()
      query.set('agent', agent)
      query.set('period', validPeriod)
      if (settings.costMode) query.set('mode', settings.costMode)
      if (settings.timezone) query.set('timezone', settings.timezone)
      if (settings.startOfWeek) query.set('startOfWeek', settings.startOfWeek)
      if (settings.showBreakdown) query.set('breakdown', '1')

      const res = await fetch(`/api/usage?${query.toString()}`)
      if (!res.ok) throw new Error('Failed to fetch report')
      const json = await res.json()
      setData(json)
    } catch (err) {
      console.error('Failed to fetch data:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!isClient) return
    fetchData()
  }, [agent, validPeriod, settings, isClient])

  const chartData = useMemo(() => {
    if (!data?.series) return []
    return data.series.map(d => ({
      ...d,
      formattedLabel: new Date(d.label).toLocaleDateString(undefined, { 
        month: 'short', 
        day: 'numeric',
        ...(validPeriod === 'monthly' ? { year: 'numeric' } : {})
      })
    }))
  }, [data?.series, validPeriod])

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val)

  const formatTokens = (val: number) => 
    new Intl.NumberFormat('en-US', { style: 'decimal' }).format(val)

  return (
    <div className="container">
      <div className="flex justify-between items-center" style={{ marginBottom: '2rem' }}>
        <div>
          <div className="flex items-center gap-4">
            <Link to="/" className="text-secondary text-sm">&larr; Back</Link>
            <h1 className="text-xl font-bold m-0 capitalize">{validPeriod} Report</h1>
          </div>
        </div>
        <div className="flex gap-4">
          <button 
            className="btn"
            onClick={() => setShowSettings(!showSettings)}
          >
            Settings
          </button>
          <button className="btn btn-primary" onClick={fetchData} disabled={loading}>
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      <div className="tabs">
        <button 
          className={`tab ${agent === 'claude' ? 'active' : ''}`}
          onClick={() => setAgent('claude')}
        >
          Claude Code
        </button>
        <button 
          className={`tab ${agent === 'opencode' ? 'active' : ''}`}
          onClick={() => setAgent('opencode')}
        >
          OpenCode
        </button>
      </div>

      {showSettings && (
        <div className="card" style={{ marginBottom: '2rem', padding: '1.5rem' }}>
          <h3 className="text-sm font-bold mb-4 uppercase text-secondary">Local Settings</h3>
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
            <div>
              <label className="block text-sm text-secondary mb-1">Cost Mode</label>
              <select 
                className="btn w-full text-left"
                value={settings.costMode}
                onChange={(e) => handleSettingChange('costMode', e.target.value)}
              >
                <option value="auto">Auto</option>
                <option value="calculate">Calculate</option>
                <option value="display">Display</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-secondary mb-1">Timezone</label>
              <select 
                className="btn w-full text-left"
                value={settings.timezone}
                onChange={(e) => handleSettingChange('timezone', e.target.value)}
              >
                <option value="local">Local</option>
                <option value="UTC">UTC</option>
              </select>
            </div>
            {validPeriod === 'weekly' && (
              <div>
                <label className="block text-sm text-secondary mb-1">Start of Week</label>
                <select 
                  className="btn w-full text-left"
                  value={settings.startOfWeek}
                  onChange={(e) => handleSettingChange('startOfWeek', e.target.value)}
                >
                  <option value="sunday">Sunday</option>
                  <option value="monday">Monday</option>
                </select>
              </div>
            )}
          </div>
        </div>
      )}

      {data?.emptyState.isEmpty && (
        <div className="card p-8 text-center mb-8">
          <h2 className="text-xl font-bold mb-2">No Data Found</h2>
          <p className="text-secondary">No {validPeriod} usage data available for {agent}.</p>
        </div>
      )}

      {chartData.length > 0 && (
        <div className="card mb-8">
          <div className="chart-container" style={{ height: '400px' }}>
            {isClient ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                  <XAxis 
                    dataKey="formattedLabel" 
                    stroke="#52525b" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false}
                  />
                  <YAxis 
                    stroke="#52525b" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false} 
                    tickFormatter={(val) => `$${val}`} 
                  />
                  <Tooltip 
                    cursor={{ fill: '#27272a', opacity: 0.4 }}
                    contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', color: '#f4f4f5' }}
                    itemStyle={{ color: '#f4f4f5' }}
                    formatter={(val: number | undefined) => [`$${val?.toFixed(2) ?? '0.00'}`, 'Cost']}
                  />
                  <Bar dataKey="costUSD" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-secondary">Loading chart...</div>
            )}
          </div>
        </div>
      )}

      {data?.series && data.series.length > 0 && (
        <div className="card">
          <h2 className="text-sm font-bold uppercase text-secondary mb-4">Detailed Breakdown</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #27272a' }}>
                <th style={{ textAlign: 'left', padding: '0.75rem', color: '#a1a1aa', fontSize: '0.875rem' }}>Date/Period</th>
                <th style={{ textAlign: 'right', padding: '0.75rem', color: '#a1a1aa', fontSize: '0.875rem' }}>Tokens</th>
                <th style={{ textAlign: 'right', padding: '0.75rem', color: '#a1a1aa', fontSize: '0.875rem' }}>Cost</th>
              </tr>
            </thead>
            <tbody>
              {data.series.map((row, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #27272a' }}>
                  <td style={{ padding: '0.75rem' }}>
                    {new Date(row.label).toLocaleDateString(undefined, {
                      weekday: 'short',
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </td>
                  <td style={{ padding: '0.75rem', textAlign: 'right', fontFamily: 'monospace' }}>
                    {formatTokens(row.totalTokens)}
                  </td>
                  <td style={{ padding: '0.75rem', textAlign: 'right', fontFamily: 'monospace' }}>
                    {formatCurrency(row.costUSD)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ fontWeight: 'bold' }}>
                <td style={{ padding: '0.75rem' }}>Total</td>
                <td style={{ padding: '0.75rem', textAlign: 'right', fontFamily: 'monospace' }}>
                  {formatTokens(data.series.reduce((sum, row) => sum + row.totalTokens, 0))}
                </td>
                <td style={{ padding: '0.75rem', textAlign: 'right', fontFamily: 'monospace' }}>
                  {formatCurrency(data.series.reduce((sum, row) => sum + row.costUSD, 0))}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}
