# Purpose

Add redirects from configs interface to skills interface when users interact with skill-type configs

## Original Ask

Complete these changes:

**Gap 1: `/configs/new` with "Skill" Selected**
- When user selects "Skill" in the type dropdown on configs create form, redirect to `/skills/new`
- Current behavior: Shows simple textarea that doesn't support multi-file skills

**Gap 2: `/configs/:id/edit` for Skill Configs**
- When editing a skill config via configs interface, redirect to `/skills/:id/edit`
- Current behavior: Shows generic config editor without companion files management

**Gap 3: `/configs/:id` Detail View for Skills**
- When viewing a skill config via configs interface, redirect to `/skills/:id`
- Current behavior: Shows generic config detail without companion files information

## Complexity and the reason behind it

**Complexity Score: 1/5**

**Reasoning:**
- Simple redirect logic in 2 backend routes
- Simple JavaScript event listener in 1 frontend view
- No database changes
- No architectural changes
- No new dependencies
- Total ~25 lines of code
- Easy to test and verify
- Follows existing redirect pattern in codebase (see `src/routes/configs.ts:186`)

## Architectural changes required

None. This is a pure UX improvement using existing infrastructure.

## Backend changes required

### File: `src/routes/configs.ts`

**Change 1: Redirect on detail view (line 75-91)**

```typescript
// Get single config
configsRouter.get('/:id', async (c) => {
  const id = c.req.param('id');
  const service = new ConfigService(c.env);
  const config = await service.getConfig(id);

  if (!config) {
    return c.json({ error: 'Config not found' }, 404);
  }

  // Redirect skills to their specialized view
  if (config.type === 'skill') {
    return c.redirect(`/skills/${id}`);
  }

  const accept = c.req.header('Accept') || '';
  if (accept.includes('application/json')) {
    return c.json({ config });
  }

  return c.html(configDetailView(config));
});
```

**Change 2: Redirect on edit (line 62-73)**

```typescript
// Route for editing config (form) - MUST be before /:id route
configsRouter.get('/:id/edit', async (c) => {
  const id = c.req.param('id');
  const service = new ConfigService(c.env);
  const config = await service.getConfig(id);

  if (!config) {
    return c.json({ error: 'Config not found' }, 404);
  }

  // Redirect skills to their specialized editor
  if (config.type === 'skill') {
    return c.redirect(`/skills/${id}/edit`);
  }

  return c.html(configEditView(config));
});
```

## Frontend changes required

### File: `src/views/configs.ts`

**Change: Add redirect JavaScript in configCreateView() (line 275-288)**

Add script after the form submission handler:

```javascript
// Handle type selection change
document.getElementById('type').addEventListener('change', function(e) {
  if (e.target.value === 'skill') {
    // Redirect to skills create page for multi-file support
    window.location.href = '/skills/new';
  }
});
```

Insert this after line 286 in the existing `<script>` tag.

## Validation

### Manual Testing

**Test 1: Create new skill via configs**
1. Navigate to http://localhost:9090/configs/new
2. Select "Skill" from type dropdown
3. **Expected:** Browser redirects to http://localhost:9090/skills/new

**Test 2: Edit skill via configs**
1. Create a skill via http://localhost:9090/skills/new
2. Note the skill ID (e.g., from URL after creation)
3. Navigate to http://localhost:9090/configs/{skill_id}/edit
4. **Expected:** Browser redirects to http://localhost:9090/skills/{skill_id}/edit

**Test 3: View skill detail via configs**
1. Navigate to http://localhost:9090/configs/{skill_id}
2. **Expected:** Browser redirects to http://localhost:9090/skills/{skill_id}

**Test 4: Verify non-skill configs still work**
1. Create a slash_command config at http://localhost:9090/configs/new
2. Select "Slash Command" type
3. **Expected:** No redirect, form works normally
4. Edit the slash_command at http://localhost:9090/configs/{id}/edit
5. **Expected:** Shows generic config editor (no redirect)
6. View the slash_command at http://localhost:9090/configs/{id}
7. **Expected:** Shows generic config detail (no redirect)

### Verification Commands

```bash
# Start dev server
npm run dev

# In another terminal, test API endpoints directly
curl -I http://localhost:9090/configs/{skill_id}/edit
# Expected: 302 redirect with Location: /skills/{skill_id}/edit

curl -I http://localhost:9090/configs/{skill_id}
# Expected: 302 redirect with Location: /skills/{skill_id}
```

### Edge Cases to Test

1. **Non-existent skill ID via configs**
   - Navigate to http://localhost:9090/configs/invalid-id
   - **Expected:** 404 error (no redirect for non-existent configs)

2. **JSON API requests**
   - `curl -H "Accept: application/json" http://localhost:9090/configs/{skill_id}`
   - **Expected:** Should still redirect (or return JSON - decide based on API contract)

3. **Direct skills URL access**
   - Navigate to http://localhost:9090/skills/{skill_id}
   - **Expected:** Works normally (no double-redirect loop)

## Implementation Notes

1. **Order matters:** The skill type check must happen BEFORE the Accept header check in detail view
2. **Consistency:** All three redirects use similar patterns for maintainability
3. **No breaking changes:** Existing API behavior for non-skill configs remains unchanged
4. **UX improvement:** Users automatically get the right interface without confusion
