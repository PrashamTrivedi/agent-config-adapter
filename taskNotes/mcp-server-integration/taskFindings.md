# MCP Server Integration

## Purpose

Add Model Context Protocol (MCP) server capabilities to Agent Config Adapter, exposing the same backend operations through both REST API and MCP protocol with HTTP Streamable transport.

## Original Ask

We need to create an MCP server from this, The MCP Server will be exposed as http streamable server, the tools use same underlying implementations as the REST API, all the data saved in database will be the resources, and think of a workflow and expose them as MCP Prompts. Consider REST API And MCP tools as two different entrypoints for same backend operations, resources can be same as GET Calls and Prompts as advanced building block laying out the workflow

## Key Architectural Decisions

### MCP vs REST Behavior Divergence

**Important**: MCP intentionally diverges from REST API behavior for resources:

| Feature | REST API | MCP Resources | MCP Tools |
|---------|----------|---------------|-----------|
| List configs | ✅ Direct DB read | ✅ Direct DB read | N/A |
| Get config | ✅ Direct DB read | ✅ Direct DB read | N/A |
| Format conversion | ✅ Convert on-demand (cache or AI) | ❌ Cache-only read (no processing) | ✅ Convert on-demand |
| Side effects | ✅ Updates cache | ❌ No side effects | ✅ Updates cache |

**Rationale**:
- MCP Resources = Pure context for AI (no processing)
- MCP Tools = Operations that AI can trigger (with processing)
- REST API = Convenience-first (converts on-demand for any GET request)

### Transport Protocol

- ✅ **Streamable HTTP only** (modern, recommended)
- ❌ **No SSE transport** (deprecated, unnecessary complexity)

### Supported Config Types

| Type | Conversion Support | MCP Tools | Batch Convert |
|------|-------------------|-----------|---------------|
| `slash_command` | ✅ AI + rule-based | ✅ Full support | ✅ Yes |
| `mcp_config` | ✅ Rule-based only | ✅ Full support | ✅ Yes |
| `agent_definition` | ❌ Passthrough only (Claude Code specific) | ✅ CRUD only, no conversion | ❌ Excluded |

## Complexity and the reason behind it

**Complexity Score: 4/5**

**Reasoning:**
- Requires integration of new MCP SDK (@modelcontextprotocol/sdk) with existing Cloudflare Workers infrastructure
- Need to design and implement dual transport layer (REST + MCP) sharing same business logic
- Complex mapping between REST CRUD operations and MCP protocol concepts (Tools, Resources, Prompts)
- MCP implementation requires understanding of JSON-RPC 2.0 and stateless transport
- Intentional behavior divergence between REST and MCP requires careful design
- Need to design meaningful workflow prompts that add value beyond simple CRUD operations
- Testing complexity: Must validate both REST API and MCP protocol endpoints
- However, the project structure is clean (layered architecture), existing adapters provide good patterns to follow, and we have strong official documentation and SDK support

## Architectural changes required

### 1. New MCP Layer Structure

```
/src
  /mcp                          # NEW: MCP server implementation
    /server.ts                  # MCP server setup and configuration
    /tools.ts                   # MCP tools (write operations)
    /resources.ts               # MCP resources (read operations)
    /prompts.ts                 # MCP workflow prompts
    /transport.ts               # HTTP Streamable transport handler
    /types.ts                   # MCP-specific type definitions
```

### 2. Shared Business Logic Pattern

Current flow:
```
HTTP Request → Routes → Infrastructure (DB/Cache) → Adapters
```

New dual-entry flow:
```
HTTP Request → Routes ────┐
                          ├→ Services Layer → Infrastructure → Adapters
MCP Request → MCP Tools ──┘
```

**Services Layer** (NEW): Extract business logic from routes into reusable services
```
/src/services
  /config-service.ts            # Config CRUD operations
  /conversion-service.ts        # Format conversion operations
  /cache-service.ts             # Already exists in infrastructure, promote
```

### 3. Entry Point Modification

Update [src/index.ts](src/index.ts) to support dual transport:
```typescript
const app = new Hono();

// REST API routes
app.route('/api/configs', configsRouter);
app.route('/configs', configsRouter);

// MCP endpoints
app.post('/mcp', mcpStreamableHandler);        // Streamable HTTP transport only
```

### 4. Dependencies

Add to [package.json](package.json):
```json
{
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.19.0",
    "zod": "^3.25.76"  // Already present
  }
}
```

