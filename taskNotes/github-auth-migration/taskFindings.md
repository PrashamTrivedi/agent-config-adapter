# GitHub Authentication Migration

## Purpose

Replace email-gated CUD operations with proper GitHub OAuth + Email OTP authentication using Better Auth, implementing MCP OAuth 2.0 with PKCE for API clients, and adding user ownership to all resources.

## Original Ask

Introduce GitHub login using Better Auth to agent-config-adapter. Move existing data to the owner's GitHub account after first login. Key components:
- Better Auth with GitHub OAuth + Email OTP for web
- MCP OAuth 2.0 with PKCE for MCP clients
- User ownership model for configs/extensions/marketplaces
- Data migration for existing records

## Implementation Specs

This task is broken into 6 phases with detailed specs. See [specs/specs.md](./specs/specs.md) for the dependency graph and overview.

| Phase | Spec | Description |
|-------|------|-------------|
| 1 | [spec-01-database.md](./specs/spec-01-database.md) | Database migrations (user, session, account, verification, api_keys tables) |
| 2 | [spec-02-better-auth.md](./specs/spec-02-better-auth.md) | Better Auth integration with D1 adapter |
| 3 | [spec-03-profile-api-keys.md](./specs/spec-03-profile-api-keys.md) | Profile page & API key management |
| 4 | [spec-04-mcp-oauth.md](./specs/spec-04-mcp-oauth.md) | MCP OAuth 2.0 with PKCE |
| 5 | [spec-05-ownership.md](./specs/spec-05-ownership.md) | Ownership enforcement on CUD operations |
| 6 | [spec-06-migration.md](./specs/spec-06-migration.md) | Data migration & cleanup |

**Critical Path**: Phase 1 → 2 → 3 → 4 (MCP OAuth) and Phase 1 → 2 → 5 (Ownership)

## Complexity and Reason

**Complexity: 5/5**

This is a high-complexity task because:
1. **Multiple authentication systems**: Better Auth (web) + custom MCP OAuth (API) with dual middleware
2. **Database schema changes**: 5+ new tables (user, session, account, verification, api_keys) + user_id columns on 3 existing tables
3. **New KV namespace**: OAUTH_TOKENS for auth codes and refresh tokens
4. **Extensive UI changes**: Login modal, profile page, header updates, 17+ entry points
5. **Business logic changes**: Ownership enforcement across 26 endpoints
6. **MCP OAuth implementation**: PKCE flow, JWT generation, refresh token rotation
7. **Data migration**: Orphaned data assignment + email subscriber notification
8. **Breaking changes**: Existing MCP_ADMIN_TOKEN_HASH removed, replaced with OAuth

## Architectural Changes Required

### New Directory Structure

```
src/
├── auth/                          # NEW - Authentication module
│   ├── better-auth.ts             # Better Auth configuration
│   ├── d1-adapter.ts              # D1 database adapter for Better Auth
│   ├── session-middleware.ts      # Web session middleware
│   └── types.ts                   # Auth types
├── oauth/                         # NEW - MCP OAuth module
│   ├── handlers.ts                # OAuth flow handlers
│   ├── metadata.ts                # Discovery endpoints
│   ├── templates.ts               # Authorization form UI
│   ├── jwt.ts                     # JWT generation/validation
│   └── middleware.ts              # JWT/API key auth middleware
├── routes/
│   ├── auth.ts                    # NEW - Auth routes (/api/auth/*)
│   ├── oauth.ts                   # NEW - OAuth routes (/oauth/*)
│   └── profile.ts                 # NEW - Profile routes (/profile)
├── views/
│   ├── auth.ts                    # NEW - Login/logout UI
│   └── profile.ts                 # NEW - Profile page with API keys
└── services/
    └── api-key-service.ts         # NEW - API key management
```

### Environment Changes (wrangler.jsonc)

```jsonc
{
  "kv_namespaces": [
    // ... existing ...
    { "binding": "OAUTH_TOKENS", "id": "..." }  // NEW
  ],
  "vars": {
    "BETTER_AUTH_URL": "https://agent-config-adapter.workers.dev"  // NEW
  }
  // Remove: MCP_ADMIN_TOKEN_HASH (replaced by OAuth)
}
```

### New Secrets (via wrangler CLI)

```bash
npx wrangler secret put BETTER_AUTH_SECRET
npx wrangler secret put GITHUB_CLIENT_ID
npx wrangler secret put GITHUB_CLIENT_SECRET
npx wrangler secret put JWT_SECRET
```

## Backend Changes Required

### Phase 1: Database Schema (Migration 0008)

