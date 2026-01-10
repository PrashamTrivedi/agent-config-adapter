# HTTP Routes

Hono route handlers for REST API and HTML views.

## Route Patterns

- `/api/*`: JSON responses
- `/*` (no `/api`): HTML views
- Same logic, different presentation

## API Endpoints

### Configs
```
GET    /api/configs                    List all
GET    /api/configs/:id                Get one (redirects skills to /skills/:id)
GET    /api/configs/:id/format/:format Convert to format
POST   /api/configs                    Create
PUT    /api/configs/:id                Update
DELETE /api/configs/:id                Delete
POST   /api/configs/:id/invalidate     Invalidate cache
```

### Slash Commands
```
GET    /api/slash-commands             List with metadata
GET    /api/slash-commands/:id         Get with metadata
POST   /api/slash-commands/:id/convert Convert (body: { "userArguments": "optional" })
```

### Skills
```
GET    /api/skills                     List all
GET    /api/skills/:id                 Get with files
POST   /api/skills                     Create
POST   /api/skills/upload-zip          Create from ZIP (email gated)
PUT    /api/skills/:id                 Update
DELETE /api/skills/:id                 Delete
GET    /api/skills/:id/files           List files
POST   /api/skills/:id/files           Upload files (email gated)
GET    /api/skills/:id/files/:fileId   Download file
DELETE /api/skills/:id/files/:fileId   Delete file
GET    /api/skills/:id/download        Download as ZIP
```

### Extensions
```
GET    /api/extensions                           List all
GET    /api/extensions/:id                       Get with configs
GET    /api/extensions/:id/manifest/:format      Get manifest
POST   /api/extensions                           Create
PUT    /api/extensions/:id                       Update
DELETE /api/extensions/:id                       Delete
POST   /api/extensions/:id/configs               Add configs (batch)
POST   /api/extensions/:id/configs/:configId     Add single config
DELETE /api/extensions/:id/configs/:configId     Remove config
POST   /api/extensions/:id/invalidate            Invalidate cache
```

### Marketplaces
```
GET    /api/marketplaces                                List all
GET    /api/marketplaces/:id                            Get with extensions
GET    /api/marketplaces/:id/manifest                   Get manifest
POST   /api/marketplaces                                Create
PUT    /api/marketplaces/:id                            Update
DELETE /api/marketplaces/:id                            Delete
POST   /api/marketplaces/:id/extensions                 Add extensions (batch)
POST   /api/marketplaces/:id/extensions/:extensionId    Add single
DELETE /api/marketplaces/:id/extensions/:extensionId    Remove
POST   /api/marketplaces/:id/invalidate                 Invalidate cache
```

### Plugins
```
GET    /plugins/:extensionId/:format                    Browse files
GET    /plugins/:extensionId/:format/download           Download ZIP
GET    /plugins/:extensionId/gemini/definition          Gemini JSON (recommended)
GET    /plugins/:extensionId/:format/*                  Serve file
POST   /plugins/:extensionId/:format/invalidate         Regenerate
GET    /plugins/marketplaces/:marketplaceId/gemini/definition  Marketplace JSON
GET    /plugins/marketplaces/:marketplaceId/download    Marketplace ZIP
```

### Subscriptions
```
GET    /subscriptions/form                 Subscription form HTML
POST   /api/subscriptions/subscribe        Subscribe email
GET    /api/subscriptions/verify/:email    Check subscription
```

### Analytics
```
POST   /api/analytics/track                Track event
```

### Authentication
```
GET    /auth/login                         Login page (GitHub OAuth, Email OTP)
GET    /auth/logout                        Logout page
POST   /auth/logout                        Execute logout
POST   /api/auth/*                         Better Auth endpoints
```

## Email Gating

Protected endpoints require `X-Subscriber-Email` header:
- Skills: upload-zip, file uploads
- All CUD operations (26 total)

Error responses include `subscription_url` for user guidance.

## Route Files

- **auth.ts**: Login/logout with analytics tracking
- **configs.ts**: Config CRUD (redirects skills)
- **skills.ts**: Multi-file management
- **extensions.ts**: Extension bundling
- **marketplaces.ts**: Marketplace management
- **slash-command-converter.ts**: Converter API
- **plugins.ts**: Plugin downloads
- **files.ts**: Companion file operations
- **subscriptions.ts**: Email subscription
- **profile.ts**: User profile
- **onboarding.ts**: Onboarding flow
