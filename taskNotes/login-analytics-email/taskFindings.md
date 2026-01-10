# Login Analytics and Admin Email Notifications

## Purpose

Enhance the login flow with comprehensive analytics tracking (login method, referrer, outcomes) and update admin email notifications when users log in.

## Original Ask

I need analytics to be updated for the login flow with the following tracking requirements:
1. What login method is used (e.g., GitHub OAuth, etc.)
2. From where does the user land on the login page (referrer/source page tracking)
3. What does the user do after they move away from login page - track outcomes: Success, Fail, or Abandoned

Additionally, the admin email functionality needs to be updated when a user logs in.

**Context:**
- This is for the agent-config-adapter project (Cloudflare Workers, Hono)
- The project has GitHub OAuth authentication
- Admin email notifications are sent via Cloudflare Email Routing
- The project uses Cloudflare Analytics (check taskNotes/cloudflare-analytics-integration for existing analytics setup)

## Complexity and the reason behind it

**Complexity Score: 2/5** (Simplified)

Reasoning:
- Extends existing AnalyticsService and EmailService (no new infrastructure)
- New analytics event types: login_page_view, login_attempt, login_success, login_fail, login_abandoned
- **Simplified:** Cookie-based referrer storage (survives OAuth redirect)
- **Simplified:** Wrapper-based tracking in auth routes (no Better Auth hooks)
- **Simplified:** Best-effort abandoned tracking via sendBeacon (acceptable if quick close misses)
- Admin email on successful login only

## Architectural changes required

### No Major Architectural Changes Needed

The existing architecture supports this feature:

1. **Analytics Engine** - Already configured in `wrangler.jsonc` with `ANALYTICS` binding
2. **AnalyticsService** - Exists at `src/services/analytics-service.ts`
3. **EmailService** - Exists at `src/services/email-service.ts`
4. **Better Auth** - Configured at `src/auth/better-auth.ts` with GitHub OAuth + Email OTP
5. **Auth Routes** - Exist at `src/routes/auth.ts`

### New Types Required

Add to `src/domain/types.ts`:

```typescript
// Add to AnalyticsEventType union
export type AnalyticsEventType =
  | 'landing'
  | 'page_view'
  // ... existing types ...
  // NEW login analytics events:
  | 'login_page_view'      // User lands on login page
  | 'login_attempt'        // User initiates login (GitHub OAuth or OTP send)
  | 'login_success'        // User successfully logs in
  | 'login_fail'           // Login attempt failed
  | 'login_abandoned';     // User left login page without completing

// NEW: Login analytics metadata
export interface LoginAnalyticsMetadata extends AnalyticsMetadata {
  loginMethod?: 'github' | 'email_otp';  // Which auth method used
  loginReferrer?: string;                 // Page that sent user to login
  loginSource?: string;                   // utm_source or direct
  loginOutcome?: 'success' | 'fail' | 'abandoned';
  errorType?: string;                     // For failed logins
  returnUrl?: string;                     // Where user intended to go
}
```

## Backend changes required

### 1. Update Analytics Service (`src/services/analytics-service.ts`)

Add login-specific tracking methods:

```typescript
/**
 * Track login page view
 */
async trackLoginPageView(
  request: Request,
  metadata: {
    referrer?: string;
    returnUrl?: string;
  }
): Promise<void> {
  await this.trackEvent(request, 'login_page_view', {
    loginReferrer: metadata.referrer || request.headers.get('referer') || 'direct',
    returnUrl: metadata.returnUrl,
  });
}

/**
 * Track login attempt (user initiated auth)
 */
async trackLoginAttempt(
  request: Request,
  method: 'github' | 'email_otp'
): Promise<void> {
  await this.trackEvent(request, 'login_attempt', {
    loginMethod: method,
    loginReferrer: request.headers.get('referer') || 'direct',
  });
}

/**
 * Track login success
 */
async trackLoginSuccess(
  request: Request,
  method: 'github' | 'email_otp',
  userId: string
): Promise<void> {
  await this.trackEvent(request, 'login_success', {
    loginMethod: method,
    loginOutcome: 'success',
    userId,
  });
}

/**
 * Track login failure
 */
async trackLoginFail(
  request: Request,
  method: 'github' | 'email_otp',
  errorType: string
): Promise<void> {
  await this.trackEvent(request, 'login_fail', {
    loginMethod: method,
    loginOutcome: 'fail',
    errorType,
  });
}

/**
 * Track login abandoned (called client-side via /api/analytics/track)
 */
async trackLoginAbandoned(
  request: Request,
  metadata?: { loginMethod?: string }
): Promise<void> {
  await this.trackEvent(request, 'login_abandoned', {
    loginOutcome: 'abandoned',
    ...metadata,
  });
}
```

