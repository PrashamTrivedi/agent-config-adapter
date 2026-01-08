# Purpose

Fix login dialogs showing even when user is logged in by ensuring view functions pass the Hono context to the layout, enabling proper authentication state detection.

## Original Ask

Fix login dialogs showing even when user is logged in - The Convert Command button in Slash Command Convert page and other similar dialogs should respect the user's login state. Currently showing login prompts even when authenticated.

## Complexity and the reason behind it

**Complexity: 2/5**

This is a straightforward bug fix involving consistent parameter passing across view functions. The authentication infrastructure is already in place (`layout.ts` correctly handles user state via `c?.get?.('user')`), but several views fail to pass the context parameter. The fix is mechanical: update function signatures and call sites to pass the context.

## Architectural changes required

None required. The authentication system is already properly implemented in `layout.ts`:
- User object is retrieved via `c?.get?.('user')` (line 5)
- User data is injected into the page as `window.__user` (line 1792)
- The `isAuthenticated()` and `requireAuth()` JavaScript functions correctly check this data (lines 1795-1823)

The issue is simply that some views don't pass the context parameter to `layout()`.

## Backend changes required

### 1. Update view functions to accept and pass context

The following view files need updates to pass the Hono context (`c`) to `layout()`:

#### `/root/Code/agent-config-adapter/src/views/slash-command-converter.ts`

**Current (line 20, 66):**
```typescript
export function slashCommandConverterView(commands: Config[], searchQuery?: string): string {
  // ...
  return layout('Slash Command Converter', content);
}
```

**Fixed:**
```typescript
export function slashCommandConverterView(commands: Config[], searchQuery?: string, c?: any): string {
  // ...
  return layout('Slash Command Converter', content, c);
}
```

#### `/root/Code/agent-config-adapter/src/views/plugin-browser.ts`

**Current (line 15-20, 224):**
```typescript
export function pluginBrowserView(
  extension: ExtensionWithConfigs,
  format: 'claude_code' | 'gemini',
  files: FileInfo[],
  baseUrl: string
): string {
  // ...
  return layout('Plugin Browser', content);
}
```

**Fixed:**
```typescript
export function pluginBrowserView(
  extension: ExtensionWithConfigs,
  format: 'claude_code' | 'gemini',
  files: FileInfo[],
  baseUrl: string,
  c?: any
): string {
  // ...
  return layout('Plugin Browser', content, c);
}
```

#### `/root/Code/agent-config-adapter/src/views/subscriptions.ts`

**Current (line 21-22):**
```typescript
export function subscriptionFormView(returnUrl?: string): string {
  return layout(
    'Subscribe for Upload Access',
    // ...
  );
}
```

**Fixed:**
```typescript
export function subscriptionFormView(returnUrl?: string, c?: any): string {
  return layout(
    'Subscribe for Upload Access',
    // ...,
    c
  );
}
```

### 2. Update route handlers to pass context

#### `/root/Code/agent-config-adapter/src/routes/slash-command-converter.ts`

**Current (line 71):**
```typescript
return c.html(slashCommandConverterView(configs, search));
```

**Fixed:**
```typescript
return c.html(slashCommandConverterView(configs, search, c));
```

#### `/root/Code/agent-config-adapter/src/routes/plugins.ts`

Find and update call sites for `pluginBrowserView()` to pass `c` as the last parameter.

#### `/root/Code/agent-config-adapter/src/routes/subscriptions.ts`

**Current (line 31):**
```typescript
return c.html(subscriptionFormView(returnUrl));
```

**Fixed:**
```typescript
return c.html(subscriptionFormView(returnUrl, c));
```

#### `/root/Code/agent-config-adapter/src/routes/onboarding.ts`

**Current (lines 23, 32, 41):**
```typescript
return c.html(layout('No-Code/Low-Code Builders', noCodeBuildersPage()));
return c.html(layout('Multi-Tool Organizations', multiToolOrgsPage()));
return c.html(layout('AI Pilot Teams', aiPilotTeamsPage()));
```

**Fixed:**
```typescript
return c.html(layout('No-Code/Low-Code Builders', noCodeBuildersPage(), c));
return c.html(layout('Multi-Tool Organizations', multiToolOrgsPage(), c));
return c.html(layout('AI Pilot Teams', aiPilotTeamsPage(), c));
```

## Frontend changes required

None. The JavaScript authentication logic in `layout.ts` is already correct:

```javascript
// User data injected from server
window.__user = ${user ? JSON.stringify({ id: user.id, name: user.name, email: user.email }) : 'null'};

// Check if user is authenticated
window.isAuthenticated = function() {
  return window.__user !== null;
};

// Gate an action behind authentication
window.requireAuth = function(callback) {
  if (window.isAuthenticated()) {
    callback(); // User is authenticated - proceed
  } else {
    window.showAuthGate(); // Show login modal
  }
};
```

The problem is that `user` is always `null` because the context isn't passed to `layout()`.

## Files to modify (Summary)

| File | Change Type |
|------|-------------|
| `src/views/slash-command-converter.ts` | Add `c` parameter, pass to `layout()` |
| `src/views/plugin-browser.ts` | Add `c` parameter, pass to `layout()` |
| `src/views/subscriptions.ts` | Add `c` parameter, pass to `layout()` |
| `src/routes/slash-command-converter.ts` | Pass `c` to view function |
| `src/routes/plugins.ts` | Pass `c` to `pluginBrowserView()` |
| `src/routes/subscriptions.ts` | Pass `c` to `subscriptionFormView()` |
| `src/routes/onboarding.ts` | Pass `c` to `layout()` |

## Validation

### Manual Testing

1. **Slash Command Converter Page:**
   - Navigate to `/slash-commands/convert`
   - When logged out: Click "Convert Command" or "Copy Original" buttons - should show auth modal
   - When logged in: Click same buttons - should execute the action without auth modal

2. **Plugin Browser Page:**
   - Navigate to `/plugins/:extensionId/claude_code` or `/plugins/:extensionId/gemini`
   - When logged out: Click "Copy Plugin URL" - should show auth modal
   - When logged in: Click same button - should copy URL without auth modal

3. **Subscription Form Page:**
   - Navigate to `/subscriptions/form`
   - Verify header shows correct auth state (Sign In link vs user profile)

4. **Onboarding Pages:**
   - Navigate to `/onboarding/no-code-builders`, `/onboarding/multi-tool-orgs`, `/onboarding/ai-pilot-teams`
   - Verify header shows correct auth state

### Verification Steps

1. Start dev server: `npm run dev`
2. Open browser to `http://localhost:8787`
3. Log out (if logged in) via profile dropdown
4. Navigate to `/slash-commands/convert` - verify header shows "Sign In" link
5. Click "Convert Command" button - verify auth modal appears
6. Log in via GitHub
7. Navigate back to `/slash-commands/convert` - verify header shows user avatar/name
8. Click "Convert Command" button - verify action proceeds without auth modal
9. Repeat steps 3-8 for plugin browser page

### Automated Testing

Existing tests should continue to pass. The changes are backward-compatible (context parameter is optional).

```bash
npm test
```
