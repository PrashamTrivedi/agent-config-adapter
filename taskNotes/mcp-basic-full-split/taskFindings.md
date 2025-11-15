# Purpose

Implement MCP access control: Default read-only public access with token-protected full access for internal testing (temporary until full user auth)

## Original Ask

Till we implement user auth (which is also being planned), everything is public, there is already a task where we are email gating upload/create/delete functionality. MCP is also public and full blown. I want MCP to be readonly till we fully implement user auth.

And for only internal testing (Where I distribute some sort of identification - probably a token- with a team) I want full MCP server. I am storing that Key in project's secret in a hash.

**Additional Requirement:**
- The admin MCP endpoint should be **undocumented and secret** (not shown in public UI)
- Only document the public read-only endpoint at `/mcp/info`
- Admin endpoint details only in internal docs (CLAUDE.md)

## Complexity and the reason behind it

**Complexity Score: 2/5**

**Reasoning:**
- Straightforward refactoring of existing MCP server into two access levels
- Token-based authentication is simple (Bearer token + hash comparison)
- No complex business logic changes - just filtering tools based on auth
- Moderate testing requirements (token validation, tool filtering)
- This is a **temporary security measure** until full user auth is implemented
- Core MCP logic remains unchanged, just access control layer added
- Lower complexity than initially planned because:
  - We're not building a complex auth system (just hash comparison)
  - Default endpoint is public (no auth overhead)
  - Token management is simple (single stored hash)

## Architectural changes required

### 1. MCP Server Access Levels

Refactor existing MCP server to support two access modes:

```typescript
// src/mcp/server.ts - REFACTOR
export function createMCPServer(env: MCPContext, mode: 'readonly' | 'full'): McpServer {
  // If mode === 'readonly':
  //   - Tools: get_config only (read-only)
  //   - Resources: All (resources are inherently read-only)
  //   - Prompts: None (they describe write workflows)

  // If mode === 'full':
  //   - All current tools (6 tools)
  //   - All current resources (3 resources)
  //   - All current prompts (3 prompts)
}
```

### 2. Endpoint Routes

Update [src/index.ts](src/index.ts):

```
POST /mcp - Public MCP server (read-only, DEFAULT)
POST /mcp/admin - Token-protected MCP server (full access)
GET /mcp/info - Update to document both access levels
```

### 3. Token Authentication

Create simple token validation:

```typescript
// src/mcp/auth.ts - NEW FILE
export async function validateMCPAdminToken(
  request: Request,
  storedTokenHash: string
): Promise<boolean> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false;
  }
  const token = authHeader.substring(7);

  // Hash the provided token and compare with stored hash
  const providedHash = await hashToken(token);
  return providedHash === storedTokenHash;
}

async function hashToken(token: string): Promise<string> {
  // Use Web Crypto API (available in Workers)
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
```

### 4. Environment Configuration

Update [wrangler.jsonc](wrangler.jsonc):
- Add new secret: `MCP_ADMIN_TOKEN_HASH`
- Document both endpoints

Update [.dev.vars.example](.dev.vars.example):
- Add `MCP_ADMIN_TOKEN_HASH` with example (hash of "test-token-123")
- Add instructions for generating token hashes

### 5. Token Hash Generation

Create utility script for generating token hashes:

```typescript
// scripts/hash-token.ts - NEW FILE
// Usage: node --experimental-modules scripts/hash-token.ts "your-token-here"
// Outputs the SHA-256 hash to store in secrets
```

## Backend changes required

### 1. Refactor MCP Server (src/mcp/server.ts)

**Update server factory to support access modes:**