### 2. Update Email Service (`src/services/email-service.ts`)

Add login notification method:

```typescript
/**
 * Send admin notification about user login
 */
async sendLoginNotification(
  userEmail: string,
  userName: string,
  loginMethod: 'github' | 'email_otp',
  loginAt: string
): Promise<void> {
  const methodLabel = loginMethod === 'github' ? 'GitHub OAuth' : 'Email OTP';

  await this.sendEmail({
    from: `Agent Config Adapter <${this.senderEmail}>`,
    to: [this.adminEmail],
    subject: 'User Login - Agent Config Adapter',
    htmlBody: `
      <html>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0;">
            <h2 style="margin: 0; font-size: 24px;">User Login</h2>
          </div>
          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 12px 0; font-weight: 600; color: #374151; width: 140px;">User:</td>
                <td style="padding: 12px 0; color: #6b7280;">${userName}</td>
              </tr>
              <tr>
                <td style="padding: 12px 0; font-weight: 600; color: #374151;">Email:</td>
                <td style="padding: 12px 0; color: #6b7280;">${userEmail}</td>
              </tr>
              <tr>
                <td style="padding: 12px 0; font-weight: 600; color: #374151;">Login Method:</td>
                <td style="padding: 12px 0; color: #6b7280;">${methodLabel}</td>
              </tr>
              <tr>
                <td style="padding: 12px 0; font-weight: 600; color: #374151;">Login Time:</td>
                <td style="padding: 12px 0; color: #6b7280;">${loginAt}</td>
              </tr>
            </table>
          </div>
        </body>
      </html>
    `,
  });
}
```

### 3. Update Auth Routes (`src/routes/auth.ts`)

Add analytics tracking to login page and callbacks:

```typescript
// Update login page route
authUIRouter.get('/login', async (c) => {
  const returnUrl = c.req.query('return') || '/';
  const error = c.req.query('error');
  const referrer = c.req.header('Referer') || 'direct';

  // Track login page view
  const analytics = new AnalyticsService(c.env.ANALYTICS);
  await analytics.trackLoginPageView(c.req.raw, {
    referrer,
    returnUrl,
  });

  // Store referrer in session/cookie for post-OAuth tracking
  // ... existing login page content with referrer stored in hidden field
});
```

### 4. Wrapper-based Tracking in `src/routes/auth.ts`

**Simplified approach:** Track directly in auth route handlers (no Better Auth hooks).

