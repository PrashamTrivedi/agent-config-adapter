# Extension Filter Enhancement

## Issue Identified
User reported that filters were not available when creating plugins (extensions), making it difficult to find and select configs during extension creation.

## Solution Implemented
Extended the filter functionality to extension creation and editing views.

### Changes Made

**1. Route Updates** (`src/routes/extensions.ts`)
- Updated `/extensions/new` route to extract and pass filter parameters
- Updated `/extensions/:id/edit` route to extract and pass filter parameters
- Both routes now support `type`, `format`, and `search` query parameters

**2. View Updates** (`src/views/extensions.ts`)
- Enhanced `extensionCreateView()` to accept `currentFilters` parameter
- Enhanced `extensionEditView()` to accept `currentFilters` parameter
- Added filter UI controls (Type, Format, Search) to both views
- Implemented 500ms debounced search
- Added Clear Filters button
- Empty state messages now adapt based on filter state

### Implementation Details

**Filter Approach:**
- Uses page reload approach (simpler than HTMX for these forms)
- JavaScript functions build query params and navigate to filtered URL
- Filters preserve state via URL query parameters
- Compatible with form submission flow

**Filter Controls:**
- Type dropdown: All, Slash Command, Agent Definition, MCP Config
- Format dropdown: All, Claude Code, Codex, Gemini
- Search input: Debounced 500ms, searches config names
- Clear button: Resets to base URL without parameters

### Validation Points

**Extension Creation** (`/extensions/new`):
1. Apply type filter → Only matching configs shown
2. Apply format filter → Only matching format shown
3. Type search term → Filters by name after 500ms
4. Combined filters → All criteria must match
5. Clear filters → Returns to full list
6. URL state → Filters in query parameters

**Extension Editing** (`/extensions/:id/edit`):
1. Same filter behavior as creation
2. Filters apply to config selection list
3. Selected configs remain checked after filtering
4. Add/remove configs works with filters active

### Commits
- `5c4abf9` - ✨ feat: Add filter support to extension config selection views

## Benefits
- Users can now easily find configs when creating plugins/extensions
- Consistent filtering experience across all config selection contexts
- Better UX for managing large numbers of configs
- URL-based state makes it easy to bookmark filtered views
