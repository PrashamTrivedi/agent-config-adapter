# Email Gating Extension - All CUD Operations (v2)

## Purpose

Extend email gating to protect ALL Create, Update, and Delete operations across the entire platform (configs, skills, extensions, marketplaces, files) - not just ZIP uploads.

## Original Ask

We need gating every CUD in this platform right now. Except MCP which is being worked in different ticket parallely.

## Complexity and the reason behind it

**Complexity Score: 3/5**

**Reasoning:**
- **Large scope**: 26+ endpoints across 5 route files need protection
- **Multiple touchpoints**: Configs, Skills, Extensions, Marketplaces, Files routes
- **Frontend updates**: All creation/edit forms need email field
- **Comprehensive testing**: Each CUD endpoint must be validated
- **However**:
  - Email gate middleware already built and tested (v1)
  - Pattern is well-established and repetitive
  - No new architectural components needed
  - Changes are systematic and predictable
  - Testing follows existing patterns from v1

## Architectural changes required

### No new infrastructure needed

The existing email gating infrastructure from v1 is sufficient:
- ✅ Email gate middleware (`src/middleware/email-gate.ts`)
- ✅ Subscription service (`src/services/subscription-service.ts`)
- ✅ Email service (`src/services/email-service.ts`)
- ✅ EMAIL_SUBSCRIPTIONS KV namespace
- ✅ Cloudflare Email Routing configured

### Scope of changes

**Apply existing `emailGateMiddleware` to 26 additional endpoints:**

#### Configs Routes (5 endpoints)
- POST /api/configs - Create config
- PUT /api/configs/:id - Update config
- DELETE /api/configs/:id - Delete config
- POST /api/configs/:id/invalidate - Invalidate cache
- POST /api/configs/:id/refresh-analysis - Refresh slash command analysis

#### Skills Routes (4 endpoints - 2 already gated)
- POST /api/skills - Create skill ⚠️ **NOT YET GATED**
- PUT /api/skills/:id - Update skill
- DELETE /api/skills/:id - Delete skill
- DELETE /api/skills/:id/files/:fileId - Delete companion file
- ✅ POST /api/skills/upload-zip - **ALREADY GATED** (v1)
- ✅ POST /api/skills/:id/files - **ALREADY GATED** (v1)

#### Extensions Routes (7 endpoints)
- POST /api/extensions - Create extension
- PUT /api/extensions/:id - Update extension
- DELETE /api/extensions/:id - Delete extension
- POST /api/extensions/:id/configs - Add configs to extension (batch)
- POST /api/extensions/:id/configs/:configId - Add single config
- DELETE /api/extensions/:id/configs/:configId - Remove config
- POST /api/extensions/:id/invalidate - Invalidate extension cache

#### Marketplaces Routes (7 endpoints)
- POST /api/marketplaces - Create marketplace
- PUT /api/marketplaces/:id - Update marketplace
- DELETE /api/marketplaces/:id - Delete marketplace
- POST /api/marketplaces/:id/extensions - Add extensions (batch)
- POST /api/marketplaces/:id/extensions/:extensionId - Add single extension
- DELETE /api/marketplaces/:id/extensions/:extensionId - Remove extension
- POST /api/marketplaces/:id/invalidate - Invalidate marketplace cache

#### Files/Plugins Routes (3 endpoints)
- POST /api/files/extensions/:extensionId - Upload extension files
- DELETE /api/files/:fileId - Delete file
- POST /api/plugins/:extensionId/:format/invalidate - Invalidate plugin files

**Total: 26 endpoints to protect** (2 already protected from v1)

## Backend changes required

### 1. Update Route Files

Apply `emailGateMiddleware` to all CUD endpoints:

**Pattern:**
```typescript
import { emailGateMiddleware } from '../middleware/email-gate';

// Before:
router.post('/', async (c) => { ... })

// After:
router.post('/', emailGateMiddleware, async (c) => { ... })
```

**Files to modify:**
1. `src/routes/configs.ts` - Add middleware to 5 endpoints
2. `src/routes/skills.ts` - Add middleware to 4 endpoints (2 already have it)
3. `src/routes/extensions.ts` - Add middleware to 7 endpoints
4. `src/routes/marketplaces.ts` - Add middleware to 7 endpoints
5. `src/routes/files.ts` - Add middleware to 2 endpoints
6. `src/routes/plugins.ts` - Add middleware to 1 endpoint

### 2. Update Type Bindings

Ensure all route files import the correct bindings for EMAIL_SUBSCRIPTIONS:

```typescript
type Bindings = {
  DB: D1Database;
  CONFIG_CACHE: KVNamespace;
  EMAIL_SUBSCRIPTIONS: KVNamespace; // Required for emailGateMiddleware
  // ... other bindings
};
```

