# Purpose

Implement conversion gating based on email provision to limit usage and encourage subscription.

## Original Ask

We need to have conversions gated by emails. If person didn't provide their emails, cap 5 conversions (both type of conversion: config conversion across coding agents and Slash command conversion) and then cap 20 conversions a week even after emails are provided. Consider this the primary task to do.

## Complexity and the reason behind it

Score: 3/5

Reason:
- Requires backend changes to track conversions (count and timestamp) per user/session.
- Needs to handle two types of users: anonymous (no email) and subscribed (email provided).
- Needs to enforce different limits: 5 total for anonymous, 20/week for subscribed.
- Requires modifying two different conversion endpoints (`/configs/:id/format/:format` and `/slash-commands/:id/convert`).
- Requires identifying users (IP address or session cookie/token). Since there is no auth mentioned, we likely rely on IP or a simple client-side generated ID stored in cookies, but IP is safer for rate limiting. However, the existing subscription service uses email. For anonymous users, we might need a way to track them.
- The `SubscriptionService` seems to store subscriptions in KV. We might need to extend it or create a new `UsageService` to track usage.

## Architectural changes required

No major architectural changes, but we need to introduce a mechanism to track usage.
- We will use KV to store usage data.
- Key structure:
  - Anonymous: `usage:anon:<ip>` or `usage:anon:<session_id>`
  - Subscribed: `usage:email:<email>`

## Backend changes required

1.  **Modify `SubscriptionService` or create `UsageService`**:
    - Add methods to `incrementUsage(identifier: string, type: 'anon' | 'email')`
    - Add methods to `checkLimit(identifier: string, type: 'anon' | 'email')`
    - Logic for "5 total" for anonymous.
    - Logic for "20 per week" for subscribed. This requires storing a list of timestamps or a counter that resets weekly. A list of timestamps (sliding window) is more accurate but takes more space. Given "20 per week", storing 20 timestamps is fine.

2.  **Update `email-gate.ts` middleware or create new middleware**:
    - The current `emailGateMiddleware` gates upload endpoints. We need a new middleware or update existing logic for *conversion* endpoints.
    - However, the requirement says "If person didn't provide their emails, cap 5 conversions". This implies they *can* convert without email up to 5 times.
    - So we can't just block if email is missing.
    - We need to check if email is provided in headers/query.
    - If email provided -> Check subscription -> Check weekly limit (20).
    - If email NOT provided -> Check anonymous limit (5 total).

3.  **Apply gating logic to routes**:
    - `src/routes/configs.ts`: `GET /:id/format/:format`
    - `src/routes/slash-command-converter.ts`: `POST /:id/convert`

## Frontend changes required

-   The UI needs to handle the "limit reached" error gracefully.
-   If limit reached for anonymous, prompt for email.
-   If limit reached for subscribed, show "weekly limit reached" message.
-   The current `email-gate.ts` returns 401/403 with `subscription_url`. We should probably stick to a similar pattern or return a specific error code that the frontend HTMX can handle.

## Acceptance Criteria

1.  **Anonymous User (No Email)**:
    - Can perform up to 5 conversions (combined count of config + slash command).
    - On 6th attempt, receives an error asking for email.
2.  **Subscribed User (Email Provided)**:
    - Can perform up to 20 conversions in a rolling 7-day window.
    - On 21st attempt, receives an error stating weekly limit reached.
3.  **Tracking**:
    - Usage is correctly incremented for both types of conversions.
    - Providing email switches tracking from IP/Session to Email. (Note: merging anonymous usage into email usage is complex and maybe not required, but would be nice. For now, we treat them separately as per requirements: "cap 5... AND THEN cap 20... AFTER emails are provided"). This implies the 5 anon conversions don't count towards the 20 weekly limit, or at least they are a separate "trial" bucket.

## Validation

1.  **Test Anonymous Limit**:
    - clear KV or use new IP.
    - Run 5 conversions. All succeed.
    - Run 6th conversion. Should fail.
2.  **Test Subscribed Limit**:
    - Provide `X-Subscriber-Email` header.
    - Run 20 conversions. All succeed.
    - Run 21st conversion. Should fail.
3.  **Test Weekly Reset (Unit Test)**:
    - Mock time to verify the 20/week logic.

## Specs

- **Usage Tracking**:
    - Use `KV` namespace `EMAIL_SUBSCRIPTIONS` (or a new one if available, but likely we reuse).
    - Key: `usage:anon:<ip>` -> Integer (count). TTL: maybe permanent or long expiration.
    - Key: `usage:email:<email>` -> Array of timestamps (integers). TTL: 1 week (refresh on update).
    - Actually, for "20 per week", we can just store the timestamps of the last 20 conversions. If the oldest of the 20 is within the last week, then they are at limit.

- **Middleware/Service Logic**:
    - `UsageService.checkAndIncrement(ip: string, email?: string)`:
        - If `email` is valid:
            - Get usage for email.
            - Filter timestamps older than 7 days.
            - If count >= 20, return Error("Weekly limit reached").
            - Add current timestamp. Save.
        - Else (Anonymous):
            - Get usage for IP.
            - If count >= 5, return Error("Trial limit reached. Please provide email.").
            - Increment count. Save.

