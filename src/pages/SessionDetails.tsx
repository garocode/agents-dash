import React, { useEffect, useState } from 'react'
import { useParams, useSearchParams, Link } from 'react-router-dom'
import { InitialState, Agent, UsageResponse, SessionSummary, CostMode, Timezone } from '../types'

interface SessionDetailsProps {
  initialState?: InitialState['sessionDetail']
}

interface LocalSettings {
  costMode: CostMode
  timezone: Timezone
}

const DEFAULT_SETTINGS: LocalSettings = {
  costMode: 'auto',
  timezone: 'local'
}

export default function SessionDetails({ initialState }: SessionDetailsProps) {
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const agentParam = searchParams.get('agent') as Agent | null
  
  const [settings, setSettings] = useState<LocalSettings>(DEFAULT_SETTINGS)
  const [showSettings, setShowSettings] = useState(false)
  const [isClient, setIsClient] = useState(false)
  const [loading, setLoading] = useState(false)
  const [session, setSession] = useState<SessionSummary | null>(initialState || null)
  const [error, setError] = useState<string | null>(null)

  const [agent, setAgent] = useState<Agent>(() => {
    if (agentParam === 'claude' || agentParam === 'opencode') return agentParam
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('defaultAgent') as Agent
      if (stored) return stored
    }
    return 'claude'
  })

  useEffect(() => {
    setIsClient(true)
    const storedMode = localStorage.getItem('costMode') as CostMode
    const storedTz = localStorage.getItem('timezone') as Timezone
    
    setSettings({
      costMode: storedMode || 'auto',
      timezone: storedTz || 'local'
    })
  }, [])

  const handleSettingChange = (key: keyof LocalSettings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }))
    localStorage.setItem(key, String(value))
  }

  const fetchData = async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const query = new URLSearchParams()
      query.set('agent', agent)
      query.set('period', 'session')
      if (settings.costMode) query.set('mode', settings.costMode)
      if (settings.timezone) query.set('timezone', settings.timezone)

      const res = await fetch(`/api/usage?${query.toString()}`)
      if (!res.ok) throw new Error('Failed to fetch sessions')
      
      const data: UsageResponse = await res.json()
      
      if (data.emptyState.isEmpty) {
        setError(`No data found for ${agent}. Check your setup.`)
        return
      }

      const found = data.sessions.find(s => s.sessionId === id)
      if (found) {
        setSession(found)
      } else {
        setError('Session not found in recent history.')
      }

    } catch (err) {
      console.error('Failed to fetch session:', err)
      setError('Failed to load session details.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!isClient) return
    fetchData()
  }, [id, agent, settings, isClient])

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val)

  const formatTokens = (val: number) => 
    new Intl.NumberFormat('en-US', { style: 'decimal' }).format(val)

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleString()
    } catch {
      return dateStr
    }
  }

  if (error) {
    return (
      <div className="container">
        <Link to="/" className="text-sm text-secondary mb-4 block">&larr; Back to Overview</Link>
        <div className="card text-center p-8">
          <h2 className="text-xl font-bold mb-2">Error</h2>
          <p className="text-secondary">{error}</p>
          <div className="mt-4">
             <button onClick={() => setAgent(agent === 'claude' ? 'opencode' : 'claude')} className="btn btn-primary">
               Try {agent === 'claude' ? 'OpenCode' : 'Claude'}
             </button>
          </div>
        </div>
      </div>
    )
  }

  if (loading && !session) {
    return (
      <div className="container">
        <div className="flex items-center justify-center h-64">
          <div className="text-secondary">Loading session details...</div>
        </div>
      </div>
    )
  }

  if (!session) return null

  return (
    <div className="container">
      <div className="flex justify-between items-center" style={{ marginBottom: '2rem' }}>
        <div>
          <div className="flex items-center gap-4">
            <Link to={`/agents/${agent}`} className="text-secondary text-sm">&larr; Back to {agent}</Link>
            <h1 className="text-xl font-bold m-0">Session Details</h1>
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
            Refresh
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
          </div>
        </div>
      )}

      <div className="card mb-8">
        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <h2 className="text-sm font-bold uppercase text-secondary mb-4">Overview</h2>
            <div className="space-y-4">
              <div>
                <div className="text-sm text-secondary">Session ID</div>
                <div className="font-mono text-lg break-all">{session.sessionId}</div>
              </div>
              <div>
                <div className="text-sm text-secondary">Agent</div>
                <div className="capitalize">{session.agent}</div>
              </div>
              <div>
                <div className="text-sm text-secondary">Last Activity</div>
                <div>{formatDate(session.lastActivity)}</div>
              </div>
            </div>
          </div>
          <div>
            <h2 className="text-sm font-bold uppercase text-secondary mb-4">Metrics</h2>
            <div className="space-y-4">
              <div>
                <div className="text-sm text-secondary">Total Cost</div>
                <div className="text-2xl font-mono font-bold text-accent-color">{formatCurrency(session.totalCostUSD)}</div>
              </div>
              <div>
                <div className="text-sm text-secondary">Total Tokens</div>
                <div className="font-mono">{formatTokens(session.totalTokens)}</div>
              </div>
              <div>
                <div className="text-sm text-secondary">Models Used</div>
                <div className="flex flex-wrap gap-2 mt-1">
                  {session.modelsUsed.map(m => (
                    <span key={m} className="px-2 py-1 bg-zinc-800 rounded text-xs font-mono border border-zinc-700">
                      {m}
                    </span>
                  ))}
                  {session.modelsUsed.length === 0 && <span className="text-secondary italic text-sm">None recorded</span>}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
