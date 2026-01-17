# Agents Dashboard

## Context

### Original Request
Build a web dashboard for local agents (Claude Code, OpenCode) using TypeScript + Vite + React with Hono/Node SSR. Fetch data using ccusage and @ccusage/opencode. Manual refresh. Overview + details pages. Modern UI. Local-only.

### Interview Summary
**Key Discussions**:
- Use React on the frontend with Hono SSR backend in a single app with a clear split.
- Show all report types (daily, weekly, monthly, session, blocks) with overview + details pages.
- Manual refresh only; local-only; aggregate session details (no message-level drilldown).
- Agent scope: separate tabs/filters for Claude Code vs OpenCode.
- Default time ranges: current for all views.
- URL structure: `/`, `/agents/:agent`, `/sessions/:id`, `/reports/:period`.
- Include a solid charting library setup for future expansion.
- Include local settings persisted in local storage.
- Data source decision: hybrid (library for daily/monthly/session; CLI JSON for weekly/blocks + OpenCode).

**Research Findings**:
- Hono Node.js adapter: https://hono.dev/docs/getting-started/nodejs.
- Hono Vite dev server plugin: https://raw.githubusercontent.com/honojs/vite-plugins/main/packages/dev-server/README.md.
- Hono Vite build plugin: https://raw.githubusercontent.com/honojs/vite-plugins/main/packages/build/README.md.
- ccusage library usage (daily/monthly/session loaders): `docs/ccusage/library-usage.md`.
- ccusage CLI JSON schemas: `docs/ccusage/json-output.md`, `docs/ccusage/weekly-reports.md`, `docs/ccusage/blocks-reports.md`.
- OpenCode CLI JSON output and session hierarchy: `docs/ccusage/opencode/index.md`.
- CLI flags for date filtering, timezone, and start-of-week: `docs/ccusage/cli-options.md`.
- Data directories and config/env variables: `docs/ccusage/environment-variables.md`, `docs/ccusage/configuration.md`, `docs/ccusage/directory-detection.md`.

### Metis Review
**Identified Gaps** (addressed):
- Agent scope and navigation fixed to tabbed filters + permalinks.
- Default time ranges set to current for all views.
- Session details depth set to aggregate-only.
- Empty state guidance added (setup checklist).
- SSR integration, routing, settings propagation, and CLI invocation rules defined.

---

## Work Objectives

### Core Objective
Deliver a local, SSR web dashboard that visualizes Claude Code and OpenCode usage via ccusage tooling, with manual refresh, overview + detail routes, and a modern UI.

### Concrete Deliverables
- Hono/Node SSR server with React hydration and Vite dev/build pipeline (Hono Vite plugins).
- API/data layer using ccusage library + CLI JSON outputs per the hybrid decision.
- Overview page with current-period summaries and one chart baseline.
- Details routes for agents, sessions, and report periods.
- Manual refresh control that re-fetches data.
- Local settings stored in local storage (feature-ready scaffold).
- Setup checklist empty state for missing data/tooling.

### Definition of Done
- [ ] SSR server starts and renders `/` with hydrated React UI.
- [ ] All routes resolve: `/`, `/agents/:agent`, `/sessions/:id`, `/reports/:period`.
- [ ] Manual refresh triggers data reload and UI updates.
- [ ] Overview shows summaries for current day/week/month and a cost-over-time chart.
- [ ] Details views show aggregate data per agent, per session, and per period.
- [ ] Local settings read/write from local storage without hydration mismatch.
- [ ] Missing data shows a setup checklist.

### Must Have
- Manual refresh only (no polling).
- Separate agent tabs/filters for Claude Code vs OpenCode.
- ccusage library loaders for daily/monthly/session (Claude Code).
- ccusage CLI JSON for weekly/blocks (Claude Code).
- @ccusage/opencode CLI JSON for OpenCode (daily/weekly/monthly/session).
- Local-only behavior (no auth, no remote services).

