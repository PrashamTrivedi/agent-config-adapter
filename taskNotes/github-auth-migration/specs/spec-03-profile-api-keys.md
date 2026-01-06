# Spec 03: Profile & API Key Management

## Purpose
User profile page with API key management for MCP client authentication.

## Dependencies
- Phase 2 (Better Auth) complete

## Files to Create

### `src/services/api-key-service.ts`

```typescript
export class ApiKeyService {
  constructor(private db: D1Database) {}

  // Generate new API key - returns raw key (shown once) and stores hash
  async createKey(userId: string, name: string): Promise<{ key: string; id: string }>;

  // Validate API key by hash - returns key record if valid
  async validateKey(keyHash: string): Promise<ApiKey | null>;

  // List all keys for user - excludes hash
  async listKeys(userId: string): Promise<ApiKeyListItem[]>;

  // Revoke/deactivate a key
  async revokeKey(keyId: string, userId: string): Promise<boolean>;

  // Update last_used_at timestamp
  async updateLastUsed(keyId: string): Promise<void>;
}
```

Key format: `msk_` prefix + 32 random hex characters
Example: `msk_a1b2c3d4e5f6...`

### `src/routes/profile.ts`

Routes:
- `GET /profile` - Profile page (HTML)
- `GET /api/profile` - Profile data (JSON)
- `GET /api/profile/keys` - List API keys
- `POST /api/profile/keys` - Create new key
- `DELETE /api/profile/keys/:id` - Revoke key

### `src/views/profile.ts`

Profile page UI:
```html
<div class="profile-page">
  <!-- User Info Section -->
  <div class="user-info">
    <img src="${user.image}" class="avatar" />
    <h2>${user.name}</h2>
    <p>${user.email}</p>
  </div>

  <!-- API Keys Section -->
  <div class="api-keys">
    <h3>API Keys</h3>
    <button onclick="generateKey()">Generate New Key</button>
    <table>
      <thead>
        <tr><th>Name</th><th>Created</th><th>Last Used</th><th>Actions</th></tr>
      </thead>
      <tbody id="keys-list">
        <!-- HTMX populated -->
      </tbody>
    </table>
  </div>

  <!-- MCP Config Snippet -->
  <div class="mcp-config">
    <h3>MCP Client Configuration</h3>
    <pre><code>{
  "mcpServers": {
    "agent-config-adapter": {
      "type": "http",
      "url": "https://agent-config-adapter.workers.dev/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_API_KEY"
      }
    }
  }
}</code></pre>
  </div>
</div>
```

### `src/views/auth.ts`

Login page with options:
- GitHub OAuth button
- Email OTP form
- Return URL handling

## Key Generation Flow

1. User clicks "Generate New Key"
2. Modal appears asking for key name
3. Server generates key, stores hash
4. Modal shows key ONCE with copy button
5. User copies key
6. Key appears in list (name, created, last used only)

## Validation

```bash
# List keys (authenticated)
curl "http://localhost:9090/api/profile/keys" \
  -H "Cookie: better-auth.session_token=..."

# Create key
curl -X POST "http://localhost:9090/api/profile/keys" \
  -H "Cookie: better-auth.session_token=..." \
  -H "Content-Type: application/json" \
  -d '{"name": "Claude Desktop"}'

# Revoke key
curl -X DELETE "http://localhost:9090/api/profile/keys/key-id" \
  -H "Cookie: better-auth.session_token=..."
```

## UI Screenshots (Wireframe)

```
┌─────────────────────────────────────────────────────┐
│ Profile                                             │
├─────────────────────────────────────────────────────┤
│  ┌─────┐                                            │
│  │ IMG │  John Doe                                  │
│  └─────┘  john@example.com                          │
│                                                     │
├─────────────────────────────────────────────────────┤
│ API Keys                        [+ Generate New Key]│
├─────────────────────────────────────────────────────┤
│ Name           │ Created   │ Last Used │ Actions   │
│ Claude Desktop │ 2 days ago│ 1 hour ago│ [Revoke]  │
│ CI/CD Pipeline │ 1 week ago│ Never     │ [Revoke]  │
├─────────────────────────────────────────────────────┤
│ MCP Client Configuration                            │
│ ┌─────────────────────────────────────────────────┐│
│ │ { "mcpServers": { ... } }                       ││
│ └─────────────────────────────────────────────────┘│
│                                       [Copy Config] │
└─────────────────────────────────────────────────────┘
```