**File: `migrations/0008_add_auth_tables.sql`**

```sql
-- Better Auth tables
CREATE TABLE IF NOT EXISTS "user" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL UNIQUE,
  "emailVerified" INTEGER DEFAULT 0 NOT NULL,
  "image" TEXT,
  "createdAt" INTEGER NOT NULL,
  "updatedAt" INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS "session" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "expiresAt" INTEGER NOT NULL,
  "token" TEXT NOT NULL UNIQUE,
  "createdAt" INTEGER NOT NULL,
  "updatedAt" INTEGER NOT NULL,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "userId" TEXT NOT NULL,
  FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "account" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "accountId" TEXT NOT NULL,
  "providerId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "accessToken" TEXT,
  "refreshToken" TEXT,
  "idToken" TEXT,
  "accessTokenExpiresAt" INTEGER,
  "refreshTokenExpiresAt" INTEGER,
  "scope" TEXT,
  "password" TEXT,
  "createdAt" INTEGER NOT NULL,
  "updatedAt" INTEGER NOT NULL,
  FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "verification" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "identifier" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  "expiresAt" INTEGER NOT NULL,
  "createdAt" INTEGER,
  "updatedAt" INTEGER
);

-- MCP OAuth API keys
CREATE TABLE IF NOT EXISTS "api_keys" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "key_hash" TEXT UNIQUE NOT NULL,
  "user_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "created_at" INTEGER NOT NULL,
  "last_used_at" INTEGER,
  "expires_at" INTEGER,
  "is_active" INTEGER DEFAULT 1,
  FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS "session_userId_idx" ON "session" ("userId");
CREATE INDEX IF NOT EXISTS "session_token_idx" ON "session" ("token");
CREATE INDEX IF NOT EXISTS "account_userId_idx" ON "account" ("userId");
CREATE INDEX IF NOT EXISTS "account_providerId_idx" ON "account" ("providerId", "accountId");
CREATE INDEX IF NOT EXISTS "verification_identifier_idx" ON "verification" ("identifier");
CREATE INDEX IF NOT EXISTS "api_keys_user_id_idx" ON "api_keys" ("user_id");
CREATE INDEX IF NOT EXISTS "api_keys_key_hash_idx" ON "api_keys" ("key_hash");
```

### Phase 2: Add user_id to Existing Tables (Migration 0009)

**File: `migrations/0009_add_user_ownership.sql`**

```sql
-- Add user_id to configs
ALTER TABLE configs ADD COLUMN user_id TEXT REFERENCES "user"(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_configs_user_id ON configs(user_id);

-- Add user_id to extensions
ALTER TABLE extensions ADD COLUMN user_id TEXT REFERENCES "user"(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_extensions_user_id ON extensions(user_id);

-- Add user_id to marketplaces
ALTER TABLE marketplaces ADD COLUMN user_id TEXT REFERENCES "user"(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_marketplaces_user_id ON marketplaces(user_id);
```

### Phase 3: Better Auth Implementation

**File: `src/auth/d1-adapter.ts`** - D1 adapter (copy from memory guide with adjustments)

**File: `src/auth/better-auth.ts`**
```typescript
import { betterAuth } from 'better-auth';
import { emailOTP } from 'better-auth/plugins';
import { d1Adapter } from './d1-adapter';

export function createAuth(env: Bindings) {
  return betterAuth({
    database: d1Adapter(env.DB),
    baseURL: env.BETTER_AUTH_URL,
    secret: env.BETTER_AUTH_SECRET,

    emailAndPassword: { enabled: false },  // Only OAuth + OTP

    socialProviders: {
      github: {
        clientId: env.GITHUB_CLIENT_ID,
        clientSecret: env.GITHUB_CLIENT_SECRET,
      },
    },

    plugins: [
      emailOTP({
        otpLength: 6,
        expiresIn: 300,
        sendVerificationOTP: async ({ email, otp }) => {
          await sendOTPEmail(env.EMAIL_API_KEY, email, otp);
        },
      }),
    ],

    session: {
      expiresIn: 60 * 60 * 24 * 7,  // 7 days
      updateAge: 60 * 60 * 24,       // Daily refresh
      cookieCache: { enabled: true, maxAge: 60 * 5 },
    },

    advanced: {
      useSecureCookies: true,  // Production HTTPS
    },
  });
}
```

### Phase 4: Session Middleware

