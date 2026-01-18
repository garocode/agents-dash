import React, { useEffect, useState, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { InitialState, Agent, UsageResponse } from '../types'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

interface OverviewProps {
  initialState?: InitialState['overview']
}

export default function Overview({ initialState }: OverviewProps) {
  const [searchParams, setSearchParams] = useSearchParams()
  
  const [agent, setAgent] = useState<Agent>(() => {
    const urlAgent = searchParams.get('agent') as Agent
    if (urlAgent && (urlAgent === 'claude' || urlAgent === 'opencode')) return urlAgent
    
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('defaultAgent') as Agent
      if (stored && (stored === 'claude' || stored === 'opencode')) return stored
    }
    return 'claude'
  })

  const [data, setData] = useState<{
    daily: UsageResponse | null
    weekly: UsageResponse | null
    monthly: UsageResponse | null
    sessions: UsageResponse | null
  }>({
    daily: initialState?.daily || null,
    weekly: initialState?.weekly || null,
    monthly: initialState?.monthly || null,
    sessions: initialState?.sessions || null
  })

  const [loading, setLoading] = useState(false)
  const [isClient, setIsClient] = useState(false)
  const [localSettingsMismatch, setLocalSettingsMismatch] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    const currentParams = new URLSearchParams(searchParams)
    if (currentParams.get('agent') !== agent) {
      currentParams.set('agent', agent)
      setSearchParams(currentParams)
      localStorage.setItem('defaultAgent', agent)
    }
  }, [agent, searchParams, setSearchParams])

  useEffect(() => {
    if (typeof window === 'undefined') return
    
    const hasSettings = localStorage.getItem('costMode') || localStorage.getItem('timezone')
    if (hasSettings && !loading && data.daily === initialState?.daily) {
      setLocalSettingsMismatch(true)
    }
  }, [data, initialState])

  const handleRefresh = async () => {
    setLoading(true)
    try {
      const settings = {
        mode: localStorage.getItem('costMode'),
        timezone: localStorage.getItem('timezone'),
        startOfWeek: localStorage.getItem('startOfWeek'),
        breakdown: localStorage.getItem('showBreakdown') === 'true' ? '1' : '0'
      }

      const query = new URLSearchParams()
      query.set('agent', agent)
      if (settings.mode) query.set('mode', settings.mode)
      if (settings.timezone) query.set('timezone', settings.timezone)
      if (settings.startOfWeek) query.set('startOfWeek', settings.startOfWeek)
      if (settings.breakdown === '1') query.set('breakdown', '1')

      const fetchPeriod = async (period: string) => {
        const q = new URLSearchParams(query)
        q.set('period', period)
        const res = await fetch(`/api/usage?${q.toString()}`)
        return res.json()
      }

      const [daily, weekly, monthly, sessions] = await Promise.all([
        fetchPeriod('daily'),
        fetchPeriod('weekly'),
        fetchPeriod('monthly'),
        fetchPeriod('session')
      ])

      setData({ daily, weekly, monthly, sessions })
      setLocalSettingsMismatch(false)
    } catch (err) {
      console.error('Failed to refresh data:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (data.daily && data.daily.agent !== agent) {
      handleRefresh()
    }
  }, [agent])

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

  return (
    <div className="container">
      <header className="flex justify-between items-center" style={{ marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>Agents Dashboard</h1>
          <p className="text-secondary text-sm" style={{ marginTop: '0.5rem' }}>
            Local cost & usage tracking
          </p>
        </div>
        <button className="btn" onClick={handleRefresh} disabled={loading}>
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </header>

      {localSettingsMismatch && (
        <div style={{ 
          background: 'rgba(245, 158, 11, 0.1)', 
          border: '1px solid rgba(245, 158, 11, 0.2)', 
          color: '#fbbf24', 
          padding: '0.75rem', 
          borderRadius: '4px',
          marginBottom: '1.5rem',
          fontSize: '0.875rem'
        }}>
          Note: Local settings will apply after refresh.
        </div>
      )}

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
          <h2 className="text-sm text-secondary" style={{ marginBottom: '1.5rem', textTransform: 'uppercase' }}>Daily Cost (Month)</h2>
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
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#52525b' }}>
                Loading chart...
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <h2 className="text-sm text-secondary" style={{ marginBottom: '1rem', textTransform: 'uppercase' }}>Recent Sessions</h2>
          {data.sessions?.sessions?.length === 0 ? (
            <div className="text-secondary text-sm">No recent sessions found.</div>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {data.sessions?.sessions?.slice(0, 10).map(session => (
                <li key={session.sessionId} style={{ 
                  padding: '0.75rem 0', 
                  borderBottom: '1px solid #27272a',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <div className="font-mono text-sm" style={{ color: '#f4f4f5' }}>
                      {session.sessionId.substring(0, 8)}...
                    </div>
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
          <div style={{ marginTop: '1rem', textAlign: 'center' }}>
            <a href={`/agents/${agent}`} className="text-sm">View All Sessions &rarr;</a>
          </div>
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
