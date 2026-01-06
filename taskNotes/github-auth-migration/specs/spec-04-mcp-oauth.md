# Spec 04: MCP OAuth 2.0 with PKCE

## Purpose
Implement OAuth 2.0 Authorization Code Flow with PKCE for MCP clients (Claude Desktop, etc.).

## Dependencies
- Phase 3 (API Keys) complete

## Files to Create

### `src/oauth/metadata.ts`

Discovery endpoints per RFC:

**`GET /.well-known/oauth-authorization-server`**
```json
{
  "issuer": "https://agent-config-adapter.workers.dev",
  "authorization_endpoint": "https://agent-config-adapter.workers.dev/oauth/authorize",
  "token_endpoint": "https://agent-config-adapter.workers.dev/oauth/token",
  "response_types_supported": ["code"],
  "grant_types_supported": ["authorization_code", "refresh_token"],
  "code_challenge_methods_supported": ["S256"],
  "token_endpoint_auth_methods_supported": ["none"],
  "scopes_supported": ["mcp:full"]
}
```

**`GET /.well-known/oauth-protected-resource`** (RFC 8707)
```json
{
  "resource": "https://agent-config-adapter.workers.dev/mcp",
  "authorization_servers": ["https://agent-config-adapter.workers.dev"],
  "bearer_methods_supported": ["header"],
  "scopes_supported": ["mcp:full"]
}
```

### `src/oauth/templates.ts`

Authorization form HTML:
```html
<div class="oauth-authorize">
  <h2>Authorize MCP Client</h2>
  <p>Enter your API key to authorize <strong>${clientId}</strong></p>
  <form method="POST" action="/oauth/authorize">
    <input type="hidden" name="client_id" value="${clientId}">
    <input type="hidden" name="redirect_uri" value="${redirectUri}">
    <input type="hidden" name="code_challenge" value="${codeChallenge}">
    <input type="hidden" name="code_challenge_method" value="${codeChallengeMethod}">
    <input type="hidden" name="state" value="${state}">

    <label>API Key</label>
    <input type="password" name="api_key" placeholder="msk_..." required>

    <button type="submit">Authorize</button>
  </form>
</div>
```

### `src/oauth/handlers.ts`

**`handleAuthorize(GET)`** - Show authorization form
**`handleAuthorize(POST)`** - Validate API key, issue auth code

```typescript
async function handleAuthorize(c: Context) {
  const { api_key, code_challenge, redirect_uri, state } = await c.req.parseBody();

  // 1. Validate API key
  const keyHash = await sha256Hex(api_key);
  const apiKey = await apiKeyService.validateKey(keyHash);
  if (!apiKey) return c.html(errorForm('Invalid API key'));

  // 2. Generate authorization code
  const code = generateRandomHex(32);
  const codeData = {
    userId: apiKey.user_id,
    apiKeyId: apiKey.id,
    codeChallenge: code_challenge,
    redirectUri: redirect_uri,
    createdAt: Date.now()
  };

  // 3. Store in KV with 5-min TTL
  await c.env.OAUTH_TOKENS.put(`oauth_code:${code}`, JSON.stringify(codeData), {
    expirationTtl: 300
  });

  // 4. Update API key last used
  await apiKeyService.updateLastUsed(apiKey.id);

  // 5. Redirect with code
  return c.redirect(`${redirect_uri}?code=${code}&state=${state}`);
}
```

**`handleToken(POST)`** - Exchange code for tokens

```typescript
async function handleToken(c: Context) {
  const { grant_type, code, code_verifier, refresh_token } = await c.req.json();

  if (grant_type === 'authorization_code') {
    // 1. Get and delete code (single-use)
    const codeData = await c.env.OAUTH_TOKENS.get(`oauth_code:${code}`, 'json');
    await c.env.OAUTH_TOKENS.delete(`oauth_code:${code}`);
    if (!codeData) return c.json({ error: 'invalid_grant' }, 400);

    // 2. Verify PKCE
    const expectedChallenge = await sha256Base64Url(code_verifier);
    if (expectedChallenge !== codeData.codeChallenge) {
      return c.json({ error: 'invalid_grant' }, 400);
    }

    // 3. Generate tokens
    const accessToken = await generateJWT(codeData.userId, c.env);
    const newRefreshToken = generateRandomHex(64);

    // 4. Store refresh token
    await c.env.OAUTH_TOKENS.put(`refresh_token:${newRefreshToken}`, JSON.stringify({
      userId: codeData.userId,
      apiKeyId: codeData.apiKeyId
    }), { expirationTtl: 30 * 24 * 60 * 60 });

    return c.json({
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: 86400,
      refresh_token: newRefreshToken,
      scope: 'mcp:full'
    });
  }

  if (grant_type === 'refresh_token') {
    return handleRefreshTokenGrant(c, refresh_token);
  }

  return c.json({ error: 'unsupported_grant_type' }, 400);
}
```

