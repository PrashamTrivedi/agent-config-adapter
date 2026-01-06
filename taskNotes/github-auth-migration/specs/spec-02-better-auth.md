# Spec 02: Better Auth Integration

## Purpose
Implement Better Auth for web authentication with GitHub OAuth and Email OTP.

## Dependencies
- Phase 1 (Database) complete

## Files to Create

### `src/auth/d1-adapter.ts`
D1 database adapter for Better Auth. Copy from memory guide "Better Auth Implementation Guide - Cloudflare Workers" with adjustments for existing project structure.

Key functions:
- `create()` - Insert records
- `findOne()` - Query single record
- `findMany()` - Query multiple records
- `update()` - Update records
- `delete()` - Delete records
- `count()` - Count records

### `src/auth/better-auth.ts`
Better Auth configuration:
- GitHub OAuth provider
- Email OTP plugin
- 7-day sessions with daily refresh
- Cookie-based session storage

### `src/auth/session-middleware.ts`
Middleware functions:
- `sessionMiddleware` - Attach session to context (runs on all routes)
- `requireAuth` - Protect routes requiring authentication

### `src/auth/types.ts`
TypeScript types for auth context:
```typescript
export interface AuthContext {
  session: Session | null;
  user: User | null;
  userId: string | null;
}
```

### `src/routes/auth.ts`
Mount Better Auth handler:
```typescript
app.on(['GET', 'POST'], '/api/auth/*', async (c) => {
  const auth = createAuth(c.env);
  return auth.handler(c.req.raw);
});
```

## Environment Setup

### Local Development (`.dev.vars`)
```
BETTER_AUTH_SECRET=dev-secret-32-chars-minimum-here
BETTER_AUTH_URL=http://localhost:9090
GITHUB_CLIENT_ID=your-dev-client-id
GITHUB_CLIENT_SECRET=your-dev-client-secret
```

### Production (wrangler secrets)
```bash
npx wrangler secret put BETTER_AUTH_SECRET
npx wrangler secret put GITHUB_CLIENT_ID
npx wrangler secret put GITHUB_CLIENT_SECRET
```

## GitHub OAuth App Setup

1. Go to GitHub Settings → Developer Settings → OAuth Apps
2. Create new OAuth App:
   - Homepage: `https://agent-config-adapter.workers.dev`
   - Callback: `https://agent-config-adapter.workers.dev/api/auth/callback/github`
3. Copy Client ID and Secret

## Validation

```bash
# Test OAuth initiation
curl -I "http://localhost:9090/api/auth/sign-in/social?provider=github&callbackURL=/"

# Test session endpoint
curl "http://localhost:9090/api/auth/session"

# Test OTP send
curl -X POST "http://localhost:9090/api/auth/email-otp/send-verification-otp" \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "type": "sign-in"}'
```

## Notes

- Email OTP uses existing EMAIL_API_KEY for sending
- Session cookies are httpOnly and secure (production)
- GitHub avatar and name automatically populated