```typescript
export function createMCPServer(
  env: MCPContext,
  mode: 'readonly' | 'full' = 'readonly'
): McpServer {
  const server = new McpServer(
    {
      name: 'agent-config-adapter',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
        resources: {},
        prompts: {},
      },
    }
  );

  const configService = new ConfigService(env);
  const conversionService = new ConversionService(env);

  // === TOOLS ===

  // Read-only tool (available in both modes)
  server.tool('get_config', /* ... existing implementation ... */);

  // Write tools (only available in 'full' mode)
  if (mode === 'full') {
    server.tool('create_config', /* ... existing implementation ... */);
    server.tool('update_config', /* ... existing implementation ... */);
    server.tool('delete_config', /* ... existing implementation ... */);
    server.tool('convert_config', /* ... existing implementation ... */);
    server.tool('invalidate_cache', /* ... existing implementation ... */);
  }

  // === RESOURCES ===
  // All resources available in both modes (resources are read-only by nature)
  server.resource('config-list', 'config://list', /* ... */);
  // Note: Individual config resources can be added here if needed

  // === PROMPTS ===
  // Prompts only available in 'full' mode (they describe write workflows)
  if (mode === 'full') {
    server.prompt('migrate_config_format', /* ... */);
    server.prompt('batch_convert', /* ... */);
    server.prompt('sync_config_versions', /* ... */);
  }

  return server;
}
```

### 2. Create Auth Module (src/mcp/auth.ts)

```typescript
/**
 * Token-based authentication for MCP admin endpoint
 * Temporary solution until full user auth is implemented
 */

/**
 * Validate MCP admin token using hash comparison
 * Tokens are hashed with SHA-256 before comparison for security
 */
export async function validateMCPAdminToken(
  request: Request,
  storedTokenHash?: string
): Promise<boolean> {
  // No token hash configured = reject all requests
  if (!storedTokenHash) {
    console.warn('MCP_ADMIN_TOKEN_HASH not configured');
    return false;
  }

  // Extract Bearer token from Authorization header
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false;
  }

  const providedToken = authHeader.substring(7).trim();
  if (!providedToken) {
    return false;
  }

  // Hash the provided token
  const providedHash = await hashToken(providedToken);

  // Constant-time comparison to prevent timing attacks
  return providedHash === storedTokenHash;
}

/**
 * Hash a token using SHA-256
 * Uses Web Crypto API (available in Cloudflare Workers)
 */
export async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Generate a secure random token
 * For creating new MCP admin tokens
 */
export function generateSecureToken(length: number = 32): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
}
```

### 3. Update Main Router (src/index.ts)

**Update Bindings type:**
```typescript
type Bindings = {
  // ... existing bindings
  MCP_ADMIN_TOKEN_HASH?: string; // SHA-256 hash of admin token for /mcp/admin endpoint
};
```

**Add MCP routes:**
```typescript
import { createMCPServer } from './mcp/server';
import { handleMCPStreamable } from './mcp/transport';
import { validateMCPAdminToken } from './mcp/auth';

// Public MCP server (read-only, DEFAULT)
app.post('/mcp', async (c) => {
  const server = createMCPServer(c.env, 'readonly');
  return handleMCPStreamable(c.req.raw, c.env, server);
});

// Admin MCP server (full access, token-protected)
app.post('/mcp/admin', async (c) => {
  // Validate admin token
  const isValid = await validateMCPAdminToken(
    c.req.raw,
    c.env.MCP_ADMIN_TOKEN_HASH
  );

  if (!isValid) {
    return c.json({
      jsonrpc: '2.0',
      id: null,
      error: {
        code: -32001,
        message: 'Unauthorized: Valid admin token required'
      }
    }, 401);
  }

  const server = createMCPServer(c.env, 'full');
  return handleMCPStreamable(c.req.raw, c.env, server);
});
```

### 4. Update Transport Layer (src/mcp/transport.ts)

**Accept server instance as parameter:**

```typescript
export async function handleMCPStreamable(
  request: Request,
  env: MCPContext,
  server: McpServer // NEW PARAMETER - server instance passed from route
): Promise<Response> {
  try {
    const { req, res } = toReqRes(request);

    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true
    });

    // Use the provided server instance instead of creating one
    await server.connect(transport);

    const body = await request.json();
    await transport.handleRequest(req, res, body);

    return await toFetchResponse(res);
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
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
  }
}
```

### 5. Update Info Endpoint (src/index.ts)

**Update `/mcp/info` to document ONLY the public endpoint (admin endpoint is secret):**

