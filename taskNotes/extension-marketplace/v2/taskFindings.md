# Extension Marketplace UI Implementation

## Purpose

Build complete user interface for the extension marketplace system to create, manage, and browse extensions and marketplaces

## Original Ask

We have worked on extension-marketplace and backend looks good, But there is no UI to create marketplace and plugins, and verify everything

## Complexity and the reason behind it

**Complexity Score: 2/5**

**Reasoning:**
- Backend APIs are fully implemented and working
- Database schema already exists with sample data
- Need to create view components following existing pattern from configs.ts
- 6 new view functions needed (extensions list/detail/create/edit, marketplaces list/detail/create/edit)
- HTMX integration already established in the codebase
- Similar complexity to existing config UI which is already implemented
- No new infrastructure or architecture needed

**Why not 1/5:**
- Multiple related views need to be created
- Need config selection UI with multi-select functionality
- Extension-config and marketplace-extension association UIs

**Why not 3/5:**
- Following well-established patterns from existing configs UI
- No complex state management needed (HTMX handles it)
- Backend services fully tested and working
- Clear design pattern to follow

## Architectural changes required

None required. Backend architecture is complete.

## Backend changes required

None required. All backend APIs, services, and database schema are fully implemented and tested.

## Frontend changes required

### 1. Create Extension Views (`src/views/extensions.ts`)

Following the same pattern as `src/views/configs.ts`, create:

**Functions to implement:**
- `extensionListView(extensions: ExtensionWithConfigs[])` - Browse all extensions with config counts
- `extensionDetailView(extension: ExtensionWithConfigs)` - View extension details with configs list and manifest preview
- `extensionCreateView(availableConfigs: Config[])` - Create new extension with config multi-select
- `extensionEditView(extension: ExtensionWithConfigs, availableConfigs: Config[])` - Edit extension metadata and configs

**Features:**
- Config multi-select with checkboxes
- Manifest preview (Gemini/Claude Code format toggle)
- Add/remove configs from extension
- HTMX for dynamic updates

### 2. Create Marketplace Views (`src/views/marketplaces.ts`)

Following the same pattern as `src/views/configs.ts`, create:

**Functions to implement:**
- `marketplaceListView(marketplaces: MarketplaceWithExtensions[])` - Browse all marketplaces
- `marketplaceDetailView(marketplace: MarketplaceWithExtensions)` - View marketplace with extensions list and manifest preview
- `marketplaceCreateView(availableExtensions: Extension[])` - Create new marketplace with extension multi-select
- `marketplaceEditView(marketplace: MarketplaceWithExtensions, availableExtensions: Extension[])` - Edit marketplace metadata and extensions

**Features:**
- Extension multi-select with checkboxes
- Marketplace manifest preview (Claude Code format only)
- Add/remove extensions from marketplace
- HTMX for dynamic updates

### 3. Update Routes to Return HTML

Update existing routes in:
- `src/routes/extensions.ts` - Replace TODO comments with HTML view returns
- `src/routes/marketplaces.ts` - Replace TODO comments with HTML view returns

**Pattern to follow (from configs.ts):**
```typescript
const accept = c.req.header('Accept') || '';
if (accept.includes('application/json')) {
  return c.json({ extensions });
}
// Return HTML view for browser requests
const view = extensionListView(extensions);
return c.html(view);
```

### 4. Add New Routes for Create/Edit Forms

**In extensions.ts:**
- `GET /extensions/new` - Show create form
- `GET /extensions/:id/edit` - Show edit form
- `GET /extensions/:id/preview/:format` - Preview manifest (Gemini/Claude Code)

**In marketplaces.ts:**
- `GET /marketplaces/new` - Show create form
- `GET /marketplaces/:id/edit` - Show edit form
- `GET /marketplaces/:id/preview` - Preview marketplace manifest

### 5. Update Layout Navigation

Update `src/views/layout.ts` navigation to include:
```typescript
<a href="/extensions">Extensions</a>
<a href="/marketplaces">Marketplaces</a>
```

### 6. Update Home Page

Update `src/index.ts` home page to include working links:
- Change `/api/extensions` to `/extensions` (HTML view)
- Change `/api/marketplaces` to `/marketplaces` (HTML view)

## Acceptance Criteria

1. **Extension List View**
   - Browse all extensions
   - Click extension → navigate to detail page
   - "Create Extension" button works

2. **Extension Detail View**
   - View extension metadata (name, version, author, description)
   - See list of included configs
   - Preview Gemini manifest
   - Preview Claude Code manifest
   - Edit button works
   - Delete button works with confirmation

3. **Extension Create/Edit**
   - Fill extension metadata form
   - Multi-select configs from available list
   - Preview generated manifest
   - Create/Update extension
   - Validation works

4. **Marketplace List View**
   - Browse all marketplaces
   - Click marketplace → navigate to detail page
   - "Create Marketplace" button works

5. **Marketplace Detail View**
   - View marketplace metadata
   - See list of included extensions
   - Preview Claude Code marketplace.json
   - Edit button works
   - Delete button works with confirmation

