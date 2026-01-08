# Task Walkthrough: Login Dialog Auth State Fix

## Purpose

Fix login dialogs showing even when user is logged in by ensuring view functions pass the Hono context to the layout, enabling proper authentication state detection.

## How to Verify the Fix

### Prerequisites
1. Deploy the changes to a staging environment or run locally with `npm run dev`
2. Have a valid authentication method set up (GitHub OAuth)

### Verification Steps

#### 1. Slash Command Converter Page (`/slash-commands/convert`)

**When Logged Out:**
1. Open the browser and navigate to `/slash-commands/convert`
2. Verify the header shows a "Sign In" link (not a profile avatar)
3. Select a slash command from the dropdown
4. Click the "Convert Command" button
5. **Expected:** Auth modal should appear prompting login

**When Logged In:**
1. Log in via GitHub OAuth
2. Navigate to `/slash-commands/convert`
3. Verify the header shows your profile avatar/name (not "Sign In")
4. Select a slash command from the dropdown
5. Click the "Convert Command" button
6. **Expected:** The conversion should proceed without showing auth modal
7. Click "Copy Original" button
8. **Expected:** Content should be copied without auth modal

#### 2. Plugin Browser Page (`/plugins/:extensionId/:format`)

**When Logged Out:**
1. Navigate to any plugin browser page (e.g., `/plugins/some-extension-id/claude_code`)
2. Verify the header shows "Sign In" link
3. Click "Copy Plugin URL" button
4. **Expected:** Auth modal should appear

**When Logged In:**
1. Log in and navigate to the same plugin browser page
2. Verify the header shows your profile
3. Click "Copy Plugin URL" button
4. **Expected:** URL should be copied without auth modal

#### 3. Subscription Form Page (`/subscriptions/form`)

**When Logged Out:**
1. Navigate to `/subscriptions/form`
2. **Expected:** Header shows "Sign In" link

**When Logged In:**
1. Navigate to `/subscriptions/form`
2. **Expected:** Header shows your profile avatar/name

#### 4. Onboarding Pages

Test each onboarding page to verify header auth state:
- `/onboarding/no-code-builders`
- `/onboarding/multi-tool-orgs`
- `/onboarding/ai-pilot-teams`

**Expected:** Each page should show the correct auth state in the header (Sign In link when logged out, profile when logged in).

## Technical Changes Summary

| File | Change |
|------|--------|
| `src/views/slash-command-converter.ts` | Added `c` parameter, passed to `layout()` |
| `src/views/plugin-browser.ts` | Added `c` parameter, passed to `layout()` |
| `src/views/subscriptions.ts` | Added `c` parameter, passed to `layout()` |
| `src/routes/slash-command-converter.ts` | Pass `c` to `slashCommandConverterView()` |
| `src/routes/plugins.ts` | Pass `c` to `pluginBrowserView()` |
| `src/routes/subscriptions.ts` | Pass `c` to `subscriptionFormView()` |
| `src/routes/onboarding.ts` | Pass `c` to `layout()` (all 3 routes) |

## Root Cause

The authentication infrastructure was already correct in `layout.ts`:
- User is retrieved via `c?.get?.('user')`
- User data is injected into the page as `window.__user`
- `isAuthenticated()` and `requireAuth()` JavaScript functions work correctly

The bug was that several views were not passing the Hono context (`c`) to the `layout()` function, causing `c` to be `undefined` and `user` to always be `null`.

## Automated Verification

All 583 existing tests pass, confirming backward compatibility:
```bash
npm test
# Result: 28 test files, 583 tests passing
```

## Next Steps

This is a backend-only fix. No frontend changes are required as the JavaScript auth logic in the layout was already correct. The fix can be released immediately.
