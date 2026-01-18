import { Hono } from 'hono'
import { renderToString } from 'react-dom/server'
import { StaticRouter } from 'react-router-dom'
import { App } from './App'
import { UsageResponse, InitialState, Agent, Period, CostMode, Timezone } from './types'
import { loadUsageData } from './data/loader'

const app = new Hono()

app.get('/api/usage', async (c) => {
  const agent = c.req.query('agent') as Agent | undefined
  const period = c.req.query('period') as Period | undefined
  const mode = c.req.query('mode') as CostMode | undefined
  const timezone = c.req.query('timezone') as Timezone | undefined
  const startOfWeek = c.req.query('startOfWeek')
  const breakdown = c.req.query('breakdown') === '1'

  if (!agent || !period) {
    return c.json(
      {
        agent: agent || 'claude',
        period: period || 'daily',
        summary: null,
        series: [],
        sessions: [],
        blocks: [],
        emptyState: { isEmpty: true, missingPaths: [], checklist: [] },
        errors: ['Missing agent or period parameter']
      } as UsageResponse,
      400
    )
  }

  const response = await loadUsageData(agent, period, {
    mode,
    timezone,
    startOfWeek,
    breakdown
  })

  return c.json(response)
})

app.get('*', async (c) => {
  const url = new URL(c.req.url)
  const initialState: InitialState = {}

  const html = renderToString(
    <StaticRouter location={url.pathname}>
      <App initialState={initialState} />
    </StaticRouter>
  )

  const initialStateJson = JSON.stringify(initialState).replace(/</g, '\u003c')

  const isDev = process.env.NODE_ENV !== 'production'
  const viteClientScript = isDev ? '<script type="module" src="/@vite/client"></script>' : ''
  const reactRefreshScript = isDev
    ? `<script type="module">
      import RefreshRuntime from "/@react-refresh"
      RefreshRuntime.injectIntoGlobalHook(window)
      window.$RefreshReg$ = () => {}
      window.$RefreshSig$ = () => (type) => type
      window.__vite_plugin_react_preamble_installed__ = true
    </script>`
    : ''
  const clientEntryScript = isDev
    ? '<script type="module" src="/src/entry-client.tsx"></script>'
    : '<script type="module" src="/static/client.js"></script>'

  const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Agents Dashboard</title>
  ${viteClientScript}
  ${reactRefreshScript}
</head>
<body>
  <div id="root">${html}</div>
  <script>
    window.__INITIAL_STATE__ = ${initialStateJson}
  </script>
  ${clientEntryScript}
</body>
</html>`

  return c.html(htmlContent)
})

export default app