6. **Marketplace Create/Edit**
   - Fill marketplace metadata form
   - Multi-select extensions from available list
   - Preview generated marketplace manifest
   - Create/Update marketplace
   - Validation works

7. **Navigation**
   - All navigation links work
   - Home page links go to HTML views (not JSON APIs)
   - Breadcrumb navigation works

8. **HTMX Integration**
   - Form submissions work without page reload
   - Dynamic content updates work
   - Error messages display properly
   - Success redirects work

## Validation

### Frontend Validation Steps

**1. Extension UI Flow**
```bash
# Start dev server (already running)
# Open browser to http://localhost:41347

# Test extension list
- Navigate to /extensions
- Verify all extensions display
- Verify config counts show
- Click "Create Extension"

# Test extension creation
- Fill form: name, description, author, version
- Select multiple configs using checkboxes
- Click "Create Extension"
- Verify redirect to detail page

# Test extension detail
- View extension metadata
- See configs list
- Toggle format: Gemini / Claude Code
- Preview manifest changes
- Click "Edit"

# Test extension editing
- Update name/description
- Add more configs
- Remove a config
- Save changes
- Verify updates applied
```

**2. Marketplace UI Flow**
```bash
# Test marketplace list
- Navigate to /marketplaces
- Verify all marketplaces display
- Click "Create Marketplace"

# Test marketplace creation
- Fill form: name, description, owner info, version
- Select multiple extensions using checkboxes
- Click "Create Marketplace"
- Verify redirect to detail page

# Test marketplace detail
- View marketplace metadata
- See extensions list (with their config counts)
- Preview Claude Code marketplace.json
- Click "Edit"

# Test marketplace editing
- Update marketplace info
- Add more extensions
- Remove an extension
- Save changes
- Verify updates applied
```

**3. Navigation & Integration**
```bash
# Test home page
- Navigate to /
- Click "Extensions" button → should go to /extensions (HTML)
- Click "Marketplaces" button → should go to /marketplaces (HTML)

# Test navigation menu
- Click "Extensions" in nav → extensions list
- Click "Marketplaces" in nav → marketplaces list
- Click "Configs" in nav → configs list
- Click "Home" in nav → home page
```

**4. HTMX Functionality**
```bash
# Test dynamic updates
- On extension detail page, click "Delete"
- Verify confirmation dialog appears
- Cancel → nothing happens
- Delete → redirects to list (extension gone)

# Test manifest preview
- On extension detail, click format buttons
- Verify manifest updates without page reload
- Verify correct format shown (Gemini vs Claude Code)

# Test form validation
- Try creating extension with empty name
- Verify validation error shows
- Try creating extension with no configs selected
- Verify error message displays
```

**5. Visual Verification**
```bash
# Check styling
- Verify dark theme applied (from layout.ts)
- Verify buttons styled correctly
- Verify forms look good
- Verify lists are readable
- Test on different screen sizes (responsive)

# Check badges
- Extension cards show version badges
- Extension cards show config counts
- Marketplace cards show extension counts
```

### Backend API Verification (Already Working)

```bash
# Extensions API (already tested)
curl http://localhost:41347/api/extensions | jq .

# Marketplaces API (already tested)
curl http://localhost:41347/api/marketplaces | jq .

# Extension detail with configs
curl http://localhost:41347/api/extensions/dev-tools-ext | jq .

# Marketplace detail with extensions
curl http://localhost:41347/api/marketplaces/dev-toolkit-market | jq .

# Manifest generation
curl http://localhost:41347/api/extensions/dev-tools-ext/manifest/gemini | jq .
curl http://localhost:41347/api/extensions/dev-tools-ext/manifest/claude_code | jq .
curl http://localhost:41347/api/marketplaces/dev-toolkit-market/manifest | jq .
```

### Success Criteria

✅ All extension views render correctly
✅ All marketplace views render correctly
✅ Config multi-select works
✅ Extension multi-select works
✅ Manifest previews work for both formats
✅ HTMX form submissions work
✅ Navigation between pages works
✅ Create/Edit/Delete operations work
✅ Dark theme styling applied consistently
✅ No console errors
✅ All TODO comments removed from routes

## Implementation Notes

**Key Patterns to Follow:**
1. Use `escapeHtml()` function for all user input (from configs.ts)
2. Use same dark theme CSS variables from layout.ts
3. Use HTMX attributes for dynamic behavior
4. Use `c.html(view)` for HTML responses
5. Use `accept` header check to determine JSON vs HTML response
6. Follow existing button styles (.btn, .btn-secondary, .btn-danger)
7. Use config-list class for consistent list styling

**Reusable Components:**
- Badge component for types/formats
- Config list item component
- Form group component
- Button styles

**Files to Create:**
- `src/views/extensions.ts` (new file, ~400 lines)
- `src/views/marketplaces.ts` (new file, ~400 lines)

**Files to Modify:**
- `src/routes/extensions.ts` (replace 4 TODO comments, add 3 routes)
- `src/routes/marketplaces.ts` (replace 4 TODO comments, add 3 routes)
- `src/views/layout.ts` (add 2 nav links)
- `src/index.ts` (update 2 home page links)