### Must NOT Have (Guardrails)
- No live monitoring or streaming data (see `docs/ccusage/blocks-reports.md`).
- No message-level session drilldown.
- No caching layer beyond in-memory state for current view.
- No external auth or cloud dependencies.
- No data export UI.

---

## SSR, Routing, and Data Loading Semantics

### Routing Decision
- Use React Router v6 (non-data router).
- Server render: `StaticRouter` with current request URL.
- Client render: `BrowserRouter`.
- Routes map 1:1 to `/`, `/agents/:agent`, `/sessions/:id`, `/reports/:period`.

### SSR Integration Decision (Concrete)
- Use Hono Vite dev server plugin in dev (`@hono/vite-dev-server` + node adapter).
- Use Hono Vite build plugin for production (`@hono/vite-build/node`).
- File layout:
  - `src/server.tsx`: Hono app + React SSR (`renderToString`) + route handlers.
  - `src/routes.tsx`: React Router routes.
  - `src/entry-client.tsx`: React hydration entry (`hydrateRoot`).
- `vite.config.ts` must explicitly set plugin entry:
  - `devServer({ entry: 'src/server.tsx', adapter: nodeAdapter })`
  - `build({ entry: './src/server.tsx' })`
- Build strategy:
  - `vite` in dev (plugin serves app).
  - `vite build --mode client` builds `dist/static/client.js`.
  - `vite build` builds server output (per `@hono/vite-build/node`).
- HTML embeds the client bundle via:
  - Dev: `<script type="module" src="/src/entry-client.tsx"></script>`
  - Prod: `<script type="module" src="/static/client.js"></script>`
- Tooling requirements:
  - `package.json` must include `"type": "module"` per Hono Vite plugins.
  - Node >= 18.14.1 (Hono Node adapter requirement).

### Initial State Hydration Contract
- SSR embeds a script tag: `window.__INITIAL_STATE__ = <json>`.
- Serialize safely: `JSON.stringify(state).replace(/</g, "\\u003c")` to avoid XSS.
- Client reads `window.__INITIAL_STATE__` in `entry-client.tsx` and hydrates without fetching.
- Manual refresh replaces state from `/api/usage`.

### SSR Data Loading Flow
- SSR calls the same internal data-loading functions used by `/api/usage` (shared module), not HTTP requests.
- Errors/empty state returned from data-loading functions are embedded into initial state and rendered in the UI.
- `/api/usage` simply serializes the same data-loading results as JSON.

### Initial State Shape (per route)
- **Overview (`/`)**:
  - `overview.daily`, `overview.weekly`, `overview.monthly`, `overview.sessions` populated from parallel data-loader calls.
- **Agent details (`/agents/:agent`)**:
  - `agentReports.daily|weekly|monthly|session|blocks` populated (5 loader calls).
- **Session details (`/sessions/:id`)**:
  - `sessionDetail` populated with one session object + optional children.
- **Report details (`/reports/:period`)**:
  - `report` populated from a single loader call for the selected period.

---

## Local Settings (v1 scope)

Persisted in local storage and applied on the client only:
- `defaultAgent`: "claude" | "opencode" (initial tab)
- `costMode`: "auto" | "calculate" | "display" (maps to `--mode`)
- `startOfWeek`: "sunday" | "monday" | ... (maps to `--start-of-week`)
- `timezone`: "local" | "UTC" (v1 only; stored as string for later expansion)
- `showBreakdown`: boolean (maps to `--breakdown`)

Settings apply after the first manual refresh in the current session. SSR uses defaults; UI should show a note “Settings apply after refresh” when settings differ from defaults.

### Settings Propagation Contract
- Client sends settings to `/api/usage` as query params:
  - `mode=auto|calculate|display`
  - `timezone=local|UTC`
  - `startOfWeek=sunday|monday|...`
  - `breakdown=1|0`
- For CLI-backed periods, these map to flags (`--mode`, `--timezone`, `--start-of-week`, `--breakdown`).
- For library-backed periods (daily/monthly/session), only `mode` is passed to loaders; `timezone/startOfWeek/breakdown` are ignored and the UI shows a note.

