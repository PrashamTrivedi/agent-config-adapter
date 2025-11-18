# HTTP Routes

Hono route handlers for REST API and HTML views.

## Route Patterns

- `/api/*` routes: Return JSON responses
- `/*` routes (no `/api`): Return HTML views
- Same logic, different presentation

## Request Handling

- Use services layer for business logic
- Validate input using Hono's context methods
- Handle both JSON and form-data for PUT/POST endpoints
- Return appropriate HTTP status codes

## Response Formatting

### JSON Responses
```typescript
return c.json({ config, message: "Created" }, 201)
return c.json({ error: "Not found" }, 404)
```

### HTML Responses
```typescript
return c.html(configListView(configs))
return c.html(configDetailView(config))
```

## Route Files

- **configs.ts**: Config CRUD and conversions (redirects skills to `/skills`)
- **skills.ts**: Multi-file skill management (upload endpoints protected by email gate middleware)
- **extensions.ts**: Extension bundling
- **marketplaces.ts**: Marketplace management
- **slash-command-converter.ts**: Slash command converter API
- **plugins.ts**: Plugin file downloads and browsing
- **files.ts**: Skill companion file operations
- **subscriptions.ts**: Email subscription management and verification

## Skills Auto-Redirect

When config type is `skill`:
- `GET /configs/:id` → Redirect to `/skills/:id`
- `GET /configs/:id/edit` → Redirect to `/skills/:id/edit`
- Preserves UX for multi-file workflows

## Email Gating

Upload endpoints are protected by `emailGateMiddleware`:
- **Protected Routes**:
  - `POST /api/skills/upload-zip`: ZIP upload requires subscribed email
  - `POST /api/skills/:id/files`: Companion file upload requires subscribed email
- **Verification**: Checks `X-Subscriber-Email` header against EMAIL_SUBSCRIPTIONS KV
- **Error Responses**:
  - 401: Email not provided
  - 400: Invalid email format
  - 403: Email not subscribed (includes subscription_url)
