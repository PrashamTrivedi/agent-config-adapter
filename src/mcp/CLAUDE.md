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
- **6 Tools**: get_config, create_config, update_config, delete_config, convert_config, invalidate_cache
- **3 Resources**: config://list, config://{id}, config://{id}/cached/{format}
- **3 Prompts**: migrate_config_format, batch_convert, sync_config_versions
- **Auth**: `Authorization: Bearer <token>` header
- **Validation**: SHA-256 hash comparison against `MCP_ADMIN_TOKEN_HASH` secret

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
- Skills not in MCP tools yet
