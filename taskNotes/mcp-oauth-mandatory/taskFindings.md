# MCP OAuth Mandatory - Web Session Sharing

## Purpose

Make MCP server require OAuth authentication at all times, with the web login session automatically recognized by MCP clients until the refresh token expires.

## Original Ask

> We need MCP server to be behind oauth all the time. And that oauth will be managed by the web login... If I am logged in to the web and then try to connect to MCP, That login should also be used for MCP until refresh token expires

## Related Memory Context

Found relevant memory: **MCP OAuth Implementation Guide** (`5daf1390-c7e0-404c-8e02-b968fd7724ea`)

Key patterns from memory-server's implementation:
- OAuth 2.0 Authorization Code Flow with PKCE (RFC 7636)
- RFC 8707 Resource Indicators for audience binding
- Dual authentication: API keys (`aca_...`) + JWT tokens
- Token lifetimes: Access (1 hour), Refresh (30 days), Auth Code (5 min)
- Single-use refresh tokens with rotation

## Design Constraint

**MCP tokens tied to user** - Tokens (access + refresh) are bound to the user's identity. No separate "API key" concept - just JWT tokens issued from the web session.

## Complexity and Reason

**Complexity: 3/5**

This is moderate complexity because:
1. **Existing OAuth infrastructure**: MCP OAuth flow with PKCE already implemented (`src/mcp/oauth/`)
2. **Session middleware exists**: Better Auth session detection already in place
3. **Key architectural decision**: Need to bridge web session cookies to MCP Bearer tokens
4. **MCP spec constraint**: MCP clients use Bearer tokens, not cookies - sessions cannot be directly shared
5. **Minimal new code**: Mostly wiring existing components together with token exchange

The MCP specification explicitly states: *"MCP Servers MUST NOT use sessions for authentication"* - tokens must be included in every request. This means we need a **token exchange mechanism** where authenticated web users can obtain MCP access tokens.

## Architectural Changes Required

### Current State

```
Web App (Browser)                    MCP Client (CLI)
      │                                    │
      │ Cookie-based session               │ Bearer token
      │ via Better Auth                    │ via MCP OAuth
      └──────────────────┘                 └──────────────────┘
             │                                    │
             ▼                                    ▼
      ┌──────────────┐                    ┌──────────────┐
      │ /api/auth/*  │                    │ /mcp/oauth/* │
      │ Better Auth  │                    │ Custom OAuth │
      └──────────────┘                    └──────────────┘
             │                                    │
             └────────── SEPARATE ────────────────┘
```

### Target State

```
Web App (Browser)                    MCP Client (CLI)
      │                                    │
      │ Cookie-based session               │ Bearer token
      │ via Better Auth                    │
      └───────────┬────────────────────────┘
                  │
                  ▼
         ┌────────────────────┐
         │  Unified Auth      │
         │  ┌──────────────┐  │
         │  │ Better Auth  │  │  ← Web login creates session
         │  └──────┬───────┘  │
         │         │          │
         │  ┌──────▼───────┐  │
         │  │ Token        │  │  ← Session can mint MCP tokens
         │  │ Exchange     │  │
         │  └──────────────┘  │
         └────────────────────┘
                  │
                  ▼
         ┌────────────────────┐
         │ /mcp (OAuth ONLY)  │  ← Bearer token required ALWAYS
         │ No anonymous access│
         └────────────────────┘
```

### Key Architecture Decision: Token Exchange Endpoint

Since MCP clients cannot use cookies, we need a **token exchange endpoint** that:
1. Accepts a valid web session (cookie-based)
2. Issues an MCP access token + refresh token
3. Allows the MCP client to use that token for `/mcp` requests

This follows the OAuth 2.0 Token Exchange pattern (RFC 8693).

## Backend Changes Required

### 1. Remove Anonymous MCP Access

**File: `src/index.ts`**

Current `/mcp` endpoint allows anonymous read-only access:
```typescript
// Current - allows anonymous
app.post('/mcp', async (c) => {
  const userId = c.get('userId');
  const accessLevel = userId ? 'full' : 'readonly';  // ← Anonymous gets readonly
  const server = createMCPServer(c.env, accessLevel);
  return handleMCPStreamable(c.req.raw, server);
});
```

Change to require authentication:
```typescript
// New - OAuth required ALWAYS
app.post('/mcp', mcpOAuthMiddleware, requireMCPAuth, async (c) => {
  const server = createMCPServer(c.env, 'full');  // Always full access for auth'd users
  return handleMCPStreamable(c.req.raw, server);
});
```

### 2. Add Token Exchange Endpoint

**File: `src/mcp/oauth/handlers.ts`** (add new handler)

