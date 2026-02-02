# Hono MCP Migration Plan

## Original Ask

Replace `fetch-to-node` with `@hono/mcp` for native Cloudflare Workers MCP support to fix the "Promise did not resolve to 'Response'" error when using MCP Inspector.

**Tasks:**
1. Install @hono/mcp package
2. Remove fetch-to-node dependency
3. Update src/mcp/transport.ts to use StreamableHTTPTransport from @hono/mcp
4. Update the route handlers in src/index.ts and src/mcp/oauth/routes.ts to pass Hono context instead of raw Request
5. Ensure all MCP endpoints work: /mcp, /mcp/admin, /mcp/oauth
6. Run tests to verify nothing is broken

## Current State Analysis

### Current Implementation Architecture

The existing MCP transport layer (`src/mcp/transport.ts`) uses `fetch-to-node` to bridge between Web Fetch API and Node.js HTTP interfaces:

```typescript
// Current implementation (problematic)
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { toReqRes, toFetchResponse } from 'fetch-to-node';

export async function handleMCPStreamable(
  request: Request,
  server: McpServer
): Promise<Response> {
  const { req, res } = toReqRes(request);
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true
  });
  await server.connect(transport);
  const body = await request.json();
  await transport.handleRequest(req, res, body);
  return await toFetchResponse(res);  // <-- This is the problem
}
```

### Problem Root Cause

The `toFetchResponse()` function from `fetch-to-node` doesn't always return a proper Web Response object that Cloudflare Workers expects. This causes the "Promise did not resolve to 'Response'" error when:
- The response needs streaming (SSE)
- The worker runtime validation fails on the returned object
- MCP Inspector sends complex requests

### Files That Import Transport

| File | Import | Usage |
|------|--------|-------|
| `src/index.ts` | `handleMCPStreamable` | `/mcp` and `/mcp/admin` routes |
| `src/mcp/oauth/routes.ts` | `handleMCPStreamable` | `/mcp/oauth` authenticated endpoint |
| `src/mcp/index.ts` | `handleMCPStreamable` | Re-exports from transport.ts |

### Current MCP Endpoints

1. **POST /mcp** - Public read-only (line 321-330 in index.ts)
   - Uses session-based auth to determine access level
   - Passes `c.req.raw` to `handleMCPStreamable`

2. **POST /mcp/admin** - Admin-only (line 335-390 in index.ts)
   - Supports admin token, JWT, and API key auth
   - Passes `c.req.raw` to `handleMCPStreamable`

3. **POST /mcp/oauth** - OAuth authenticated (line 79-88 in oauth/routes.ts)
   - Uses `mcpOAuthMiddleware` for auth
   - Passes `c.req.raw` to `handleMCPStreamable`

### Current Dependencies

```json
{
  "dependencies": {
    "fetch-to-node": "^2.1.0",
    "@modelcontextprotocol/sdk": "^1.25.2",
    "hono": "^4.9.10"
  }
}
```

---

## Implementation Plan

### Phase 1: Install Dependencies

**Step 1.1: Add @hono/mcp package**

```bash
npm install @hono/mcp
```

**Step 1.2: Verify version compatibility**

Ensure compatibility with:
- `hono@^4.9.10`
- `@modelcontextprotocol/sdk@^1.25.2`

### Phase 2: Update Transport Layer

**Step 2.1: Replace transport.ts implementation**

**File:** `/root/Code/agent-config-adapter/src/mcp/transport.ts`

**Before:**
```typescript
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { toReqRes, toFetchResponse } from 'fetch-to-node';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

export async function handleMCPStreamable(
  request: Request,
  server: McpServer
): Promise<Response> {
  try {
    const { req, res } = toReqRes(request);
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true
    });
    await server.connect(transport);
    const body = await request.json();
    await transport.handleRequest(req, res, body);
    return await toFetchResponse(res);
  } catch (error: any) {
    // error handling...
  }
}
```