---

## API & Data Contracts (Implementation Requirement)

### API Response Envelope
`GET /api/usage?agent=claude|opencode&period=daily|weekly|monthly|session|blocks[&mode][&timezone][&startOfWeek][&breakdown]`

```
{
  "agent": "claude" | "opencode",
  "period": "daily" | "weekly" | "monthly" | "session" | "blocks",
  "summary": UsageSummary | null,
  "series": UsageSeriesPoint[],
  "sessions": SessionSummary[],
  "blocks": BlockSummary[],
  "emptyState": {
    "isEmpty": boolean,
    "missingPaths": string[],
    "checklist": string[]
  },
  "errors": string[]
}
```

### Error Semantics
- Missing/invalid `agent` or `period` → HTTP 400 + `errors[]`.
- Unsupported combo (OpenCode + blocks) → HTTP 200 + `errors[]` + `emptyState.isEmpty=true`.
- CLI failure / JSON parse failure → HTTP 500 + `errors[]`.
- Missing data directories → HTTP 200 + `emptyState.isEmpty=true`.

### Unsupported Combinations
- `agent=opencode&period=blocks` is unsupported. Return:
  - `blocks: []`, `summary: null`, `errors: ["Blocks reports not supported for OpenCode"]`, `emptyState.isEmpty=true`.

### Per-Period Response Fields
- `daily`: `summary` + `series` populated; `sessions`/`blocks` empty.
- `weekly`: `summary` + `series` populated; `sessions`/`blocks` empty.
- `monthly`: `summary` + `series` populated; `sessions`/`blocks` empty.
- `session`: `sessions` populated; `summary` optional; `series` empty; `blocks` empty.
- `blocks`: `blocks` populated; `summary` optional; `series` empty; `sessions` empty.

### Overview Data Fetch Strategy
- Overview performs 4 parallel API calls for the selected agent:
  - `period=daily` (today summary + daily series)
  - `period=weekly` (current week summary)
  - `period=monthly` (current month summary)
  - `period=session` (session list for table preview)
- The cost-over-time chart uses the `series` from `period=daily`.

### Shared Contracts
**UsageSummary** (overview cards):
- `period`: "daily" | "weekly" | "monthly"
- `start`: ISO date or ISO week/month label
- `totalTokens`, `totalInputTokens`, `totalOutputTokens`, `totalCostUSD`

**UsageSeriesPoint** (chart):
- `label`: string (date/week/month)
- `costUSD`: number
- `totalTokens`: number

**SessionSummary** (sessions table):
- `sessionId`, `lastActivity`, `totalTokens`, `totalCostUSD`, `modelsUsed[]`
- `agent`: "claude" | "opencode"
- `parentSessionId` (nullable) for OpenCode hierarchy

**BlockSummary** (blocks table):
- `blockId`, `startTime`, `endTime`, `isActive`, `totalTokens`, `costUSD`, `models[]`

---

## Data Sources and Normalization

### Source-of-Truth Schema Decision
For each source, use the following canonical shape:
- **Claude daily/monthly/session (library)**: use the actual TypeScript types from `ccusage/data-loader` in node_modules after install. Treat these types as the canonical shape for normalization; add a short “shape snapshot” in comments once verified.
- **Claude weekly/blocks (CLI)**: use fixture-captured JSON; treat fixture schema as canonical.
- **OpenCode daily/weekly/monthly/session (CLI)**: use fixture-captured JSON; treat fixture schema as canonical.

### Canonical JSON Schemas (by command)
Because ccusage docs show multiple JSON shapes across pages, the plan requires capturing actual CLI output and using fixtures as the source of truth.

- Capture fixtures for:
  - `ccusage daily --json`
  - `ccusage weekly --json`
  - `ccusage monthly --json`
  - `ccusage session --json`
  - `ccusage blocks --json`
  - `@ccusage/opencode daily --json`
  - `@ccusage/opencode weekly --json`
  - `@ccusage/opencode monthly --json`
  - `@ccusage/opencode session --json`

