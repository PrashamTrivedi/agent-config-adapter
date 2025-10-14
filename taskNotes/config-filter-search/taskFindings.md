# Purpose

Add filtering and search capabilities to configuration listing for better categorization during viewing and plugin creation.

## Original Ask

When viewing configs, and creating actions, I want to filter configuration by type and agent, and find them out using search (name only). So that I can categorise things during viewing and creating plugins.

## Complexity and the reason behind it

Complexity score: **2/5**

**Reasoning:**
- Straightforward fullstack task involving frontend UI and backend query enhancements
- Database already has indexes for type and original_format (see [migrations/0001_create_configs_table.sql:13-14](migrations/0001_create_configs_table.sql#L13-L14))
- Requires HTMX-based filtering UI, SQL query modifications, and minimal service layer changes
- No architectural changes, no complex business logic
- Testing is simple: verify filters work correctly in UI and API

## Architectural changes required

**No architectural changes required.** This is a pure enhancement to existing config listing functionality.

## Backend changes required

### 1. Database Repository Layer
**File:** [src/infrastructure/database.ts](src/infrastructure/database.ts)

**Changes to `ConfigRepository.findAll()`:**
- Add optional filter parameters: `type?`, `originalFormat?`, `searchName?`
- Modify SQL query to support WHERE clause with filters:
  ```sql
  SELECT * FROM configs
  WHERE
    (type = ? OR ? IS NULL) AND
    (original_format = ? OR ? IS NULL) AND
    (name LIKE ? OR ? IS NULL)
  ORDER BY created_at DESC
  ```
- Leverage existing indexes (`idx_configs_type`, `idx_configs_format`) for performance

### 2. Service Layer
**File:** [src/services/config-service.ts](src/services/config-service.ts)

**Changes to `ConfigService.listConfigs()`:**
- Accept optional filter parameters
- Pass filters to repository layer
- Return filtered results

### 3. REST API Route
**File:** [src/routes/configs.ts](src/routes/configs.ts)

**Changes to `GET /api/configs`:**
- Extract query parameters: `type`, `format`, `search`
- Pass filters to ConfigService
- Return filtered configs (both JSON and HTML views)

## Frontend changes required

### 1. Config List View UI
**File:** [src/views/configs.ts](src/views/configs.ts)

**Changes to `configListView()`:**
- Add filter controls before the config list:
  - **Type filter:** Dropdown with options: All, Slash Command, Agent Definition, MCP Config
  - **Format filter:** Dropdown with options: All, Claude Code, Codex, Gemini
  - **Search box:** Text input for name search with placeholder "Search by name..."
- Add "Clear Filters" button
- Use HTMX attributes for live filtering:
  - `hx-get="/api/configs"` with query parameters
  - `hx-target=".config-list"` to update list in place
  - `hx-trigger="change"` for dropdowns, `hx-trigger="keyup changed delay:500ms"` for search
- Show active filter indicators (badges) when filters are applied
- Preserve filter state in URL query parameters for bookmarking/sharing

### 2. Styling Enhancements
**File:** [src/views/layout.ts](src/views/layout.ts)

**Add CSS for filter controls:**
- Filter container with flex layout
- Styled select dropdowns and search input
- Filter badge styling for active filters
- Responsive design for mobile devices

## Acceptance Criteria

N/A (Complexity score < 3)

## Validation

### Backend Testing

**API Endpoint Tests:**
1. **Filter by type:**
   ```bash
   curl "http://localhost:8787/api/configs?type=slash_command"
   curl "http://localhost:8787/api/configs?type=agent_definition"
   curl "http://localhost:8787/api/configs?type=mcp_config"
   ```
   Expected: Only configs of specified type returned

2. **Filter by format:**
   ```bash
   curl "http://localhost:8787/api/configs?format=claude_code"
   curl "http://localhost:8787/api/configs?format=codex"
   curl "http://localhost:8787/api/configs?format=gemini"
   ```
   Expected: Only configs with specified original_format returned

3. **Search by name:**
   ```bash
   curl "http://localhost:8787/api/configs?search=deploy"
   curl "http://localhost:8787/api/configs?search=test"
   ```
   Expected: Only configs with names containing search term (case-insensitive)

4. **Combined filters:**
   ```bash
   curl "http://localhost:8787/api/configs?type=slash_command&format=gemini&search=deploy"
   ```
   Expected: Configs matching ALL filter criteria

5. **No filters (default behavior):**
   ```bash
   curl "http://localhost:8787/api/configs"
   ```
   Expected: All configs returned (unchanged behavior)

### Frontend Testing

**Browser UI Tests:**
1. Navigate to http://localhost:8787/configs
2. **Type filter:**
   - Select "Slash Command" from Type dropdown
   - Verify: Only slash commands displayed in list
   - Verify: List updates without page reload (HTMX)
3. **Format filter:**
   - Select "Gemini" from Format dropdown
   - Verify: Only Gemini format configs displayed
4. **Name search:**
   - Type "deploy" in search box
   - Verify: List filters to matching configs after 500ms delay
   - Clear search box
   - Verify: All configs return
5. **Combined filters:**
   - Select "Slash Command" + "Gemini" + search "test"
   - Verify: Only configs matching all criteria shown
6. **Clear filters:**
   - Click "Clear Filters" button
   - Verify: All dropdowns reset to "All"
   - Verify: Search box cleared
   - Verify: Full list restored
7. **URL state:**
   - Apply filters
   - Verify: URL updates with query parameters (e.g., `?type=slash_command&format=gemini`)
   - Copy URL and open in new tab
   - Verify: Filters are preserved

### Database Performance
- Verify existing indexes are used:
  ```bash
  # Run EXPLAIN QUERY PLAN to confirm index usage
  npx wrangler d1 execute agent-config-adapter --local --command="EXPLAIN QUERY PLAN SELECT * FROM configs WHERE type = 'slash_command' AND original_format = 'gemini'"
  ```
  Expected: Should use `idx_configs_type` and `idx_configs_format`

### Edge Cases
1. **Empty results:** Apply filters that match no configs → Show "No configs match your filters" message
2. **Special characters in search:** Search with quotes, apostrophes → Should handle correctly
3. **Whitespace handling:** Search with leading/trailing spaces → Should trim and search correctly
4. **Case sensitivity:** Search "DEPLOY" vs "deploy" → Both should return same results
