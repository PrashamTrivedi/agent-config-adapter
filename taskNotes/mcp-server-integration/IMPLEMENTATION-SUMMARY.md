# MCP Server Integration - Implementation Summary

## Quick Overview

This document provides a high-level summary of the MCP server integration plan. See [taskFindings.md](./taskFindings.md) for complete details.

## What We're Building

Adding **Model Context Protocol (MCP)** server capabilities to the Agent Config Adapter, creating a dual-transport backend:

```
┌─────────────────────────────────────────────────┐
│           Agent Config Adapter                   │
├─────────────────────────────────────────────────┤
│                                                  │
│  REST API (existing)    MCP Server (new)        │
│       │                      │                   │
│       └──────────┬───────────┘                   │
│                  │                               │
│          Services Layer (new)                    │
│                  │                               │
│       ┌──────────┴──────────┐                   │
│       │                     │                    │
│  Infrastructure        Adapters                  │
│  (DB, Cache, AI)    (Format Conversion)         │
└─────────────────────────────────────────────────┘
```

## Key Capabilities

### MCP Tools (5) - Write Operations
1. `create_config` - Create new configurations
2. `update_config` - Update existing configurations
3. `delete_config` - Delete configurations
4. `invalidate_cache` - Clear cached conversions
5. `convert_config` - Convert formats (on-demand, with caching)

### MCP Resources (3) - Pure Read Operations
1. `config://list` - List all configs from database
2. `config://{configId}` - Get single config from database
3. `config://{configId}/cached/{format}` - Get cached conversion only

### MCP Prompts (3) - Workflow Automation
1. `migrate_config_format` - Migrate config between agent formats
2. `batch_convert` - Bulk convert multiple configs
3. `sync_config_versions` - Synchronize cached conversions

## Critical Design Decision: Resource vs Tool Separation

### MCP Resources (Read-Only)
- **Purpose**: Provide context to AI without triggering work
- **Behavior**: Direct database/cache reads only
- **No side effects**: Never triggers conversions or updates cache
- **Intentionally diverges from REST API**

### MCP Tools (Operations)
- **Purpose**: Perform operations that AI can trigger
- **Behavior**: Can convert, process, and cache
- **Has side effects**: Updates cache, modifies database

### Example:

```typescript
// REST API: GET /api/configs/abc123/format/gemini
// → Converts on-demand if not cached (convenience-first)

// MCP Resource: config://abc123/cached/gemini
// → Returns cached conversion ONLY, or null (pure read)

// MCP Tool: convert_config { configId: "abc123", targetFormat: "gemini" }
// → Converts on-demand, caches result (operation)
```

## Transport Protocol

- ✅ **Streamable HTTP** - Modern, recommended
- ❌ **No SSE** - Deprecated, unnecessary complexity

## Config Type Support

| Config Type | Conversion | CRUD | Batch Convert |
|-------------|-----------|------|---------------|
| `slash_command` | ✅ AI + Rules | ✅ | ✅ |
| `mcp_config` | ✅ Rules only | ✅ | ✅ |
| `agent_definition` | ❌ Passthrough | ✅ | ❌ |

## Implementation Phases

1. **Services Layer** - Refactor existing routes to extract business logic
2. **MCP Core** - Server setup, types, configuration
3. **MCP Tools** - Implement 5 write operation tools
4. **MCP Resources** - Implement 3 read-only resources
5. **MCP Prompts** - Implement 3 workflow prompts
6. **Transport** - Streamable HTTP handler
7. **Integration** - Update routes and entry point
8. **Testing** - Unit, integration, and regression tests

## Technology Stack

- **MCP SDK**: `@modelcontextprotocol/sdk` v1.19.0
- **Framework**: Hono (existing)
- **Platform**: Cloudflare Workers (existing)
- **Database**: D1 SQLite (existing)
- **Cache**: KV namespace (existing)
- **AI**: OpenAI GPT-5-mini via Cloudflare AI Gateway (existing)

## Success Criteria

1. ✅ All 5 tools, 3 resources, 3 prompts functional
2. ✅ Zero regressions in REST API
3. ✅ MCP Inspector connects successfully
4. ✅ Resources are pure reads (no processing)
5. ✅ Services layer eliminates code duplication
6. ✅ Performance within 2x of REST API

## Testing Strategy

### Unit Tests
- Services layer isolation tests
- MCP tool/resource/prompt tests
- Mock D1 and KV dependencies

### Integration Tests
- MCP Inspector validation
- End-to-end workflow tests
- Cross-transport validation (create via MCP, read via REST)

### Regression Tests
- Existing test suite must pass
- REST API unchanged
- UI functionality preserved

## API Endpoints

### New MCP Endpoints
```
POST /mcp              - MCP Streamable HTTP endpoint
GET  /mcp/info         - Server capabilities metadata
```

### Existing REST (Unchanged)
```
GET    /api/configs
GET    /api/configs/:id
GET    /api/configs/:id/format/:format
POST   /api/configs
PUT    /api/configs/:id
DELETE /api/configs/:id
POST   /api/configs/:id/invalidate
```

## Client Connection Example

```json
// Claude Desktop config.json
{
  "mcpServers": {
    "agent-config-adapter": {
      "type": "http",
      "url": "https://your-worker.workers.dev/mcp"
    }
  }
}
```

## Complexity: 4/5

**Why 4/5?**
- ✅ Clean existing architecture
- ✅ Strong SDK support
- ✅ Clear protocol specification
- ⚠️ Behavior divergence requires careful design
- ⚠️ Dual transport testing complexity
- ⚠️ Services layer refactoring scope

## Optional Future Enhancements

Not included in MVP:
- `audit_configs` prompt (conversion quality monitoring)
- `setup_new_agent` prompt (interactive setup wizard)
- SSE transport support (if needed later)
- Advanced caching strategies

## Questions?

See [taskFindings.md](./taskFindings.md) for complete implementation details, or invoke `/startWork` to begin implementation!
