# Email Gating for Upload Functionality

## Purpose

Implement email-based access control for upload functionality with automated admin notifications via Cloudflare email service.

## Original Ask

We need to gate the upload functionality behind email. User must enter the email and it should record to a KV with email as primary key, projectName will be "agentConfig" and date time when the record is added. I must receive an email (using cloudflare's email sending capabilities-find online) when someone subscribes to email, using `admin-agent-config@prashamhtrivedi.app` (Domain already configured in cloudflare)

**Additional Requirements:**
- Email gating serves as a landing page before full user authentication
- Marketing copy needed: "User Login is coming soon! When ready, you'll be able to upload your configs"
- Public content access: All content (configs, skills, extensions, marketplaces) is publicly viewable
- MCP content: Read-only access (being converted separately)
- Upload functionality: Gated behind email subscription (temporary until auth is implemented)

## Complexity and the reason behind it

**Complexity Score: 3/5**

**Reasoning:**
- Involves both backend (email validation, KV storage, email sending) and frontend (UI forms)
- Integration with Cloudflare's native `send_email` binding (production-ready, part of Email Routing)
- Requires middleware implementation for access control
- Multiple touchpoints: 2 upload endpoints need gating
- Security considerations (email validation, rate limiting)
- However, the task is well-defined with clear requirements and uses established patterns
- No complex state management or architectural changes required
- Email solution is simpler than expected: native Cloudflare binding, no third-party service needed

## Architectural changes required

### New Infrastructure Components

1. **Email Subscription KV Namespace**
   - New KV namespace: `EMAIL_SUBSCRIPTIONS`
   - Schema: `{ email: string, projectName: string, subscribedAt: string, ipAddress?: string }`
   - Primary key: email address (lowercase, trimmed)

2. **Email Service Integration**
   - **Cloudflare `send_email` Binding** (production-ready, native, FREE)
   - Part of Email Routing (already available, no waitlist)
   - No API keys needed - uses native Worker binding
   - Perfect for admin notifications to verified addresses

3. **Middleware Layer**
   - Email verification middleware for upload routes
   - Session tracking (cookie or header-based)
   - Rate limiting for email submissions

### Modified Routes

**Gated Endpoints:**
- `POST /api/skills/upload-zip` - ZIP upload (requires email)
- `POST /api/skills/:id/files` - Companion file upload (requires email)

**New Endpoints:**
- `POST /api/subscriptions/subscribe` - Email subscription endpoint
- `GET /api/subscriptions/verify/:email` - Check if email is subscribed
- `GET /subscriptions/form` - UI for email subscription form (HTML)

### Configuration Changes

**wrangler.jsonc additions:**
```jsonc
{
  "kv_namespaces": [
    // ... existing
    {
      "binding": "EMAIL_SUBSCRIPTIONS",
      "id": "TBD" // Created during setup
    }
  ],
  "send_email": [
    {
      "name": "EMAIL",
      "destination_address": "admin-agent-config@prashamhtrivedi.app"
    }
  ],
  "vars": {
    // ... existing
    "ADMIN_EMAIL": "admin-agent-config@prashamhtrivedi.app"
  }
}
```

**Environment Setup:**
```bash
# Production
npx wrangler kv:namespace create EMAIL_SUBSCRIPTIONS
# Update wrangler.jsonc with the ID

# No secrets needed - send_email binding uses native Email Routing
```

## Backend changes required

### 1. Email Service Layer (`src/services/email-service.ts`)

**Purpose:** Handle email sending via Cloudflare's native `send_email` binding

**Dependencies:**
```bash
npm install mimetext
```

**Key Methods:**
```typescript
import { EmailMessage } from "cloudflare:email";
import { createMimeMessage } from 'mimetext';

class EmailService {
  constructor(
    private emailBinding: any, // send_email binding from env
    private adminEmail: string,
    private senderEmail: string = 'notifications@prashamhtrivedi.app'
  )

  async sendSubscriptionNotification(subscriberEmail: string, subscribedAt: string): Promise<void>
  // Sends admin notification about new subscriber using EmailMessage

  async sendWelcomeEmail(subscriberEmail: string): Promise<void>
  // Optional: Send welcome email (requires subscriberEmail to be verified in Email Routing)
}
```

**Implementation Example:**
```typescript
async sendSubscriptionNotification(subscriberEmail: string, subscribedAt: string): Promise<void> {
  const msg = createMimeMessage();

  msg.setSender({
    name: 'Agent Config Adapter',
    addr: this.senderEmail
  });

  msg.setRecipient(this.adminEmail);
  msg.setSubject('New Subscription to Agent Config Adapter');

  msg.addMessage({
    contentType: 'text/html',
    data: `
      <h2>New Subscription</h2>
      <p><strong>Email:</strong> ${subscriberEmail}</p>
      <p><strong>Project:</strong> agentConfig</p>
      <p><strong>Subscribed At:</strong> ${subscribedAt}</p>
    `
  });

  const message = new EmailMessage(
    this.senderEmail,
    this.adminEmail,
    msg.asRaw()
  );

  await this.emailBinding.send(message);
}
```

**Email Templates:**
- Admin notification: "New subscriber: {email} subscribed to agentConfig at {datetime}"
- Welcome email: (Optional - requires subscriber email to be verified in Email Routing)

### 2. Subscription Service Layer (`src/services/subscription-service.ts`)

**Purpose:** Manage email subscriptions in KV

**Key Methods:**
```typescript
class SubscriptionService {
  constructor(kv: KVNamespace)

  async subscribe(email: string, ipAddress?: string): Promise<SubscriptionRecord>
  // Store subscription in KV, return subscription record

  async isSubscribed(email: string): Promise<boolean>
  // Check if email exists in KV

  async getSubscription(email: string): Promise<SubscriptionRecord | null>
  // Retrieve full subscription record

  async listSubscriptions(cursor?: string): Promise<{ subscriptions: SubscriptionRecord[], cursor?: string }>
  // Admin: list all subscriptions with pagination
}

interface SubscriptionRecord {
  email: string
  projectName: 'agentConfig'
  subscribedAt: string // ISO datetime
  ipAddress?: string
}
```

**KV Storage Pattern:**
```
Key: email (lowercase, trimmed)
Value: JSON.stringify(SubscriptionRecord)
Metadata: { subscribedAt: timestamp }
```

### 3. Email Verification Middleware (`src/middleware/email-gate.ts`)

**Purpose:** Protect upload endpoints

**Implementation:**
```typescript
export const emailGateMiddleware = async (c: Context, next: Next) => {
  // 1. Check for email in request
  const email = c.req.header('X-Subscriber-Email') || c.req.query('email')

  if (!email) {
    return c.json({
      error: 'Email required for uploads',
      subscription_required: true,
      subscription_url: '/subscriptions/form'
    }, 401)
  }

  // 2. Validate email format
  if (!isValidEmail(email)) {
    return c.json({ error: 'Invalid email format' }, 400)
  }

  // 3. Check subscription status
  const subscriptionService = new SubscriptionService(c.env.EMAIL_SUBSCRIPTIONS)
  const isSubscribed = await subscriptionService.isSubscribed(email)

  if (!isSubscribed) {
    return c.json({
      error: 'Email not subscribed',
      subscription_required: true,
      subscription_url: '/subscriptions/form'
    }, 403)
  }

  // 4. Store email in context for logging
  c.set('subscriberEmail', email)

  await next()
}
```

### 4. Updated Routes (`src/routes/subscriptions.ts`)

**New subscription routes:**
```typescript
// POST /api/subscriptions/subscribe
async (c) => {
  const { email } = await c.req.json()

  // Validate email
  if (!isValidEmail(email)) {
    return c.json({ error: 'Invalid email' }, 400)
  }

  // Check if already subscribed
  const subscriptionService = new SubscriptionService(c.env.EMAIL_SUBSCRIPTIONS)
  const existing = await subscriptionService.isSubscribed(email)

  if (existing) {
    return c.json({ message: 'Email already subscribed', subscribed: true })
  }

  // Subscribe
  const ipAddress = c.req.header('CF-Connecting-IP')
  const subscription = await subscriptionService.subscribe(email, ipAddress)

  // Send notifications
  const emailService = new EmailService(
    c.env.EMAIL, // send_email binding
    c.env.ADMIN_EMAIL
  )
  await emailService.sendSubscriptionNotification(email, subscription.subscribedAt)
  // await emailService.sendWelcomeEmail(email) // Optional - requires email verification in Email Routing

  return c.json({ message: 'Subscribed successfully', subscription }, 201)
}

// GET /api/subscriptions/verify/:email
async (c) => {
  const email = c.req.param('email')
  const subscriptionService = new SubscriptionService(c.env.EMAIL_SUBSCRIPTIONS)
  const isSubscribed = await subscriptionService.isSubscribed(email)

  return c.json({ email, subscribed: isSubscribed })
}
```

### 5. Modified Skills Routes

**Apply middleware to upload endpoints:**
```typescript
import { emailGateMiddleware } from '../middleware/email-gate'

// POST /api/skills/upload-zip
skillsRouter.post('/upload-zip', emailGateMiddleware, async (c) => {
  // Existing upload logic
})

// POST /api/skills/:id/files
skillsRouter.post('/:id/files', emailGateMiddleware, async (c) => {
  // Existing upload logic
})
```

### 6. Domain Types Update (`src/domain/types.ts`)

**Add subscription types:**
```typescript
export interface SubscriptionRecord {
  email: string
  projectName: 'agentConfig'
  subscribedAt: string
  ipAddress?: string
}

export interface Env {
  // ... existing bindings
  EMAIL_SUBSCRIPTIONS: KVNamespace
  EMAIL: any // send_email binding
  ADMIN_EMAIL: string
}
```

## Frontend changes required

### 1. Email Subscription Form (`src/views/subscriptions.ts`)

**New view for subscription form with marketing copy:**
```typescript
export function subscriptionFormView(returnUrl?: string): string {
  return layout('Subscribe for Upload Access', `
    <div class="fade-in">
      <div class="card" style="max-width: 700px; margin: 40px auto;">
        <h2 style="margin: 0 0 16px 0; display: flex; align-items: center; gap: 12px;">
          ${icons.mail('icon')} Get Early Access to Uploads
        </h2>

        <!-- Marketing Banner -->
        <div style="background: linear-gradient(135deg, rgba(88, 166, 255, 0.15) 0%, rgba(88, 166, 255, 0.05) 100%); border-left: 4px solid var(--accent-primary); padding: 16px 20px; border-radius: 8px; margin-bottom: 24px;">
          <div style="display: flex; align-items: start; gap: 12px;">
            <div style="font-size: 1.5em;">🚀</div>
            <div>
              <h3 style="margin: 0 0 8px 0; color: var(--accent-primary); font-size: 1.1em;">
                User Login Coming Soon!
              </h3>
              <p style="margin: 0; color: var(--text-primary); line-height: 1.6;">
                We're building a full authentication system. When it's ready, you'll be able to securely upload and manage your agent configurations, skills, and extensions.
              </p>
              <p style="margin: 8px 0 0 0; color: var(--text-secondary); font-size: 0.95em;">
                <strong>For now:</strong> Enter your email below to get early access to upload features. We'll notify you when user accounts launch!
              </p>
            </div>
          </div>
        </div>

        <p style="color: var(--text-secondary); margin-bottom: 24px; font-size: 0.95em;">
          Browse and explore all configs, skills, and extensions freely. Email required only for uploads.
        </p>

        <form
          hx-post="/api/subscriptions/subscribe"
          hx-target="#subscription-result"
          hx-swap="innerHTML">

          <div class="form-group">
            <label for="email">Email Address *</label>
            <input
              type="email"
              id="email"
              name="email"
              required
              placeholder="you@example.com">
            <span class="help-text">
              We'll send a confirmation to this address
            </span>
          </div>

          <div id="subscription-result" style="margin-bottom: 16px;"></div>

          <button type="submit" class="btn ripple">
            ${icons.check('icon')} Subscribe
          </button>
          ${returnUrl ? `
            <input type="hidden" name="return_url" value="${escapeHtml(returnUrl)}">
          ` : ''}
        </form>

        <div style="margin-top: 24px; padding-top: 24px; border-top: 1px solid var(--border-color); font-size: 0.9em; color: var(--text-secondary);">
          <p style="margin: 0 0 8px 0;">
            <strong>What you get:</strong>
          </p>
          <ul style="margin: 0; padding-left: 20px; line-height: 1.8;">
            <li>Upload skills (ZIP files with multi-file support)</li>
            <li>Upload companion files for existing skills</li>
            <li>Early access to new features</li>
            <li>Notification when user accounts are available</li>
          </ul>
          <p style="margin: 16px 0 0 0; font-size: 0.85em; color: var(--text-secondary);">
            By subscribing, you agree to receive notifications about platform updates and your uploads.
          </p>
        </div>
      </div>
    </div>

    <script>
      document.body.addEventListener('htmx:afterRequest', function(evt) {
        if (evt.detail.successful && evt.detail.target.id === 'subscription-result') {
          const result = JSON.parse(evt.detail.xhr.responseText)
          const container = document.getElementById('subscription-result')

          if (result.subscription || result.subscribed) {
            container.innerHTML = \`
              <div class="status-indicator status-success" style="padding: 12px; background: rgba(76, 217, 100, 0.1); border-radius: 6px;">
                <span class="status-dot"></span>
                \${result.message}
              </div>
            \`

            // Redirect after 2 seconds if return_url exists
            const returnUrl = new FormData(evt.detail.target).get('return_url')
            if (returnUrl) {
              setTimeout(() => {
                window.location.href = returnUrl
              }, 2000)
            }
          }
        }
      })
    </script>
  `)
}
```

### 2. Info Banner for Upload Pages (`src/views/skills.ts`)

**Add banner at top of upload pages (create/edit forms):**
```typescript
// Banner component for upload pages
function uploadAccessBanner(): string {
  return `
    <div style="background: rgba(255, 184, 0, 0.1); border: 1px solid rgba(255, 184, 0, 0.3); border-radius: 6px; padding: 14px 18px; margin-bottom: 20px; display: flex; align-items: center; gap: 12px;">
      <div style="font-size: 1.3em;">⚡</div>
      <div style="flex: 1;">
        <strong style="color: var(--text-primary);">Upload Access Required</strong>
        <p style="margin: 4px 0 0 0; color: var(--text-secondary); font-size: 0.9em;">
          Enter your email below to unlock uploads. <strong>Full user authentication coming soon!</strong>
        </p>
      </div>
    </div>
  `;
}
```

**Modify ZIP upload form to show banner and check subscription:**
```typescript
// In skillCreateView(), update ZIP upload tab
<form
  hx-post="/api/skills/upload-zip"
  hx-encoding="multipart/form-data"
  hx-headers='{"X-Subscriber-Email": localStorage.getItem("subscriberEmail") || ""}'
  hx-on="htmx:responseError: handleUploadError">

  <!-- Show subscription prompt if not subscribed -->
  <div id="subscription-check"
       hx-get="/api/subscriptions/verify?email="
       hx-trigger="load"
       hx-swap="innerHTML">
    <div class="status-indicator status-info">
      <span class="status-dot"></span>
      Checking subscription status...
    </div>
  </div>

  <!-- Rest of upload form -->
</form>

<script>
function handleUploadError(evt) {
  const response = JSON.parse(evt.detail.xhr.responseText)
  if (response.subscription_required) {
    window.location.href = response.subscription_url + '?return=' + window.location.pathname
  }
}
</script>
```

**Add email input to upload forms:**
```typescript
// Before file upload section, add:
<div class="form-group">
  <label for="subscriber-email">Your Email *</label>
  <input
    type="email"
    id="subscriber-email"
    name="subscriber_email"
    required
    placeholder="you@example.com"
    value=""
    hx-post="/api/subscriptions/verify"
    hx-trigger="change"
    hx-target="#email-status"
    hx-swap="innerHTML">
  <div id="email-status"></div>
  <span class="help-text">
    Required for upload access.
    <a href="/subscriptions/form">Subscribe here</a> if you don't have access.
  </span>
</div>
```

### 3. Homepage Notice (`src/views/configs.ts` or main landing page)

**Add prominent notice on homepage:**
```typescript
// Add to top of configs list view or create a dedicated landing section
function homepageNotice(): string {
  return `
    <div class="card" style="background: linear-gradient(135deg, var(--bg-secondary) 0%, var(--bg-primary) 100%); border: 2px solid var(--accent-primary); margin-bottom: 30px;">
      <div style="text-align: center; padding: 20px;">
        <h2 style="margin: 0 0 12px 0; color: var(--accent-primary); display: flex; align-items: center; justify-content: center; gap: 10px;">
          ${icons.star('icon')} Welcome to Agent Config Adapter
        </h2>
        <p style="font-size: 1.1em; color: var(--text-primary); margin: 0 0 16px 0; line-height: 1.6;">
          Browse and explore <strong>configs</strong>, <strong>skills</strong>, and <strong>extensions</strong> for Claude Code, Gemini, and Codex agents.
        </p>
        <div style="display: inline-block; background: rgba(255, 184, 0, 0.1); border: 1px solid rgba(255, 184, 0, 0.3); border-radius: 8px; padding: 12px 20px; margin-bottom: 16px;">
          <p style="margin: 0; color: var(--text-primary);">
            <strong>🚀 Coming Soon:</strong> User authentication & personal config management
          </p>
        </div>
        <div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; margin-top: 20px;">
          <a href="/skills" class="btn ripple">
            ${icons.star('icon')} Browse Skills
          </a>
          <a href="/configs" class="btn ripple">
            ${icons.file('icon')} View Configs
          </a>
          <a href="/subscriptions/form" class="btn" style="background: var(--accent-primary); color: white;">
            ${icons.mail('icon')} Get Upload Access
          </a>
        </div>
      </div>
    </div>
  `;
}
```

### 4. Navigation Update (`src/views/layout.ts`)

**Update navigation to emphasize public access and upload CTA:**
```html
<!-- Main navigation -->
<nav>
  <a href="/">${icons.home('icon')} Home</a>
  <a href="/configs">${icons.file('icon')} Configs</a>
  <a href="/skills">${icons.star('icon')} Skills</a>
  <a href="/extensions">${icons.package('icon')} Extensions</a>
  <a href="/marketplaces">${icons.grid('icon')} Marketplaces</a>

  <!-- Upload Access CTA -->
  <a href="/subscriptions/form" class="btn-primary" style="margin-left: auto; background: var(--accent-primary); color: white; padding: 8px 16px; border-radius: 6px;">
    ${icons.upload('icon')} Upload Access
  </a>
</nav>
```

### 5. Public Access Notice on List Views

**Add notice to configs/skills list views:**
```typescript
// Add to top of list views (before grid)
function publicAccessNotice(): string {
  return `
    <div style="background: rgba(76, 217, 100, 0.1); border: 1px solid rgba(76, 217, 100, 0.3); border-radius: 6px; padding: 12px 16px; margin-bottom: 20px; display: flex; align-items: center; gap: 10px;">
      <span style="font-size: 1.2em;">👁️</span>
      <span style="color: var(--text-primary); font-size: 0.95em;">
        <strong>Public Access:</strong> All content is freely browsable. <a href="/subscriptions/form" style="color: var(--accent-primary); text-decoration: underline;">Get upload access</a> to contribute your own configs.
      </span>
    </div>
  `;
}
```

### 6. Client-side Email Storage

**Add to layout.ts for persistent email:**
```javascript
// Store subscriber email in localStorage after successful subscription
document.body.addEventListener('subscription-success', function(evt) {
  const email = evt.detail.email
  localStorage.setItem('subscriberEmail', email)
  localStorage.setItem('subscribedAt', new Date().toISOString())
})

// Auto-populate email fields from localStorage
document.addEventListener('DOMContentLoaded', function() {
  const storedEmail = localStorage.getItem('subscriberEmail')
  if (storedEmail) {
    document.querySelectorAll('input[name="subscriber_email"]').forEach(input => {
      input.value = storedEmail
    })
  }
})
```

## Acceptance Criteria

1. **Email Subscription Works**
   - ✅ User can subscribe with valid email
   - ✅ Duplicate subscriptions are handled gracefully
   - ✅ Invalid emails are rejected with clear error messages
   - ✅ Subscription record stored in KV with all required fields

2. **Admin Notifications Sent**
   - ✅ Admin receives email when new user subscribes
   - ✅ Email contains subscriber email and timestamp
   - ✅ Email is sent from `admin-agent-config@prashamhtrivedi.app`

3. **Upload Gating Enforced**
   - ✅ ZIP upload endpoint rejects requests without email
   - ✅ Companion file upload endpoint rejects requests without email
   - ✅ Unsubscribed emails are rejected with 403 status
   - ✅ Subscribed emails can upload successfully

4. **UI/UX Quality**
   - ✅ Subscription form is accessible and user-friendly
   - ✅ Clear error messages for validation failures
   - ✅ Success confirmation after subscription
   - ✅ Email persistence across sessions (localStorage)
   - ✅ Smooth redirect flow from upload → subscribe → upload

5. **Security & Rate Limiting**
   - ✅ Email validation prevents malformed inputs
   - ✅ Lowercase/trim normalization prevents duplicates
   - ✅ IP address captured for abuse monitoring
   - ✅ (Optional) Rate limiting on subscription endpoint

6. **Marketing & Messaging**
   - ✅ Landing page clearly communicates "auth coming soon"
   - ✅ Homepage prominently shows public access
   - ✅ Upload pages explain temporary email requirement
   - ✅ Subscription form highlights early access benefits
   - ✅ Navigation emphasizes browse vs. upload distinction

## Validation

### Backend API Testing

**1. Subscription Flow:**
```bash
# Test new subscription
curl -X POST http://localhost:8787/api/subscriptions/subscribe \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'
# Expected: 201, subscription record returned, admin email sent

# Test duplicate subscription
curl -X POST http://localhost:8787/api/subscriptions/subscribe \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'
# Expected: 200, "already subscribed" message

# Verify subscription status
curl http://localhost:8787/api/subscriptions/verify/test@example.com
# Expected: {"email": "test@example.com", "subscribed": true}

# Check KV storage
npx wrangler kv:key get --binding=EMAIL_SUBSCRIPTIONS "test@example.com" --local
# Expected: {"email":"test@example.com","projectName":"agentConfig","subscribedAt":"..."}
```

**2. Upload Gating:**
```bash
# Test ZIP upload without email
curl -X POST http://localhost:8787/api/skills/upload-zip \
  -F "skill_zip=@test-skill.zip" \
  -F "name=Test Skill"
# Expected: 401, "Email required for uploads"

# Test ZIP upload with unsubscribed email
curl -X POST http://localhost:8787/api/skills/upload-zip \
  -H "X-Subscriber-Email: unsubscribed@example.com" \
  -F "skill_zip=@test-skill.zip" \
  -F "name=Test Skill"
# Expected: 403, "Email not subscribed"

# Test ZIP upload with subscribed email
curl -X POST http://localhost:8787/api/skills/upload-zip \
  -H "X-Subscriber-Email: test@example.com" \
  -F "skill_zip=@test-skill.zip" \
  -F "name=Test Skill"
# Expected: 201, skill created successfully

# Test companion file upload with subscribed email
SKILL_ID="existing-skill-id"
curl -X POST http://localhost:8787/api/skills/$SKILL_ID/files \
  -H "X-Subscriber-Email: test@example.com" \
  -F "file_path=FORMS.md" \
  -F "file_content=@test-file.md"
# Expected: 201, file uploaded successfully
```

**3. Email Validation:**
```bash
# Test invalid email formats
curl -X POST http://localhost:8787/api/subscriptions/subscribe \
  -H "Content-Type: application/json" \
  -d '{"email": "invalid-email"}'
# Expected: 400, "Invalid email format"

curl -X POST http://localhost:8787/api/subscriptions/subscribe \
  -H "Content-Type: application/json" \
  -d '{"email": "test@"}'
# Expected: 400, "Invalid email format"
```

### Frontend UI Testing

**1. Subscription Form:**
- Navigate to `/subscriptions/form`
- Enter valid email → Submit → See success message
- Check localStorage for stored email
- Enter invalid email → Submit → See error message
- Enter duplicate email → Submit → See "already subscribed" message

**2. Upload Flow:**
- Navigate to `/skills/new`
- Click "Upload ZIP" tab
- Without email: See subscription prompt or error on submit
- With subscribed email: Upload succeeds
- Email auto-populated from localStorage

**3. Companion File Upload:**
- Navigate to `/skills/:id/edit`
- Try adding companion file without email → See error
- Add email from subscription → Upload succeeds

### Email Testing

**Check admin email inbox:**
- Subscribe with test email
- Verify admin receives notification at `admin-agent-config@prashamhtrivedi.app`
- Email contains:
  - Subscriber email
  - Project name: "agentConfig"
  - Timestamp
  - (Optional) IP address

**Resend Dashboard:**
- Log into Resend dashboard
- Check email logs for delivery status
- Verify no bounce/spam issues

### Integration Testing

**Full user journey:**
1. User visits `/skills/new`
2. Clicks "Upload ZIP"
3. Sees "Email required for upload" message
4. Clicks subscription link → Redirected to `/subscriptions/form`
5. Enters email and subscribes
6. Redirected back to `/skills/new`
7. Email auto-populated in form
8. Uploads ZIP successfully
9. Admin receives notification email

### Edge Cases

**Test edge cases:**
```bash
# Case-insensitive email storage
curl -X POST .../subscribe -d '{"email": "Test@Example.com"}'
curl -X POST .../subscribe -d '{"email": "test@example.com"}'
# Expected: Second request returns "already subscribed"

# Whitespace handling
curl -X POST .../subscribe -d '{"email": " test@example.com "}'
# Expected: Trimmed and stored as "test@example.com"

# Special characters in email
curl -X POST .../subscribe -d '{"email": "test+tag@example.com"}'
# Expected: Valid email, subscription succeeds

# Very long email
curl -X POST .../subscribe -d '{"email": "verylongemailaddress@very-long-domain-name.com"}'
# Expected: Valid if under max length, subscription succeeds
```

### Performance Testing

**KV lookup performance:**
```bash
# Measure subscription check latency
time curl http://localhost:8787/api/subscriptions/verify/test@example.com
# Expected: < 100ms for KV lookup

# Concurrent uploads
# Run 5 concurrent upload requests with valid emails
# Expected: All succeed without conflicts
```

### Deployment Validation

**Production checklist:**
```bash
# 1. Create KV namespace
npx wrangler kv:namespace create EMAIL_SUBSCRIPTIONS
# Copy ID to wrangler.jsonc

# 2. Set Resend API key
npx wrangler secret put RESEND_API_KEY
# Paste API key from Resend dashboard

# 3. Deploy
npm run deploy

# 4. Verify production endpoints
curl https://agent-config-adapter.workers.dev/api/subscriptions/subscribe \
  -X POST -H "Content-Type: application/json" \
  -d '{"email": "production-test@example.com"}'

# 5. Check admin email received
# Verify email arrives at admin-agent-config@prashamhtrivedi.app
```

## Setup Prerequisites

### Before Implementation

1. **Cloudflare Email Routing Setup**
   - Enable Email Routing on `prashamhtrivedi.app` domain in Cloudflare Dashboard
   - Go to: Dashboard → Domain → Email → Email Routing → Enable
   - DNS records (SPF, DKIM, DMARC) are configured AUTOMATICALLY by Cloudflare
   - Verify destination address: `admin-agent-config@prashamhtrivedi.app`
   - Confirm verification via email link sent to admin address

2. **Environment Preparation**
   ```bash
   # Production only - no local secrets needed for email
   npx wrangler kv:namespace create EMAIL_SUBSCRIPTIONS
   # Update wrangler.jsonc with the returned ID
   ```

3. **Dependencies**
   ```bash
   npm install mimetext
   # Already using: nanoid (for potential token generation)
   # Already using: hono (for routes)
   ```

4. **Verify Email Routing**
   ```bash
   # Test that notifications@prashamhtrivedi.app can send
   # This email address will be the sender for admin notifications
   # Domain must have Email Routing enabled
   ```

## Notes

### Technical
- **Email Service**: Using Cloudflare's native `send_email` binding (production-ready, FREE, part of Email Routing)
- **Why This Works**: Admin email is a verified destination address, so the "verified addresses only" limitation doesn't apply
- **No API Keys**: Native binding means no secrets to manage, no third-party accounts
- **Local Testing**: Wrangler simulates emails by writing .eml files to disk during `wrangler dev`
- **Rate Limiting**: Consider adding Cloudflare's native rate limiting rules in dashboard for subscription endpoint
- **GDPR Compliance**: Store minimal data (email, project, timestamp), allow deletion via support
- **Future Enhancement**: Add email verification flow with confirmation tokens (requires verifying subscriber emails in Email Routing)
- **Monitoring**: Track subscription count, failed email sends, and abuse attempts via Cloudflare analytics
- **Sender Email**: Use `notifications@prashamhtrivedi.app` or any address from your domain with Email Routing enabled

### Product & UX
- **Temporary Landing Page**: Email subscription serves as MVP before full authentication
- **Public First**: All content (configs, skills, extensions, marketplaces) is publicly browsable
- **Upload Gating**: Only upload functionality requires email (temporary measure)
- **Marketing Message**: "User Login Coming Soon" - sets expectations for future auth
- **Migration Path**: When auth is ready, existing email subscriptions can become user accounts
- **MCP Access**: Read-only (being converted separately, not affected by this feature)
- **Content Strategy**: Encourage browsing and exploration, with upload as upgrade path