**Files to check/update:**
- `src/routes/configs.ts` - Add EMAIL_SUBSCRIPTIONS to Bindings
- `src/routes/extensions.ts` - Add EMAIL_SUBSCRIPTIONS to Bindings
- `src/routes/marketplaces.ts` - Add EMAIL_SUBSCRIPTIONS to Bindings
- `src/routes/files.ts` - Add EMAIL_SUBSCRIPTIONS to Bindings
- `src/routes/plugins.ts` - Add EMAIL_SUBSCRIPTIONS to Bindings
- ✅ `src/routes/skills.ts` - **ALREADY HAS IT** (v1)

### 3. No Service Layer Changes

All existing services remain unchanged. The middleware operates at the route level and doesn't require service modifications.

## Frontend changes required

### 1. Add Email Fields to All Creation Forms

**Forms to update:**

#### Config Forms (`src/views/configs.ts`)
- `configCreateView()` - Add email field
- `configEditView()` - Add email field

**Pattern:**
```html
<div class="form-group">
  <label for="subscriber-email">Your Email *</label>
  <input
    type="email"
    id="subscriber-email"
    name="subscriber_email"
    required
    placeholder="you@example.com"
    value="">
  <span class="help-text">
    Required for content management.
    <a href="/subscriptions/form">Subscribe here</a> if you don't have access.
  </span>
</div>
```

#### Extension Forms (`src/views/extensions.ts`)
- `extensionCreateView()` - Add email field
- `extensionEditView()` - Add email field

#### Marketplace Forms (`src/views/marketplaces.ts`)
- `marketplaceCreateView()` - Add email field
- `marketplaceEditView()` - Add email field

#### Skills Forms (`src/views/skills.ts`)
- `skillCreateView()` - **ALREADY HAS EMAIL FIELD** (verify and update if needed)
- `skillEditView()` - **ALREADY HAS EMAIL FIELD** (verify and update if needed)

### 2. Update Form Submissions to Include Email Header

All HTMX forms need to send email in headers:

```html
<form
  hx-post="/api/configs"
  hx-headers='{"X-Subscriber-Email": localStorage.getItem("subscriberEmail") || document.getElementById("subscriber-email")?.value || ""}'
  hx-target="#result">
  <!-- form fields -->
</form>
```

### 3. Add Email Verification UI Indicators

Add real-time email verification on blur:

```html
<input
  type="email"
  id="subscriber-email"
  hx-post="/api/subscriptions/verify"
  hx-trigger="blur"
  hx-target="#email-status"
  hx-include="[name='subscriber_email']">
<div id="email-status"></div>
```

### 4. Update JavaScript for Email Persistence

Enhance `src/views/layout.ts` with better email handling:

```javascript
// Auto-populate email from localStorage
document.addEventListener('DOMContentLoaded', function() {
  const storedEmail = localStorage.getItem('subscriberEmail');
  if (storedEmail) {
    document.querySelectorAll('input[name="subscriber_email"]').forEach(input => {
      input.value = storedEmail;
    });
  }
});

// Save email after successful subscription
document.body.addEventListener('htmx:afterRequest', function(evt) {
  if (evt.detail.successful && evt.detail.pathInfo.requestPath.includes('/subscribe')) {
    const result = JSON.parse(evt.detail.xhr.responseText);
    if (result.subscription || result.subscribed) {
      const email = result.subscription?.email || evt.detail.requestConfig.parameters?.email;
      if (email) {
        localStorage.setItem('subscriberEmail', email);
      }
    }
  }
});
```

### 5. Update Marketing Messages

Update all form pages to explain the email requirement:

```html
<div class="info-banner">
  <strong>⚡ Email Required:</strong>
  All content creation and modifications require email verification.
  <strong>Full authentication coming soon!</strong>
  <a href="/subscriptions/form">Subscribe for access</a>
</div>
```

## Acceptance Criteria

### 1. All CUD Endpoints Protected
- ✅ All 26+ CUD endpoints reject requests without email (401)
- ✅ All endpoints reject unsubscribed emails (403)
- ✅ All endpoints accept subscribed emails (200/201)

### 2. Email Validation
- ✅ Invalid email formats rejected (400)
- ✅ Case-insensitive email matching works
- ✅ Email trimming and normalization works

### 3. Frontend UX
- ✅ All creation/edit forms have email field
- ✅ Email auto-populated from localStorage
- ✅ Real-time email verification works
- ✅ Clear error messages for email issues
- ✅ Smooth redirect flow to subscription form

### 4. No Breaking Changes
- ✅ Existing subscriptions continue to work
- ✅ Previously gated endpoints (ZIP upload, companion files) still work
- ✅ All existing tests still pass
- ✅ MCP endpoints remain unaffected (read-only)

