# Draft: Agents Dashboard

## Requirements (confirmed)
- User wants a web dashboard for local agents (Claude Code, OpenCode).
- Stack: TypeScript + Vite.
- Frontend: React.
- Backend: SSR using Hono/Node.
- Single app with clear frontend/backend split.
- Data source: ccusage and @ccusage/opencode.
- Show all report types (daily/weekly/monthly/session/cost/etc.).
- Pages: overview + details.
- Details drilldown: all (per-agent, per-session, per-time-range).
- Visual direction: modern (planner to propose layout/visuals).
- Data refresh: manual.
- Auth: local only.
- Agent scope: separate tabs/filters for Claude Code vs OpenCode.
- Default time ranges: current for all (today/current week/current month).
- Session details: aggregate only (no message-level drilldown).
- URL structure approved: /, /agents/:agent, /sessions/:id, /reports/:period.
- Empty/error states: show setup checklist when data missing/tools not installed.
- Include a solid charting library setup for future expansion.
- Include local settings (stored locally) for future use.
- Docs available in: /Users/nico/Downloads/Workspace/garocode/agents-dash/docs/ccusage/.

## Technical Decisions
- SSR framework: Hono on Node.
- Frontend framework: React.
- Test strategy: tests after implementation (no TDD).
- Navigation: tabbed agent filter; permalinks define view state.
- UI: baseline charting library to enable future charts.
- Settings: local storage for preferences.

## Research Findings
- Docs path provided: docs/ccusage/ (ccusage and opencode docs).

## Open Questions
- None pending.

## Scope Boundaries
- INCLUDE: Dashboard for local agent usage metrics from ccusage + @ccusage/opencode.
- EXCLUDE: Any remote auth or cloud hosting.
- EXCLUDE: Reusing patterns from other projects in this workspace.
