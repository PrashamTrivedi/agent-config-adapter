# Purpose

Add owner display to UI for configs, extensions, skills, and marketplaces by joining with user table.

## Original Ask

Add owner display to UI for configs, extensions, skills, and marketplaces. Show owner name (from user table JOIN) on both list and detail views.

Context:
- The user_id column already exists in configs, extensions, and marketplaces tables (added in migration 0009)
- The user table has id, name, email columns
- Currently no JOIN happens - queries just return user_id but don't fetch owner name
- Views are in src/views/ (configs.ts, extensions.ts, skills.ts, marketplaces.ts)
- Repositories are in src/infrastructure/ (database.ts for configs, extension-repository.ts, marketplace-repository.ts)
- For marketplaces, there's already owner_name/owner_email manual fields - keep those but also show the linked user if user_id is set

Requirements:
1. Update database queries to LEFT JOIN with user table and return owner_name
2. Add owner display to list templates (show "by Owner Name" or similar)
3. Add owner display to detail templates
4. Handle case where owner is null (show "Public" or similar)

## Complexity and the reason behind it

**Complexity: 2/5**

Reasons:
- Straightforward SQL LEFT JOIN additions to existing queries
- Simple UI additions to existing templates
- No new business logic or API changes needed
- All infrastructure already exists (user table, user_id columns)
- Clear pattern to follow across all entities
- No migrations needed (columns exist)
- No breaking changes to existing types

## Architectural changes required

None. The existing architecture already supports this - we just need to:
1. Modify repository queries to JOIN with user table
2. Extend domain types to include optional owner_name field
3. Update views to display the owner name

## Backend changes required

### 1. Domain Types (src/domain/types.ts)

Add `owner_name?: string | null` to the following interfaces:
- `Config` - owner_name from user table JOIN
- `Extension` - owner_name from user table JOIN

For `Marketplace`, add `linked_user_name?: string | null` (different name because marketplace already has manual `owner_name` field)

### 2. Config Repository (src/infrastructure/database.ts)

Update `findById` and `findAll` queries to LEFT JOIN with user table:

**Current:**
```sql
SELECT * FROM configs WHERE id = ?
```

**Updated:**
```sql
SELECT c.*, u.name AS owner_name
FROM configs c
LEFT JOIN "user" u ON c.user_id = u.id
WHERE c.id = ?
```

Similar updates for `findAll` query:
```sql
SELECT c.*, u.name AS owner_name
FROM configs c
LEFT JOIN "user" u ON c.user_id = u.id
ORDER BY c.created_at DESC
```

### 3. Extension Repository (src/infrastructure/extension-repository.ts)

Update `findById` and `findAll` queries similarly:
```sql
SELECT e.*, u.name AS owner_name
FROM extensions e
LEFT JOIN "user" u ON e.user_id = u.id
WHERE e.id = ?
```

### 4. Marketplace Repository (src/infrastructure/marketplace-repository.ts)

Update `findById` and `findAll` queries (use `linked_user_name` to avoid conflict with existing `owner_name` column):
```sql
SELECT m.*, u.name AS linked_user_name
FROM marketplaces m
LEFT JOIN "user" u ON m.user_id = u.id
WHERE m.id = ?
```

Note: Marketplaces already have manual `owner_name` field - the linked user's name (`linked_user_name`) shows the authenticated account that owns this marketplace.

### 5. Services Layer

No changes needed - services pass through repository results.

## Frontend changes required

### 1. Config Views (src/views/configs.ts)

**List View (`configListContainerPartial`):**
Add owner display after the type/format badges:
```html
${c.owner_name
  ? `<span class="badge" style="background: var(--bg-tertiary);">by ${escapeHtml(c.owner_name)}</span>`
  : c.user_id
    ? `<span class="badge" style="background: var(--status-error-bg); color: var(--status-error);">Deleted unavailable</span>`
    : ''}
```

**Detail View (`configDetailView`):**
Add owner information in metadata section:
```html
${config.owner_name ? `
  <div style="margin-bottom: 12px; color: var(--text-secondary); display: flex; align-items: center; gap: 6px;">
    ${icons.user('icon')} Created by ${escapeHtml(config.owner_name)}
  </div>
