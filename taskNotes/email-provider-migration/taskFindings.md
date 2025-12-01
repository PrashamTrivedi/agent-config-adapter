# Purpose

Migrate email sending logic from Resend SDK to custom email service API.

## Original Ask

Instead of using resend. Move email sending logic to below service whose curls are being provided to you

```bash
# Basic email with HTML body
curl -X POST https://email-sender.prashamhtrivedi.in/api/send \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "from": "sender@yourdomain.com",
    "to": ["recipient@example.com"],
    "subject": "Hello from Email Sender",
    "htmlBody": "<h1>Hello!</h1><p>This is a test email.</p>"
  }'

# Email with attachments
curl -X POST https://email-sender.prashamhtrivedi.in/api/send \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "from": "sender@yourdomain.com",
    "to": ["recipient@example.com"],
    "subject": "Document Attached",
    "textBody": "Please find the document attached.",
    "attachments": [{
      "filename": "document.pdf",
      "content": "BASE64_ENCODED_CONTENT",
      "contentType": "application/pdf"
    }]
  }'

# Email with CC, BCC, reply-to
curl -X POST https://email-sender.prashamhtrivedi.in/api/send \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "from": "sender@yourdomain.com",
    "to": ["user1@example.com", "user2@example.com"],
    "cc": ["cc@example.com"],
    "bcc": ["bcc@example.com"],
    "subject": "Team Update",
    "htmlBody": "<p>Important announcement...</p>",
    "textBody": "Important announcement...",
    "replyTo": ["replies@yourdomain.com"]
  }'
```

## Complexity and the reason behind it

**Complexity Score: 2/5**

Reasons:
- Simple 1:1 API migration - same functionality, different provider
- No database changes required
- No new features being added
- EmailService interface remains identical (same public methods)
- Only implementation changes (fetch instead of Resend SDK)
- Straightforward environment variable rename
- Low verification complexity - just test email sending works

## Architectural changes required

None required. The service layer abstraction (`EmailService`) remains the same. Only the internal implementation changes from Resend SDK to native fetch API.

## Backend changes required

### 1. Update EmailService (`src/services/email-service.ts`)

**Current Implementation:**
- Uses `Resend` SDK class
- Constructor takes `resendApiKey`
- Uses `this.resend.emails.send()` method

**New Implementation:**
- Use native `fetch` API
- Constructor takes `emailApiKey`
- Call `https://email-sender.prashamhtrivedi.in/api/send` with:
  - Header: `x-api-key: <apiKey>`
  - Header: `Content-Type: application/json`
  - Body: `{ from, to: [email], subject, htmlBody }`

### 2. Update Environment Variables

| Location | Old | New |
|----------|-----|-----|
| `src/index.ts` | `RESEND_API_KEY` | `EMAIL_API_KEY` |
| `src/routes/subscriptions.ts` | `RESEND_API_KEY` | `EMAIL_API_KEY` |
| `.dev.vars.example` | `RESEND_API_KEY=` | `EMAIL_API_KEY=` |
| Worker secret | `RESEND_API_KEY` | `EMAIL_API_KEY` |

### 3. Remove Resend Dependency

```bash
npm uninstall resend
```

### 4. Update Documentation

- `CLAUDE.md`: Update setup instructions and secret names
- `.dev.vars.example`: Update variable name and comments

## Frontend changes required

None required. Email sending is entirely backend.

## Validation

### Test Scenarios

1. **New Subscription Flow**
   - Subscribe new email via `/api/subscriptions/subscribe`
   - Verify admin notification email received
   - Verify welcome email received by subscriber

2. **Error Handling**
   - Test with invalid API key (should log error, not fail subscription)
   - Test with invalid email address (should fail validation before email)

### Commands to Verify

```bash
# Start dev server
npm run dev

# Test subscription endpoint
curl -X POST http://localhost:8787/api/subscriptions/subscribe \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'

# Check server logs for email sending success/failure messages
```

### Expected Log Output

```
[Email] Sending admin notification to admin@example.com
[Email] Admin notification sent successfully
[Email] Sending welcome email to test@example.com
[Email] Welcome email sent successfully
```

## Files to Modify

1. `src/services/email-service.ts` - Main implementation change
2. `src/routes/subscriptions.ts` - Update binding type
3. `src/index.ts` - Update binding type
4. `.dev.vars.example` - Update example config
5. `CLAUDE.md` - Update documentation
6. `package.json` - Remove resend dependency
