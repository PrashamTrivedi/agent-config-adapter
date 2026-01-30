# Task Walkthrough: sync_from_local MCP Prompt

## Overview

This document provides step-by-step instructions for Product Owners to verify the completed `sync_from_local` MCP prompt implementation.

---

## Prerequisites

1. Local development environment setup
2. Admin MCP token configured in `.dev.vars` as `MCP_ADMIN_TOKEN_HASH`
3. Claude Code with MCP server configured

---

## Verification Steps

### Step 1: Start the Development Server

```bash
cd /root/Code/agent-config-adapter
npm run dev
```

Expected output: Server starts on `http://localhost:8787`

---

### Step 2: Verify MCP Endpoint Availability

The new prompt is only available on the admin endpoint:

| Endpoint | Prompts Available |
|----------|------------------|
| `/mcp` (public) | None |
| `/mcp/admin` (requires token) | 4 prompts including `sync_from_local` |

---

### Step 3: Configure Claude Code MCP Client

Add to your Claude Code settings (e.g., `~/.claude/settings.json`):

```json
{
  "mcpServers": {
    "agent-config-adapter-admin": {
      "type": "http",
      "url": "http://localhost:8787/mcp/admin",
      "headers": {
        "Authorization": "Bearer YOUR_ADMIN_TOKEN"
      }
    }
  }
}
```

---

### Step 4: Invoke the Prompt

In Claude Code, invoke the `sync_from_local` prompt. The prompt will guide Claude through:

1. **Directory Detection**
   - Checks if in `~/.claude` or a project with `.claude` directory
   - Exits gracefully if no config directory found

2. **Configuration Scanning**
   - Scans `commands/*.md` for slash commands
   - Scans `agents/*.md` for agent definitions
   - Scans `skills/*/SKILL.md` for skills (with companion files)

3. **Preview and Confirm**
   - Shows what configs were found
   - Asks user to confirm before syncing

4. **Dry Run**
   - Calls `sync_local_configs` tool with `dry_run: true`
   - Shows what would be created/updated/deleted

5. **Skip Existing Configs**
   - Does NOT overwrite configs that already exist on server
   - Logs skipped configs for user visibility

6. **Handle Deletions**
   - Lists configs on server but not locally
   - Asks user explicitly about each deletion
   - Never auto-deletes

7. **Execute Sync**
   - Only creates NEW configs
   - Executes user-confirmed deletions

8. **Summary Report**
   - Shows final counts of created/skipped/deleted configs

---

### Step 5: Expected Behaviors

| Scenario | Expected Behavior |
|----------|------------------|
| No `.claude` directory | Graceful exit with message |
| Empty directories | Reports "No configs found" |
| All configs already exist | All skipped, nothing created |
| New configs found | Created after confirmation |
| Remote-only configs | User prompted about deletion |

---

### Step 6: Run Tests to Verify

```bash
# Run all tests
npm test

# Expected: 595 tests pass

# Run MCP-specific tests
npm test -- tests/mcp/server.test.ts

# Expected: 28 tests pass
```

---

## Files Changed

| File | Change |
|------|--------|
| `src/mcp/server.ts` | Added `sync_from_local` prompt (lines 665-872) |
| `src/mcp/CLAUDE.md` | Updated documentation (4 prompts, sync prompt description) |
| `tests/mcp/server.test.ts` | Updated test comment (3 → 4 prompts) |

---

## Key Implementation Details

1. **Prompt registered in 'full' mode only** - Not available on public endpoint
2. **Optional `workingDirectory` parameter** - Defaults to current directory
3. **Uses existing `sync_local_configs` tool** - No new backend infrastructure
4. **Skip-existing behavior** - Explicitly requested by user requirements
5. **User-confirmed deletions only** - Never auto-deletes

---

## Next Steps

This is a backend-only change. No frontend work required.

Ready for: **Code Review → Merge → Deploy**
