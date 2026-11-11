# Purpose

Define how to gate conversions behind email collection with tiered limits for anonymous and subscribed users.

## Original Ask
We need to have conversions gated by emails. If person didn't provide their emails, cap 5 conversions (bith type of conversion: config conversion across coding agents and Slash command conversion) and then cap 20 conversions a week even after emails are provided.

## Complexity and the reason behind it
3/5 - Requires coordinated limits across multiple conversion paths, new storage for weekly quotas, and UX/middleware updates to collect and propagate emails.

## Architectural changes required
- Introduce a quota-tracking layer (likely KV-based) that records conversion counts keyed by email or anonymous identifier and supports weekly reset windows.
- Add conversion gating middleware usable by both config format conversions and slash command conversions, enforcing anonymous and subscribed limits before invoking services.
- Ensure consistent identification strategy (email header/query + fallback token for anonymous users) and structured error responses that frontends can surface.

## Backend changes required
- Create a conversion quota service to increment counts, enforce 5-conversion cap when no email is provided, and enforce a 20-per-week cap for verified emails; include TTL/epoch logic for weekly windows.
- Update conversion endpoints (`GET /api/configs/:id/format/:format` and `POST /api/slash-commands/:id/convert`) to require email context or anonymous token, invoking the quota service before conversions and returning clear limit errors.
- Extend subscription/email validation utilities (reuse `SubscriptionService` where possible) so provided emails are normalized and optionally persisted before counting toward the weekly quota.
- Add tests covering anonymous limits, subscribed weekly caps, and shared counting across both conversion types.

## Frontend changes required
- Update conversion UI flows (config conversion responses and slash command converter) to prompt for email when anonymous limit is reached, store the email locally, and send it via request headers/params on subsequent conversions.
- Display user-friendly messaging when weekly cap is hit and guide users toward subscription confirmation if needed.

## Acceptance Criteria
- Anonymous visitors can perform at most 5 total conversions across config format conversions and slash command conversions; further attempts clearly require providing an email.
- Users who provide a valid email can perform up to 20 conversions per rolling week; attempts beyond that return a clear weekly limit error without performing the conversion.
- Both conversion entry points share the same quota tracking so usage in one surface counts toward the other.
- Automated tests cover anonymous and subscribed scenarios, including limit transitions and reset behavior.

## Validation
- Run automated tests: `npm test` and focused unit tests for the quota service/middleware.
- Manual flows: attempt multiple conversions without an email to hit the anonymous cap, then provide an email and verify weekly limit behavior across both conversion interfaces, ensuring error messaging is surfaced in the UI.
