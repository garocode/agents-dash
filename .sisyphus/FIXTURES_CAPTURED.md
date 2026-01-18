# Fixtures Successfully Captured ✅

**Date**: 2026-01-18  
**Status**: All 9 fixtures captured and validated

---

## Captured Fixtures

### Claude Code (5 fixtures)
- ✅ `fixtures/ccusage/daily.json` (12K)
- ✅ `fixtures/ccusage/weekly.json` (3.3K)
- ✅ `fixtures/ccusage/monthly.json` (1.4K)
- ✅ `fixtures/ccusage/session.json` (77K)
- ✅ `fixtures/ccusage/blocks.json` (1.8K)

**Commands Used**:
```bash
SINCE=20260101
UNTIL=20260118

LOG_LEVEL=0 bunx ccusage@18.0.5 daily --json --offline --since $SINCE --until $UNTIL
LOG_LEVEL=0 bunx ccusage@18.0.5 weekly --json --offline --since $SINCE --until $UNTIL --start-of-week sunday
LOG_LEVEL=0 bunx ccusage@18.0.5 monthly --json --offline --since $SINCE --until $UNTIL
LOG_LEVEL=0 bunx ccusage@18.0.5 session --json --offline --since $SINCE --until $UNTIL
LOG_LEVEL=0 bunx ccusage@18.0.5 blocks --json --offline --recent
```

### OpenCode (4 fixtures)
- ✅ `fixtures/opencode/daily.json` (3.8K)
- ✅ `fixtures/opencode/weekly.json` (1.2K)
- ✅ `fixtures/opencode/monthly.json` (832B)
- ✅ `fixtures/opencode/session.json` (74K)

**Commands Used**:
```bash
# Note: OpenCode doesn't support --since, --until, or --offline flags
LOG_LEVEL=0 bunx @ccusage/opencode@18.0.5 daily --json | tail -n +2
LOG_LEVEL=0 bunx @ccusage/opencode@18.0.5 weekly --json | tail -n +2
LOG_LEVEL=0 bunx @ccusage/opencode@18.0.5 monthly --json | tail -n +2
LOG_LEVEL=0 bunx @ccusage/opencode@18.0.5 session --json | tail -n +2
```

---

## Critical Discoveries

### OpenCode CLI Limitations

**Unsupported Flags**:
- ❌ `--since` / `--until` - No date filtering support
- ❌ `--offline` - Not available
- ❌ `--start-of-week` - Not available

**Workaround**: Fetch full dataset and filter in-memory during normalization

### bunx Output Quirk

**Issue**: bunx prints "Saved lockfile" to stdout before JSON output

**Solution**: Use `tail -n +2` to strip the first line

**Example**:
```bash
# Without tail - Invalid JSON
bunx @ccusage/opencode@18.0.5 daily --json
# Output: Saved lockfile\n{...}

# With tail - Valid JSON
bunx @ccusage/opencode@18.0.5 daily --json | tail -n +2
# Output: {...}
```

---

## Implementation Impact

### Data Loader Strategy

**Claude Code**:
- ✅ Use CLI with date flags for weekly/blocks
- ✅ Use library with in-memory filtering for daily/monthly/session

**OpenCode**:
- ⚠️ Must fetch full dataset (no date flags)
- ⚠️ Filter in-memory by date ranges in normalization layer
- ⚠️ Strip bunx output line before JSON parsing

### Normalization Layer

Must handle:
1. **Date filtering** for OpenCode (no CLI support)
2. **bunx output stripping** (first line removal)
3. **Different field names** between Claude/OpenCode
4. **Missing fields** in some responses

---

## Next Steps

With fixtures captured, the implementation can proceed:

1. ✅ **Fixtures captured** (DONE)
2. ⏳ **Create src/data/*.ts files** (5 files)
3. ⏳ **Update src/server.tsx** (use real data loader)
4. ⏳ **Verify with TypeScript** (`bunx tsc --noEmit`)
5. ⏳ **Test endpoints** (curl tests)

**Blocker**: Still in READ-ONLY mode for file creation. Need `/start-work` to create implementation files.