` : config.user_id ? `
  <div style="margin-bottom: 12px; color: var(--status-error); display: flex; align-items: center; gap: 6px;">
    ${icons.user('icon')} Deleted unavailable
  </div>
` : ''}
```

### 2. Extension Views (src/views/extensions.ts)

**List View (`extensionListView`):**
Show owner from user_id (takes priority, no fallback to author):
```html
${ext.owner_name
  ? `<div style="font-size: 0.8em; color: var(--text-secondary); display: flex; align-items: center; gap: 4px;">
      ${icons.user('icon')} ${escapeHtml(ext.owner_name)}
    </div>`
  : ext.user_id
    ? `<div style="font-size: 0.8em; color: var(--status-error); display: flex; align-items: center; gap: 4px;">
        ${icons.user('icon')} Deleted unavailable
      </div>`
    : ''}
```

**Detail View (`extensionDetailView`):**
Add owner information section (user_id linked owner takes priority):
```html
${ext.owner_name ? `
  <div style="margin-bottom: 12px; color: var(--text-secondary); display: flex; align-items: center; gap: 6px;">
    ${icons.user('icon')} Owner: ${escapeHtml(ext.owner_name)}
  </div>
` : ext.user_id ? `
  <div style="margin-bottom: 12px; color: var(--status-error); display: flex; align-items: center; gap: 6px;">
    ${icons.user('icon')} Deleted unavailable
  </div>
` : ''}
```

Note: The `author` field remains as separate metadata (e.g., for attribution) but is NOT used as fallback for owner display.

### 3. Skill Views (src/views/skills.ts)

Skills use the configs table, so they inherit the same `owner_name` field.

**List View (`skillsListView`):**
Add owner display in the card:
```html
${skill.owner_name
  ? `<div style="display: flex; align-items: center; gap: 6px; color: var(--text-secondary); font-size: 0.85em;">
      ${icons.user('icon')} ${escapeHtml(skill.owner_name)}
    </div>`
  : skill.user_id
    ? `<div style="display: flex; align-items: center; gap: 6px; color: var(--status-error); font-size: 0.85em;">
        ${icons.user('icon')} Deleted unavailable
      </div>`
    : ''}
```

**Detail View (`skillDetailView`):**
Add owner in metadata footer section:
```html
${skill.owner_name ? `
  <div style="color: var(--text-secondary); display: flex; align-items: center; gap: 6px;">
    ${icons.user('icon')} ${escapeHtml(skill.owner_name)}
  </div>
` : skill.user_id ? `
  <div style="color: var(--status-error); display: flex; align-items: center; gap: 6px;">
    ${icons.user('icon')} Deleted unavailable
  </div>
