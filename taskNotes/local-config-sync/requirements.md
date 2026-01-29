# Local Config Sync - MCP Tool Specification

## Overview

Add a `sync_local_configs` MCP tool to the existing `/mcp/admin` endpoint that enables push-only synchronization of local Claude Code configuration files (skills, commands, agents) to the Agent Config Adapter service. The tool scans specified local directories, compares against remote configs by name+type, and performs create/update operations with batch confirmation for deletions.

## Functional Requirements

### Sync Behavior

**Push-only direction**: Local files are uploaded to the remote service. No pulling from remote to local.

**File Type Mapping**:
| Local Directory | Config Type | Notes |
|-----------------|-------------|-------|
| `.claude/skills/<name>/SKILL.md` | `skill` | Multi-file with companions |
| `.claude/commands/<name>.md` | `slash_command` | Single markdown files |
| `.claude/agents/<name>.md` | `agent_definition` | Single markdown files |

**Matching Logic**: Configs are matched by `name + type`. A local skill named "commit" matches a remote skill named "commit", but not a command named "commit".

**Sync Operations**:
1. **Create**: Local file exists, no matching remote config → create new config
2. **Update**: Local file exists, matching remote config exists → update remote (local wins, no conflict prompt)
3. **Delete candidates**: Remote config exists, no matching local file → collect for batch confirmation

**Deletion Handling**: Present a batch list of remote-only configs and ask user once: "Delete all? Keep all? Or review one by one?" Never auto-delete without confirmation.

### Authentication

Use existing MCP admin token authentication (Bearer token validated against `MCP_ADMIN_TOKEN_HASH`). All synced configs are associated with the authenticated user's `user_id` for ownership tracking.

### MCP Tool Interface

**Tool Name**: `sync_local_configs`

**Input Schema**:
```json
{
  "directories": ["~/.claude", ".claude"],  // Paths to scan (required)
  "types": ["skill", "slash_command", "agent_definition"],  // Optional filter
  "dry_run": false  // Preview changes without applying
}
```

**Output**: Summary of operations performed (created, updated, skipped, deletion candidates).

### Skills with Companion Files

For skills in `.claude/skills/<name>/` directories:
- `SKILL.md` becomes the main config content
- All other files (e.g., `FORMS.md`, `helpers.py`) are uploaded as companion files to R2
- Existing companion files not present locally are removed from R2

## Technical Notes

- Extends existing `/mcp/admin` endpoint (no new routes needed)
- Reuses `ConfigService`, `SkillsService`, and `SkillFilesRepository` for storage
- File reading handled by MCP tool input (paths resolved server-side or via MCP resources)
- Batch delete confirmation uses MCP's interactive prompt capability or returns deletion candidates for external handling
