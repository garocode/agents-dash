import React from 'react'
import { AppRoutes } from './routes'
import { InitialState } from './types'

interface AppProps {
  initialState?: InitialState
}

export function App({ initialState }: AppProps) {
  return (
    <div className="app">
      <AppRoutes initialState={initialState} />
    </div>
  )
}
