# Spec 06: Data Migration & Cleanup

## Purpose
Migrate existing data to owner's account, notify email subscribers, and clean up old code.

## Dependencies
- All previous phases complete
- System tested and stable

## Tasks

### 1. Data Migration Script

Create `scripts/migrate-ownership.ts`:

```typescript
/**
 * Assigns all orphaned data (user_id = NULL) to a specific user
 * Run after owner logs in for the first time
 */

import { D1Database } from '@cloudflare/workers-types';

async function migrateOwnership(db: D1Database, ownerUserId: string) {
  const tables = ['configs', 'extensions', 'marketplaces'];

  for (const table of tables) {
    const result = await db.prepare(
      `UPDATE ${table} SET user_id = ? WHERE user_id IS NULL`
    ).bind(ownerUserId).run();

    console.log(`Migrated ${result.meta.changes} ${table} to owner`);
  }
}

// Usage: Called after first admin login
// migrateOwnership(env.DB, 'owner-user-id');
```

Alternative: Admin endpoint for triggering migration:

```typescript
// src/routes/admin.ts
adminRouter.post('/migrate-ownership', requireAuth, async (c) => {
  const userId = c.get('userId');

  // Verify this is the designated owner (first user or specific email)
  const user = c.get('user');
  if (user.email !== 'owner@example.com') {
    return c.json({ error: 'Not authorized' }, 403);
  }

  // Run migration
  const results = await migrateOwnership(c.env.DB, userId);
  return c.json({ success: true, results });
});
```

### 2. Email Subscriber Notification

Create `scripts/notify-subscribers.ts`:

```typescript
/**
 * Send notification to all email subscribers about auth change
 * One-time script run after deployment
 */

interface SubscriberNotification {
  email: string;
  subject: string;
  body: string;
}

async function notifySubscribers(
  kvNamespace: KVNamespace,
  emailApiKey: string
) {
  // List all subscriptions
  const list = await kvNamespace.list();
  const emails: string[] = [];

  for (const key of list.keys) {
    const data = await kvNamespace.get(key.name, 'json');
    if (data?.email) {
      emails.push(data.email);
    }
  }

  console.log(`Found ${emails.length} subscribers to notify`);

  // Send notification emails
  for (const email of emails) {
    await sendNotificationEmail(emailApiKey, email);
  }

  console.log('Notification complete');
}

async function sendNotificationEmail(apiKey: string, email: string) {
  const subject = 'Agent Config Adapter: New Login System';
  const body = `
Hi there,

We've upgraded Agent Config Adapter with a new authentication system!

What's new:
- Login with your GitHub account
- Manage your own configs, skills, and extensions
- API keys for MCP client integration

What you need to do:
- Visit https://agent-config-adapter.workers.dev
- Click "Login" and sign in with GitHub
- Your existing email subscription has been noted - thank you!

Questions? Reply to this email.

Best,
Agent Config Adapter Team
  `.trim();

  // Use existing email service
  await fetch('https://email-sender.api/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({ to: email, subject, body })
  });
}
```

### 3. Remove Old Code

**Files to delete:**
- `src/middleware/email-gate.ts`

**Code to remove from `src/index.ts`:**
```typescript
// REMOVE:
import { emailGateMiddleware } from './middleware/email-gate';
// ... and all usages
```

**Code to remove from `src/views/layout.ts`:**
```javascript
// REMOVE email gate modal HTML
// REMOVE email gate JavaScript functions:
// - hasValidEmail()
// - getStoredEmail()
// - showEmailGate()
// - closeEmailGate()
// - submitEmailGate()
// - requireEmail()
// - X-Subscriber-Email header logic
```

**Wrangler secret to remove:**
```bash
npx wrangler secret delete MCP_ADMIN_TOKEN_HASH
```

### 4. Update Documentation

**Files to update:**

`CLAUDE.md`:
- Remove email-gating documentation
- Add authentication documentation
- Update MCP endpoint auth docs
- Add profile/API key docs

`README.md`:
- Update setup instructions
- Add GitHub OAuth app setup
- Document authentication flow

### 5. KV Namespace Cleanup (Optional)

Decide what to do with EMAIL_SUBSCRIPTIONS:
- **Option A**: Keep for marketing/newsletter
- **Option B**: Repurpose for OTP codes
- **Option C**: Delete after migration

If keeping, rename binding for clarity:
```jsonc
// wrangler.jsonc
{
  "kv_namespaces": [
    // ... existing ...
    { "binding": "NEWSLETTER_SUBSCRIBERS", "id": "..." }
  ]
}
```

## Deployment Checklist

### Pre-Deployment
- [ ] All tests passing
- [ ] Environment variables set (prod)
- [ ] GitHub OAuth app configured (prod)
- [ ] Database migrations ready

### Deployment
- [ ] Apply database migrations
- [ ] Deploy updated code
- [ ] Verify health check

### Post-Deployment
- [ ] Owner logs in with GitHub
- [ ] Run ownership migration script
- [ ] Run subscriber notification script
- [ ] Verify MCP OAuth flow
- [ ] Remove MCP_ADMIN_TOKEN_HASH secret

### Verification
```bash
# Check migration
npx wrangler d1 execute agent-config-adapter --remote \
  --command="SELECT COUNT(*) as orphaned FROM configs WHERE user_id IS NULL;"

# Check user count
npx wrangler d1 execute agent-config-adapter --remote \
  --command="SELECT COUNT(*) FROM user;"
```

## Rollback Plan

If issues arise:

1. **Quick rollback**: Revert to previous deployment
   ```bash
   npx wrangler rollback
   ```

2. **Data rollback**: user_id columns are nullable, old code still works

3. **Feature flag**: Could add `AUTH_ENABLED=false` to disable auth temporarily

## Timeline Estimate

| Task | Effort |
|------|--------|
| Data migration script | 1 hour |
| Subscriber notification | 2 hours |
| Code cleanup | 2 hours |
| Documentation | 2 hours |
| Testing & verification | 2 hours |
| **Total** | **9 hours** |

## Notes

- Run migration during low-traffic period
- Have rollback plan ready
- Monitor error logs after deployment
- Consider staged rollout (specific users first)
