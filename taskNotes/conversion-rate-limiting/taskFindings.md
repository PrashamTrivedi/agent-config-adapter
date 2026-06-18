# Conversion Rate Limiting by Email Subscription

## Purpose

Implement rate limiting for config and slash command conversions based on email subscription status - 5 conversions for anonymous users, 20/week for subscribers.

## Original Ask

We need to have conversions gated by emails. If person didn't provide their emails, cap 5 conversions (both type of conversion: config conversion across coding agents and Slash command conversion) and then cap 20 conversions a week even after emails are provided. Consider this the primary task to do.

## Complexity and the reason behind it

**Complexity Score: 3/5**

**Reasoning:**
- **New infrastructure**: Need a rate limiting service with KV storage for tracking
- **Multiple entry points**: Two conversion endpoints need protection (config format, slash command)
- **Dual tracking**: Anonymous users (IP-based) and subscribers (email-based) have different limits
- **Time-based logic**: Weekly reset for subscribers requires careful timestamp handling
- **Frontend UX**: Need to show rate limit status and encourage subscription
- **However**:
  - Pattern is similar to existing email gate middleware
  - KV storage pattern already established in project
  - Testing is straightforward with mock time functions
  - No database schema changes needed

## Architectural changes required

### New Components

1. **RateLimitService** (`src/services/rate-limit-service.ts`)
   - Tracks conversion counts per identifier (IP or email)
   - Two modes: anonymous (IP-based, 5 lifetime) and subscriber (email-based, 20/week)
   - Uses KV namespace `RATE_LIMITS` for storage

2. **conversionRateLimitMiddleware** (`src/middleware/conversion-rate-limit.ts`)
   - Checks rate limits before conversion
   - Returns 429 Too Many Requests when exceeded
   - Includes rate limit headers in response

### Storage Schema (KV)

```
Key format:
- Anonymous: "conversion:ip:{ip_hash}" -> {"count": number, "firstConversion": ISO_timestamp}
- Subscriber: "conversion:email:{email}:week:{week_number}" -> {"count": number}

Week number = ISO week of year (e.g., "2025-W48")
```

### New KV Namespace

Add `RATE_LIMITS` KV namespace to wrangler.jsonc for rate limit counters.

## Backend changes required

### 1. Create RateLimitService (`src/services/rate-limit-service.ts`)

```typescript
export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  resetAt?: string;  // ISO timestamp for weekly reset (subscribers only)
  isSubscriber: boolean;
}

export class RateLimitService {
  constructor(
    private rateLimitsKV: KVNamespace,
    private subscriptionsKV: KVNamespace
  ) {}

  async checkConversionLimit(
    identifier: { ip?: string; email?: string }
  ): Promise<RateLimitResult>;

  async incrementConversion(
    identifier: { ip?: string; email?: string }
  ): Promise<void>;
}
```

**Logic:**
1. If email provided, check subscription status
2. If subscribed: Check weekly limit (20/week), reset each week
3. If not subscribed or no email: Check lifetime limit (5 total) using IP hash

### 2. Create conversionRateLimitMiddleware (`src/middleware/conversion-rate-limit.ts`)

```typescript
export const conversionRateLimitMiddleware = async (c: Context, next: Next) => {
  const email = c.req.header('X-Subscriber-Email') || '';
  const ip = c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For') || 'unknown';

  const rateLimitService = new RateLimitService(
    c.env.RATE_LIMITS,
    c.env.EMAIL_SUBSCRIPTIONS
  );

  const result = await rateLimitService.checkConversionLimit({ ip, email });

  // Set rate limit headers
  c.header('X-RateLimit-Limit', result.limit.toString());
  c.header('X-RateLimit-Remaining', result.remaining.toString());
  if (result.resetAt) {
    c.header('X-RateLimit-Reset', result.resetAt);
  }

  if (!result.allowed) {
    return c.json({
      error: 'Rate limit exceeded',
      limit: result.limit,
      remaining: 0,
      isSubscriber: result.isSubscriber,
      subscription_url: '/subscriptions/form',
      message: result.isSubscriber
        ? 'Weekly conversion limit reached. Resets at ' + result.resetAt
        : 'Free conversion limit reached. Subscribe for 20 conversions/week.'
    }, 429);
  }

  await next();

  // Increment only on successful conversion
  if (c.res.status >= 200 && c.res.status < 300) {
    await rateLimitService.incrementConversion({ ip, email });
  }
};
```

### 3. Apply Middleware to Conversion Routes

**File: `src/routes/configs.ts`**
```typescript
import { conversionRateLimitMiddleware } from '../middleware/conversion-rate-limit';

// GET /:id/format/:format - Apply rate limit
configsRouter.get('/:id/format/:format', conversionRateLimitMiddleware, async (c) => {
  // ... existing conversion logic
});
```

**File: `src/routes/slash-command-converter.ts`**
```typescript
import { conversionRateLimitMiddleware } from '../middleware/conversion-rate-limit';

// POST /:id/convert - Apply rate limit
slashCommandConverterRouter.post('/:id/convert', conversionRateLimitMiddleware, async (c) => {
  // ... existing conversion logic
});
```

### 4. Add Domain Types (`src/domain/types.ts`)

```typescript
// Rate limiting types
export interface RateLimitRecord {
  count: number;
  firstConversion?: string;  // ISO timestamp (for anonymous users)
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  resetAt?: string;
  isSubscriber: boolean;
}
```

### 5. Update Bindings

Add `RATE_LIMITS` to all relevant type bindings:
- `src/index.ts`
- `src/routes/configs.ts`
- `src/routes/slash-command-converter.ts`

### 6. Update wrangler.jsonc

