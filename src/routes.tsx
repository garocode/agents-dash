import React from 'react'
import { Routes, Route } from 'react-router-dom'
import { InitialState } from './types'

interface RoutesProps {
  initialState?: InitialState
}

const Overview = React.lazy(() => import('./pages/Overview'))
const AgentDetails = React.lazy(() => import('./pages/AgentDetails'))
const SessionDetails = React.lazy(() => import('./pages/SessionDetails'))
const ReportDetails = React.lazy(() => import('./pages/ReportDetails'))
const NotFound = React.lazy(() => import('./pages/NotFound'))

export function AppRoutes({ initialState }: RoutesProps) {
  return (
    <React.Suspense fallback={<div>Loading...</div>}>
      <Routes>
        <Route path="/" element={<Overview initialState={initialState?.overview} />} />
        <Route path="/agents/:agent" element={<AgentDetails initialState={initialState?.agentReports} />} />
        <Route path="/sessions/:id" element={<SessionDetails initialState={initialState?.sessionDetail} />} />
        <Route path="/reports/:period" element={<ReportDetails initialState={initialState?.report} />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </React.Suspense>
  )
}