References for expected fields:
- Daily/monthly/session/blocks: `docs/ccusage/json-output.md`.
- Weekly: `docs/ccusage/weekly-reports.md`.
- Blocks alternate schema: `docs/ccusage/blocks-reports.md` (verify against fixture and reconcile).

### Normalization Rules (per period)
- **Daily**:
  - Summary: `totals.totalTokens`, `totals.inputTokens`, `totals.outputTokens`, `totals.totalCost` → `totalCostUSD`.
  - Series: `daily[].date`, `daily[].totalCost`, `daily[].totalTokens`.
  - Models: map `modelsUsed` or `models` to `modelsUsed`.
- **Weekly**:
  - Summary: `totals.totalTokens`, `totals.inputTokens`, `totals.outputTokens`, `totals.totalCost` → `totalCostUSD`.
  - Series: `weekly[].week`, `weekly[].totalCost`, `weekly[].totalTokens`.
  - Models: map `modelsUsed` or `models` to `modelsUsed`.
- **Monthly**:
  - Summary: `summary.totalTokens`, `summary.totalInputTokens`, `summary.totalOutputTokens`, `summary.totalCostUSD`.
  - Series: `data[].month`, `data[].costUSD`, `data[].totalTokens`.
  - Models: `data[].models` → `modelsUsed`.
- **Session**:
  - Sessions: `data[].session` → `sessionId`, `data[].lastActivity`, `data[].totalTokens`, `data[].costUSD` → `totalCostUSD`, `data[].models` → `modelsUsed`.
- **Blocks**:
  - Prefer fixture schema. If using `json-output.md`, map `data[].blockStart`, `data[].blockEnd`, `data[].isActive`, `data[].totalTokens`, `data[].costUSD`.
  - If using `blocks-reports.md`, map:
    - `blockId`: `blocks[].id`
    - `startTime`: `blocks[].startTime`
    - `endTime`: `blocks[].endTime`
    - `isActive`: `blocks[].isActive`
    - `models`: `blocks[].models`
    - `totalTokens`: sum of `tokenCounts.inputTokens + tokenCounts.outputTokens + tokenCounts.cacheCreationInputTokens + tokenCounts.cacheReadInputTokens`
    - `costUSD`: `blocks[].costUSD`

### Current Period Computation (library + CLI)
- Use plain JS Date in local timezone and format `YYYYMMDD` for CLI flags.
- **Today**: local date at midnight, formatted `YYYYMMDD`.
- **Current week**: compute week start based on `startOfWeek` setting (default Sunday).
- **Current month**: first day of month to today.
- For library loaders (daily/monthly/session), fetch all data and filter in-memory by date string ranges using the computed windows.

### Current Period CLI Invocation Rules
Use CLI flags from `docs/ccusage/cli-options.md`:
- **Daily (today)**: `--since YYYYMMDD --until YYYYMMDD`.
- **Weekly (current week)**: `--since <weekStartYYYYMMDD> --until <todayYYYYMMDD> --start-of-week <setting>`.
- **Monthly (current month)**: `--since <YYYYMM01> --until <todayYYYYMMDD>`.
- **Sessions (current month)**: `--since <YYYYMM01> --until <todayYYYYMMDD>`.
- **Blocks (overview)**: `--recent` (last 3 days).
- **Blocks (details)**: `--since <YYYYMM01> --until <todayYYYYMMDD>`.
- Apply `--timezone` and `--start-of-week` from local settings when present.

### Session Scoping Rules
- “Current” sessions = sessions whose `lastActivity` is within the current month window.
- For overview, show the 10 most recent (by `lastActivity`) after filtering to the current month.
- For details routes, list all sessions in the current month unless a specific session is selected.

### Offline / No-Network Enforcement
- Always pass `--offline` for CLI invocations.
- Set `CCUSAGE_OFFLINE=1` in the server process so library calls avoid network.
- If cost data is unavailable offline:
  - Set cost fields to `0` and append `errors[]` with “Pricing cache missing; costs may be zero.”
  - Include this message in the setup checklist.

