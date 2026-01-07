# Spec 07: Frontend Auth Migration

## Purpose
Migrate frontend from email-gating to session-based authentication. Update all CUD (Create, Update, Delete) buttons to use the new auth system and show user state in the header.

## Dependencies
- Phase 2 (Better Auth) - Session middleware
- Phase 3 (Profile & API Keys) - Profile page exists

## Files to Modify

### `src/views/layout.ts`

1. **Add auth section to header** - Show user avatar/name when logged in, Login button when not
2. **Replace `requireEmail()` with `requireAuth()`** - New function checks session instead of localStorage email
3. **Remove X-Subscriber-Email header** - No longer needed, backend uses session
4. **Remove email gate modal** - Replace with redirect to login page

### `src/views/configs.ts`
Replace all `requireEmail()` calls (7 locations):
- Edit button
- Delete button
- Convert buttons (3)
- Copy buttons (2)

### `src/views/extensions.ts`
Replace all `requireEmail()` calls (5 locations):
- Create button (2)
- Edit button
- Delete button
- Copy manifest button

### `src/views/marketplaces.ts`
Replace all `requireEmail()` calls (5 locations):
- Create button (2)
- Edit button
- Delete button
- Copy URL button

### `src/views/skills.ts`
Replace all `requireEmail()` calls (12 locations):
- Create button (2)
- Edit buttons (2)
- Delete buttons (3)
- Download buttons (2)
- Copy buttons (2)
- File delete button

### `src/views/plugin-browser.ts`
Replace all `requireEmail()` calls (2 locations):
- Copy URL buttons

### `src/views/slash-command-converter.ts`
Replace all `requireEmail()` calls (3 locations):
- Copy original button
- Convert button
- Copy output button

## Implementation Details

### New Header Auth Section

```html
<div class="auth-section">
  ${user ? `
    <a href="/profile" class="user-link">
      <img src="${user.image || ''}" alt="" class="user-avatar">
      <span>${user.name}</span>
    </a>
    <a href="/api/auth/sign-out" class="btn btn-secondary btn-sm">Logout</a>
  ` : `
    <a href="/auth/login" class="btn btn-sm">Login</a>
  `}
</div>
```

### New `requireAuth()` Function

```javascript
window.requireAuth = function(callback) {
  // Check if user is logged in via session (set by server)
  if (window.__user) {
    callback();
  } else {
    // Redirect to login with return URL
    window.location.href = '/auth/login?return=' + encodeURIComponent(window.location.pathname);
  }
};
```

### Server-Side User Injection

```javascript
// In layout.ts, inject user data for client-side checks
<script>
  window.__user = ${user ? JSON.stringify({ id: user.id, name: user.name }) : 'null'};
</script>
```

## Validation

### Manual Testing
1. **Anonymous user**: Click any CUD button → Redirected to login
2. **Logged in user**: Click any CUD button → Action proceeds
3. **Header state**: Shows Login when anonymous, user info when logged in
4. **Logout**: Click logout → Session cleared, redirected

### Automated Tests
```bash
npm test
```

All existing tests should pass as backend logic is unchanged.

## Notes

- Keep backward compatibility during transition
- Email subscription data in localStorage can be cleaned up later
- No database changes required
- All changes are frontend-only (views)
