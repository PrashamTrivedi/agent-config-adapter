# Purpose

Create a whitelist mechanism to allow select trusted users (1-2 people) to bypass email gating and have permanent CUD (Create, Update, Delete) access via API, MCP, or UI.

## Original Ask

We need a way to open the gate for select few (One or two people) to constantly update some section either by API or by MCP or BY UI... For rest of the world this is still gated...

## Complexity and the reason behind it

**Complexity Score: 2/5**

Reasoning:
- Email gate middleware already exists
- Just need to add whitelist check before subscription verification
- Whitelist can be stored in environment variable (simple list of emails)
- No database changes needed
- No UI changes needed (whitelisted users just work)
- MCP admin endpoint already exists for full access
- Simple enhancement to existing middleware

## Architectural changes required

None required. This is a simple enhancement to the existing email gate middleware:
- Add whitelist check before subscription verification
- Whitelist stored as environment variable (comma-separated emails)
- Falls through to normal subscription check if not whitelisted

## Backend changes required

### 1. Update `wrangler.jsonc`

Add whitelist environment variable:

```jsonc
{
  "vars": {
    // ... existing vars
    "WHITELISTED_EMAILS": "trusted.user@example.com,another.trusted@example.com"
  }
}
```

For production, set as secret:
```bash
npx wrangler secret put WHITELISTED_EMAILS
# Enter: trusted.user@example.com,another.trusted@example.com
```

### 2. Update `src/middleware/email-gate.ts`

Add whitelist bypass before subscription check:

```typescript
import type { Context, Next } from 'hono';
import { SubscriptionService } from '../services/subscription-service';

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Check if email is in whitelist
 */
function isWhitelisted(email: string, whitelist?: string): boolean {
  if (!whitelist) return false;

  const normalizedEmail = email.toLowerCase().trim();
  const whitelistedEmails = whitelist
    .split(',')
    .map(e => e.toLowerCase().trim())
    .filter(e => e.length > 0);

  return whitelistedEmails.includes(normalizedEmail);
}

export const emailGateMiddleware = async (c: Context, next: Next) => {
  const email =
    c.req.header('X-Subscriber-Email') || c.req.query('email') || '';

  if (!email) {
    return c.json(
      {
        error: 'Email required for uploads',
        subscription_required: true,
        subscription_url: '/subscriptions/form',
      },
      401
    );
  }

  if (!isValidEmail(email)) {
    return c.json({ error: 'Invalid email format' }, 400);
  }

  // NEW: Check whitelist first (bypass subscription check)
  if (isWhitelisted(email, c.env.WHITELISTED_EMAILS)) {
    c.set('subscriberEmail', email);
    c.set('isWhitelisted', true);  // Optional: flag for logging
    console.log(`[EmailGate] Whitelisted user: ${email}`);
    await next();
    return;
  }

  // Existing subscription check
  const subscriptionService = new SubscriptionService(
    c.env.EMAIL_SUBSCRIPTIONS
  );
  const isSubscribed = await subscriptionService.isSubscribed(email);

  if (!isSubscribed) {
    return c.json(
      {
        error: 'Email not subscribed',
        subscription_required: true,
        subscription_url: '/subscriptions/form',
      },
      403
    );
  }

  c.set('subscriberEmail', email);
  await next();
};
```

### 3. Update `.dev.vars.example`

Document the new variable:

```env
# ... existing vars

# Whitelisted emails (comma-separated) - bypass email subscription gate
# These users can perform CUD operations without subscribing
WHITELISTED_EMAILS=your.email@example.com
```

## Frontend changes required

None required. The whitelist works transparently:
- Whitelisted users provide their email via the same UI flow
- The gate check passes immediately
- No special UI needed for whitelisted users

## Access Methods for Whitelisted Users

### 1. API Access

Whitelisted users can use the standard API with their email:

```bash
# Create config
curl -X POST "https://api.example.com/api/configs" \
  -H "X-Subscriber-Email: trusted.user@example.com" \
  -H "Content-Type: application/json" \
  -d '{"name": "test", "type": "slash_command", ...}'

# Update config
curl -X PUT "https://api.example.com/api/configs/:id" \
  -H "X-Subscriber-Email: trusted.user@example.com" \
  -H "Content-Type: application/json" \
  -d '{"content": "updated content"}'

# Delete config
curl -X DELETE "https://api.example.com/api/configs/:id" \
  -H "X-Subscriber-Email: trusted.user@example.com"
```