### 5. Error Handling
- ✅ Consistent error messages across all endpoints
- ✅ Proper HTTP status codes (401, 403, 400)
- ✅ User-friendly error messages with subscription URL

## Validation

### Backend API Testing

Test each CUD endpoint with 3 scenarios:
1. **No email** → 401 Unauthorized
2. **Unsubscribed email** → 403 Forbidden
3. **Subscribed email** → Success (200/201)

#### Configs Endpoints
```bash
# Subscribe test email first
curl -X POST http://localhost:9090/api/subscriptions/subscribe \
  -H "Content-Type: application/json" \
  -d '{"email":"qa@test.com"}'

# Test each config endpoint:

# 1. Create config - No email
curl -X POST http://localhost:9090/api/configs \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","type":"slash_command","original_format":"claude_code","content":"test"}'
# Expected: 401

# 2. Create config - Unsubscribed email
curl -X POST http://localhost:9090/api/configs \
  -H "X-Subscriber-Email: unsubscribed@test.com" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","type":"slash_command","original_format":"claude_code","content":"test"}'
# Expected: 403

# 3. Create config - Subscribed email
curl -X POST http://localhost:9090/api/configs \
  -H "X-Subscriber-Email: qa@test.com" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","type":"slash_command","original_format":"claude_code","content":"test"}'
# Expected: 201

# Repeat for PUT, DELETE, and POST invalidate/refresh-analysis
```

Repeat similar tests for:
- **Skills**: POST /, PUT /:id, DELETE /:id, DELETE /:id/files/:fileId
- **Extensions**: POST /, PUT /:id, DELETE /:id, POST/DELETE /:id/configs
- **Marketplaces**: POST /, PUT /:id, DELETE /:id, POST/DELETE /:id/extensions
- **Files/Plugins**: POST /extensions/:id, DELETE /:fileId, POST invalidate

#### Unit Tests Update

Update existing test suites:

```typescript
// src/routes/configs.test.ts
describe('POST /api/configs', () => {
  it('should reject requests without email', async () => {
    const res = await app.request('/api/configs', {
      method: 'POST',
      body: JSON.stringify({ name: 'Test', type: 'slash_command', content: 'test' }),
      headers: { 'Content-Type': 'application/json' }
    });
    expect(res.status).toBe(401);
  });

  it('should reject unsubscribed emails', async () => {
    const res = await app.request('/api/configs', {
      method: 'POST',
      body: JSON.stringify({ name: 'Test', type: 'slash_command', content: 'test' }),
      headers: {
        'Content-Type': 'application/json',
        'X-Subscriber-Email': 'unsubscribed@test.com'
      }
    });
    expect(res.status).toBe(403);
  });

  it('should accept subscribed emails', async () => {
    // Setup: Subscribe email first
    await subscriptionService.subscribe('qa@test.com');

    const res = await app.request('/api/configs', {
      method: 'POST',
      body: JSON.stringify({ name: 'Test', type: 'slash_command', content: 'test' }),
      headers: {
        'Content-Type': 'application/json',
        'X-Subscriber-Email': 'qa@test.com'
      }
    });
    expect(res.status).toBe(201);
  });
});
```

Add similar tests for all route files.

### Frontend UI Testing

**For each entity (Configs, Skills, Extensions, Marketplaces):**

1. **Navigate to creation form** (e.g., `/configs/new`)
   - ✅ Email field is visible
   - ✅ Email field is required
   - ✅ Help text with subscription link present

2. **Try to submit without email**
   - ✅ Browser validation prevents submission OR
   - ✅ API returns 401 with clear error message

3. **Try to submit with unsubscribed email**
   - ✅ API returns 403 with subscription URL
   - ✅ User redirected to `/subscriptions/form`

4. **Subscribe and retry**
   - ✅ Subscription succeeds
   - ✅ Email saved to localStorage
   - ✅ Redirect back to form
   - ✅ Email auto-populated
   - ✅ Form submission succeeds

5. **Verify edit forms**
   - ✅ Edit forms also have email field
   - ✅ Same gating behavior for PUT requests

6. **Verify delete operations**
   - ✅ Delete buttons/links send email header
   - ✅ Same gating behavior for DELETE requests

### Regression Testing

1. **MCP endpoints remain read-only** (not gated)
   ```bash
   curl http://localhost:9090/mcp/info
   # Should work without email
   ```

2. **GET endpoints remain public**
   ```bash
   curl http://localhost:9090/api/configs
   curl http://localhost:9090/api/skills
   # Should work without email
   ```

3. **Previously gated endpoints still work**
   ```bash
   # ZIP upload
   curl -X POST http://localhost:9090/api/skills/upload-zip \
     -H "X-Subscriber-Email: qa@test.com" \
     -F "skill_zip=@test.zip" \
     -F "name=Test"
   # Should still work (201)
   ```