## Backend changes required

### Phase 1: Create Services Layer (Refactoring)

**File: [src/services/config-service.ts](src/services/config-service.ts)** (NEW)
- Extract CRUD logic from [src/routes/configs.ts](src/routes/configs.ts)
- Create `ConfigService` class with methods:
  - `listConfigs()` - Get all configs
  - `getConfig(id)` - Get single config
  - `createConfig(input)` - Create new config
  - `updateConfig(id, input)` - Update config
  - `deleteConfig(id)` - Delete config
  - `invalidateCache(id)` - Clear cached conversions

**File: [src/services/conversion-service.ts](src/services/conversion-service.ts)** (NEW)
- Extract format conversion logic from routes
- Create `ConversionService` class with methods:
  - `convert(configId, targetFormat)` - Convert config to target format
  - `convertWithMetadata(configId, targetFormat)` - Conversion with AI metadata
  - Returns: `{ content, cached, usedAI, fallbackUsed }`

### Phase 2: Implement MCP Server Core

**File: [src/mcp/types.ts](src/mcp/types.ts)** (NEW)
```typescript
// MCP-specific type definitions
export interface MCPContext {
  DB: D1Database;
  CONFIG_CACHE: KVNamespace;
  // OpenAI API key for AI-powered format conversion (used by convert_config tool)
  // Falls back to rule-based conversion if not provided
  // See: src/infrastructure/ai-converter.ts
  OPENAI_API_KEY?: string;
  ACCOUNT_ID: string;
  GATEWAY_ID: string;
}

export interface ToolInput {
  configId?: string;
  name?: string;
  type?: string;
  format?: string;
  content?: string;
}
```

**File: [src/mcp/server.ts](src/mcp/server.ts)** (NEW)
- Initialize MCP server with metadata
- Register all tools, resources, and prompts
- Export configured server instance
```typescript
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

export function createMCPServer(env: MCPContext): McpServer {
  const server = new McpServer({
    name: 'agent-config-adapter',
    version: '1.0.0',
    description: 'Universal configuration adapter for AI coding agents'
  });

  // Register tools, resources, prompts
  registerTools(server, env);
  registerResources(server, env);
  registerPrompts(server, env);

  return server;
}
```

### Phase 3: Implement MCP Tools (Write Operations)

**File: [src/mcp/tools.ts](src/mcp/tools.ts)** (NEW)

Map REST write operations to MCP tools:

1. **Tool: `create_config`**
   - Maps to: `POST /api/configs`
   - Input schema: `{ name, type, original_format, content }`
   - Returns: Created config with ID
   - Uses: `ConfigService.createConfig()`

2. **Tool: `update_config`**
   - Maps to: `PUT /api/configs/:id`
   - Input schema: `{ configId, name?, type?, original_format?, content? }`
   - Returns: Updated config
   - Uses: `ConfigService.updateConfig()` + `ConfigService.invalidateCache()`

3. **Tool: `delete_config`**
   - Maps to: `DELETE /api/configs/:id`
   - Input schema: `{ configId }`
   - Returns: Success confirmation
   - Uses: `ConfigService.deleteConfig()`

4. **Tool: `invalidate_cache`**
   - Maps to: `POST /api/configs/:id/invalidate`
   - Input schema: `{ configId }`
   - Returns: Success confirmation
   - Uses: `ConfigService.invalidateCache()`

5. **Tool: `convert_config`** (Performs format conversion with processing)
   - Maps to: `GET /api/configs/:id/format/:format` (REST behavior)
   - Input schema: `{ configId, targetFormat }`
   - Returns: Converted content with metadata `{ content, cached, usedAI, fallbackUsed }`
   - **Behavior**: Converts on-demand (uses cache if available, otherwise converts and caches)
   - **Side effect**: Updates KV cache with conversion result
   - Uses: `ConversionService.convertWithMetadata()`

### Phase 4: Implement MCP Resources (Read Operations)

**File: [src/mcp/resources.ts](src/mcp/resources.ts)** (NEW)

**IMPORTANT**: MCP Resources are **pure read operations** with no processing or side effects. This intentionally diverges from REST API behavior where format conversion can trigger AI processing.

Map database and cache reads to MCP resources:

1. **Resource: `config://list`**
   - URI: `config://list`
   - Returns: All configs from database
   - **No processing**: Direct database read
   - Uses: `ConfigService.listConfigs()`