**After:**
```typescript
import { StreamableHTTPTransport } from '@hono/mcp';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Context } from 'hono';

/**
 * Handle MCP requests via Streamable HTTP transport
 * Uses @hono/mcp for native Cloudflare Workers support
 *
 * @param c - Hono context (provides access to request and environment)
 * @param server - Pre-configured MCP server instance (readonly or full access)
 */
export async function handleMCPStreamable(
  c: Context,
  server: McpServer
): Promise<Response> {
  try {
    // @hono/mcp supports same options as official SDK
    const transport = new StreamableHTTPTransport({
      sessionIdGenerator: undefined,  // Stateless mode (same as before)
      enableJsonResponse: true        // JSON responses (same as before)
    });
    await server.connect(transport);
    return transport.handleRequest(c) as Promise<Response>;
  } catch (error: any) {
    console.error('MCP transport error:', error);
    return new Response(
      JSON.stringify({
        jsonrpc: '2.0',
        id: null,
        error: {
          code: -32603,
          message: 'Internal error',
          data: error.message
        }
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}
```

**Confirmed:** `@hono/mcp` StreamableHTTPTransport supports the same options as the official MCP SDK:
- `sessionIdGenerator: undefined` for stateless mode ✅
- `enableJsonResponse: true` for JSON responses ✅
- `handleRequest(c)` returns native Web Response ✅

**Key changes:**
- Import `StreamableHTTPTransport` from `@hono/mcp` instead of SDK + fetch-to-node
- Change function signature from `(request: Request, server: McpServer)` to `(c: Context, server: McpServer)`
- Call `transport.handleRequest(c)` directly with Hono context
- Remove `toReqRes`, `toFetchResponse`, and manual body parsing

### Phase 3: Update Route Handlers

**Step 3.1: Update src/index.ts MCP routes**

**File:** `/root/Code/agent-config-adapter/src/index.ts`

**Change 1 - Public MCP endpoint (lines 321-330):**

```typescript
// Before
app.post('/mcp', async (c) => {
  const userId = c.get('userId');
  const accessLevel = userId ? 'full' : 'readonly';
  const server = createMCPServer(c.env, accessLevel, userId || undefined);
  return handleMCPStreamable(c.req.raw, server);  // <-- Change this
});

// After
app.post('/mcp', async (c) => {
  const userId = c.get('userId');
  const accessLevel = userId ? 'full' : 'readonly';
  const server = createMCPServer(c.env, accessLevel, userId || undefined);
  return handleMCPStreamable(c, server);  // <-- Pass context, not raw request
});
```

**Change 2 - Admin MCP endpoint (line 389):**

```typescript
// Before
const server = createMCPServer(c.env, 'full', userId);
return handleMCPStreamable(c.req.raw, server);

// After
const server = createMCPServer(c.env, 'full', userId);
return handleMCPStreamable(c, server);
```

**Step 3.2: Update src/mcp/oauth/routes.ts**

**File:** `/root/Code/agent-config-adapter/src/mcp/oauth/routes.ts`

```typescript
// Before (lines 79-88) - BUG: missing userId parameter!
mcpOAuthRouter.post('/', mcpOAuthMiddleware, async (c) => {
  const userId = c.get('userId');
  const mode = userId ? 'full' : 'readonly';
  const server = createMCPServer(c.env as any, mode);  // <-- Missing userId!
  return handleMCPStreamable(c.req.raw, server);
});

// After - Fixed: pass userId for sync operations + pass context
mcpOAuthRouter.post('/', mcpOAuthMiddleware, async (c) => {
  const userId = c.get('userId');
  const mode = userId ? 'full' : 'readonly';
  const server = createMCPServer(c.env as any, mode, userId || undefined);  // <-- Fixed!
  return handleMCPStreamable(c, server);
});
```

**Note:** This also fixes a pre-existing bug where sync operations (`sync_local_configs`, `delete_configs_batch`) would fail on `/mcp/oauth` endpoint because `userId` wasn't passed to `createMCPServer`.

### Phase 4: Remove Old Dependency

**Step 4.1: Remove fetch-to-node**

```bash
npm uninstall fetch-to-node
```

**Step 4.2: Update package.json**

Verify the dependency is removed and @hono/mcp is added:

```json
{
  "dependencies": {
    "@hono/mcp": "^0.x.x",
    "@modelcontextprotocol/sdk": "^1.25.2",
    "hono": "^4.9.10"
    // ... other deps, no fetch-to-node
  }
}
```

### Phase 5: Type Updates

**Step 5.1: Update index.ts imports**

Add Context type import if needed:

```typescript
import type { Context } from 'hono';
```

