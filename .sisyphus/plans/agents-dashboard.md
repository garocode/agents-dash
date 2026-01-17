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
- Vite SSR architecture and middleware mode: https://vitejs.dev/guide/ssr.
- Hono Node.js adapter: https://hono.dev/docs/getting-started/nodejs.
- Hono Vite plugins:
  - https://raw.githubusercontent.com/honojs/vite-plugins/main/packages/dev-server/README.md
  - https://raw.githubusercontent.com/honojs/vite-plugins/main/packages/build/README.md
- ccusage library usage (daily/monthly/session loaders): `docs/ccusage/library-usage.md`.
- ccusage CLI JSON schemas: `docs/ccusage/json-output.md`, `docs/ccusage/weekly-reports.md`, `docs/ccusage/blocks-reports.md`.
- OpenCode CLI JSON output and session hierarchy: `docs/ccusage/opencode/index.md`.
- CLI flags for date filtering, timezone, and start-of-week: `docs/ccusage/cli-options.md`.
- Data directories and config/env variables: `docs/ccusage/environment-variables.md`, `docs/ccusage/configuration.md`.

### Metis Review
**Identified Gaps** (addressed):
- Agent scope and navigation fixed to tabbed filters + permalinks.
- Default time ranges set to current for all views.
- Session details depth set to aggregate-only.
- Empty state guidance added (setup checklist).
- SSR integration, routing, settings semantics, and CLI invocation rules defined.

---

## Work Objectives

### Core Objective
Deliver a local, SSR web dashboard that visualizes Claude Code and OpenCode usage via ccusage tooling, with manual refresh, overview + detail routes, and a modern UI.

### Concrete Deliverables
- Hono/Node SSR server with React hydration and Vite build pipeline.
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
- Use React Router.
- Server render: `StaticRouter` with current request URL.
- Client render: `BrowserRouter`.
- Routes map 1:1 to `/`, `/agents/:agent`, `/sessions/:id`, `/reports/:period`.

### SSR Integration Decision
- Use Hono Node adapter as the HTTP server.
- Use `@hono/vite-dev-server` in dev and `@hono/vite-build` for production builds.
- Follow Vite SSR entry-client/entry-server layout and call render from Hono route handler.

### Data Loading Semantics
- SSR renders pages with real data on every request using the API/data layer.
- Client hydration uses SSR-provided initial state (no automatic fetch on load).
- Manual refresh triggers a client fetch to `/api/usage` and replaces state.

---

## Local Settings (v1 scope)

Persisted in local storage and applied on the client only:
- `defaultAgent`: "claude" | "opencode" (initial tab)
- `costMode`: "auto" | "calculate" | "display" (maps to `--mode`)
- `startOfWeek`: "sunday" | "monday" | ... (maps to `--start-of-week`)
- `timezone`: "local" | "UTC" | IANA zone (maps to `--timezone`)
- `showBreakdown`: boolean (maps to `--breakdown`)

Settings apply after the first manual refresh in the current session. SSR uses defaults; UI should show a note “Settings apply after refresh” when settings differ from defaults.

---

## API & Data Contracts (Implementation Requirement)

### API Response Envelope
`GET /api/usage?agent=claude|opencode&period=daily|weekly|monthly|session|blocks`

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

### Unsupported Combinations
- `agent=opencode&period=blocks` is unsupported. Return:
  - `blocks: []`, `summary: null`, `errors: ["Blocks reports not supported for OpenCode"]`, `emptyState.isEmpty=true`.

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

### Library vs CLI Sources
- **Library loaders** (Claude Code): daily, monthly, session (from `docs/ccusage/library-usage.md`).
- **CLI JSON** (Claude Code): weekly, blocks.
- **CLI JSON** (OpenCode): daily, weekly, monthly, session.

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

### Normalization Rules (field mapping)
Use fixtures as canonical. Map to `totalCostUSD` as follows:
- If the row has `totalCost`, map to `totalCostUSD`.
- If the row has `costUSD`, map to `totalCostUSD`.
- If summary has `totalCost` or `totalCostUSD`, normalize to `totalCostUSD`.