### 2. MCP Access

Two options:

**Option A: Use existing MCP Admin endpoint (already available)**
```json
{
  "mcpServers": {
    "agent-config-admin": {
      "type": "http",
      "url": "https://api.example.com/mcp/admin",
      "headers": {
        "Authorization": "Bearer ADMIN_TOKEN"
      }
    }
  }
}
```

**Option B: Add email header support to public MCP (enhancement)**
```json
{
  "mcpServers": {
    "agent-config": {
      "type": "http",
      "url": "https://api.example.com/mcp",
      "headers": {
        "X-Subscriber-Email": "trusted.user@example.com"
      }
    }
  }
}
```

For Option B, would need to update MCP server to:
1. Extract email from headers
2. Expose write tools if whitelisted
3. Fall back to read-only for others

### 3. UI Access

Whitelisted users just enter their email once in the email gate modal:
- Email stored in localStorage (30-day expiration)
- All CUD operations work immediately
- No subscription verification delay

## Validation

### Test Cases

```bash
# Setup: Add test email to whitelist in .dev.vars
echo 'WHITELISTED_EMAILS=test.whitelist@example.com' >> .dev.vars

# Restart dev server
npm run dev

# 1. Test whitelisted user can create without subscription
curl -X POST "http://localhost:8787/api/configs" \
  -H "X-Subscriber-Email: test.whitelist@example.com" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Whitelist",
    "type": "slash_command",
    "original_format": "claude_code",
    "content": "Test content"
  }'
# Expected: 201 Created

# 2. Test non-whitelisted, non-subscribed user is blocked
curl -X POST "http://localhost:8787/api/configs" \
  -H "X-Subscriber-Email: random@example.com" \
  -H "Content-Type: application/json" \
  -d '{"name": "Test", "type": "slash_command", ...}'
# Expected: 403 Forbidden with subscription_required

# 3. Test case-insensitive whitelist matching
curl -X POST "http://localhost:8787/api/configs" \
  -H "X-Subscriber-Email: TEST.WHITELIST@EXAMPLE.COM" \
  -H "Content-Type: application/json" \
  -d '{"name": "Test", "type": "slash_command", ...}'
# Expected: 201 Created (case insensitive match)

# 4. Test empty whitelist (all users go through normal flow)
# Temporarily remove WHITELISTED_EMAILS from .dev.vars
curl -X POST "http://localhost:8787/api/configs" \
  -H "X-Subscriber-Email: test.whitelist@example.com" \
  -H "Content-Type: application/json" \
  -d '{"name": "Test", "type": "slash_command", ...}'
# Expected: 403 Forbidden (whitelist disabled, not subscribed)

# 5. Verify logging shows whitelist bypass
# Check server logs for: "[EmailGate] Whitelisted user: test.whitelist@example.com"
```

### UI Test Flow

1. Open browser to localhost:8787/configs
2. Click "Create Config" button
3. Enter whitelisted email in modal
4. Submit - modal should close immediately
5. Config creation form should load
6. Create config - should succeed without subscription

### Production Deployment

```bash
# 1. Set whitelist as secret (more secure than env var)
npx wrangler secret put WHITELISTED_EMAILS
# Enter: trusted.user1@example.com,trusted.user2@example.com

# 2. Deploy
npm run deploy

# 3. Verify
curl -X POST "https://production-url/api/configs" \
  -H "X-Subscriber-Email: trusted.user1@example.com" \
  -H "Content-Type: application/json" \
  -d '{"name": "Test", ...}'
```

## Security Considerations

1. **Whitelist stored as secret** - Not exposed in code or logs
2. **Email validation still applies** - Invalid emails rejected
3. **Logging** - Whitelist bypasses logged for audit
4. **Limited scope** - Only bypasses subscription check, not auth
5. **Easy revocation** - Remove email from secret, redeploy

## Future Enhancements (Not in Scope)

- Rate limiting per whitelisted user
- Audit log of whitelisted user actions
- Admin UI to manage whitelist
- Per-resource whitelist permissions