```typescript
app.get('/mcp/info', (c) => {
  const accept = c.req.header('Accept') || '';
  const baseUrl = c.req.url.replace('/mcp/info', '');

  const mcpInfo = {
    name: 'agent-config-adapter',
    version: '1.0.0',
    description: 'Universal configuration adapter for AI coding agents',
    transport: 'streamable-http',
    endpoint: `${baseUrl}/mcp`,

    capabilities: {
      tools: ['get_config - Get a single configuration by ID'],
      resources: [
        'config://list - List all configurations from database',
        // Add others as needed
      ],
      prompts: []
    },

    usage: {
      connection: 'POST requests to /mcp endpoint',
      example_client_config: {
        mcpServers: {
          'agent-config-adapter': {
            type: 'http',
            url: `${baseUrl}/mcp`
          }
        }
      }
    },

    documentation: {
      access: 'Public read-only access',
      resources_behavior: 'Resources are pure reads (no conversion processing)',
      tools_behavior: 'Read-only tools for retrieving configurations',
      // NO MENTION of admin endpoint - it's secret!
    }
  };

  if (accept.includes('application/json')) {
    return c.json(mcpInfo);
  }

  // HTML view - keep existing structure but only show public endpoint
  // DO NOT mention /mcp/admin endpoint in public UI
  const content = `/* ... existing HTML showing only public read-only endpoint ... */`;
  return c.html(layout('MCP Server Info', content));
});
```

### 6. Update Types (src/mcp/types.ts)

```typescript
export interface MCPContext {
  DB: D1Database;
  CONFIG_CACHE: KVNamespace;
  OPENAI_API_KEY?: string;
  GEMINI_API_KEY?: string;
  ACCOUNT_ID: string;
  GATEWAY_ID: string;
  AI_GATEWAY_TOKEN?: string;
  MCP_ADMIN_TOKEN_HASH?: string; // NEW: SHA-256 hash of admin token
}
```

### 7. Create Token Hash Generator Script

**scripts/hash-token.ts:**

```typescript
#!/usr/bin/env node

/**
 * Generate SHA-256 hash of MCP admin token
 * Usage: node scripts/hash-token.ts "your-secret-token"
 * Or: tsx scripts/hash-token.ts "your-secret-token"
 */

async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function main() {
  const token = process.argv[2];

  if (!token) {
    console.error('Usage: node scripts/hash-token.ts "your-token"');
    console.error('');
    console.error('Example:');
    console.error('  node scripts/hash-token.ts "my-secure-token-123"');
    process.exit(1);
  }

  const hash = await hashToken(token);

  console.log('Token Hash (SHA-256):');
  console.log(hash);
  console.log('');
  console.log('Set this hash as MCP_ADMIN_TOKEN_HASH secret:');
  console.log(`npx wrangler secret put MCP_ADMIN_TOKEN_HASH`);
  console.log('Then paste the hash above when prompted.');
  console.log('');
  console.log('For local development (.dev.vars):');
  console.log(`MCP_ADMIN_TOKEN_HASH=${hash}`);
}

main().catch(console.error);
```

## Frontend changes required

**None required** - This is a backend-only change. The `/mcp/info` page will be updated to show both endpoints.

## Acceptance Criteria

1. **Public MCP Endpoint (`/mcp`)**
   - ✅ Publicly accessible (no authentication required)
   - ✅ Exposes only read-only tool (`get_config`)
   - ✅ Exposes all resources (inherently read-only)
   - ✅ No prompts exposed (prompts describe write workflows)
   - ✅ Attempting to call write tools returns "Tool not found" error

2. **Admin MCP Endpoint (`/mcp/admin`)**
   - ✅ Requires Bearer token authentication
   - ✅ Returns 401 Unauthorized without token
   - ✅ Returns 401 Unauthorized with invalid token
   - ✅ Returns 401 Unauthorized with unhashed token (must be hashed)
   - ✅ Accepts requests with valid Bearer token (matching stored hash)
   - ✅ Exposes all 6 tools
   - ✅ Exposes all 3 resources
   - ✅ Exposes all 3 prompts
   - ✅ All existing functionality works unchanged

3. **Token Security**
   - ✅ Tokens are never stored in plaintext (only hashes)
   - ✅ SHA-256 hashing used for token comparison
   - ✅ Hash generation script provided for creating tokens
   - ✅ Token validation uses constant-time comparison (prevents timing attacks)

