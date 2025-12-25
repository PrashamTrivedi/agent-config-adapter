# Purpose

Include UTM attribution data in admin email notifications when new users subscribe, so admin knows the source/campaign that brought each user.

## Original Ask

When we send new user email, Admin needs to know from where they came from... Using analytics.

## Complexity and the reason behind it

**Complexity Score: 2/5**

Reasoning:
- UTM persistence already implemented (cookie-based first-touch attribution)
- Email service already exists and sends admin notifications
- SubscriptionService already stores subscription data
- Simply need to:
  1. Pass UTM params through subscription flow
  2. Update email template to include UTM data
  3. Store UTM in subscription record for historical reference
- No architectural changes, no new infrastructure
- Straightforward data flow enhancement

## Architectural changes required

None required. The existing architecture supports this:
- UTM is already persisted via cookie middleware (`utm-persistence.ts`)
- AnalyticsService already extracts UTM from request
- EmailService already has admin notification capability
- SubscriptionService handles KV storage

## Backend changes required

### 1. Update `src/domain/types.ts`

Add UTM fields to SubscriptionRecord:

```typescript
export interface SubscriptionRecord {
  email: string;
  projectName: 'agentConfig';
  subscribedAt: string;
  ipAddress?: string;
  // NEW: UTM attribution data
  utm?: UTMParams;
}
```

### 2. Update `src/services/subscription-service.ts`

Accept and store UTM params:

```typescript
async subscribe(
  email: string,
  ipAddress?: string,
  utm?: UTMParams  // NEW parameter
): Promise<SubscriptionRecord> {
  const subscription: SubscriptionRecord = {
    email: normalizedEmail,
    projectName: 'agentConfig',
    subscribedAt: new Date().toISOString(),
    ipAddress,
    utm,  // Store UTM
  };
  // ... rest unchanged
}
```

### 3. Update `src/services/email-service.ts`

Update admin notification to include UTM:

```typescript
async sendSubscriptionNotification(
  subscriberEmail: string,
  subscribedAt: string,
  utm?: UTMParams  // NEW parameter
): Promise<void> {
  // Add UTM section to email template
  const utmSection = utm && (utm.source || utm.medium || utm.campaign) ? `
    <tr>
      <td style="padding: 12px 0; font-weight: 600; color: #374151;">Source:</td>
      <td style="padding: 12px 0; color: #6b7280;">${utm.source || 'organic'}</td>
    </tr>
    <tr>
      <td style="padding: 12px 0; font-weight: 600; color: #374151;">Medium:</td>
      <td style="padding: 12px 0; color: #6b7280;">${utm.medium || 'none'}</td>
    </tr>
    <tr>
      <td style="padding: 12px 0; font-weight: 600; color: #374151;">Campaign:</td>
      <td style="padding: 12px 0; color: #6b7280;">${utm.campaign || 'none'}</td>
    </tr>
  ` : '';

  // Insert into email template
}
```

### 4. Update `src/routes/subscriptions.ts`

Pass UTM through the subscription flow:

```typescript
subscriptionsRouter.post('/subscribe', async (c) => {
  // ... existing validation

  // Get persisted UTM from cookie (first-touch attribution)
  const analytics = new AnalyticsService(c.env.ANALYTICS);
  const utm = analytics.getPersistedUTM(c.req.raw);

  // Subscribe with UTM
  const subscription = await subscriptionService.subscribe(email, ipAddress, utm);

  // Send notification with UTM
  await emailService.sendSubscriptionNotification(
    email,
    subscription.subscribedAt,
    utm  // Pass UTM
  );
});
```

## Frontend changes required

None required. UTM is already captured and persisted by the cookie middleware.

## Validation

### Test Cases

```bash
# 1. Test subscription with UTM parameters
# First visit page with UTM (sets cookie)
curl -c cookies.txt "http://localhost:8787/?utm_source=github&utm_medium=readme&utm_campaign=launch"

# Then subscribe (cookie provides UTM)
curl -b cookies.txt -X POST "http://localhost:8787/api/subscriptions/subscribe" \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'

# 2. Verify admin email includes UTM
# - Check email received by admin
# - Should show: Source: github, Medium: readme, Campaign: launch

# 3. Test subscription without UTM
curl -X POST "http://localhost:8787/api/subscriptions/subscribe" \
  -H "Content-Type: application/json" \
  -d '{"email": "organic@example.com"}'

# - Admin email should show: Source: organic, Medium: none, Campaign: none
# - Or UTM section omitted entirely

# 4. Verify KV storage includes UTM
# Use wrangler to inspect KV value
npx wrangler kv:key get --binding EMAIL_SUBSCRIPTIONS "test@example.com"
# Should include utm field in JSON
```

### Expected Email Format

**New Admin Notification with UTM:**
```
Subject: New Waitlist Signup - Agent Config Adapter

+------------------------+
| New Waitlist Signup    |
+------------------------+
| Email: test@example.com|
| Project: agentConfig   |
| Subscribed: 2024-12-24 |
| Source: github         |  <-- NEW
| Medium: readme         |  <-- NEW
| Campaign: launch       |  <-- NEW
+------------------------+
```