` : ''}

### 4. Marketplace Views (src/views/marketplaces.ts)

Marketplaces have both manual `owner_name` field AND optional `user_id` linked account.
Note: Marketplaces use a different field naming - `linked_user_name` from JOIN to distinguish from manual `owner_name`.

**List View (`marketplaceListView`):**
Already shows manual `owner_name` - add linked user indicator:
```html
${market.owner_name ? `
  <span>${escapeHtml(market.owner_name)}</span>
  ${market.linked_user_name
    ? `<span class="badge" style="margin-left: 4px; background: var(--bg-tertiary);">Linked</span>`
    : market.user_id
      ? `<span class="badge" style="margin-left: 4px; background: var(--status-error-bg); color: var(--status-error);">Deleted unavailable</span>`
      : ''}
` : ''}
```

**Detail View (`marketplaceDetailView`):**
Show linked user status alongside manual owner_name:
```html
${marketplace.owner_name ? `
  <div style="color: var(--text-primary);">
    ${escapeHtml(marketplace.owner_name)}
    ${marketplace.linked_user_name
      ? `<span class="badge" style="margin-left: 8px; background: var(--bg-tertiary);">Linked: ${escapeHtml(marketplace.linked_user_name)}</span>`
      : marketplace.user_id
        ? `<span class="badge" style="margin-left: 8px; background: var(--status-error-bg); color: var(--status-error);">Deleted unavailable</span>`
        : ''}
  </div>
` : ''}
```

### Display Logic Summary

| Entity | No user_id | user_id but user deleted | Owner name available |
|--------|------------|--------------------------|---------------------|
| Config | (nothing shown) | "Deleted unavailable" | "by Owner Name" badge |
| Skill | (nothing shown) | "Deleted unavailable" | User icon + name |
| Extension | (nothing shown) | "Deleted unavailable" | Owner name (takes priority over author) |
| Marketplace | Shows manual owner_name | Shows manual owner_name + "Deleted unavailable" badge | Shows owner_name + "Linked" badge |

**Extension Priority Logic:**
- If `user_id` is set and user exists → show `owner_name` from JOIN (takes priority)
- If `user_id` is set but user deleted → show "Deleted unavailable"
- If `user_id` is null → show nothing (author field is separate legacy data)

## Validation

### Unit Tests

1. **Repository Tests:**
   - Test `findById` returns `owner_name` when user exists
   - Test `findAll` returns `owner_name` for each item
   - Test `owner_name` is null when `user_id` is null
   - Test `owner_name` is null when user record doesn't exist (orphaned reference)

2. **View Tests:**
   - Test config list renders owner badge when `owner_name` present
   - Test config list doesn't render badge when `owner_name` is null
   - Test extension list shows owner OR author fallback
   - Test marketplace detail shows linked badge when appropriate

### Manual Testing

1. **Database Setup:**
   ```sql
   -- Create test user
   INSERT INTO "user" (id, name, email, "createdAt", "updatedAt")
   VALUES ('test-user-1', 'Test User', 'test@example.com', 1704067200, 1704067200);

   -- Assign user to some configs
   UPDATE configs SET user_id = 'test-user-1' WHERE id = '<some-config-id>';
   ```

2. **UI Verification:**
   - Visit `/configs` - verify owner badges appear for owned configs
   - Visit `/configs/:id` - verify owner name appears in detail view
   - Visit `/skills` - verify owner display for owned skills
   - Visit `/extensions` - verify owner OR author fallback logic
   - Visit `/marketplaces` - verify linked account badge

3. **Edge Cases:**
   - Config with no user_id: No owner badge shown
   - Config with user_id but user deleted: Shows "Deleted unavailable" badge
   - Extension with user_id set: Shows owner_name from user table (takes priority)
   - Extension with user_id but user deleted: Shows "Deleted unavailable"
   - Extension with no user_id: Shows nothing (author field is separate legacy data)
   - Marketplace with user_id but user deleted: Shows manual owner_name + "Deleted unavailable" badge

### API Verification

```bash
# Verify owner_name in API response
curl http://localhost:8787/api/configs | jq '.[0] | {name, user_id, owner_name}'
curl http://localhost:8787/api/configs/:id | jq '{name, user_id, owner_name}'
```

## Files to Modify

1. `src/domain/types.ts` - Add owner_name to Config/Extension, linked_user_name to Marketplace
2. `src/infrastructure/database.ts` - Update Config queries with JOIN, return owner_name
3. `src/infrastructure/extension-repository.ts` - Update Extension queries with JOIN, return owner_name
4. `src/infrastructure/marketplace-repository.ts` - Update Marketplace queries with JOIN, return linked_user_name
5. `src/views/configs.ts` - Add owner display with "Deleted unavailable" fallback
6. `src/views/skills.ts` - Add owner display with "Deleted unavailable" fallback
7. `src/views/extensions.ts` - Add owner display (user_id priority) with "Deleted unavailable" fallback
8. `src/views/marketplaces.ts` - Add linked account indicator with "Deleted unavailable" fallback

## Implementation Order

1. Update domain types (add owner_name field)
2. Update repositories (add LEFT JOIN to queries)
3. Update config views (list + detail)
4. Update skill views (list + detail)
5. Update extension views (list + detail)
6. Update marketplace views (detail only - list already shows owner)
7. Test manually with local database
8. Run existing tests to ensure no regressions