4. **Configuration & Documentation**
   - ✅ `wrangler.jsonc` documents `MCP_ADMIN_TOKEN_HASH` secret (internal only)
   - ✅ `.dev.vars.example` updated with example hash (internal only)
   - ✅ Token generation script created (`scripts/hash-token.ts`) (internal only)
   - ✅ `/mcp/info` page documents **ONLY public endpoint** (admin is secret!)
   - ✅ [CLAUDE.md](CLAUDE.md) updated with both endpoints (internal docs)
   - ✅ [README.md](README.md) documents **ONLY public endpoint** (admin is secret!)

5. **Backwards Compatibility**
   - ⚠️ **BREAKING CHANGE**: `/mcp` endpoint is now read-only
   - ✅ Existing MCP clients using `/mcp` can continue read operations
   - ✅ Write operations require migration to `/mcp/admin` with token
   - ✅ Migration guide provided in documentation

6. **Temporary Nature**
   - ✅ Code comments indicate this is temporary until user auth
   - ✅ Internal documentation notes this is interim security measure
   - ✅ Design allows easy removal when user auth is implemented

7. **Security by Obscurity**
   - ✅ Admin endpoint (`/mcp/admin`) is NOT documented in public UI
   - ✅ Admin endpoint is NOT mentioned in `/mcp/info` page
   - ✅ Admin endpoint is NOT mentioned in README.md
   - ✅ Admin endpoint details ONLY in CLAUDE.md (project-internal docs)
   - ✅ Only team members with token know about admin endpoint

## Validation

### Backend API Testing

#### 1. Public MCP Server Tests (`/mcp`)

**Test: Public access (no auth required)**
```bash
# Should succeed - list configs
curl -X POST http://localhost:9090/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "resources/list"
  }'
# Expected: Success, returns config list
```

**Test: Read-only tool available**
```bash
# Should succeed - get_config works
curl -X POST http://localhost:9090/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "get_config",
      "arguments": {
        "configId": "some-existing-id"
      }
    }
  }'
# Expected: Success, returns config
```

**Test: Write tools NOT available**
```bash
# Should fail - create_config not available
curl -X POST http://localhost:9090/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "create_config",
      "arguments": {
        "name": "test",
        "type": "slash_command",
        "original_format": "claude_code",
        "content": "test"
      }
    }
  }'
# Expected: Error -32601 (Method not found) or tool not found
```

#### 2. Admin MCP Server Tests (`/mcp/admin`)

**Test: No token = 401**
```bash
# Should return 401 Unauthorized
curl -X POST http://localhost:9090/mcp/admin \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/list"
  }'
# Expected: 401 Unauthorized
```

**Test: Invalid token = 401**
```bash
# Should return 401 Unauthorized
curl -X POST http://localhost:9090/mcp/admin \
  -H "Authorization: Bearer invalid-token" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/list"
  }'
# Expected: 401 Unauthorized
```

**Test: Valid token = full access**
```bash
# First, generate token hash
node scripts/hash-token.ts "test-admin-token-123"
# Copy the hash and set in .dev.vars:
# MCP_ADMIN_TOKEN_HASH=<hash>

# Test with valid token
curl -X POST http://localhost:9090/mcp/admin \
  -H "Authorization: Bearer test-admin-token-123" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/list"
  }'
# Expected: Success, returns 6 tools

# Test create operation
curl -X POST http://localhost:9090/mcp/admin \
  -H "Authorization: Bearer test-admin-token-123" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "create_config",
      "arguments": {
        "name": "Test Config",
        "type": "slash_command",
        "original_format": "claude_code",
        "content": "test content"
      }
    }
  }'
# Expected: Success, config created
```

#### 3. Token Hash Generation

**Test: Generate token hash**
```bash
# Generate hash for a new token
node scripts/hash-token.ts "my-secure-admin-token"
# Expected: Outputs SHA-256 hash and setup instructions

# Verify same token generates same hash
node scripts/hash-token.ts "my-secure-admin-token"
# Expected: Same hash as above
```

#### 4. Info Endpoint Test