**File: `src/auth/session-middleware.ts`**
```typescript
export const sessionMiddleware = async (c: Context, next: Next) => {
  const auth = createAuth(c.env);
  const session = await auth.api.getSession({ headers: c.req.raw.headers });

  c.set('session', session);
  c.set('user', session?.user || null);
  c.set('userId', session?.user?.id || null);

  await next();
};

export const requireAuth = async (c: Context, next: Next) => {
  const user = c.get('user');
  if (!user) {
    return c.json({ error: 'Authentication required', login_url: '/auth/login' }, 401);
  }
  await next();
};
```

### Phase 5: MCP OAuth Implementation

**File: `src/oauth/handlers.ts`**
- `handleAuthorize()` - Show API key entry form, validate, issue auth code
- `handleToken()` - Exchange code for JWT, handle refresh grants
- `handleRefreshTokenGrant()` - Token rotation

**File: `src/oauth/metadata.ts`**
- `/.well-known/oauth-authorization-server`
- `/.well-known/oauth-protected-resource`

**File: `src/oauth/jwt.ts`**
- JWT generation with HS256
- JWT verification with issuer/audience

**File: `src/oauth/middleware.ts`** - Dual auth middleware
```typescript
export const mcpAuthMiddleware = async (c: Context, next: Next) => {
  const authHeader = c.req.header('Authorization');
  const token = authHeader?.replace('Bearer ', '');

  if (token?.startsWith('msk_')) {
    // API key authentication
    return apiKeyAuth(c, token, next);
  }

  if (token) {
    // JWT authentication
    return jwtAuth(c, token, next);
  }

  return c.json({ error: 'Authentication required' }, 401);
};
```

### Phase 6: API Key Service

**File: `src/services/api-key-service.ts`**
```typescript
export class ApiKeyService {
  async createKey(userId: string, name: string): Promise<{ key: string; id: string }>;
  async validateKey(keyHash: string): Promise<ApiKey | null>;
  async listKeys(userId: string): Promise<ApiKey[]>;
  async revokeKey(keyId: string, userId: string): Promise<boolean>;
  async updateLastUsed(keyId: string): Promise<void>;
}
```

### Phase 7: Ownership Enforcement

**Update existing services** to add ownership checks:

```typescript
// ConfigService
async updateConfig(id: string, input: UpdateConfigInput, userId?: string) {
  if (userId) {
    const config = await this.getConfig(id);
    if (config?.user_id && config.user_id !== userId) {
      throw new Error('Not authorized to update this config');
    }
  }
  // ... existing logic
}

async deleteConfig(id: string, userId?: string) {
  if (userId) {
    const config = await this.getConfig(id);
    if (config?.user_id && config.user_id !== userId) {
      throw new Error('Not authorized to delete this config');
    }
  }
  // ... existing logic
}
```

### Phase 8: Routes Integration

**File: `src/routes/auth.ts`** - Better Auth handler
```typescript
app.on(['GET', 'POST'], '/api/auth/*', async (c) => {
  const auth = createAuth(c.env);
  return auth.handler(c.req.raw);
});
```

**File: `src/routes/oauth.ts`** - MCP OAuth endpoints
```typescript
app.get('/.well-known/oauth-authorization-server', handleAuthServerMetadata);
app.get('/.well-known/oauth-protected-resource', handleProtectedResourceMetadata);
app.get('/oauth/authorize', showAuthorizeForm);
app.post('/oauth/authorize', handleAuthorize);
app.post('/oauth/token', handleToken);
```

**File: `src/routes/profile.ts`** - Profile & API keys
```typescript
app.get('/profile', requireAuth, showProfile);
app.get('/api/profile/keys', requireAuth, listApiKeys);
app.post('/api/profile/keys', requireAuth, createApiKey);
app.delete('/api/profile/keys/:id', requireAuth, revokeApiKey);
```

## Frontend Changes Required

### Phase 1: Update Layout Header

**File: `src/views/layout.ts`**

Add login/logout button and user avatar to header:
```html
<nav>
  <!-- ... existing nav ... -->
  <div class="auth-section">
    ${user ? `
      <a href="/profile" class="user-avatar">
        <img src="${user.image}" alt="${user.name}">
        <span>${user.name}</span>
      </a>
      <form action="/api/auth/sign-out" method="POST" style="display: inline;">
        <button type="submit" class="btn btn-secondary">Logout</button>
      </form>
    ` : `
      <a href="/auth/login" class="btn">Login</a>
    `}
  </div>
</nav>
```

### Phase 2: Replace Email Gate Modal

Replace current email gate modal with login options:
- GitHub OAuth button
- Email OTP option
- Clear messaging about why login is needed

### Phase 3: Profile Page UI

**File: `src/views/profile.ts`**