### Empty State Detection (verified)
- **Claude Code**:
  - If `CLAUDE_CONFIG_DIR` is set, treat each comma-separated entry as a root that already contains `projects/` per `docs/ccusage/directory-detection.md` examples. If the path does not contain `projects/`, append it and check both.
  - If not set: check `~/.config/claude/projects/` and `~/.claude/projects/`.
  - Always verify actual resolved paths by running `ccusage daily --debug` once and noting the detected paths in logs.
- **OpenCode**:
  - If `OPENCODE_DATA_DIR` is set: check `${OPENCODE_DATA_DIR}/storage`.
  - If not set: check `~/.local/share/opencode/storage`.
- **Checklist items** (UI copy):
  - “Install ccusage (or run via bunx/npx).”
  - “Run Claude Code/OpenCode to generate local data.”
  - “Verify data directories exist (see paths).”
  - “Pricing cache missing; costs may be zero while offline.”

### CLI Invocation Strategy
- Use `bunx` for both tools:
  - `bunx ccusage@latest <command> --json --offline`
  - `bunx @ccusage/opencode@latest <command> --json --offline`
- Set `LOG_LEVEL=0` to silence logs when parsing JSON.
- Error handling:
  - Non-zero exit or JSON parse failure → `errors[]` populated and HTTP 500.
  - Missing data directories → HTTP 200 with `emptyState.isEmpty=true`.

### Fixtures Policy (deterministic)
- Store fixtures under `fixtures/ccusage/` and `fixtures/opencode/`.
- Sanitize project names and session IDs by stable hashing:
  - Hash algorithm: SHA-256, hex, first 8 chars.
  - Replace any project/session/path identifiers with `hash:<shortHash>`.
  - Store the mapping in `fixtures/.map.json` and exclude it via `.gitignore`.
- Commit sanitized fixtures only.

---

## Session Identity Rules

- **Claude Code**: use `data[].session` from `ccusage session --json` as the URL `:id`. Details page loads with `ccusage session --id <id> --json` when available, otherwise filters the session list to `session === :id`.
- **OpenCode**: use `sessionID` from `@ccusage/opencode session --json` fixtures as the URL `:id`. If a session has subagents, `/sessions/:id` shows parent + all subagent rows aggregated under the parent.

---

## Task Flow

```
Task 1 → Task 2 → Task 3 → Task 4
                     ↘ Task 5
```

## Parallelization

| Group | Tasks | Reason |
|-------|-------|--------|
| A | 3, 4 | UI and settings scaffolding can proceed after server/data setup |

| Task | Depends On | Reason |
|------|------------|--------|
| 2 | 1 | Needs SSR server + routing baseline |
| 3 | 2 | Needs data contracts to render UI |
| 4 | 2 | Needs routes + layouts |
| 5 | 3 | Tests require implemented UI/data |

---

## TODOs

- [ ] 0. Initialize project scaffold

  **What to do**:
  - Create `package.json` with scripts: `dev`, `build`, `preview`, `test`.
  - Add dependencies: `react`, `react-dom`, `react-router-dom`, `hono`, `recharts`.
  - Add dev dependencies: `vite`, `@vitejs/plugin-react`, `@hono/vite-dev-server`, `@hono/vite-build`, `typescript`, `vitest`, `@testing-library/react`.
  - Add `tsconfig.json` suitable for Vite + React.
  - Create base dirs: `src/`, `public/`.

  **Must NOT do**:
  - Do not bring in unrelated frameworks.

  **Parallelizable**: NO

  **Acceptance Criteria**:
  - [ ] `bun install` succeeds with the above dependencies.
  - [ ] `vite` runs and reads `vite.config.ts`.

  **Commit**: NO

