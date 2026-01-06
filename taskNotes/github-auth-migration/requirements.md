# GitHub Authentication Migration

## Overview

Replace email-gated CUD operations with proper user authentication using Better Auth. Implement GitHub OAuth as primary authentication method with Email OTP as alternative. Migrate all existing configs/extensions/marketplaces to the owner's GitHub account after first login.

## Final Specification

Implement GitHub OAuth + Email OTP authentication using Better Auth library on Cloudflare Workers with D1 database. Anonymous users can browse all configs but cannot convert or copy - these actions trigger login. All existing data will be migrated to the project owner's GitHub account upon their first login. The visibility model is "public read, private write" - all configs are visible to everyone, but only the owner can edit or delete. The MCP admin endpoint will transition from token-based auth to OAuth-based auth, as modern MCP clients support OAuth flows.

## Detailed Requirements

### Authentication Methods
- **GitHub OAuth**: Primary authentication method for developers
- **Email OTP**: Passwordless email login (6-digit code) for non-GitHub users
- **Session Management**: 7-day sessions with daily refresh, cookie-based

### Anonymous User Experience
- Can browse all configs, extensions, marketplaces, skills
- Can view config details and metadata
- **Cannot convert** configs - triggers login modal
- **Copy button visible** but triggers login when clicked
- Convert endpoint requires authentication
- Clear "Login to access" messaging

### Authenticated User Experience
- Full CRUD operations on owned resources
- Convert and copy functionality enabled
- View all public configs from other users (read-only)
- User profile with GitHub avatar/name

### Data Ownership Model
- **Visibility**: Public read, private write (may add explicit visibility flag later)
- All configs/extensions/marketplaces have `user_id` foreign key
- Only owner can update/delete their resources
- No sharing/collaboration in MVP

### Database Schema Changes
1. **Add Better Auth tables** (new migration):
   - `user` - id, name, email, emailVerified, image, createdAt, updatedAt
   - `session` - id, expiresAt, token, createdAt, updatedAt, ipAddress, userAgent, userId
   - `account` - id, accountId, providerId, userId, accessToken, refreshToken, etc.
   - `verification` - id, identifier, value, expiresAt (for OTP codes)

2. **Add user_id to existing tables** (new migration):
   - `configs.user_id` TEXT (nullable initially for migration)
   - `extensions.user_id` TEXT (nullable initially)
   - `marketplaces.user_id` TEXT (nullable initially)
   - Foreign key to `user(id)` ON DELETE SET NULL

3. **Add indexes**:
   - `idx_configs_user_id`
   - `idx_extensions_user_id`
   - `idx_marketplaces_user_id`

### Migration Strategy
1. Project owner logs in with GitHub (first login after deployment)
2. Script/endpoint assigns all existing orphaned data to owner's user_id
3. Future data automatically assigned to authenticated user
4. Orphaned data (NULL user_id) treated as system-owned, read-only

### Email Subscriber Migration
- Send simple notification email to all EMAIL_SUBSCRIPTIONS entries
- Inform users that login is now required
- One-time batch email via existing email service
- Keep EMAIL_SUBSCRIPTIONS KV for:
  - Email OTP verification codes (repurpose or new namespace)
  - Future newsletter/marketing (separate concern)

### MCP Endpoint Authentication (OAuth 2.0 with PKCE)
Based on MCP OAuth Implementation Guide, implement proper OAuth 2.0 for MCP clients:

**Flow Overview**:
1. User logs in via web (GitHub/Email OTP) → creates API key in profile
2. MCP client initiates OAuth Authorization Code Flow with PKCE
3. User visits /oauth/authorize → enters API key
4. Server validates API key → issues authorization code (5-min TTL)
5. Client exchanges code + PKCE verifier for tokens
6. JWT access token (24h) + refresh token (30 days with rotation)

**New OAuth Endpoints**:
- `GET /.well-known/oauth-authorization-server` - Discovery metadata
- `GET /.well-known/oauth-protected-resource` - RFC 8707 resource indicator
- `GET /oauth/authorize` - Show authorization form (API key entry)
- `POST /oauth/authorize` - Validate API key, issue auth code
- `POST /oauth/token` - Exchange code for tokens, handle refresh

**New Database Table - api_keys**:
```sql
CREATE TABLE api_keys (
  id TEXT PRIMARY KEY,
  key_hash TEXT UNIQUE NOT NULL,     -- SHA-256 hash (never store raw)
  user_id TEXT NOT NULL,             -- FK to user table
  name TEXT NOT NULL,                -- "Claude Desktop - Laptop"
  created_at INTEGER NOT NULL,
  last_used_at INTEGER,
  expires_at INTEGER,                -- NULL = never expires
  is_active INTEGER DEFAULT 1,
  FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
);
```

**Token Storage (KV)**:
- `oauth_code:{code}` - Auth code data (5-min TTL)
- `refresh_token:{token}` - Refresh token data (30-day TTL)