4. **All existing unit tests pass**
   ```bash
   npm test -- --run
   # All 529+ tests should pass
   ```

### Integration Testing

**End-to-End User Journey:**

1. User visits `/configs/new` (not subscribed yet)
2. Fills out config form
3. Submits without email → Browser validation error
4. Adds fake email → Submit → 403 error
5. Clicks subscription link → Redirected to `/subscriptions/form`
6. Subscribes with real email → 201 success
7. Redirected back to `/configs/new`
8. Email auto-populated in form
9. Submits config → 201 success
10. Config created successfully

Repeat for Skills, Extensions, Marketplaces.

### Performance Testing

**Verify middleware overhead is minimal:**

```bash
# Measure response time difference
# Before gating (if we temporarily remove middleware)
time curl -X POST http://localhost:9090/api/configs ...

# After gating (with middleware)
time curl -X POST http://localhost:9090/api/configs -H "X-Subscriber-Email: qa@test.com" ...

# Difference should be < 5ms (KV lookup is fast)
```

### Load Testing (Optional)

```bash
# Concurrent requests with subscribed email
ab -n 100 -c 10 -H "X-Subscriber-Email: qa@test.com" \
  -p config.json -T application/json \
  http://localhost:9090/api/configs

# All should succeed
```

## Deployment Checklist

### Pre-Deployment

1. ✅ All unit tests pass (`npm test`)
2. ✅ Manual API testing complete (26+ endpoints)
3. ✅ Frontend forms tested in browser
4. ✅ Email gating works for all CUD operations
5. ✅ MCP endpoints remain unaffected
6. ✅ GET endpoints remain public
7. ✅ Documentation updated (CLAUDE.md, README.md)

### Deployment Steps

No new infrastructure needed - v1 setup already complete:
- ✅ EMAIL_SUBSCRIPTIONS KV namespace exists
- ✅ Cloudflare Email Routing configured
- ✅ ADMIN_EMAIL set in wrangler.jsonc

**Deploy:**
```bash
npm run deploy
```

### Post-Deployment Verification

```bash
# 1. Verify subscription works
curl -X POST https://agent-config-adapter.workers.dev/api/subscriptions/subscribe \
  -H "Content-Type: application/json" \
  -d '{"email":"production-qa@test.com"}'

# 2. Verify gating works on production
curl -X POST https://agent-config-adapter.workers.dev/api/configs \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","type":"slash_command","original_format":"claude_code","content":"test"}'
# Expected: 401

# 3. Verify subscribed email works
curl -X POST https://agent-config-adapter.workers.dev/api/configs \
  -H "X-Subscriber-Email: production-qa@test.com" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","type":"slash_command","original_format":"claude_code","content":"test"}'
# Expected: 201

# 4. Verify admin email received
# Check admin-agent-config@prashamhtrivedi.app inbox
```

## Notes

### Technical

- **No breaking changes**: Existing v1 implementation (ZIP upload, companion files) continues to work
- **MCP exemption**: MCP server endpoints (`/mcp/*`) deliberately NOT gated (handled in separate ticket)
- **Middleware reuse**: No new middleware code needed - reuse existing `emailGateMiddleware`
- **Systematic approach**: Apply same pattern to all 26+ endpoints
- **Testing strategy**: Each CUD endpoint gets 3-scenario test (no email, unsubscribed, subscribed)
- **Performance**: Email gate adds <5ms overhead (single KV lookup)

### Product & UX

- **Consistent gating**: All CUD operations now require email (not just uploads)
- **Public browsing**: All GET endpoints remain public (view-only access)
- **Clear messaging**: All forms explain email requirement with "auth coming soon" message
- **Smooth flow**: Email persistence via localStorage reduces friction
- **Migration path**: When full auth launches, existing email subscriptions become user accounts

### Estimated Effort

- **Backend**: ~2 hours (apply middleware to 26+ endpoints, update bindings)
- **Frontend**: ~1.5 hours (add email fields to forms, update HTMX headers)
- **Testing**: ~2 hours (comprehensive API + UI testing)
- **Total**: ~5-6 hours of focused work

### Migration from v1

**What changes:**
- v1: Only ZIP uploads and companion files gated
- v2: ALL CUD operations gated

**What stays the same:**
- Email subscription flow
- KV storage structure
- Admin notifications
- Middleware implementation
- Subscription UI

### Future Considerations

When full authentication is implemented:
1. Remove email gate middleware
2. Replace with proper auth middleware
3. Migrate EMAIL_SUBSCRIPTIONS to user accounts
4. Keep subscription form as waitlist for new users