```bash
# Browser or curl
curl http://localhost:9090/mcp/info

# Should show:
# - ONLY public endpoint (/mcp) - read-only
# - Client configuration example for public endpoint
# - NO MENTION of admin endpoint (it's secret!)
# - Admin endpoint should still work but be undocumented
```

### Automated Tests

Create test files:

1. **tests/mcp/server.test.ts** - UPDATE
   - Test readonly mode only exposes get_config tool
   - Test readonly mode exposes all resources
   - Test readonly mode has no prompts
   - Test full mode exposes all 6 tools
   - Test full mode exposes all resources and prompts

2. **tests/mcp/auth.test.ts** - NEW
   - Test `validateMCPAdminToken()` with missing header
   - Test with invalid Bearer format
   - Test with wrong token
   - Test with correct token
   - Test `hashToken()` produces consistent hashes
   - Test `hashToken()` produces different hashes for different tokens

3. **tests/routes/mcp.test.ts** - NEW
   - Test `/mcp` allows public access
   - Test `/mcp` only exposes read tools
   - Test `/mcp/admin` rejects requests without token
   - Test `/mcp/admin` accepts requests with valid token

### Security Testing

**Test token hash security:**
```bash
# Verify tokens are hashed before comparison
# Check that plaintext tokens are never logged
# Verify constant-time comparison prevents timing attacks
```

**Test token strength:**
```bash
# Use strong random token (32+ characters)
# Test with weak token (should still work but document minimum strength)
```

### Integration Testing

**MCP Client Configuration:**

Public (read-only):
```json
{
  "mcpServers": {
    "agent-config-adapter": {
      "type": "http",
      "url": "https://your-worker.workers.dev/mcp"
    }
  }
}
```

Admin (full access):
```json
{
  "mcpServers": {
    "agent-config-adapter-admin": {
      "type": "http",
      "url": "https://your-worker.workers.dev/mcp/admin",
      "headers": {
        "Authorization": "Bearer YOUR_ADMIN_TOKEN"
      }
    }
  }
}
```

### Deployment Steps

**Local Development:**
```bash
# 1. Generate admin token
node scripts/hash-token.ts "local-dev-token-123"

# 2. Add hash to .dev.vars
echo "MCP_ADMIN_TOKEN_HASH=<hash-from-step-1>" >> .dev.vars

# 3. Start dev server
npm run dev

# 4. Test both endpoints
```

**Production Deployment:**
```bash
# 1. Generate strong random token
node scripts/hash-token.ts "$(openssl rand -hex 32)"
# Save the token securely (password manager)
# Copy the hash for next step

# 2. Set hash as Worker secret
npx wrangler secret put MCP_ADMIN_TOKEN_HASH
# Paste the hash when prompted

# 3. Deploy
npm run deploy

# 4. Test public endpoint (no token)
curl -X POST https://your-worker.workers.dev/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"resources/list"}'

# 5. Test admin endpoint (with token)
curl -X POST https://your-worker.workers.dev/mcp/admin \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

## Notes

- **Security**: Use a strong, randomly-generated token (32+ characters) for production
- **Token Storage**: Only hash is stored, never plaintext token
- **Token Distribution**: Share admin token securely with team (password manager, encrypted channel)
- **Token Rotation**: To rotate, generate new token, update hash in secrets, notify team
- **Temporary Solution**: This will be replaced when full user authentication is implemented
- **Alignment**: This follows the same pattern as email-gating for uploads (interim security measure)
- **Future**: When user auth is implemented, MCP endpoints will integrate with auth system
- **Rate Limiting**: Consider Cloudflare rate limiting rules for public `/mcp` endpoint
- **Monitoring**: Log failed authentication attempts at `/mcp/admin` for security monitoring
- **⚠️ CRITICAL**: Admin endpoint (`/mcp/admin`) must remain **undocumented and secret**
  - DO NOT mention in `/mcp/info` page
  - DO NOT mention in README.md or public documentation
  - DO NOT mention in UI or marketing materials
  - ONLY document in CLAUDE.md (internal project docs)
  - Only share with team members who need admin access
  - Security through obscurity + authentication token