- [ ] 1. Scaffold Hono + Vite SSR app with React hydration

  **What to do**:
  - Use `@hono/vite-dev-server` in dev and `@hono/vite-build/node` in prod.
  - Implement `src/server.tsx` with Hono routes and React SSR (`renderToString`).
  - Implement `src/entry-client.tsx` with `hydrateRoot` and React Router `BrowserRouter`.
  - Implement `src/routes.tsx` and use `StaticRouter` on the server.
  - Add `window.__INITIAL_STATE__` script injection with XSS-safe serialization.
  - Add `/api/usage` endpoint in the Hono app.
  - Add scripts:
    - `dev`: `vite`
    - `build`: `vite build --mode client && vite build`
    - `preview`: `node dist/index.js`
    - `test`: `vitest run`
  - Add `"type": "module"` to `package.json`.

  **Must NOT do**:
  - Do not reuse patterns or code from other projects in this workspace.
  - Do not add remote services or auth.

  **Parallelizable**: NO

  **References**:
  - https://raw.githubusercontent.com/honojs/vite-plugins/main/packages/dev-server/README.md
  - https://raw.githubusercontent.com/honojs/vite-plugins/main/packages/build/README.md
  - https://hono.dev/docs/getting-started/nodejs

  **Acceptance Criteria**:
  - [ ] `bun dev` starts server and renders `/` with HTML.
  - [ ] All routes respond with SSR HTML.
  - [ ] `/api/usage` responds with JSON and respects query params.

  **Manual Execution Verification**:
  - [ ] Open `http://localhost:[port]/` and see initial SSR content.
  - [ ] Hit `/api/usage?agent=claude&period=daily` and see JSON response.

  **Commit**: NO

- [ ] 2. Implement data access layer using ccusage library + CLI JSON outputs

  **What to do**:
  - Use `ccusage/data-loader` for daily/monthly/session (Claude Code).
  - Invoke `bunx ccusage@latest` with `--json` for weekly/blocks (Claude Code).
  - Invoke `bunx @ccusage/opencode@latest` with `--json` for daily/weekly/monthly/session (OpenCode).
  - Capture sample JSON outputs into fixtures for all CLI commands listed in “Canonical JSON Schemas.”
  - Normalize all responses into the shared contracts and response envelope.
  - Implement empty-state detection using the defined path rules and env vars.
  - Return “unsupported blocks for OpenCode” response for `agent=opencode&period=blocks`.
  - Before using OpenCode flags, run `bunx @ccusage/opencode@latest --help` and record supported flags; skip unsupported flags and append `errors[]` note.
  - Add a single `runCliCommand()` helper module so tests can stub CLI execution and load fixtures.

  **Must NOT do**:
  - Do not call any external network APIs.
  - Do not add persistent caching.

  **Parallelizable**: NO

  **References**:
  - `docs/ccusage/library-usage.md` - daily/monthly/session loaders.
  - `docs/ccusage/json-output.md` - JSON schemas for daily/monthly/session/blocks.
  - `docs/ccusage/weekly-reports.md` - weekly JSON schema.
  - `docs/ccusage/blocks-reports.md` - alternate blocks schema to reconcile with fixtures.
  - `docs/ccusage/opencode/index.md` - OpenCode CLI and data directory.
  - `docs/ccusage/cli-options.md` - date filters, timezone, start-of-week.
  - `docs/ccusage/environment-variables.md` - `CLAUDE_CONFIG_DIR` semantics.
  - `docs/ccusage/directory-detection.md` - default Claude data directories.

  **Acceptance Criteria**:
  - [ ] CLI JSON output parsed for weekly/blocks and all OpenCode reports.
  - [ ] Fixtures captured and used as the schema for normalization.
  - [ ] Library outputs filtered to current periods via in-memory date range filter.
  - [ ] OpenCode blocks returns explicit unsupported response.
  - [ ] Empty-state checklist triggers when directories are missing.

  **Manual Execution Verification**:
  - [ ] Trigger `/api/usage` for each report type and see normalized JSON.
  - [ ] With missing dirs, API returns empty + checklist state.

  **Commit**: NO

