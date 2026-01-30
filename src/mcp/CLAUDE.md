# Model Context Protocol (MCP) Server

AI agent integration via MCP protocol. Shares business logic with REST API via services layer.

## Endpoints

```
POST   /mcp           Public (read-only, no auth)
POST   /mcp/admin     Admin (full access, token required)
GET    /mcp/info      Server info (shows public only)
```

## Public Endpoint (`/mcp`)

Read-only, no authentication:
- **Tool**: `get_config`
- **Resources**: `config://list`
- **Prompts**: None

## Admin Endpoint (`/mcp/admin`)

Full access, Bearer token required:
- **8 Tools**: get_config, create_config, update_config, delete_config, convert_config, invalidate_cache, sync_local_configs, delete_configs_batch
- **3 Resources**: config://list, config://{id}, config://{id}/cached/{format}
- **4 Prompts**: migrate_config_format, batch_convert, sync_config_versions, sync_from_local
- **Auth**: `Authorization: Bearer <token>` header (supports admin token, JWT, or API key)
- **Validation**: Admin token hash, JWT verification, or API key lookup

### Sync Tools

- `sync_local_configs`: Push-only sync from local configs to remote. Accepts array of configs with name, type, content, and optional companionFiles. Returns created/updated/unchanged/deletionCandidates.
- `delete_configs_batch`: Delete multiple configs by ID with explicit confirmation required.

### Sync Prompts

- `sync_from_local`: Workflow prompt for syncing local Claude Code configs. Detects ~/.claude or ./.claude directories, scans commands/agents/skills, and uses sync_local_configs tool. Skips existing configs (no overwrites), asks user about deletions.

## Security

Admin endpoint is **UNDOCUMENTED publicly**:
- NOT shown on `/mcp/info`
- NOT in README
- Only documented here for team use

## Client Configuration

Public:
```json
{
  "mcpServers": {
    "agent-config-adapter": {
      "type": "http",
      "url": "http://localhost:8787/mcp"
    }
  }
}
```

Admin:
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

## Token Setup

```bash
# Local dev
tsx scripts/hash-token.ts "test-admin-token-123"
# Add hash to .dev.vars: MCP_ADMIN_TOKEN_HASH=...

# Production
tsx scripts/hash-token.ts "$(openssl rand -hex 32)"
npx wrangler secret put MCP_ADMIN_TOKEN_HASH
```

## MVP Limitations

- Extensions/marketplaces not in MCP tools yet
- Skills sync supported via `sync_local_configs` tool (with companion files)