```jsonc
"kv_namespaces": [
  // ... existing namespaces
  {
    "binding": "RATE_LIMITS",
    "id": "YOUR_KV_ID_HERE"
  }
]
```

## Frontend changes required

### 1. Show Rate Limit Status in Conversion UI

**File: `src/views/configs.ts` - configDetailView()**

Add rate limit banner above conversion buttons:

```html
<div id="rate-limit-status" class="card" style="margin-bottom: 15px; padding: 12px; background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.3);">
  <div style="display: flex; align-items: center; justify-content: space-between;">
    <span id="rate-limit-text">Loading conversion quota...</span>
    <a href="/subscriptions/form" class="btn btn-secondary" style="padding: 6px 12px; font-size: 0.875em;">
      🚀 Upgrade to 20/week
    </a>
  </div>
</div>
```

**File: `src/views/slash-command-converter.ts` - slashCommandConverterFormPartial()**

Similar rate limit banner above convert button.

### 2. Handle 429 Response in JavaScript

Add handler for rate limit errors:

```javascript
document.body.addEventListener('htmx:afterRequest', function(evt) {
  if (evt.detail.xhr.status === 429) {
    const data = JSON.parse(evt.detail.xhr.responseText);
    showRateLimitModal(data);
  }
});

function showRateLimitModal(data) {
  const modal = document.getElementById('rate-limit-modal');
  const message = data.isSubscriber
    ? `Weekly limit reached. Resets at ${new Date(data.resetAt).toLocaleDateString()}`
    : 'Free limit reached. Subscribe for 20 conversions per week!';
  // Show modal with subscription CTA
}
```

### 3. Add Rate Limit Check Endpoint

**New endpoint: GET /api/conversions/quota**

Returns current quota status without performing a conversion:

```json
{
  "limit": 5,
  "remaining": 3,
  "isSubscriber": false,
  "resetAt": null
}
```

### 4. Update Layout with Rate Limit Modal

Add modal to `src/views/layout.ts` for rate limit exceeded state.

## Acceptance Criteria

1. **Anonymous users limited to 5 conversions total**
   - First 5 conversions succeed
   - 6th conversion returns 429 with subscription CTA

2. **Subscribed users limited to 20 conversions per week**
   - Weekly counter resets every Monday (ISO week)
   - Rate limit headers included in all conversion responses

3. **Rate limit applies to both conversion types**
   - Config format conversion: `GET /api/configs/:id/format/:format`
   - Slash command conversion: `POST /api/slash-commands/:id/convert`

4. **Clear error messages**
   - 429 response includes remaining quota, limit, and subscription URL
   - Frontend shows friendly rate limit exceeded modal

5. **Graceful degradation**
   - If KV unavailable, conversions proceed (fail-open)
   - Rate limit errors don't break conversion flow

## Validation

### Backend API Testing

```bash
# 1. Anonymous user - should work for first 5
for i in {1..5}; do
  curl http://localhost:8787/api/configs/test-id/format/gemini
done
# Expected: 5 successful responses

# 2. Anonymous user - 6th request should fail
curl http://localhost:8787/api/configs/test-id/format/gemini
# Expected: 429 with rate limit message

# 3. Check rate limit headers
curl -I http://localhost:8787/api/configs/test-id/format/gemini
# Expected: X-RateLimit-Limit, X-RateLimit-Remaining headers

# 4. Subscriber user
curl http://localhost:8787/api/configs/test-id/format/gemini \
  -H "X-Subscriber-Email: qa@test.com"
# Expected: Success with X-RateLimit-Remaining showing out of 20

# 5. Subscriber weekly limit
for i in {1..20}; do
  curl http://localhost:8787/api/configs/test-id/format/gemini \
    -H "X-Subscriber-Email: qa@test.com"
done
# 21st request should return 429
```

### Unit Tests

Create `tests/services/rate-limit-service.test.ts`:
- Test anonymous limit (5 total)
- Test subscriber limit (20/week)
- Test weekly reset logic
- Test IP hashing
- Test graceful failure

Create `tests/middleware/conversion-rate-limit.test.ts`:
- Test middleware applies limits
- Test 429 response format
- Test rate limit headers

### Frontend UI Testing

1. **Anonymous user flow**
   - Visit `/configs/:id`
   - Click conversion button 5 times
   - On 6th click, see rate limit modal
   - Modal has subscription CTA button

2. **Subscriber flow**
   - Subscribe at `/subscriptions/form`
   - Return to conversion page
   - Rate limit banner shows "20/week"
   - Complete 20 conversions
   - On 21st, see weekly limit message with reset date

3. **Slash command converter**
   - Similar flow at `/slash-commands/convert`
   - Rate limits shared across both conversion types

### Deployment Steps

```bash
# 1. Create KV namespace
npx wrangler kv:namespace create RATE_LIMITS
# Copy ID to wrangler.jsonc

# 2. Run tests
npm test -- --run

# 3. Deploy
npm run deploy

# 4. Verify in production
curl -I https://agent-config-adapter.workers.dev/api/configs/test/format/gemini
```

## Notes

### Technical
- IP hashing uses SHA-256 for privacy (don't store raw IPs)
- Week number uses ISO 8601 (week starts Monday)
- KV TTL: 30 days for anonymous, 7 days for weekly counters
- Fail-open design: If KV errors, allow conversion to proceed

### Product & UX
- Rate limit encourages email subscription without blocking entirely
- Weekly reset for subscribers balances usage and cost
- Clear messaging explains limits and upgrade path
- Shared quota across conversion types prevents gaming

### Future Considerations
- Add rate limit analytics (track conversion counts)
- Tiered plans (e.g., premium with higher limits)
- Per-config rate limits for heavy usage configs
- Admin bypass for testing
