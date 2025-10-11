# Purpose

Add UI functionality for editing existing configurations and manually invalidating conversion cache

## Original Ask

We need UI features for:
1. Editing existing configs
2. Manual cache invalidation button (especially from UI)

## Complexity and the reason behind it

**Complexity Score: 2/5**

Reasons:
- Backend endpoints already exist (PUT /api/configs/:id for edit, cache.invalidate() for cache)
- Need to add only UI routes and views following existing HTMX patterns
- Straightforward CRUD operations with established patterns in codebase
- Cache invalidation endpoint needs to be created (simple wrapper around existing service)
- Testing is straightforward with existing patterns

## Architectural changes required

None required. The architecture already supports these features:
- Repository pattern for database operations exists
- Cache service with invalidation method exists
- HTMX pattern for UI interactions established
- Route structure supports both JSON API and HTML views

## Backend changes required

### 1. Add cache invalidation endpoint
**File**: `src/routes/configs.ts`

Add new route:
```typescript
// POST /configs/:id/invalidate - Manual cache invalidation
configsRouter.post('/:id/invalidate', async (c) => {
  const id = c.req.param('id');
  const cache = new CacheService(c.env.CONFIG_CACHE);
  await cache.invalidate(id);

  const accept = c.req.header('Accept') || '';
  if (accept.includes('application/json')) {
    return c.json({ success: true, message: 'Cache invalidated' });
  }

  // For HTMX: return success message
  return c.html('<p style="color: #4caf50;">✓ Cache invalidated successfully</p>');
});
```

### 2. Add edit config route (GET /configs/:id/edit)
**File**: `src/routes/configs.ts`

Add route BEFORE `/:id` route:
```typescript
// GET /configs/:id/edit - Edit form
configsRouter.get('/:id/edit', async (c) => {
  const id = c.req.param('id');
  const repo = new ConfigRepository(c.env.DB);
  const config = await repo.findById(id);

  if (!config) {
    return c.json({ error: 'Config not found' }, 404);
  }

  return c.html(configEditView(config));
});
```

### 3. Update PUT endpoint to handle form data
**File**: `src/routes/configs.ts`

Modify existing PUT handler to accept both JSON and form data (similar to POST):
```typescript
configsRouter.put('/:id', async (c) => {
  const id = c.req.param('id');
  let body;

  const contentType = c.req.header('Content-Type') || '';
  if (contentType.includes('application/json')) {
    body = await c.req.json();
  } else {
    const formData = await c.req.parseBody();
    body = {
      name: formData.name as string,
      type: formData.type as any,
      original_format: formData.original_format as any,
      content: formData.content as string,
    };
  }

  const repo = new ConfigRepository(c.env.DB);
  const config = await repo.update(id, body);

  if (!config) {
    return c.json({ error: 'Config not found' }, 404);
  }

  const cache = new CacheService(c.env.CONFIG_CACHE);
  await cache.invalidate(id);

  const accept = c.req.header('Accept') || '';
  if (accept.includes('application/json')) {
    return c.json({ config });
  }

  // Redirect to detail view after edit
  return c.redirect(`/configs/${id}`);
});
```

## Frontend changes required

### 1. Add Edit Config View
**File**: `src/views/configs.ts`

Create new function:
```typescript
export function configEditView(config: Config): string {
  const content = `
    <h2>Edit Configuration</h2>
    <form hx-put="/api/configs/${config.id}" hx-target="body" hx-swap="outerHTML">
      <div class="form-group">
        <label for="name">Name</label>
        <input type="text" id="name" name="name" value="${escapeHtml(config.name)}" required>
      </div>

      <div class="form-group">
        <label for="type">Type</label>
        <select id="type" name="type" required>
          <option value="slash_command" ${config.type === 'slash_command' ? 'selected' : ''}>Slash Command</option>
          <option value="agent_definition" ${config.type === 'agent_definition' ? 'selected' : ''}>Agent Definition</option>
          <option value="mcp_config" ${config.type === 'mcp_config' ? 'selected' : ''}>MCP Config</option>
        </select>
      </div>

      <div class="form-group">
        <label for="original_format">Original Format</label>
        <select id="original_format" name="original_format" required>
          <option value="claude_code" ${config.original_format === 'claude_code' ? 'selected' : ''}>Claude Code</option>
          <option value="codex" ${config.original_format === 'codex' ? 'selected' : ''}>Codex</option>
          <option value="gemini" ${config.original_format === 'gemini' ? 'selected' : ''}>Gemini</option>
        </select>
      </div>

      <div class="form-group">
        <label for="content">Content</label>
        <textarea id="content" name="content" required>${escapeHtml(config.content)}</textarea>
      </div>

      <button type="submit" class="btn">Update Config</button>
      <a href="/configs/${config.id}" class="btn btn-secondary">Cancel</a>
    </form>

    <script>
      document.body.addEventListener('htmx:afterSwap', function(evt) {
        // Redirect handled by server
      });
    </script>
  `;
  return layout('Edit Config', content);
}
```

