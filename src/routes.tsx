import { Routes, Route } from 'react-router-dom'
import { InitialState } from './types'
import Overview from './pages/Overview'
import AgentDetails from './pages/AgentDetails'
import SessionDetails from './pages/SessionDetails'
import ReportDetails from './pages/ReportDetails'
import NotFound from './pages/NotFound'

interface RoutesProps {
  initialState?: InitialState
}

export function AppRoutes({ initialState }: RoutesProps) {
  return (
    <Routes>
      <Route path="/" element={<Overview initialState={initialState?.overview} />} />
      <Route path="/agents/:agent" element={<AgentDetails initialState={initialState?.agentReports} />} />
      <Route path="/sessions/:id" element={<SessionDetails initialState={initialState?.sessionDetail} />} />
      <Route path="/reports/:period" element={<ReportDetails initialState={initialState?.report} />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
