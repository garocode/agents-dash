# Implementation Ready - Task 2 Data Access Layer

## Status: READY FOR EXECUTION

**Planning Complete**: ✅  
**Specifications Complete**: ✅  
**Blocked By**: Prometheus (Planner) READ-ONLY mode  
**Solution**: Use `/start-work` to execute the plan

---

## Quick Start

```bash
# Execute Task 2 implementation
/start-work
```

---

## What's Ready

### Files to Create (5)
1. `src/data/periods.ts` - Date computation utilities
2. `src/data/cli.ts` - CLI command execution helper
3. `src/data/empty-state.ts` - Directory detection
4. `src/data/normalize.ts` - Data normalization functions
5. `src/data/loader.ts` - Main orchestrator

### Fixtures to Capture (9)
```bash
SINCE=20260101
UNTIL=20260118

LOG_LEVEL=0 bunx ccusage@18.0.5 daily --json --offline --since $SINCE --until $UNTIL > fixtures/ccusage/daily.json
LOG_LEVEL=0 bunx ccusage@18.0.5 weekly --json --offline --since $SINCE --until $UNTIL --start-of-week sunday > fixtures/ccusage/weekly.json
LOG_LEVEL=0 bunx ccusage@18.0.5 monthly --json --offline --since $SINCE --until $UNTIL > fixtures/ccusage/monthly.json
LOG_LEVEL=0 bunx ccusage@18.0.5 session --json --offline --since $SINCE --until $UNTIL > fixtures/ccusage/session.json
LOG_LEVEL=0 bunx ccusage@18.0.5 blocks --json --offline --recent > fixtures/ccusage/blocks.json

LOG_LEVEL=0 bunx @ccusage/opencode@18.0.5 daily --json --offline --since $SINCE --until $UNTIL > fixtures/opencode/daily.json
LOG_LEVEL=0 bunx @ccusage/opencode@18.0.5 weekly --json --offline --since $SINCE --until $UNTIL > fixtures/opencode/weekly.json
LOG_LEVEL=0 bunx @ccusage/opencode@18.0.5 monthly --json --offline --since $SINCE --until $UNTIL > fixtures/opencode/monthly.json
LOG_LEVEL=0 bunx @ccusage/opencode@18.0.5 session --json --offline --since $SINCE --until $UNTIL > fixtures/opencode/session.json
```

### Server Update
Edit `src/server.tsx` to import and use `loadUsageData()` from `./data/loader`

---

## Complete Specifications

See `.sisyphus/notepads/agents-dashboard/learnings.md` for:
- Normalization rules (plan lines 269-293)
- Empty state detection (plan lines 323-335)
- CLI invocation strategy (plan lines 337-344)
- API response envelope (plan lines 159-177)

---

## Verification

```bash
# TypeScript check
bunx tsc --noEmit

# Start server
bun dev

# Test endpoints
curl "http://localhost:3456/api/usage?agent=claude&period=daily"
curl "http://localhost:3456/api/usage?agent=opencode&period=session"
curl "http://localhost:3456/api/usage?agent=opencode&period=blocks"  # Should error
```

---

## Progress

- ✅ Task 0: Project scaffold
- ✅ Task 1: Hono + Vite SSR
- ⏳ Task 2: Data access layer (READY TO IMPLEMENT)
- ⏳ Task 3: Overview UI (depends on Task 2)
- ⏳ Task 4: Details routes (depends on Task 2)
- ⏳ Task 5: Tests (depends on Tasks 2-4)

**Next Action**: Execute `/start-work` to begin implementation