**Dual Auth Middleware**:
- Web routes: Check Better Auth session (cookie)
- MCP routes: Check JWT (Bearer token) OR API key (msk_...)
- Both resolve to user_id for ownership checks

**Security Features**:
- PKCE (S256 code challenge) - Prevents interception
- Single-use tokens - Auth codes and refresh tokens deleted after use
- Token rotation - Each refresh issues new refresh token
- Hashed API keys - Only SHA-256 hash stored
- JWT verification - HS256 with issuer/audience validation

**New Environment Variables**:
- `JWT_SECRET` - 32+ byte secret for JWT signing

**Public `/mcp` endpoint** remains read-only, no auth required

### UI Changes
- Replace email gate modal with login modal (GitHub + Email options)
- Add login/logout button in header
- Show user avatar/name when logged in
- Update all CUD buttons to check session instead of email
- Remove `X-Subscriber-Email` header requirement from HTMX
- Add session-based CSRF protection
- **New**: User profile page with API key management
  - Generate new API key (shows once, then only hash stored)
  - List existing API keys (name, created, last used)
  - Revoke API keys
  - Copy MCP client config snippet

### Protected Endpoints (26 total, same as current)
All current email-gated endpoints become session-authenticated:
- Configs: POST /, PUT /:id, DELETE /:id, POST /:id/invalidate, POST /:id/refresh-analysis
- Skills: POST /, PUT /:id, DELETE /:id, POST /upload-zip, POST /:id/files, DELETE /:id/files/:fileId
- Extensions: POST /, PUT /:id, DELETE /:id, POST /:id/configs, POST /:id/configs/:configId, DELETE /:id/configs/:configId, POST /:id/invalidate
- Marketplaces: POST /, PUT /:id, DELETE /:id, POST /:id/extensions, POST /:id/extensions/:extensionId, DELETE /:id/extensions/:extensionId, POST /:id/invalidate
- Files/Plugins: POST /files/extensions/:extensionId, DELETE /files/:fileId, POST /plugins/:extensionId/:format/invalidate
- **NEW**: Convert endpoints require login

### Environment Variables
**New secrets/vars needed**:
- `BETTER_AUTH_SECRET` - 32+ character secret for sessions
- `GITHUB_CLIENT_ID` - GitHub OAuth app client ID
- `GITHUB_CLIENT_SECRET` - GitHub OAuth app secret
- `BETTER_AUTH_URL` - Base URL (production domain)
- `JWT_SECRET` - 32+ byte secret for MCP OAuth JWT signing

**New KV Namespace**:
- `OAUTH_TOKENS` - Store auth codes (5-min TTL) and refresh tokens (30-day TTL)

**Keep existing**:
- `EMAIL_API_KEY` - For OTP and migration emails
- `ADMIN_EMAIL` - For notifications
- `EMAIL_SUBSCRIPTIONS` - Repurpose for OTP codes or keep for newsletter

**Remove after migration**:
- Current email subscription logic from middleware (replace with session check)
- `MCP_ADMIN_TOKEN_HASH` - Replaced by OAuth

## Non-Requirements (Out of Scope)
- User-to-user sharing/collaboration
- Role-based access control (admin/user roles)
- Private configs (visibility toggle) - may add later
- Password-based authentication
- Multiple OAuth providers (Google, etc.) - GitHub + Email OTP only
- User profile editing beyond GitHub-provided info

## Technical Notes
- Use existing D1 adapter pattern from memory for Better Auth
- `nodejs_compat` already enabled in wrangler.jsonc
- Cookie-based sessions work with Hono
- HTMX needs updated headers (remove email, add CSRF)
- MCP OAuth requires HTTP endpoint auth (not streaming)

## Implementation Phases (suggested)
1. **Phase 1**: Database & Better Auth Setup
   - Add Better Auth tables (user, session, account, verification)
   - Add api_keys table for MCP OAuth
   - Add user_id columns to configs, extensions, marketplaces
   - Implement D1 adapter for Better Auth

2. **Phase 2**: Web Authentication (GitHub + Email OTP)
   - Better Auth configuration with GitHub OAuth
   - Email OTP plugin setup
   - Login/logout UI in header
   - Session middleware for web routes

3. **Phase 3**: User Profile & API Key Management
   - Profile page UI
   - API key generation/listing/revocation
   - MCP config snippet display

4. **Phase 4**: MCP OAuth Implementation
   - OAuth discovery endpoints (/.well-known/*)
   - Authorization endpoint (/oauth/authorize)
   - Token endpoint (/oauth/token)
   - JWT generation and validation
   - Dual auth middleware (session + JWT)

5. **Phase 5**: Ownership & Access Control
   - Update services to enforce ownership
   - Replace email-gate middleware with auth middleware
   - Convert endpoint protection
   - UI updates (login triggers, CUD protection)

6. **Phase 6**: Migration & Cleanup
   - Migrate existing data to owner's account
   - Send notification to email subscribers
   - Remove old MCP_ADMIN_TOKEN_HASH
   - Cleanup email gate code
   - Update documentation
