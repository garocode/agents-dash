import React from 'react'
import { hydrateRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { App } from './App'
import { InitialState } from './types'
import './index.css'

const initialState: InitialState = (window as any).__INITIAL_STATE__ || {}

const root = document.getElementById('root')
if (root) {
  hydrateRoot(
    root,
    <BrowserRouter>
      <App initialState={initialState} />
    </BrowserRouter>
  )
}

if (import.meta.hot) {
  import.meta.hot.accept()
}