2. **Resource: `config://{configId}`**
   - URI template: `config://{configId}`
   - Returns: Single config from database
   - **No processing**: Direct database read
   - Uses: `ConfigService.getConfig()`

3. **Resource: `config://{configId}/cached/{format}`**
   - URI template: `config://{configId}/cached/{format}`
   - Returns: Cached conversion ONLY (null if not cached)
   - **No processing**: Only reads from KV cache, never triggers conversion
   - **Diverges from REST**: REST API converts on-demand; this resource only returns existing cache
   - Uses: `CacheService.get()`

**Note**: To trigger conversion via MCP, use the `convert_config` **tool** instead of a resource.

### Phase 5: Implement MCP Prompts (Workflows)

**File: [src/mcp/prompts.ts](src/mcp/prompts.ts)** (NEW)

Design workflow prompts that combine multiple operations:

1. **Prompt: `migrate_config_format`*
   - **Workflow**: Migrate a config from one agent format to another
   - **Args**: `{ sourceConfigId, targetFormat, newName? }`
   - **Steps**:
     1. Fetch source config
     2. Convert to target format
     3. Create new config in target format
     4. Return comparison summary
   - **Message**: Pre-filled prompt for AI to assist with migration

2. **Prompt: `batch_convert`**
   - **Workflow**: Bulk convert configs to a specific format
   - **Args**: `{ targetFormat, configTypes?: ['slash_command', 'mcp_config'] }`
   - **Supported types**:
     - `slash_command`: Fully supported (AI + rule-based conversion)
     - `mcp_config`: Fully supported (rule-based conversion)
     - ~~`agent_definition`~~: Not supported (passthrough only, Claude Code specific)
   - **Steps**:
     1. List all configs of specified types (defaults to all convertible types)
     2. Convert each to target format using `convert_config` tool
     3. Return batch conversion results with success/failure status
   - **Message**: Guide AI through batch conversion process with progress tracking

3. **Prompt: `sync_config_versions`**
   - **Workflow**: Keep multiple format versions in sync
   - **Args**: `{ configId }`
   - **Steps**:
     1. Get config details
     2. Check if conversions exist in cache
     3. Suggest invalidation if source was updated
     4. Re-generate all cached versions
   - **Message**: Sync status and guidance

#### Optional Prompts (Future Enhancement)

The following prompts were considered but marked as optional for MVP:

- **`audit_configs`**: Audit all configs for conversion quality
  - Would analyze which conversions used AI vs fallback
  - Identify configs needing review
  - Nice-to-have for monitoring conversion quality over time

- **`setup_new_agent`**: Interactive setup wizard for new agent
  - Guide through selecting and converting relevant configs
  - Convenience feature for initial agent setup
  - Can be manually achieved using batch_convert and migrate_config_format

### Phase 6: Implement Transport Layer

**File: [src/mcp/transport.ts](src/mcp/transport.ts)** (NEW)
```typescript
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createMCPServer } from './server';

export async function handleMCPStreamable(
  request: Request,
  env: MCPContext
): Promise<Response> {
  // Create stateless transport (recommended for serverless)
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,  // Stateless mode
    enableJsonResponse: true
  });

  // Create MCP server instance
  const server = createMCPServer(env);

  // Connect and handle request
  await server.connect(transport);

  // Parse request body
  const body = await request.json();

  // Create response using web-compatible API
  return transport.handleRequest(request, body);
}

// Note: SSE transport removed - using Streamable HTTP only
```

### Phase 7: Update Routes to Use Services

**File: [src/routes/configs.ts](src/routes/configs.ts)** (REFACTOR)
- Replace inline logic with service calls
- Keep route handlers thin - only handle HTTP concerns
- Example:
```typescript
// Before
configsRouter.get('/', async (c) => {
  const repo = new ConfigRepository(c.env.DB);
  const configs = await repo.findAll();
  return c.json({ configs });
});

// After
configsRouter.get('/', async (c) => {
  const service = new ConfigService(c.env);
  const configs = await service.listConfigs();
  return c.json({ configs });
});
```

### Phase 8: Update Entry Point