```typescript
authRouter.all('/*', async (c) => {
  const auth = createAuth(c.env);
  const url = new URL(c.req.url);
  const pathname = url.pathname.replace('/api/auth', '');

  // Track login attempts before processing
  const analytics = new AnalyticsService(c.env.ANALYTICS);

  if (pathname === '/sign-in/social' && c.req.method === 'POST') {
    const body = await c.req.json();
    if (body.provider === 'github') {
      await analytics.trackLoginAttempt(c.req.raw, 'github');
    }
  }

  if (pathname === '/email-otp/send-verification-otp' && c.req.method === 'POST') {
    await analytics.trackLoginAttempt(c.req.raw, 'email_otp');
  }

  // Process auth request
  const response = await auth.handler(c.req.raw);

  // Track outcomes after processing
  if (pathname.startsWith('/callback/github')) {
    if (response.status === 302) {
      // Check if this is a success redirect
      const location = response.headers.get('location');
      if (location && !location.includes('error')) {
        // Success - get user from session
        const session = await auth.api.getSession({ headers: c.req.raw.headers });
        if (session?.user) {
          await analytics.trackLoginSuccess(c.req.raw, 'github', session.user.id);

          const emailService = new EmailService(c.env.EMAIL_API_KEY, c.env.ADMIN_EMAIL);
          await emailService.sendLoginNotification(
            session.user.email,
            session.user.name,
            'github',
            new Date().toISOString()
          );
        }
      } else {
        await analytics.trackLoginFail(c.req.raw, 'github', 'oauth_callback_error');
      }
    }
  }

  if (pathname === '/sign-in/email-otp' && c.req.method === 'POST') {
    if (response.status === 200) {
      const responseData = await response.clone().json();
      if (responseData.user) {
        await analytics.trackLoginSuccess(c.req.raw, 'email_otp', responseData.user.id);

        const emailService = new EmailService(c.env.EMAIL_API_KEY, c.env.ADMIN_EMAIL);
        await emailService.sendLoginNotification(
          responseData.user.email,
          responseData.user.name,
          'email_otp',
          new Date().toISOString()
        );
      }
    } else {
      await analytics.trackLoginFail(c.req.raw, 'email_otp', 'invalid_otp');
    }
  }

  return response;
});
```

### 5. Update Domain Types (`src/domain/types.ts`)

Add new analytics event types:

```typescript
export type AnalyticsEventType =
  | 'landing'
  | 'page_view'
  | 'onboarding_view'
  | 'configs_browse'
  | 'config_view'
  | 'config_conversion'
  | 'slash_command_convert'
  | 'email_gate_view'
  | 'email_submit'
  | 'plugin_browse'
  | 'marketplace_browse'
  | 'extension_download'
  | 'skill_download'
  // NEW login tracking events
  | 'login_page_view'
  | 'login_attempt'
  | 'login_success'
  | 'login_fail'
  | 'login_abandoned';

export interface AnalyticsMetadata {
  userId?: string;
  sessionId?: string;
  configFormat?: AgentFormat;
  configType?: ConfigType;
  configName?: string;
  onboardingICP?: 'no-code-builders' | 'multi-tool-orgs' | 'ai-pilot-teams';
  conversionTarget?: string;
  timeSpent?: number;
  // NEW login tracking fields
  loginMethod?: 'github' | 'email_otp';
  loginReferrer?: string;
  loginOutcome?: 'success' | 'fail' | 'abandoned';
  errorType?: string;
  returnUrl?: string;
  [key: string]: string | number | undefined;
}
```

## Frontend changes required

### 1. Update Login Page (`src/routes/auth.ts` - Login UI)

**Simplified approach:** Cookie-based referrer + best-effort abandoned tracking.

```html
<!-- Add to login page template -->
<script>
  // Track page entry for abandoned detection (best-effort via sendBeacon)
  const loginEntryTime = Date.now();
  let loginCompleted = false;

  // Set referrer cookie on page load (survives OAuth redirect)
  document.cookie = 'login_referrer=' + encodeURIComponent(document.referrer || 'direct') + '; path=/; max-age=300';

  // Best-effort abandoned tracking
  window.addEventListener('beforeunload', () => {
    if (!loginCompleted) {
      navigator.sendBeacon('/api/analytics/track', JSON.stringify({
        event: 'login_abandoned',
        metadata: { timeSpent: Math.floor((Date.now() - loginEntryTime) / 1000) }
      }));
    }
  });

  // Mark login as started when auth begins
  function markLoginStarted() { loginCompleted = true; }
</script>
```

Update existing `signInWithGitHub()` and OTP functions to call `markLoginStarted()` before redirect/success.

### 2. Update Analytics Endpoint (`src/index.ts`)

The existing `/api/analytics/track` endpoint already handles client-side events. Ensure it handles new login event types:

```typescript
// Client-side analytics tracking endpoint (already exists)
app.post('/api/analytics/track', async (c) => {
  try {
    const analytics = new AnalyticsService(c.env.ANALYTICS);
    const { event, metadata } = await c.req.json();

    // Validate login events
    const validLoginEvents = ['login_page_view', 'login_attempt', 'login_success', 'login_fail', 'login_abandoned'];
    if (validLoginEvents.includes(event)) {
      await analytics.trackEvent(c.req.raw, event, metadata);
    } else {
      // Handle other events as before
      await analytics.trackEvent(c.req.raw, event, metadata);
    }

    return c.json({ success: true });
  } catch (error) {
    return c.json({ success: false }, 500);
  }
});
```

## Acceptance Criteria

1. **Login Method Tracking**
   - [ ] GitHub OAuth login attempts are tracked with `login_attempt` event and `loginMethod: 'github'`
   - [ ] Email OTP login attempts are tracked with `login_attempt` event and `loginMethod: 'email_otp'`
   - [ ] Login method is recorded in Analytics Engine blob fields

2. **Referrer/Source Tracking**
   - [ ] Page that sent user to login is captured (HTTP Referer header)
   - [ ] Return URL parameter is tracked
   - [ ] UTM parameters are persisted through OAuth redirect flow
   - [ ] Direct visits are recorded as 'direct'

3. **Login Outcome Tracking**
   - [ ] Successful logins trigger `login_success` event with user ID
   - [ ] Failed logins trigger `login_fail` event with error type
   - [ ] Abandoned logins (user leaves page) trigger `login_abandoned` event via beacon API
   - [ ] Outcome is recorded in Analytics Engine

4. **Admin Email Notifications**
   - [ ] Admin receives email notification on each successful login
   - [ ] Email contains: user name, email, login method, timestamp
   - [ ] Email uses consistent Neural Lab design theme

5. **Analytics Data Quality**
   - [ ] Session ID links all login events for a user journey
   - [ ] Analytics failures don't break login flow
   - [ ] No PII (passwords, OTP codes) stored in analytics

## Validation

### Backend API Testing

```bash
# 1. Start dev server
npm run dev

# 2. Test login page tracking
curl -X GET "http://localhost:8787/auth/login?return=/profile" \
  -H "Referer: http://localhost:8787/configs"
# Verify: login_page_view event tracked

# 3. Test GitHub OAuth initiation
curl -X POST "http://localhost:8787/api/auth/sign-in/social" \
  -H "Content-Type: application/json" \
  -d '{"provider":"github","callbackURL":"/"}'
# Verify: login_attempt event tracked with loginMethod: 'github'

# 4. Test Email OTP send
curl -X POST "http://localhost:8787/api/auth/email-otp/send-verification-otp" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","type":"sign-in"}'
# Verify: login_attempt event tracked with loginMethod: 'email_otp'

# 5. Test abandoned tracking (client-side beacon simulation)
curl -X POST "http://localhost:8787/api/analytics/track" \
  -H "Content-Type: application/json" \
  -d '{"event":"login_abandoned","metadata":{"loginReferrer":"/configs","timeSpent":45}}'
# Verify: login_abandoned event tracked
```

### Analytics Engine Queries

```sql
-- Login funnel analysis
SELECT
  blob1 AS event,
  blob14 AS login_method,  -- Adjust blob index based on implementation
  COUNT(*) AS count,
  COUNT(DISTINCT index1) AS unique_sessions
FROM user_analytics
WHERE blob1 LIKE 'login_%'
  AND timestamp >= NOW() - INTERVAL '7' DAY
GROUP BY blob1, blob14
ORDER BY
  CASE blob1
    WHEN 'login_page_view' THEN 1
    WHEN 'login_attempt' THEN 2
    WHEN 'login_success' THEN 3
    WHEN 'login_fail' THEN 4
    WHEN 'login_abandoned' THEN 5
  END;

-- Login method distribution
SELECT
  blob14 AS login_method,
  SUM(CASE WHEN blob1 = 'login_attempt' THEN 1 ELSE 0 END) AS attempts,
  SUM(CASE WHEN blob1 = 'login_success' THEN 1 ELSE 0 END) AS successes,
  SUM(CASE WHEN blob1 = 'login_fail' THEN 1 ELSE 0 END) AS failures,
  SUM(CASE WHEN blob1 = 'login_success' THEN 1 ELSE 0 END) * 100.0 /
    NULLIF(SUM(CASE WHEN blob1 = 'login_attempt' THEN 1 ELSE 0 END), 0) AS success_rate
FROM user_analytics
WHERE blob1 IN ('login_attempt', 'login_success', 'login_fail')
  AND timestamp >= NOW() - INTERVAL '30' DAY
GROUP BY blob14;

-- Login referrer analysis
SELECT
  blob15 AS referrer,  -- Adjust blob index
  COUNT(*) AS login_page_views,
  SUM(CASE WHEN blob1 = 'login_success' THEN 1 ELSE 0 END) AS conversions
FROM user_analytics
WHERE blob1 IN ('login_page_view', 'login_success')
  AND timestamp >= NOW() - INTERVAL '30' DAY
GROUP BY blob15
ORDER BY login_page_views DESC
LIMIT 20;

-- Abandoned login analysis
SELECT
  blob15 AS referrer,
  AVG(double2) AS avg_time_before_abandon,
  COUNT(*) AS abandoned_count
FROM user_analytics
WHERE blob1 = 'login_abandoned'
  AND timestamp >= NOW() - INTERVAL '7' DAY
GROUP BY blob15
ORDER BY abandoned_count DESC;
```