```typescript
/**
 * Token Exchange - Convert web session to MCP tokens
 * POST /mcp/oauth/exchange
 *
 * Tokens are tied to the user's identity.
 * Each call issues fresh tokens (access + refresh).
 *
 * Requires: Valid session cookie (from Better Auth)
 * Returns: { access_token, refresh_token, expires_in }
 */
export async function handleSessionTokenExchange(c: Context): Promise<Response> {
  const user = c.get('user');
  const kvStore = c.env.OAUTH_TOKENS as KVNamespace;
  const jwtSecret = c.env.JWT_SECRET || c.env.BETTER_AUTH_SECRET;

  if (!user) {
    return c.json({
      error: 'invalid_grant',
      error_description: 'Valid session required. Please log in first.'
    }, 401);
  }

  // Generate MCP access token from session (1 day lifetime)
  const accessToken = await signAccessToken(
    {
      sub: user.id,
      scope: 'read write',
      client_id: 'web_session_exchange',
      jti: generateRandomString(16),
    },
    jwtSecret,
    3600 * 24 // 1 day
  );

  // Generate refresh token (30 days, matching session expiry)
  const refreshToken = generateRandomString(64);
  await kvStore.put(
    `refresh_token:${refreshToken}`,
    JSON.stringify({
      userId: user.id,
      scope: 'read write',
      clientId: 'web_session_exchange',
    }),
    { expirationTtl: 60 * 60 * 24 * 30 } // 30 days
  );

  return c.json({
    access_token: accessToken,
    token_type: 'Bearer',
    expires_in: 86400, // 1 day
    refresh_token: refreshToken,
    scope: 'read write',
  });
}
```

### 3. Update MCP OAuth Routes

**File: `src/mcp/oauth/routes.ts`**

Add the token exchange route:
```typescript
/**
 * Token Exchange - Web session to MCP tokens
 * POST /mcp/oauth/exchange
 *
 * Requires active web session (cookie auth via Better Auth)
 */
mcpOAuthRouter.post('/exchange', handleSessionTokenExchange);
```

### 4. Update Protected Resource Metadata

**File: `src/mcp/oauth/metadata.ts`**

Update to indicate OAuth is mandatory:
```typescript
export function getMCPServerMetadata(baseUrl: string) {
  return {
    resource: `${baseUrl}/mcp`,
    authorization_servers: [`${baseUrl}`],
    bearer_methods_supported: ['header'],
    resource_documentation: `${baseUrl}/mcp/info`,
    // Indicate OAuth is required
    scopes_supported: ['read', 'write'],
    token_exchange_endpoint: `${baseUrl}/mcp/oauth/exchange`,
  };
}
```

### 5. Update MCP Info Page

**File: `src/index.ts`** (update `/mcp/info` handler)

Remove read-only access messaging, indicate OAuth is always required:
- Remove "Public read-only" access level
- Show "Authentication Required" for all users
- Update client config examples to include token exchange flow

### 6. Update WWW-Authenticate Response

When MCP receives unauthenticated request, return proper RFC 6750 challenge:

```typescript
// In mcpOAuthMiddleware when no auth provided:
return c.json({
  jsonrpc: '2.0',
  id: null,
  error: {
    code: -32001,
    message: 'Authentication required'
  }
}, 401, {
  'WWW-Authenticate': `Bearer realm="${baseUrl}/mcp", authorization_uri="${baseUrl}/mcp/oauth/authorize", token_uri="${baseUrl}/mcp/oauth/token", resource="${baseUrl}/mcp"`
});
```

## Frontend Changes Required

### 1. Profile Page - MCP Token Section

**File: `src/views/profile.ts`**

Add section showing how to get MCP tokens:

```html
<div class="card">
  <h3>MCP Access</h3>
  <p>Connect Claude Desktop or other MCP clients to your account.</p>

  <div class="token-exchange">
    <button onclick="exchangeSessionForTokens()" class="btn">
      Generate MCP Tokens
    </button>
    <div id="mcp-tokens" style="display: none;">
      <div class="alert alert-warning">
        ⚠️ Save these tokens - the refresh token won't be shown again!
      </div>
      <label>Access Token (expires in 1 day):</label>
      <input type="text" readonly id="access-token" class="mono">
      <label>Refresh Token (use to get new access tokens, expires in 30 days):</label>
      <input type="text" readonly id="refresh-token" class="mono">
      <button onclick="copyTokens()" class="btn btn-secondary">Copy</button>
    </div>
  </div>

  <h4>MCP Client Configuration</h4>
  <pre><code>{
  "mcpServers": {
    "agent-config-adapter": {
      "type": "http",
      "url": "${baseUrl}/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_ACCESS_TOKEN"
      }
    }
  }
}</code></pre>
</div>
```

### 2. Update MCP Info Page

Show that authentication is always required and provide login link for unauthenticated users.

## Database Changes Required

None - using existing tables:
- `OAUTH_TOKENS` KV namespace for refresh tokens (already exists)
- Better Auth session tables (already exist)

## Environment Changes Required