### Current Period CLI Invocation Rules
Use CLI flags from `docs/ccusage/cli-options.md`:
- **Daily (today)**: `--since YYYYMMDD --until YYYYMMDD`.
- **Weekly (current week)**: compute start/end from `startOfWeek`, then `--since YYYYMMDD --until YYYYMMDD`.
- **Monthly (current month)**: `--since YYYYMM01 --until YYYYMMDD` (today).
- **Sessions (current month)**: same date window as monthly.
- **Blocks**: `--recent` (last 3 days) for overview; full blocks list on details view.
- Apply `--timezone` and `--start-of-week` from local settings when present.

### Empty State Detection
- **Claude Code**:
  - If `CLAUDE_CONFIG_DIR` is set: split by comma, trim, and check each dir. If a dir does not end with `/projects`, also check `${dir}/projects`.
  - If not set: check `~/.config/claude/projects/` and `~/.claude/projects/`.
- **OpenCode**:
  - If `OPENCODE_DATA_DIR` is set: check `${OPENCODE_DATA_DIR}/storage`.
  - If not set: check `~/.local/share/opencode/storage`.
- **Checklist items** (UI copy):
  - “Install ccusage (or run via bunx/npx).”
  - “Run Claude Code/OpenCode to generate local data.”
  - “Verify data directories exist (see paths).”

### CLI Invocation Strategy
- Use `bunx` for both tools:
  - `bunx ccusage@latest <command> --json`
  - `bunx @ccusage/opencode@latest <command> --json`
- Set `LOG_LEVEL=0` to silence logs when parsing JSON.
- Error handling:
  - Non-zero exit or JSON parse failure → `errors[]` populated and HTTP 500.
  - Missing data directories → HTTP 200 with `emptyState.isEmpty=true`.

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

- [ ] 1. Scaffold Hono + Vite SSR app with React hydration

  **What to do**:
  - Follow Vite SSR guide (entry-client + entry-server) and run Vite in middleware mode.
  - Use Hono Node adapter and Hono Vite dev server/build plugins for integration.
  - Define `server.ts` to mount Vite middleware and render SSR HTML in Hono routes.
  - Implement React Router with `StaticRouter` (server) and `BrowserRouter` (client).
  - Establish routes for SSR: `/`, `/agents/:agent`, `/sessions/:id`, `/reports/:period`.
  - Add a JSON data endpoint for refresh: `GET /api/usage?agent=claude|opencode&period=daily|weekly|monthly|session|blocks`.

  **Must NOT do**:
  - Do not reuse patterns or code from other projects in this workspace.
  - Do not add remote services or auth.

  **Parallelizable**: NO

  **References**:
  - https://vitejs.dev/guide/ssr - SSR entry structure and middleware setup.
  - https://hono.dev/docs/getting-started/nodejs - Hono Node adapter.
  - https://raw.githubusercontent.com/honojs/vite-plugins/main/packages/dev-server/README.md - Hono Vite dev server integration.
  - https://raw.githubusercontent.com/honojs/vite-plugins/main/packages/build/README.md - Hono Vite build integration.

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

  **Acceptance Criteria**:
  - [ ] CLI JSON output parsed for weekly/blocks and all OpenCode reports.
  - [ ] Fixtures captured and used as the schema for normalization.
  - [ ] Library outputs filtered to current periods.
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
  - [ ] `bun test` passes.
  - [ ] Data normalization tests cover Claude Code + OpenCode.
  - [ ] API route tests validate JSON outputs.

  **Manual Execution Verification**:
  - [ ] Run `bun test` and capture passing output.

  **Commit**: NO

---

## Commit Strategy

No commits unless explicitly requested.

---

## Success Criteria

### Verification Commands
```bash
bun dev
bun test
```

### Final Checklist
- [ ] Overview and details routes render and hydrate.
- [ ] Manual refresh works.
- [ ] Agent tabs filter data.
- [ ] Local settings persist and apply after refresh.
- [ ] Empty state checklist appears when data missing.
- [ ] Tests pass (after implementation).