Features:
- User info (name, email, avatar)
- API key management
  - List existing keys (name, created, last used)
  - Generate new key (show once modal)
  - Revoke keys
- MCP client config snippet

### Phase 4: Update CUD Buttons

Change all `requireEmail()` calls to trigger login modal:
```javascript
window.requireAuth = function(callback) {
  if (window.getSession()) {
    callback();
  } else {
    window.location.href = '/auth/login?return=' + encodeURIComponent(window.location.pathname);
  }
};
```

### Phase 5: Remove Email Header Logic

Remove from HTMX configRequest handler:
```javascript
// REMOVE THIS:
event.detail.headers['X-Subscriber-Email'] = email;
```

## Acceptance Criteria

1. **GitHub OAuth Login**
   - [ ] User can log in via GitHub
   - [ ] Session persists across page loads
   - [ ] User info displayed in header

2. **Email OTP Login**
   - [ ] User can request OTP via email
   - [ ] User can verify OTP and create session
   - [ ] OTP expires after 5 minutes

3. **MCP OAuth**
   - [ ] Discovery endpoints return valid metadata
   - [ ] MCP client can complete PKCE flow
   - [ ] JWT tokens work for MCP requests
   - [ ] Refresh tokens rotate correctly

4. **API Key Management**
   - [ ] User can generate API keys
   - [ ] API keys shown only once
   - [ ] API keys can be revoked
   - [ ] MCP config snippet displays correctly

5. **Ownership Enforcement**
   - [ ] Anonymous users can browse all configs
   - [ ] Anonymous users cannot convert/copy (triggers login)
   - [ ] Users can only edit/delete their own resources
   - [ ] Orphaned data (NULL user_id) is read-only

6. **Data Migration**
   - [ ] Existing data migrates to owner's account
   - [ ] Email subscribers receive notification
   - [ ] Old MCP_ADMIN_TOKEN_HASH removed

## Validation

### Backend API Flows

**1. GitHub OAuth Flow**
```bash
# 1. Initiate login
GET /api/auth/sign-in/social?provider=github&callbackURL=/

# 2. GitHub redirects to callback
GET /api/auth/callback/github?code=...

# 3. Session cookie set, redirected to /
```

**2. Email OTP Flow**
```bash
# 1. Request OTP
POST /api/auth/email-otp/send-verification-otp
{"email": "user@example.com", "type": "sign-in"}

# 2. Verify OTP
POST /api/auth/sign-in/email-otp
{"email": "user@example.com", "otp": "123456"}
```

**3. MCP OAuth Flow**
```bash
# 1. Discover endpoints
GET /.well-known/oauth-authorization-server

# 2. Request authorization
GET /oauth/authorize?client_id=claude-desktop&redirect_uri=http://localhost:8000&code_challenge=...&code_challenge_method=S256

# 3. User enters API key, receives code
POST /oauth/authorize
# Redirects to: http://localhost:8000?code=AUTH_CODE

# 4. Exchange code for tokens
POST /oauth/token
{"grant_type": "authorization_code", "code": "AUTH_CODE", "code_verifier": "..."}
# Returns: {"access_token": "eyJ...", "refresh_token": "...", "expires_in": 86400}

# 5. Use token for MCP requests
POST /mcp/admin
Authorization: Bearer eyJ...
```

**4. Ownership Test Cases**
```bash
# Anonymous user - browse allowed
GET /api/configs  # 200 OK

# Anonymous user - convert blocked
GET /api/configs/123/format/gemini  # 401 Unauthorized

# Authenticated user - own resource
DELETE /api/configs/123  # 200 OK (if owner)

# Authenticated user - other's resource
DELETE /api/configs/456  # 403 Forbidden
```

### Frontend User Steps

1. **Login Flow**
   - Navigate to any page
   - Click "Login" in header
   - Choose GitHub or Email
   - Complete authentication
   - Verify: Header shows user name/avatar

2. **Convert Flow (Authenticated)**
   - Navigate to /configs
   - Click config detail
   - Click "Convert to Gemini"
   - Verify: Conversion completes

3. **Convert Flow (Anonymous)**
   - Open incognito
   - Navigate to /configs/123
   - Click "Convert"
   - Verify: Redirected to login

4. **API Key Management**
   - Log in
   - Navigate to /profile
   - Click "Generate API Key"
   - Copy key (shown once)
   - Verify: Key appears in list
   - Click "Revoke"
   - Verify: Key removed

### Test Commands

```bash
# Run all tests
npm test

# Run auth-specific tests
npm test -- --grep "auth"

# Run with coverage
npm test -- --run --coverage
```