**File: [src/index.ts](src/index.ts)** (UPDATE)
```typescript
import { handleMCPStreamable } from './mcp/transport';

// Add MCP endpoint (Streamable HTTP only)
app.post('/mcp', async (c) => {
  return handleMCPStreamable(c.req.raw, c.env);
});

// Add MCP info endpoint
app.get('/mcp/info', (c) => {
  return c.json({
    name: 'agent-config-adapter',
    version: '1.0.0',
    transport: 'streamable-http',
    endpoint: '/mcp',
    capabilities: {
      tools: ['create_config', 'update_config', 'delete_config', 'invalidate_cache', 'convert_config'],
      resources: ['config://list', 'config://{configId}', 'config://{configId}/cached/{format}'],
      prompts: ['migrate_config_format', 'batch_convert', 'sync_config_versions']
    }
  });
});
```

## Frontend changes required

**No frontend changes required** - This is a backend-only feature. The existing UI remains unchanged and continues to work through the REST API.

**Optional Enhancement** (Future):
- Add MCP connection info to the UI home page
- Display MCP endpoint URLs for easy copying
- Add "Test MCP Connection" button

## Acceptance Criteria

1. **MCP Server Endpoints**
   - [ ] `/mcp` endpoint responds to JSON-RPC requests with Streamable HTTP
   - [ ] `/mcp/info` endpoint returns server metadata and capabilities

2. **Tools (Write Operations)**
   - [ ] `create_config` tool creates new configs
   - [ ] `update_config` tool updates existing configs
   - [ ] `delete_config` tool deletes configs
   - [ ] `invalidate_cache` tool clears cached conversions
   - [ ] `convert_config` tool performs format conversions

3. **Resources (Read Operations - Pure Reads Only)**
   - [ ] `config://list` resource returns all configs from database
   - [ ] `config://{configId}` resource returns single config from database
   - [ ] `config://{configId}/cached/{format}` resource returns cached conversion (null if not cached)
   - [ ] Resources never trigger processing or conversions

4. **Prompts (Workflows)**
   - [ ] `migrate_config_format` prompt guides config migration
   - [ ] `batch_convert` prompt handles bulk conversions (slash_command and mcp_config only)
   - [ ] `sync_config_versions` prompt manages cache synchronization

5. **Shared Logic**
   - [ ] Services layer successfully used by both REST and MCP
   - [ ] No code duplication between REST routes and MCP tools
   - [ ] Both transports use same database and cache infrastructure

6. **REST API Compatibility**
   - [ ] All existing REST endpoints continue to work
   - [ ] UI remains functional with no regressions
   - [ ] Response formats unchanged for REST API

## Validation

### Unit Tests

**File: [tests/mcp-tools.test.ts](tests/mcp-tools.test.ts)** (NEW)
- Test each MCP tool with valid inputs
- Test error handling for invalid inputs
- Test that tools call correct service methods
- Mock D1 and KV for isolated testing

**File: [tests/mcp-resources.test.ts](tests/mcp-resources.test.ts)** (NEW)
- Test resource URI template parsing
- Test resource data retrieval
- Test resource error handling

**File: [tests/mcp-prompts.test.ts](tests/mcp-prompts.test.ts)** (NEW)
- Test prompt argument validation
- Test prompt message generation
- Test workflow logic

**File: [tests/config-service.test.ts](tests/config-service.test.ts)** (NEW)
- Test all service methods
- Verify service methods work independently of transport
- Test error conditions

### Integration Tests

**MCP Inspector Testing**:
```bash
# Install MCP Inspector
npm install -g @modelcontextprotocol/inspector

# Test local MCP server
npx @modelcontextprotocol/inspector http://localhost:8787/mcp
```

**Manual Test Scenarios**:

1. **Test Tool: create_config**
   ```json
   {
     "jsonrpc": "2.0",
     "id": 1,
     "method": "tools/call",
     "params": {
       "name": "create_config",
       "arguments": {
         "name": "Test MCP Command",
         "type": "slash_command",
         "original_format": "claude_code",
         "content": "---\nname: test\ndescription: Test command\n---\n\nTest prompt"
       }
     }
   }
   ```
   - **Expected**: Config created in D1, returns config with ID

2. **Test Resource: config://list**
   ```json
   {
     "jsonrpc": "2.0",
     "id": 2,
     "method": "resources/read",
     "params": {
       "uri": "config://list"
     }
   }
   ```
   - **Expected**: Returns all configs from database

3. **Test Prompt: migrate_config_format**
   ```json
   {
     "jsonrpc": "2.0",
     "id": 3,
     "method": "prompts/get",
     "params": {
       "name": "migrate_config_format",
       "arguments": {
         "sourceConfigId": "abc123",
         "targetFormat": "gemini",
         "newName": "Migrated Command"
       }
     }
   }
   ```
   - **Expected**: Returns structured prompt for AI to execute migration