- [ ] 3. Build overview UI with current-period summaries and chart baseline

  **What to do**:
  - Implement overview cards for current day/week/month totals.
  - Add Recharts and render a cost-over-time chart (daily series for current month).
  - Provide a manual refresh control (button) that reloads data via `/api/usage`.
  - Add agent tabs/filters (Claude Code vs OpenCode).
  - Show “Settings apply after refresh” note when local settings differ from defaults.

  **Must NOT do**:
  - Avoid message-level session views or live monitoring.
  - Do not add multiple chart types beyond the baseline chart.

  **Parallelizable**: YES (with 4)

  **References**:
  - `docs/ccusage/json-output.md` - daily/summary fields for cards and chart series.
  - `docs/ccusage/weekly-reports.md` - weekly totals.
  - `docs/ccusage/json-output.md` - monthly summary totals.

  **Acceptance Criteria**:
  - [ ] Overview shows current totals for day/week/month.
  - [ ] Chart renders with cost over time for selected agent.
  - [ ] Refresh button re-fetches and updates values.
  - [ ] Agent tabs filter all values.

  **Manual Execution Verification**:
  - [ ] Load `/` and verify totals and chart.
  - [ ] Switch agent tabs and confirm values change.
  - [ ] Click refresh and see data updated.

  **Commit**: NO

- [ ] 4. Build details routes (agents, sessions, reports) + local settings

  **What to do**:
  - `/agents/:agent`: aggregate tables for daily/weekly/monthly/session/blocks.
  - `/sessions/:id`: aggregate session metrics (tokens, cost, models, last activity).
  - `/reports/:period`: report-specific tables.
  - Local settings: read from local storage after hydration; render server defaults to avoid mismatch.
  - Empty state checklist UI with steps for missing data/tools.

  **Must NOT do**:
  - No per-message drilldown in sessions.
  - No export/download UI.

  **Parallelizable**: YES (with 3)

  **References**:
  - `docs/ccusage/json-output.md` - session/blocks fields.
  - `docs/ccusage/opencode/index.md` - OpenCode session hierarchy display notes.
  - `docs/ccusage/configuration.md` - settings concepts to mirror in local settings.

  **Acceptance Criteria**:
  - [ ] `/agents/:agent` renders aggregate tables for all report types.
  - [ ] `/sessions/:id` shows aggregate fields only.
  - [ ] `/reports/:period` shows report-specific tables.
  - [ ] Local settings persist across reloads without SSR mismatch.
  - [ ] Empty state checklist appears when data is missing.

  **Manual Execution Verification**:
  - [ ] Navigate to each route and verify data renders.
  - [ ] Toggle a local setting and confirm persistence across reloads.
  - [ ] Simulate missing data dirs and verify checklist.

  **Commit**: NO

- [ ] 5. Add tests after implementation

  **What to do**:
  - Set up Vitest + React Testing Library.
  - Add tests for data normalization and API responses using fixtures.
  - Add UI tests for overview refresh behavior.

  **Must NOT do**:
  - Avoid trivial unit tests (e.g., testing array methods).

  **Parallelizable**: NO (depends on 3 and 4)

  **References**:
  - `docs/ccusage/json-output.md` - canonical JSON schemas for fixtures.

  **Acceptance Criteria**:
  - [ ] `bun run test` passes (script runs `vitest`).
  - [ ] Data normalization tests cover Claude Code + OpenCode.
  - [ ] API route tests validate JSON outputs.

  **Manual Execution Verification**:
  - [ ] Run `bun run test` and capture passing output.

  **Commit**: NO

---

## Commit Strategy

No commits unless explicitly requested.

---

## Success Criteria

### Verification Commands
```bash
bun dev
bun run test
```

### Final Checklist
- [ ] Overview and details routes render and hydrate.
- [ ] Manual refresh works.
- [ ] Agent tabs filter data.
- [ ] Local settings persist and apply after refresh.
- [ ] Empty state checklist appears when data missing.
- [ ] Tests pass (after implementation).
