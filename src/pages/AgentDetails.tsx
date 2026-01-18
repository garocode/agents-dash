import React, { useEffect, useState, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { InitialState, Agent, UsageResponse, CostMode, Timezone } from '../types'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

interface AgentDetailsProps {
  initialState?: InitialState['agentReports']
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

export default function AgentDetails({ initialState }: AgentDetailsProps) {
  const { agent } = useParams<{ agent: string }>()
  const validAgent = (agent === 'claude' || agent === 'opencode') ? agent as Agent : 'claude'

  const [settings, setSettings] = useState<LocalSettings>(DEFAULT_SETTINGS)
  const [showSettings, setShowSettings] = useState(false)
  const [isClient, setIsClient] = useState(false)
  
  const [data, setData] = useState<{
    daily: UsageResponse | null
    weekly: UsageResponse | null
    monthly: UsageResponse | null
    session: UsageResponse | null
  }>({
    daily: initialState?.daily || null,
    weekly: initialState?.weekly || null,
    monthly: initialState?.monthly || null,
    session: initialState?.session || null
  })

  const [loading, setLoading] = useState(false)

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

  const handleSettingChange = (key: keyof LocalSettings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }))
    localStorage.setItem(key, String(value))
  }

  const fetchData = async () => {
    setLoading(true)
    try {
      const query = new URLSearchParams()
      query.set('agent', validAgent)
      if (settings.costMode) query.set('mode', settings.costMode)
      if (settings.timezone) query.set('timezone', settings.timezone)
      if (settings.startOfWeek) query.set('startOfWeek', settings.startOfWeek)
      if (settings.showBreakdown) query.set('breakdown', '1')

      const fetchPeriod = async (period: string) => {
        const q = new URLSearchParams(query)
        q.set('period', period)
        const res = await fetch(`/api/usage?${q.toString()}`)
        if (!res.ok) throw new Error(`Failed to fetch ${period}`)
        return res.json()
      }

      const [daily, weekly, monthly, session] = await Promise.all([
        fetchPeriod('daily'),
        fetchPeriod('weekly'),
        fetchPeriod('monthly'),
        fetchPeriod('session')
      ])

      setData({ daily, weekly, monthly, session })
    } catch (err) {
      console.error('Failed to fetch agent data:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!isClient) return
    fetchData()
  }, [validAgent, settings, isClient])

  const emptyState = data.daily?.emptyState

  const chartData = useMemo(() => {
    if (!data.daily?.series) return []
    return data.daily.series.map(d => ({
      ...d,
      date: new Date(d.label).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    }))
  }, [data.daily])

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val)

  const formatTokens = (val: number) => 
    new Intl.NumberFormat('en-US', { style: 'decimal', notation: 'compact' }).format(val)

  if (emptyState?.isEmpty) {
    return (
      <div className="container">
        <Link to="/" className="text-sm text-secondary mb-4 block">&larr; Back to Overview</Link>
        <div className="card" style={{ maxWidth: '600px', margin: '2rem auto', textAlign: 'center' }}>
          <h1 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Setup Required for {validAgent}</h1>
          <p className="text-secondary mb-4">We couldn't find usage data for this agent.</p>
          <div style={{ textAlign: 'left', background: 'rgba(255,255,255,0.05)', padding: '1.5rem', borderRadius: '4px' }}>
            <h3 className="text-sm font-bold mb-2 uppercase text-secondary">Checklist</h3>
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {emptyState.checklist.map((item, i) => (
                <li key={i} style={{ padding: '0.5rem 0', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                  {item}
                </li>
              ))}
            </ul>
            {emptyState.missingPaths.length > 0 && (
              <div style={{ marginTop: '1rem' }}>
                <h3 className="text-sm font-bold mb-2 uppercase text-secondary">Missing Paths</h3>
                {emptyState.missingPaths.map(p => (
                  <code key={p} style={{ display: 'block', padding: '0.25rem', fontSize: '0.8rem', color: '#ef4444' }}>{p}</code>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container">
      <div className="flex justify-between items-center" style={{ marginBottom: '2rem' }}>
        <div>
          <div className="flex items-center gap-4">
            <Link to="/" className="text-secondary text-sm">&larr; Back</Link>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, textTransform: 'capitalize' }}>
              {validAgent === 'claude' ? 'Claude Code' : 'OpenCode'}
            </h1>
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
            <div>
              <label className="block text-sm text-secondary mb-1">Breakdown</label>
              <div className="flex items-center h-full">
                <input 
                  type="checkbox" 
                  checked={settings.showBreakdown}
                  onChange={(e) => handleSettingChange('showBreakdown', e.target.checked)}
                  style={{ marginRight: '0.5rem' }}
                />
                <span className="text-sm">Show Breakdown</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', marginBottom: '2rem' }}>
        <SummaryCard 
          title="Today" 
          cost={data.daily?.summary?.totalCostUSD || 0} 
          tokens={data.daily?.summary?.totalTokens || 0} 
        />
        <SummaryCard 
          title="This Week" 
          cost={data.weekly?.summary?.totalCostUSD || 0} 
          tokens={data.weekly?.summary?.totalTokens || 0} 
        />
        <SummaryCard 
          title="This Month" 
          cost={data.monthly?.summary?.totalCostUSD || 0} 
          tokens={data.monthly?.summary?.totalTokens || 0} 
        />
      </div>

      <div className="grid" style={{ gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
        <div className="card">
          <h2 className="text-sm text-secondary" style={{ marginBottom: '1.5rem', textTransform: 'uppercase' }}>Daily Usage</h2>
          <div className="chart-container">
            {isClient ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                  <XAxis 
                    dataKey="date" 
                    stroke="#52525b" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false}
                    minTickGap={30}
                  />
                  <YAxis 
                    stroke="#52525b" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false} 
                    tickFormatter={(val) => `$${val}`} 
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', color: '#f4f4f5' }}
                    itemStyle={{ color: '#f4f4f5' }}
                    formatter={(val: number | undefined) => [`$${val?.toFixed(2) ?? '0.00'}`, 'Cost']}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="costUSD" 
                    stroke="#f59e0b" 
                    strokeWidth={2} 
                    dot={false} 
                    activeDot={{ r: 6, fill: '#f59e0b' }} 
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-secondary">Loading chart...</div>
            )}
          </div>
        </div>

        <div className="card">
          <h2 className="text-sm text-secondary" style={{ marginBottom: '1rem', textTransform: 'uppercase' }}>Recent Sessions</h2>
          {data.session?.sessions?.length === 0 ? (
            <div className="text-secondary text-sm">No recent sessions found.</div>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {data.session?.sessions?.slice(0, 10).map(session => (
                <li key={session.sessionId} style={{ 
                  padding: '0.75rem 0', 
                  borderBottom: '1px solid #27272a',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <Link to={`/sessions/${session.sessionId}`} className="font-mono text-sm block hover:text-accent-color">
                      {session.sessionId.substring(0, 8)}...
                    </Link>
                    <div className="text-secondary" style={{ fontSize: '0.75rem' }}>
                      {new Date(session.lastActivity).toLocaleDateString()}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className="font-mono text-sm">{formatCurrency(session.totalCostUSD)}</div>
                    <div className="text-secondary" style={{ fontSize: '0.75rem' }}>{formatTokens(session.totalTokens)} tks</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

function SummaryCard({ title, cost, tokens }: { title: string, cost: number, tokens: number }) {
  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val)
  
  const formatTokens = (val: number) => 
    new Intl.NumberFormat('en-US', { style: 'decimal' }).format(val)

  return (
    <div className="card">
      <div className="stat-label">{title}</div>
      <div className="stat-value">{formatCurrency(cost)}</div>
      <div className="text-secondary text-sm">{formatTokens(tokens)} tokens</div>
    </div>
  )
}