### `src/oauth/jwt.ts`

JWT handling with jose library:

```typescript
import { SignJWT, jwtVerify } from 'jose';

export async function generateJWT(userId: string, env: Bindings): Promise<string> {
  const secret = new TextEncoder().encode(env.JWT_SECRET);

  return new SignJWT({ sub: userId, scope: 'mcp:full' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuer(env.BETTER_AUTH_URL)
    .setAudience(`${env.BETTER_AUTH_URL}/mcp`)
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(secret);
}

export async function verifyJWT(token: string, env: Bindings): Promise<{ userId: string } | null> {
  try {
    const secret = new TextEncoder().encode(env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret, {
      issuer: env.BETTER_AUTH_URL,
      audience: `${env.BETTER_AUTH_URL}/mcp`
    });
    return { userId: payload.sub as string };
  } catch {
    return null;
  }
}
```

### `src/oauth/middleware.ts`

Dual auth middleware for MCP routes:

```typescript
export const mcpAuthMiddleware = async (c: Context, next: Next) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: 'Authorization required' }, 401);
  }

  const token = authHeader.substring(7);

  // API key authentication (msk_ prefix)
  if (token.startsWith('msk_')) {
    const keyHash = await sha256Hex(token);
    const apiKey = await apiKeyService.validateKey(keyHash);
    if (!apiKey || !apiKey.is_active) {
      return c.json({ error: 'Invalid API key' }, 401);
    }
    await apiKeyService.updateLastUsed(apiKey.id);
    c.set('userId', apiKey.user_id);
    c.set('authType', 'api_key');
    return next();
  }

  // JWT authentication
  const verified = await verifyJWT(token, c.env);
  if (!verified) {
    return c.json({ error: 'Invalid or expired token' }, 401);
  }
  c.set('userId', verified.userId);
  c.set('authType', 'jwt');
  return next();
};
```

### `src/routes/oauth.ts`

Mount OAuth routes:

```typescript
const oauthRouter = new Hono<{ Bindings: Bindings }>();

// Discovery endpoints
oauthRouter.get('/.well-known/oauth-authorization-server', handleAuthServerMetadata);
oauthRouter.get('/.well-known/oauth-protected-resource', handleProtectedResourceMetadata);

// OAuth flow endpoints
oauthRouter.get('/oauth/authorize', showAuthorizeForm);
oauthRouter.post('/oauth/authorize', handleAuthorize);
oauthRouter.post('/oauth/token', handleToken);
```

## New Dependency

Add to package.json:
```json
"jose": "^5.9.6"
```

## KV Storage Schema

**Auth Code** (`oauth_code:{code}`)
```json
{
  "userId": "user-id",
  "apiKeyId": "key-id",
  "codeChallenge": "base64url-hash",
  "redirectUri": "http://localhost:8000",
  "createdAt": 1234567890
}
```
TTL: 5 minutes

**Refresh Token** (`refresh_token:{token}`)
```json
{
  "userId": "user-id",
  "apiKeyId": "key-id"
}
```
TTL: 30 days

## Validation

```bash
# 1. Discover endpoints
curl "http://localhost:9090/.well-known/oauth-authorization-server" | jq

# 2. Start PKCE flow
VERIFIER=$(openssl rand -hex 32)
CHALLENGE=$(echo -n $VERIFIER | sha256sum | cut -d' ' -f1 | xxd -r -p | base64 -w0 | tr '+/' '-_' | tr -d '=')

# 3. Get authorization (manual - shows form)
open "http://localhost:9090/oauth/authorize?client_id=test&redirect_uri=http://localhost:8000&code_challenge=$CHALLENGE&code_challenge_method=S256&state=xyz"

# 4. After entering API key and redirecting, exchange code
curl -X POST "http://localhost:9090/oauth/token" \
  -H "Content-Type: application/json" \
  -d "{\"grant_type\":\"authorization_code\",\"code\":\"AUTH_CODE\",\"code_verifier\":\"$VERIFIER\"}"

# 5. Use access token
curl -X POST "http://localhost:9090/mcp" \
  -H "Authorization: Bearer ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"tools/list","id":1}'
```

## Security Considerations

1. **PKCE Required** - All flows use S256 code challenge
2. **Single-Use Codes** - Auth codes deleted after use
3. **Token Rotation** - Refresh tokens rotate on each use
4. **Short Token Lifetime** - Access tokens expire in 24h
5. **API Key Hash** - Raw keys never stored