None - using existing secrets:
- `JWT_SECRET` / `BETTER_AUTH_SECRET` for signing tokens
- `OAUTH_TOKENS` KV binding

## Acceptance Criteria

1. **Anonymous MCP Access Disabled**
   - [ ] `POST /mcp` without Bearer token returns 401
   - [ ] WWW-Authenticate header includes authorization endpoints
   - [ ] No "readonly" mode exists anymore

2. **Token Exchange Works**
   - [ ] Logged-in web user can call `POST /mcp/oauth/exchange`
   - [ ] Returns valid access_token and refresh_token
   - [ ] Access token works for MCP requests

3. **Refresh Token Flow**
   - [ ] Existing refresh token endpoint works with exchanged tokens
   - [ ] Refresh tokens expire after 30 days

4. **MCP Client Flow**
   - [ ] Client can discover auth endpoints via metadata
   - [ ] Client can complete OAuth PKCE flow
   - [ ] Client can use token exchange (if has session cookie)

5. **Documentation Updated**
   - [ ] MCP info page shows OAuth required
   - [ ] Profile page shows token exchange option
   - [ ] CLAUDE.md updated with new behavior

## Validation

### Backend API Flows

**1. Token Exchange Flow (for logged-in web users)**
```bash
# 1. User is logged in (has session cookie)
# 2. Exchange session for MCP tokens
curl -X POST https://example.com/mcp/oauth/exchange \
  -H "Cookie: agent-config.session_token=..."

# Response:
{
  "access_token": "eyJ...",
  "token_type": "Bearer",
  "expires_in": 86400,
  "refresh_token": "abc123...",
  "scope": "read write"
}

# 3. Use token for MCP requests
curl -X POST https://example.com/mcp \
  -H "Authorization: Bearer eyJ..." \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc": "2.0", "method": "tools/list", "id": 1}'
```

**2. Refresh Token Flow**
```bash
POST /mcp/oauth/token
{
  "grant_type": "refresh_token",
  "refresh_token": "abc123..."
}

# Response:
{
  "access_token": "eyJ...(new)...",
  "token_type": "Bearer",
  "expires_in": 86400,
  "scope": "read write"
}
```

**3. Unauthenticated MCP Request**
```bash
curl -X POST https://example.com/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc": "2.0", "method": "tools/list", "id": 1}'

# Response: 401 Unauthorized
{
  "jsonrpc": "2.0",
  "id": 1,
  "error": {
    "code": -32001,
    "message": "Authentication required"
  }
}

# Headers include:
# WWW-Authenticate: Bearer realm="...", authorization_uri="...", token_uri="..."
```

**4. OAuth PKCE Flow (alternative for MCP clients that support it)**
```bash
# Standard OAuth PKCE flow still works
GET /mcp/oauth/authorize?client_id=...&code_challenge=...
POST /mcp/oauth/token (exchange code for JWT)
```

### Frontend User Steps

1. **Get MCP Tokens (Logged In)**
   - Log in via GitHub or Email OTP
   - Navigate to /profile
   - Click "Generate MCP Tokens"
   - Copy access token to MCP client config
   - Save refresh token for later use
   - Verify: MCP client can connect

2. **Refresh Expired Token**
   - Use refresh token to get new access token
   - Update MCP client config with new access token

### Test Commands

```bash
# Run all tests
npm test

# Run MCP auth tests specifically
npm test -- --grep "mcp.*auth"

# Test token exchange endpoint
curl -X POST http://localhost:8787/mcp/oauth/exchange \
  -H "Cookie: agent-config.session_token=test"

# Test MCP without auth (should fail)
curl -X POST http://localhost:8787/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc": "2.0", "method": "tools/list", "id": 1}'
```

## Implementation Notes

### MCP Spec Compliance

Per the MCP OAuth 2.0 specification (June 2025):
- MCP servers MUST validate Bearer tokens on every request
- MCP servers MUST NOT use sessions for authentication
- Tokens must be scoped to the specific MCP server (resource indicator)

Our token exchange approach complies because:
- Web session is used only to **issue** tokens, not to authenticate MCP requests
- MCP requests always require Bearer token
- Tokens are scoped to our MCP server

### Token Lifetime Strategy

| Token Type | Lifetime | Rationale |
|------------|----------|-----------|
| Access Token | 1 day | Balance of security and usability |
| Refresh Token | 30 days | Extended MCP access without re-login |
| Web Session | 7 days (auto-refresh) | Better Auth default |

When refresh token expires, user must re-authenticate (either via web login + token exchange, or full OAuth flow).

### Breaking Changes

1. **Anonymous MCP access removed** - All MCP requests now require authentication
2. **`/mcp` endpoint behavior change** - Returns 401 instead of readonly access for unauthenticated requests

### Migration Path

For existing users with saved MCP configs:
1. Add "Log in to get tokens" messaging on /mcp/info
2. Provide clear instructions in error response
3. Token exchange is the simplest path for web users
