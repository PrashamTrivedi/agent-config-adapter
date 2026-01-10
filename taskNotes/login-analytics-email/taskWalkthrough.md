# Task Walkthrough: Login Analytics and Admin Email Notifications

## Overview

This task adds comprehensive analytics tracking for the login flow and admin email notifications when users successfully log in.

## What Was Implemented

### 1. Analytics Event Types
Five new analytics event types for tracking the login journey:
- `login_page_view` - User views the login page
- `login_attempt` - User initiates a login (GitHub OAuth or Email OTP)
- `login_success` - Login completed successfully
- `login_fail` - Login attempt failed
- `login_abandoned` - User left the login page without completing

### 2. Analytics Service Methods
New tracking methods in `src/services/analytics-service.ts`:
- `trackLoginPageView(request, metadata)` - Tracks referrer and return URL
- `trackLoginAttempt(request, method)` - Tracks which auth method was started
- `trackLoginSuccess(request, method, userId)` - Tracks successful login with user ID
- `trackLoginFail(request, method, errorType)` - Tracks failed login with error type
- `trackLoginAbandoned(request, metadata)` - Tracks when user abandons login

### 3. Email Notifications
New method in `src/services/email-service.ts`:
- `sendLoginNotification(userEmail, userName, loginMethod, loginAt)` - Sends admin email on successful login

### 4. Auth Route Integration
Updated `src/routes/auth.ts` to:
- Track login page views when `/auth/login` is accessed
- Track login attempts when OAuth or OTP is initiated
- Track success/failure after auth completes
- Send admin email notification on successful login

### 5. Frontend Abandoned Tracking
Added JavaScript to login page for best-effort abandoned tracking:
- Uses `navigator.sendBeacon` API
- Tracks time spent before abandoning
- Only triggers if user leaves without starting auth

## Verification Steps for Product Owners

### Step 1: View Login Page Analytics
1. Open the application at `/auth/login`
2. Check server logs for `[Analytics] Skipping event tracking (local dev): login_page_view`
   - In production, this would be sent to Cloudflare Analytics Engine

### Step 2: Test GitHub OAuth Tracking
1. Navigate to `/auth/login`
2. Click "Continue with GitHub"
3. Server logs should show `login_attempt` event tracked
4. Complete the OAuth flow
5. Server logs should show `login_success` event tracked
6. Admin should receive email notification

### Step 3: Test Email OTP Tracking
1. Navigate to `/auth/login`
2. Enter email and click "Send Code"
3. Server logs should show `login_attempt` event tracked
4. Enter OTP and verify
5. Server logs should show `login_success` event tracked
6. Admin should receive email notification

### Step 4: Test Failed Login Tracking
1. Navigate to `/auth/login`
2. Enter email and click "Send Code"
3. Enter wrong OTP
4. Server logs should show `login_fail` event tracked

### Step 5: Test Abandoned Login Tracking
1. Navigate to `/auth/login`
2. Wait a few seconds
3. Navigate away or close the tab
4. Network tab should show POST to `/api/analytics/track` with `login_abandoned` event

### Step 6: Verify Admin Email Content
Admin emails should contain:
- User name
- User email
- Login method (GitHub OAuth or Email OTP)
- Login timestamp

## Analytics Queries

Once deployed, use these queries in Cloudflare Analytics Engine:

```sql
-- Login funnel overview
SELECT
  blob1 AS event,
  COUNT(*) AS count
FROM user_analytics
WHERE blob1 LIKE 'login_%'
GROUP BY blob1;

-- Login success rate by method
SELECT
  loginMethod,
  SUM(CASE WHEN event = 'login_success' THEN 1 ELSE 0 END) * 100.0 /
    NULLIF(SUM(CASE WHEN event = 'login_attempt' THEN 1 ELSE 0 END), 0) AS success_rate
FROM user_analytics
WHERE blob1 IN ('login_attempt', 'login_success')
GROUP BY loginMethod;
```

## Files Changed

| File | Changes |
|------|---------|
| `src/domain/types.ts` | Added 5 login event types, login metadata fields |
| `src/services/analytics-service.ts` | Added 5 login tracking methods |
| `src/services/email-service.ts` | Added `sendLoginNotification` method |
| `src/routes/auth.ts` | Integrated analytics and email for login flow |
| `CLAUDE.md` | Updated API documentation |
| `src/domain/CLAUDE.md` | Documented analytics types |
| `src/services/CLAUDE.md` | Documented new service methods |
| `src/routes/CLAUDE.md` | Documented auth routes |

## Test Results

- All 583 tests pass
- No regressions in existing functionality
- TypeScript compiles without errors in feature code

## Next Steps

Since this is a backend-only feature, the recommended next step is:
1. **Deploy to production** - Merge PR and deploy to see live analytics data
2. **Monitor Analytics** - Review Cloudflare Analytics Engine for login funnel data
3. **Iterate** - Based on analytics insights, optimize login UX if needed