4. **Test Tool: convert_config**
   ```json
   {
     "jsonrpc": "2.0",
     "id": 4,
     "method": "tools/call",
     "params": {
       "name": "convert_config",
       "arguments": {
         "configId": "abc123",
         "targetFormat": "codex"
       }
     }
   }
   ```
   - **Expected**: Returns converted content with metadata (cached, usedAI, fallbackUsed)

### REST API Regression Tests

Run existing test suite:
```bash
npm test
```

**Verify**:
- [ ] All existing tests pass
- [ ] REST API endpoints unchanged
- [ ] UI still loads and functions
- [ ] Format conversions still work
- [ ] Cache invalidation still works

### End-to-End Workflow Tests

**Scenario 1: Create config via MCP, verify via REST API**
1. Use MCP `create_config` tool to create config
2. Call REST `GET /api/configs/:id` to verify it exists
3. Verify both return same data structure

**Scenario 2: Update config via REST, access via MCP Resource**
1. Use REST `PUT /api/configs/:id` to update config
2. Use MCP `config://{configId}` resource to read updated config
3. Verify changes are reflected

**Scenario 3: Complete migration workflow**
1. Use MCP `migrate_config_format` prompt
2. Follow prompt instructions with AI
3. Verify new config created in target format
4. Test REST API access to both configs

### Performance Validation

**Caching Behavior**:
- [ ] MCP conversion uses KV cache (same as REST)
- [ ] Cache invalidation works across both transports
- [ ] No performance degradation from dual transport

**Load Testing** (Optional):
```bash
# Test MCP endpoint with multiple concurrent requests
# Verify stateless transport handles concurrent requests correctly
```

## Deployment Notes

### Local Development
```bash
# Install new dependencies
npm install

# Run dev server (supports both REST and MCP)
npm run dev

# Test MCP endpoint
curl -X POST http://localhost:8787/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

### Production Deployment
```bash
# Deploy to Cloudflare Workers
npm run deploy

# Verify deployment
curl -X POST https://your-worker.workers.dev/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

### Documentation Updates

**File: [README.md](README.md)** (UPDATE)
- Add MCP Server section
- Document MCP endpoints and usage
- Add examples for connecting with MCP clients
- Update architecture diagram to show dual transport

**File: [CLAUDE.md](CLAUDE.md)** (UPDATE)
- Add MCP server implementation notes
- Document services layer
- Update architecture section

**File: [taskNotes/mcp-server-integration/MCP-USAGE-GUIDE.md](taskNotes/mcp-server-integration/MCP-USAGE-GUIDE.md)** (NEW)
- Complete guide for using MCP endpoints
- Client connection examples (Claude Desktop, Cline, etc.)
- Workflow examples using prompts
- Troubleshooting guide

## Implementation Order

1. ✅ Research and planning (COMPLETE)
2. Install MCP SDK and dependencies
3. Create services layer (refactor existing code)
4. Implement MCP server core and types
5. Implement MCP tools
6. Implement MCP resources
7. Implement MCP prompts
8. Implement transport layer
9. Update routes to use services
10. Update entry point with MCP endpoints
11. Write unit tests
12. Write integration tests
13. Documentation updates
14. Deployment and validation

## Risk Assessment

**Low Risks**:
- ✅ MCP SDK is officially supported by Anthropic
- ✅ Cloudflare Workers officially supports MCP servers
- ✅ Clear separation of concerns in current architecture

**Medium Risks**:
- Stateless transport design needs careful testing for concurrent requests
- JSON-RPC error handling needs to be comprehensive
- Prompts may need iteration based on real-world usage

**Mitigation Strategies**:
- Follow official Cloudflare MCP examples closely
- Comprehensive error handling in all tools/resources
- Use stateless transport mode (recommended for serverless)
- Thorough testing before production deployment

## Success Metrics

1. **Functional**: All 5 tools, 3 resources, and 3 prompts work correctly
2. **Performance**: MCP requests complete within 2x REST API response time
3. **Reliability**: Zero regressions in existing REST API functionality
4. **Usability**: MCP Inspector successfully connects and displays all capabilities
5. **Maintainability**: Services layer reduces code duplication by >50%
6. **Separation of Concerns**: MCP resources are pure reads (no processing), tools handle all operations

---

**Status**: Ready for implementation - awaiting user approval to proceed with `/startWork`
