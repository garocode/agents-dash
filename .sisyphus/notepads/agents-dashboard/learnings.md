# Learnings - Agents Dashboard

## Task 0: Project Scaffold (2026-01-18) ✅

### Versions Pinned
- React 19.2.3 (latest stable)
- Hono 4.11.4 (SSR framework)
- Vite 7.3.1 (build tool)
- TypeScript 5.9.3
- ccusage/opencode 18.0.5 (both packages share version)

### Critical Configuration
- `"type": "module"` in package.json is REQUIRED by Hono Vite plugins
- Node >= 18.14.1 required (we have v23.10.0 ✅)
- TypeScript moduleResolution must be "bundler" for Vite compatibility

## Task 1: Hono + Vite SSR Scaffold (2026-01-18) ✅

### Files Created
- vite.config.ts - Dual-mode config (client build + server build)
- src/server.tsx - Hono app with SSR and /api/usage endpoint
- src/entry-client.tsx - Client hydration with BrowserRouter
- src/routes.tsx - React Router route definitions
- src/App.tsx - Root component
- src/types.ts - API response type definitions
- src/pages/*.tsx - Page component stubs

### Key Patterns
- **Dual-mode Vite config**: `mode === 'client'` check for separate builds
- **Port configuration**: Changed to 3456 to avoid conflict with user's app on 5173
- **XSS-safe serialization**: `JSON.stringify(state).replace(/</g, "\\u003c")`
- **Router duality**: StaticRouter (server) vs BrowserRouter (client)
- **Initial state hydration**: `window.__INITIAL_STATE__` for SSR → client transfer

### Technical Gotchas
- Vite client build must use `emptyOutDir: false` to preserve server output
- Static asset paths: `static/client.js` (fixed name for HTML reference)
- Server starts on configured port (3456) successfully
- TypeScript compilation clean with all files

## Task 2: Data Access Layer (2026-01-18) ✅

### Implemented
- ✅ Created `src/data/periods.ts` for date range utilities
- ✅ Created `src/data/cli.ts` for CLI execution (ccusage + OpenCode)
- ✅ Created `src/data/empty-state.ts` for directory detection
- ✅ Created `src/data/normalize.ts` for normalization across periods
- ✅ Created `src/data/loader.ts` orchestrating data load + normalization
- ✅ Updated `src/server.tsx` to use real `loadUsageData`

### Data Sources
- Claude Code daily/monthly/session: ccusage library loaders
- Claude Code weekly/blocks: ccusage CLI (weekly now uses library loader for accuracy)
- OpenCode daily/weekly/monthly/session: OpenCode CLI

### Fixture Capture
- ✅ Captured all 9 fixtures (5 Claude, 4 OpenCode)
- ✅ Validated JSON outputs

### Verification
- ✅ `bunx tsc --noEmit` passes
- ✅ `/api/usage` responses return normalized JSON for all periods
- ✅ OpenCode blocks returns unsupported error and empty state
- ⚠️ Empty state checklist not verified (requires missing dirs simulation)

### OpenCode CLI Quirks
- `--since`, `--until`, `--offline`, `--start-of-week` unsupported
- bunx prints "Saved lockfile" to stdout; handled in `runOpenCodeCli`
- Filter OpenCode data in-memory by date ranges

### Claude Weekly
- Switched weekly to `loadWeeklyUsageData` for reliable data

### API Verification Notes
- Dev server requires `--host 0.0.0.0` for curl to connect in this environment
- Claude daily returns empty summary if no data for current date window
- Weekly/monthly/session/blocks all returning normalized data
- OpenCode blocks returns expected unsupported error

## Task 3: Overview UI ✅

### Implemented
- Overview cards (day/week/month totals)
- Client-only Recharts line chart
- Manual refresh button with parallel fetches
- Agent tabs syncing URL + localStorage
- Settings mismatch banner
- Recent sessions list with link to agent details

### Files Updated
- `src/pages/Overview.tsx`
- `src/index.css`
- `src/entry-client.tsx`
- `src/routes.tsx`

## Task 4: Details Routes + Settings ✅

### Implemented
- Agent details dashboard with settings and empty-state checklist
- Session details view with settings and error handling
- Report details view with agent selector, chart, and table
- Local settings persisted to localStorage with SSR guards

### Files Updated
- `src/pages/AgentDetails.tsx`
- `src/pages/SessionDetails.tsx`
- `src/pages/ReportDetails.tsx`

## Task 5: Tests ⚠️ BLOCKED (depends on Task 4)

**Blocker**: Tests not written yet

---

## Fixtures Captured (2026-01-18) ✅


**Status**: All 9 fixtures successfully captured

**Claude Code Fixtures** (5):
- daily.json (12K) - ✓ Valid JSON
- weekly.json (3.3K) - ✓ Valid JSON
- monthly.json (1.4K) - ✓ Valid JSON
- session.json (77K) - ✓ Valid JSON
- blocks.json (1.8K) - ✓ Valid JSON

**OpenCode Fixtures** (4):
- daily.json (3.8K) - ✓ Valid JSON
- weekly.json (1.2K) - ✓ Valid JSON
- monthly.json (832B) - ✓ Valid JSON
- session.json (74K) - ✓ Valid JSON

### OpenCode CLI Quirks Discovered

**Unsupported Flags**:
- ❌ `--since` / `--until` (not available)
- ❌ `--offline` (not available)
- ❌ `--start-of-week` (not available)
- ✅ `--json` (supported)

**Output Issues**:
- bunx prints "Saved lockfile" to stdout
- Solution: Use `tail -n +2` to strip first line
- LOG_LEVEL=0 does NOT suppress bunx messages

**Implication for Implementation**:
- OpenCode data must be filtered in-memory by date ranges
- Cannot rely on CLI flags for date filtering
- Normalization layer must handle full dataset and filter client-side