**Step 5.2: Verify TypeScript compilation**

```bash
npm run lint
npx tsc --noEmit
```

---

## Risk Assessment

### High Risk

| Risk | Impact | Mitigation | Status |
|------|--------|------------|--------|
| @hono/mcp API differs from expected | Build failure | Review package docs, check types before implementation | ✅ RESOLVED - API confirmed compatible |
| Context storage needed for tools | MCP tools lose access to env | Implement context-storage middleware if needed | ✅ RESOLVED - tools use c.env directly |
| Session management changes | Stateless mode breaks | Verify StreamableHTTPTransport supports sessionIdGenerator: undefined | ✅ RESOLVED - confirmed supported |

### Medium Risk

| Risk | Impact | Mitigation | Status |
|------|--------|------------|--------|
| OAuth flow breaks | Auth endpoints fail | Test OAuth flow thoroughly with MCP Inspector | To verify |
| Transport options not configurable | Cannot set enableJsonResponse | Check if @hono/mcp supports options passthrough | ✅ RESOLVED - confirmed supported |
| Version incompatibility | Runtime errors | Lock versions in package.json | To verify |

### Low Risk

| Risk | Impact | Mitigation |
|------|--------|------------|
| Test updates needed | Test failures | Update test mocks if needed |
| Documentation outdated | Developer confusion | Update CLAUDE.md in src/mcp |

---

## Test Strategy

### Unit Tests

```bash
# Run existing tests
npm test

# Specific MCP tests
npm test -- tests/mcp-config-adapter.test.ts
```

**Note:** The existing MCP config adapter tests (`tests/mcp-config-adapter.test.ts`) test the adapter logic, not the transport layer. Transport tests may need to be added.

### Integration Tests

**Manual Testing Checklist:**

1. **Test /mcp endpoint (public, read-only)**
   ```bash
   curl -X POST http://localhost:8787/mcp \
     -H "Content-Type: application/json" \
     -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
   ```

2. **Test /mcp/admin endpoint (authenticated)**
   ```bash
   curl -X POST http://localhost:8787/mcp/admin \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
     -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
   ```

3. **Test /mcp/oauth endpoint**
   - Use MCP Inspector with OAuth flow
   - Verify token exchange works
   - Test tool invocation with auth

4. **Test MCP Inspector compatibility**
   - Connect to http://localhost:8787/mcp
   - Verify no "Promise did not resolve to 'Response'" errors
   - Test all tool invocations

### E2E Test Scenarios

| Scenario | Endpoint | Expected Result |
|----------|----------|-----------------|
| List tools (anonymous) | /mcp | Returns get_config only |
| List tools (authenticated) | /mcp | Returns all 8 tools |
| Get config | /mcp | Returns config data |
| Create config (admin) | /mcp/admin | Creates new config |
| Convert config (admin) | /mcp/admin | Returns converted content |
| OAuth token exchange | /mcp/oauth/token | Returns access token |
| Authenticated tool call | /mcp/oauth | Executes with user context |

---

## Rollback Plan

If issues arise after deployment:

1. **Immediate rollback:**
   ```bash
   git revert HEAD
   npm install
   npm run deploy
   ```

2. **Dependency rollback:**
   ```bash
   npm uninstall @hono/mcp
   npm install fetch-to-node@^2.1.0
   # Restore original transport.ts from git
   git checkout HEAD~1 -- src/mcp/transport.ts src/index.ts src/mcp/oauth/routes.ts
   ```

---

## Implementation Summary

| Step | File | Change Type |
|------|------|-------------|
| 1 | package.json | Add @hono/mcp |
| 2 | src/mcp/transport.ts | Complete rewrite |
| 3 | src/index.ts | Update 2 function calls |
| 4 | src/mcp/oauth/routes.ts | Update 1 function call |
| 5 | package.json | Remove fetch-to-node |

**Total files modified:** 4
**Lines of code changed:** ~50
**Estimated implementation time:** 30-60 minutes

---

## References

- [@hono/mcp npm package](https://www.npmjs.com/package/@hono/mcp)
- [Hono MCP Helper Issue #4151](https://github.com/honojs/hono/issues/4151)
- [Accessing Hono Context in MCP Tools Discussion](https://github.com/orgs/honojs/discussions/4452)
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
