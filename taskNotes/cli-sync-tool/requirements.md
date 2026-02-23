# CLI Sync Tool (`aca`) - Requirements

## Overview

A standalone CLI tool compiled as a Bun binary that syncs local Claude Code configurations to the Agent Config Adapter server. Replaces the fragile MCP prompt-based sync workflow with a reliable, filesystem-native approach.

## Problem Statement

The current `sync_from_local` MCP prompt relies on the AI agent to navigate the filesystem and read files. This is fragile because:
- The agent is bound to its working directory context
- Scanning both `~/.claude` (global) and `./.claude` (project) requires filesystem navigation that agents handle unreliably
- Nested directories (e.g., `git/`, `legacy/` under commands) may be missed
- Reading dozens of files through an AI agent is slow and error-prone

A native CLI tool has direct filesystem access and eliminates these limitations.

## Functional Requirements

### CLI Interface

**Binary name**: `aca`

**Commands**:
- `aca sync --global` — Syncs configs from `~/.claude/` (commands, agents, skills)
- `aca sync --project` — Syncs configs from `./.claude/` in the current working directory
- `aca sync --global --project` — Syncs both global and project configs
- `aca login` — Opens browser for authentication, prompts user to paste API key
- `aca status` — Shows current auth status, server URL, last sync summary
- `aca sync --dry-run` — Preview what would be synced without making changes

**Flags**:
- `--dry-run` — Preview changes without applying
- `--types <type,...>` — Filter to specific config types (slash_command, agent_definition, skill)
- `--server <url>` — Override server URL for this invocation
- `--verbose` — Show detailed output during sync

### Sync Direction

Push only: local files are uploaded to the remote server. No pulling from server to local.

### Config Type Scanning

| Local Path | Config Type | Notes |
|---|---|---|
| `{dir}/commands/**/*.md` | `slash_command` | Recursive scan, nested dirs use colon prefix |
| `{dir}/agents/**/*.md` | `agent_definition` | Recursive scan, nested dirs use colon prefix |
| `{dir}/skills/{name}/SKILL.md` | `skill` | SKILL.md is main content, other files are companions |

### Nested Directory Handling

Files in subdirectories use a colon-separated flat name:
- `commands/git/blame.md` becomes config name `git:blame`
- `commands/legacy/codePrimer.md` becomes config name `legacy:codePrimer`
- `commands/brainstorm.md` remains config name `brainstorm` (no prefix for top-level)

### Symlink Handling

Follow symlinks and sync the resolved file content. Do not skip symlinked files or directories.

### Sync Behavior

Same as existing SyncService logic:
1. **Create**: Local file exists, no matching remote config (by name + type) -> create new
2. **Update**: Local file exists, matching remote exists, content differs -> update remote (local wins)
3. **Unchanged**: Local matches remote -> skip
4. **Deletion candidates**: Remote exists, no local match -> report to user, never auto-delete

The CLI should:
- Always run a dry-run first and display the summary
- Ask for user confirmation before executing the actual sync
- Display deletion candidates but do not delete without explicit `--delete` flag

### Skills with Companion Files

For skills in `{dir}/skills/{name}/`:
- `SKILL.md` is the main config content
- All other files in the directory are companion files
- Companion files are sent with their relative path and base64-encoded content (for binary files)
- Text files (md, txt, json, yaml, ts, js, py, sh) are sent as plain text

## Authentication

### Login Flow

1. User runs `aca login`
2. CLI opens the default browser to the server's profile/API keys page
3. User logs in via GitHub OAuth (existing Better Auth flow)
4. User generates or copies their API key from the web UI
5. User pastes the API key into the CLI prompt
6. CLI stores the key in the config file
7. CLI validates the key by calling a simple authenticated endpoint

### API Key Storage

Stored in `~/.config/aca/config.json`:
```json
{
  "server_url": "https://agent-config-adapter.example.com",
  "api_key": "aca_...",
  "last_sync": "2026-02-16T12:00:00Z"
}
```

## Server-Side Requirements

### New REST Endpoint

**`POST /api/sync`** — Batch sync endpoint

Reuses the existing `SyncService`. Requires authentication (API key via `Authorization: Bearer aca_...` header).

**Request body**:
```json
{
  "configs": [
    {
      "name": "git:blame",
      "type": "slash_command",
      "content": "file content here",
      "companionFiles": [
        {
          "path": "relative/path.md",
          "content": "text or base64 content",
          "mimeType": "text/markdown"
        }
      ]
    }
  ],
  "types": ["slash_command", "agent_definition", "skill"],
  "dry_run": false
}
```

**Response body**:
```json
{
  "success": true,
  "summary": {
    "created": 3,
    "updated": 1,
    "unchanged": 5,
    "deletionCandidates": 2
  },
  "details": {
    "created": [{ "name": "...", "type": "...", "id": "..." }],
    "updated": [{ "name": "...", "type": "...", "id": "..." }],
    "unchanged": [{ "name": "...", "type": "..." }],
    "deletionCandidates": [{ "name": "...", "type": "...", "id": "..." }]
  }
}
```

**`DELETE /api/sync/batch`** — Batch delete endpoint for confirmed deletions.

## Technical Implementation

### Build & Packaging

- Written in TypeScript
- Lives in `cli/` directory within the same repository
- Compiled to standalone binary using `bun build --compile`
- Target platforms: linux-x64, darwin-arm64, darwin-x64
- No runtime dependencies required on the target machine

### CLI Config Location

`~/.config/aca/config.json` — XDG-compliant config directory.

### Repository Structure

```
cli/
  src/
    index.ts          # Entry point, CLI argument parsing
    commands/
      sync.ts         # Sync command implementation
      login.ts        # Login command
      status.ts       # Status command
    lib/
      scanner.ts      # Filesystem scanner (commands, agents, skills)
      api-client.ts   # HTTP client for server API
      config.ts       # Config file management (~/.config/aca/)
      display.ts      # Terminal output formatting
  package.json        # CLI-specific dependencies
  tsconfig.json
  build.ts            # Bun compile script
```

### Shared Types

The CLI imports domain types from the main project (`../src/domain/types.ts`) at build time. No runtime dependency on the server code.

## Out of Scope

- Pulling configs from server to local filesystem
- Automatic sync (hooks, watch mode) — may be added later
- Config format conversion in the CLI (server handles this)
- Managing server-side extensions or marketplaces
- Interactive config editor