### Frontend User Steps

1. **Test Login Page View Tracking**
   - Open browser DevTools Network tab
   - Navigate to `/auth/login` from `/configs`
   - Verify: Analytics beacon sent with `login_page_view` event
   - Verify: `loginReferrer` contains `/configs`

2. **Test GitHub OAuth Flow**
   - Click "Continue with GitHub" button
   - Verify: Analytics beacon sent with `login_attempt` and `loginMethod: 'github'`
   - Complete GitHub OAuth
   - Verify: Admin email received with login details

3. **Test Email OTP Flow**
   - Enter email and click "Send Code"
   - Verify: Analytics beacon sent with `login_attempt` and `loginMethod: 'email_otp'`
   - Enter OTP and verify
   - Verify: Admin email received with login details

4. **Test Abandoned Login**
   - Navigate to `/auth/login`
   - Wait a few seconds
   - Close tab or navigate away
   - Verify: Analytics beacon sent with `login_abandoned` event (via sendBeacon)

### Test Commands

```bash
# Run all tests
npm test

# Run analytics-related tests
npm test -- --grep "analytics"

# Run auth-related tests
npm test -- --grep "auth"

# Run with coverage
npm test -- --run --coverage
```

## Implementation Order (Simplified)

1. **Domain Types** - Add login event types to AnalyticsEventType union + metadata fields
2. **Analytics Service** - Add 5 login tracking methods (page_view, attempt, success, fail, abandoned)
3. **Email Service** - Add `sendLoginNotification()` method
4. **Auth Routes** -
   - Login page: track page_view, set referrer cookie, add abandoned tracking script
   - Auth wrapper: track attempt/success/fail, read referrer cookie, send admin email
5. **Test** - Verify tracking in dev, check Analytics Engine data

## Blob Field Mapping Reference

Current Analytics Engine blob mapping (from existing implementation):

| Index | Field | Description |
|-------|-------|-------------|
| blob1 | eventType | Event name |
| blob2 | pathname | URL path |
| blob3 | referer | HTTP Referer header |
| blob4 | country | CF country |
| blob5 | city | CF city |
| blob6 | utm_source | UTM source |
| blob7 | utm_medium | UTM medium |
| blob8 | utm_campaign | UTM campaign |
| blob9 | onboardingICP | ICP segment |
| blob10 | configFormat | Config format |
| blob11 | configType | Config type |
| blob12 | configName | Config name |
| blob13 | userAgent | User agent |

**Proposed additions for login tracking:**

| Index | Field | Description |
|-------|-------|-------------|
| blob14 | loginMethod | github, email_otp |
| blob15 | loginReferrer | Page that sent to login |
| blob16 | loginOutcome | success, fail, abandoned |
| blob17 | errorType | Error type for failures |
| blob18 | returnUrl | Intended destination |

Note: Blob fields are limited. May need to encode login metadata differently or use existing fields when not needed for other purposes.
