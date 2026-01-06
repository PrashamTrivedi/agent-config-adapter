# Spec 05: Ownership Enforcement

## Purpose
Enforce user ownership on CUD operations. Anonymous users can read, authenticated users can write their own resources.

## Dependencies
- Phase 2 (Better Auth) complete
- Phase 4 (MCP OAuth) complete

## Files to Modify

### `src/services/config-service.ts`

Add ownership checks:

```typescript
export class ConfigService {
  // Create - assign user_id
  async createConfig(input: CreateConfigInput, userId?: string): Promise<Config> {
    const id = nanoid();
    await this.db.prepare(
      'INSERT INTO configs (id, name, type, original_format, content, user_id) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(id, input.name, input.type, input.original_format, input.content, userId || null).run();
    // ...
  }

  // Update - check ownership
  async updateConfig(id: string, input: UpdateConfigInput, userId?: string): Promise<Config | null> {
    if (userId) {
      const config = await this.getConfig(id);
      if (config?.user_id && config.user_id !== userId) {
        throw new Error('Not authorized to update this config');
      }
    }
    // ... existing update logic
  }

  // Delete - check ownership
  async deleteConfig(id: string, userId?: string): Promise<boolean> {
    if (userId) {
      const config = await this.getConfig(id);
      if (config?.user_id && config.user_id !== userId) {
        throw new Error('Not authorized to delete this config');
      }
    }
    // ... existing delete logic
  }
}
```

### `src/services/extension-service.ts`

Same pattern:
- `createExtension()` - assign user_id
- `updateExtension()` - check ownership
- `deleteExtension()` - check ownership

### `src/services/marketplace-service.ts`

Same pattern for marketplaces.

### `src/services/skills-service.ts`

Same pattern for skills (type='skill' configs).

### `src/routes/configs.ts`

Update route handlers:

```typescript
// Create
configsRouter.post('/', sessionMiddleware, requireAuth, emailGateMiddleware, async (c) => {
  const userId = c.get('userId');  // From session
  // ... parse input
  const config = await configService.createConfig(input, userId);
  // ...
});

// Update
configsRouter.put('/:id', sessionMiddleware, requireAuth, emailGateMiddleware, async (c) => {
  const userId = c.get('userId');
  try {
    const config = await configService.updateConfig(id, input, userId);
    // ...
  } catch (error) {
    if (error.message.includes('Not authorized')) {
      return c.json({ error: 'Not authorized to update this config' }, 403);
    }
    throw error;
  }
});

// Delete
configsRouter.delete('/:id', sessionMiddleware, requireAuth, emailGateMiddleware, async (c) => {
  const userId = c.get('userId');
  try {
    await configService.deleteConfig(id, userId);
    // ...
  } catch (error) {
    if (error.message.includes('Not authorized')) {
      return c.json({ error: 'Not authorized to delete this config' }, 403);
    }
    throw error;
  }
});

// Convert - now requires auth
configsRouter.get('/:id/format/:format', sessionMiddleware, requireAuth, async (c) => {
  // ... conversion logic
});
```

### `src/routes/extensions.ts`, `src/routes/marketplaces.ts`, `src/routes/skills.ts`

Apply same pattern to all CUD routes.

### `src/middleware/auth-gate.ts` (replaces email-gate.ts)

New auth middleware:

```typescript
import { createAuth } from '../auth/better-auth';

export const authGateMiddleware = async (c: Context, next: Next) => {
  const session = c.get('session');
  const user = c.get('user');

  if (!user) {
    // Check if this is an API request
    const accept = c.req.header('Accept') || '';
    if (accept.includes('application/json')) {
      return c.json({
        error: 'Authentication required',
        login_url: '/auth/login',
      }, 401);
    }
    // Redirect to login for HTML requests
    const returnUrl = encodeURIComponent(c.req.url);
    return c.redirect(`/auth/login?return=${returnUrl}`);
  }

  await next();
};
```

### `src/index.ts`

Update middleware stack:

```typescript
import { sessionMiddleware, requireAuth } from './auth/session-middleware';
import { mcpAuthMiddleware } from './oauth/middleware';

// Apply session middleware globally
app.use('*', sessionMiddleware);

// Mount auth routes
app.route('/api/auth', authRouter);

// Mount OAuth routes (public)
app.route('/', oauthRouter);

// Mount profile routes (authenticated)
app.route('/profile', profileRouter);

// MCP public endpoint (read-only, no auth)
app.post('/mcp', async (c) => {
  const server = createMCPServer(c.env, 'readonly');
  return handleMCPStreamable(c.req.raw, server);
});

// MCP authenticated endpoint (full access)
app.post('/mcp/admin', mcpAuthMiddleware, async (c) => {
  const userId = c.get('userId');
  const server = createMCPServer(c.env, 'full', userId);
  return handleMCPStreamable(c.req.raw, server);
});
```

## UI Updates

### `src/views/layout.ts`

Replace email gate JavaScript:

```javascript
// OLD: requireEmail()
// NEW: requireAuth()

window.requireAuth = function(callback) {
  // Check if user is logged in (session exists)
  if (window.__user) {
    callback();
  } else {
    // Redirect to login with return URL
    const returnUrl = encodeURIComponent(window.location.href);
    window.location.href = '/auth/login?return=' + returnUrl;
  }
};

// Inject user data from server
window.__user = ${JSON.stringify(user || null)};
```

### Update all CUD buttons

Find and replace all `onclick="requireEmail(..."` with `onclick="requireAuth(..."`:
- src/views/configs.ts
- src/views/skills.ts
- src/views/extensions.ts
- src/views/marketplaces.ts
- src/views/plugin-browser.ts

## Domain Types Update

### `src/domain/types.ts`

Add user_id to existing types:

```typescript
export interface Config {
  // ... existing fields
  user_id?: string | null;
}

export interface Extension {
  // ... existing fields
  user_id?: string | null;
}

export interface Marketplace {
  // ... existing fields
  user_id?: string | null;
}
```

## Validation

### Anonymous User Tests

```bash
# Browse configs - allowed
curl "http://localhost:9090/api/configs"  # 200 OK

# View config - allowed
curl "http://localhost:9090/api/configs/abc123"  # 200 OK

# Convert config - blocked
curl "http://localhost:9090/api/configs/abc123/format/gemini"  # 401

# Create config - blocked
curl -X POST "http://localhost:9090/api/configs" \
  -H "Content-Type: application/json" \
  -d '{"name": "test"}'  # 401

# Copy button - redirects to login (UI test)
```

### Authenticated User Tests

```bash
# Create config - allowed (assigned to user)
curl -X POST "http://localhost:9090/api/configs" \
  -H "Cookie: better-auth.session_token=..." \
  -d '{"name": "My Config", ...}'  # 201 Created

# Update own config - allowed
curl -X PUT "http://localhost:9090/api/configs/my-config-id" \
  -H "Cookie: better-auth.session_token=..." \
  -d '{"name": "Updated"}'  # 200 OK

# Update other's config - blocked
curl -X PUT "http://localhost:9090/api/configs/other-user-config" \
  -H "Cookie: better-auth.session_token=..."  # 403 Forbidden

# Delete other's config - blocked
curl -X DELETE "http://localhost:9090/api/configs/other-user-config" \
  -H "Cookie: better-auth.session_token=..."  # 403 Forbidden
```

### MCP Tests

```bash
# Public MCP - read allowed
curl -X POST "http://localhost:9090/mcp" \
  -d '{"jsonrpc":"2.0","method":"tools/list","id":1}'  # 200

# Admin MCP without auth - blocked
curl -X POST "http://localhost:9090/mcp/admin" \
  -d '{"jsonrpc":"2.0","method":"tools/list","id":1}'  # 401

# Admin MCP with JWT - allowed
curl -X POST "http://localhost:9090/mcp/admin" \
  -H "Authorization: Bearer eyJ..." \
  -d '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"create_config",...},"id":1}'
```

## Notes

- Orphaned data (user_id = NULL) is read-only for all users
- System/admin user can be created later for managing orphaned data
- Current email-gate middleware will be removed in Phase 6