### 2. Update Config Detail View
**File**: `src/views/configs.ts`

Add Edit button and Cache Invalidation button to `configDetailView()`:

```typescript
// Add after line 48 (after convert buttons section)
<h3>Actions</h3>
<div style="margin-bottom: 20px;">
  <button
    class="btn"
    hx-post="/api/configs/${config.id}/invalidate"
    hx-target="#cache-status"
    hx-swap="innerHTML">
    Refresh Conversions
  </button>
  <span style="font-size: 0.875em; color: var(--text-secondary); margin-left: 10px;">
    (Clears cached conversions and forces re-processing)
  </span>
</div>
<div id="cache-status"></div>

// Update the Back/Delete section (line 54-64) to include Edit button:
<div style="margin-top: 30px;">
  <a href="/configs/${config.id}/edit" class="btn">Edit</a>
  <a href="/configs" class="btn btn-secondary">Back to List</a>
  <button
    class="btn btn-danger"
    hx-delete="/api/configs/${config.id}"
    hx-confirm="Are you sure you want to delete this config?"
    hx-target="body"
    hx-swap="outerHTML">
    Delete
  </button>
</div>
```

## Acceptance Criteria

N/A (Complexity < 3)

## Validation

### Manual Testing Steps

1. **Test Edit Functionality**
   - Navigate to `/configs`
   - Click on any config
   - Click "Edit" button
   - Modify name, type, format, or content
   - Click "Update Config"
   - Verify redirect to detail page with updated values
   - Verify database contains updated values

2. **Test Cache Invalidation**
   - Navigate to a config detail page
   - Click any format conversion button (Claude Code/Codex/Gemini)
   - Note the conversion result
   - Click "Refresh Conversions" button
   - Verify success message appears
   - Click the same format conversion button again
   - Verify `cached: false` in the response metadata

3. **Test Cache Auto-Invalidation on Edit**
   - Convert config to a format
   - Note the conversion (it should be cached)
   - Edit the config's content
   - Convert to the same format again
   - Verify the conversion reflects the new content (cache was invalidated)

### API Testing Commands

```bash
BASE_URL="http://localhost:8787"

# Test 1: Manual cache invalidation endpoint
CONFIG_ID="<some-id>"
echo "=== Test Cache Invalidation ==="
curl -X POST "$BASE_URL/api/configs/$CONFIG_ID/invalidate" | jq .

# Test 2: Update config via PUT with JSON
echo -e "\n=== Test Update Config (JSON) ==="
curl -X PUT "$BASE_URL/api/configs/$CONFIG_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Config Name",
    "type": "slash_command",
    "original_format": "claude_code",
    "content": "Updated content"
  }' | jq .

# Test 3: Verify cache was invalidated after update
echo -e "\n=== Test Conversion After Update ==="
curl -X GET "$BASE_URL/api/configs/$CONFIG_ID/format/gemini" | jq .
# Should show cached: false
```

### Browser Testing
1. Start dev server: `npm run dev`
2. Navigate to `http://localhost:8787/configs`
3. Test all UI flows manually (create → edit → invalidate cache → delete)
4. Verify HTMX interactions work smoothly (no page refreshes)
5. Test with browser DevTools Network tab to verify API calls

### Success Criteria
- ✅ Edit button appears on config detail page
- ✅ Edit form pre-fills with existing config values
- ✅ Updating config redirects to detail page
- ✅ Cache invalidation button works and shows success message
- ✅ Editing a config automatically invalidates its conversion cache
- ✅ All HTMX interactions work without full page reloads
- ✅ No console errors in browser
- ✅ API endpoints return proper JSON responses
