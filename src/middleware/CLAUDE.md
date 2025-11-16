# Middleware

Request processing middleware for Hono routes.

## Email Gate Middleware

Protects upload endpoints from abuse using email subscription verification.

### Purpose

- Prevent spam and abuse of upload functionality
- Build user community through email subscriptions
- Simple access control without full authentication system

### How It Works

1. **Extract Email**: Checks `X-Subscriber-Email` header or `email` query parameter
2. **Validate Format**: Basic email format validation (regex)
3. **Verify Subscription**: Checks EMAIL_SUBSCRIPTIONS KV namespace
4. **Grant or Deny Access**: Allows request to proceed or returns error

### Protected Endpoints

- `POST /api/skills/upload-zip` - ZIP file uploads
- `POST /api/skills/:id/files` - Companion file uploads

### Usage

```typescript
import { emailGateMiddleware } from '../middleware/email-gate';

// Apply to specific routes
skillsRouter.post('/upload-zip', emailGateMiddleware, async (c) => {
  // Email verified, safe to proceed
  const email = c.get('subscriberEmail'); // Email stored in context
  // ... handle upload
});
```

### Error Responses

**401 Unauthorized** - No email provided:
```json
{
  "error": "Email required for uploads",
  "subscription_required": true,
  "subscription_url": "/subscriptions/form"
}
```

**400 Bad Request** - Invalid email format:
```json
{
  "error": "Invalid email format"
}
```

**403 Forbidden** - Email not subscribed:
```json
{
  "error": "Email not subscribed",
  "subscription_required": true,
  "subscription_url": "/subscriptions/form"
}
```

### Implementation Details

- Email normalization: lowercase, trimmed
- Context storage: Verified email stored as `subscriberEmail` in Hono context
- Non-blocking: Subscription check is fast (KV lookup)
- User-friendly: Provides subscription URL in error responses

### Future Enhancements

- Rate limiting per email address
- Temporary access tokens
- Integration with full authentication system
- Upload quotas per subscriber
