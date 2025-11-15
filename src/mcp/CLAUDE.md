# Model Context Protocol (MCP) Server

AI agent integration via MCP protocol. Shares business logic with REST API via services layer.

## Capabilities

### 6 Tools (Write Operations)
- `create_config`: Create new config
- `update_config`: Update existing config
- `delete_config`: Delete config
- `get_config`: Retrieve single config
- `convert_config`: Format conversion
- `invalidate_cache`: Clear cached conversions

### 3 Resources (Pure Read Operations)
- `config://list`: List all configs
- `config://{configId}`: Get single config
- `config://{configId}/cached/{format}`: Get cached conversion (no processing)

### 3 Prompts (Workflow Automations)
- `migrate_config_format`: Migration workflow
- `batch_convert`: Bulk conversion workflow
- `sync_config_versions`: Cache sync workflow

## Transport

**Streamable HTTP**: Cloudflare Workers compatible
- Endpoint: `POST /mcp`
- JSON-RPC protocol over HTTP
- Info endpoint: `GET /mcp/info`

## Client Configuration

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

## MVP Limitations

- Extension and marketplace features not yet exposed via MCP
- Skills features not yet exposed via MCP
- Focus on core config operations first

## Implementation Notes

- Uses ConfigService and ConversionService
- Same business logic as REST API
- Returns standardized MCP responses
- Error handling via MCP error codes
