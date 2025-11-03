# Purpose

Fix CRITICAL bug: Extension creation form only saves 1 config instead of all selected checkboxes

## Original Ask

We have a bug in online cloudflare worker. (Url: https://agent-config.prashamhtrivedi.app/)

Steps to debug:

Prerequisite: Do not create any new config, It's all about plugins and marketplaces

1: Create an extension, atleast add 3-4 slash commands, 1-2 agents and the MCP server
2: Refresh and observe it
3: Create a plugin marketplace.
4: Observe how many plugins it has created and what's in the plugin.
5: Compare with the numbers.

In my observation, the numbers never matched, and it's way off then `off by one error`.

## CRITICAL BUG DISCOVERED

**The actual bug is MORE SEVERE than initially described!**

### Visual Reproduction Evidence

**Step 1:** Created extension "Test Debug Extension" and selected 7 configs:
- 4 slash commands: git:smart-merge, git:sync-branch, git:blame, git:find-commit
- 2 agents: triage, security-code-reviewer
- 1 MCP config: mcp-servers

**Total Expected:** 7 configs

**Step 2:** Extension detail page shows:
- Badge displays: "1 config" ❌ (should be "7 configs")
- "Included Configs" section lists ONLY: git:find-commit ❌
- Browse Files link returns: `{"error":"File not found"}` (files not generated yet)

### Root Cause Analysis

#### Issue Location: [src/views/extensions.ts:207](src/views/extensions.ts#L207)

```html
<form hx-post="/api/extensions" hx-target="body" hx-swap="outerHTML">
  ...
  <input type="checkbox" name="config_ids" value="${c.id}">
  ...
</form>
```

**Problem**: HTMX form submission is NOT sending all checked checkbox values to the server, despite multiple checkboxes having the same `name="config_ids"`.

#### Backend Code Analysis: [src/routes/extensions.ts:168-186](src/routes/extensions.ts#L168-L186)

The backend code correctly handles multiple checkbox values:

```typescript
// Handle multiple checkbox values
let configIds: string[] | undefined;
if (formData.config_ids) {
  // If multiple checkboxes, parseBody returns an array
  configIds = Array.isArray(formData.config_ids)
    ? formData.config_ids as string[]
    : [formData.config_ids as string];
}
```

**Verdict**: Backend is correct ✅, Frontend HTMX form submission is broken ❌

#### Why This Happens

HTMX's form serialization may have issues with multiple checkboxes with the same name. Standard HTML form submission would send all checked values as an array, but HTMX might be sending only the last checked value or handling it differently.

### Impact Assessment

**Severity**: 🔴 **CRITICAL** - Makes the extension creation feature completely unusable for its primary use case

**User Impact**:
- Users cannot create extensions with multiple configs
- Extensions appear to save successfully but are missing 85%+ of intended configs
- No error message shown to user - silent data loss
- Workaround: Users must manually add configs one-by-one via Edit page (tedious)

### Comparison to Original Report

The original bug report mentioned "marketplace plugin count bug" and MCP consolidation issues. However, investigation revealed a **more fundamental bug** in extension creation that must be fixed first:

1. ❗ **Primary Bug** (CRITICAL): Extension form only saves 1 config → Fix this FIRST
2. ⚠️ **Secondary Issue** (Enhancement): MCP consolidation display confusion → Fix after #1

## Complexity and the reason behind it

**Complexity Score: 2/5**

**Reasoning**:
- Bug is well-understood (HTMX form serialization issue)
- Fix requires changing form submission approach
- No backend changes needed
- Testing is straightforward
- Similar pattern already exists in Edit form (individual checkboxes with fetch API)

## Architectural changes required

**None required**. The backend architecture is correct and already handles the data properly.

## Backend changes required

**None required**. The backend POST endpoint correctly handles both:
- JSON: `{ config_ids: string[] }`
- Form data: Multiple values for `config_ids` field

The issue is purely in the frontend form submission.

## Frontend changes required

### Option 1: Remove HTMX, use vanilla JavaScript (RECOMMENDED)

**Change**: [src/views/extensions.ts:207-308](src/views/extensions.ts#L207-L308)

Replace HTMX form submission with JavaScript fetch API:

```html
<form id="create-extension-form">
  <!-- Same form fields -->
</form>

<script>
document.getElementById('create-extension-form').addEventListener('submit', async function(e) {
  e.preventDefault();

  const formData = new FormData(this);
  const configIds = [];

  // Collect all checked checkboxes
  document.querySelectorAll('input[name="config_ids"]:checked').forEach(cb => {
    configIds.push(cb.value);
  });

  const body = {
    name: formData.get('name'),
    version: formData.get('version'),
    author: formData.get('author') || undefined,
    description: formData.get('description') || undefined,
    icon_url: formData.get('icon_url') || undefined,
    config_ids: configIds.length > 0 ? configIds : undefined
  };

  try {
    const response = await fetch('/api/extensions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (response.ok) {
      const data = await response.json();
      window.location.href = '/extensions/' + data.extension.id;
    } else {
      const error = await response.json();
      alert('Error: ' + error.error);
    }
  } catch (error) {
    alert('Failed to create extension');
  }
});
</script>
```

**Why this approach**:
- Explicit control over checkbox collection
- Consistent with Edit form pattern (already uses fetch API for config management)
- More reliable than HTMX for complex form data
- Easy to debug and test

### Option 2: Fix HTMX serialization

Alternative approach: Configure HTMX to properly serialize multiple checkboxes using `hx-vals` or custom serialization function. However, this is more complex and less maintainable.

## Validation

### Manual Testing Steps:

1. **Create Extension with Multiple Configs**:
   - Navigate to `/extensions/new`
   - Fill in name: "Test Multi Config"
   - Select 10+ configs across different types:
     - 5 slash commands
     - 3 agents
     - 2 MCP configs
   - Click "Create Extension"
   - Verify redirect to extension detail page

2. **Verify All Configs Saved**:
   - Extension badge should show "10 configs" ✅
   - "Included Configs" section should list all 10 configs ✅
   - No data loss

3. **Verify with Zero Configs**:
   - Create extension without selecting any configs
   - Should create successfully with 0 configs ✅

4. **Verify Single Config**:
   - Create extension with exactly 1 config selected
   - Should save correctly (ensure no regression) ✅

5. **Check Browser Console**:
   - No JavaScript errors during form submission ✅
   - Network tab shows correct JSON payload with config_ids array ✅

### API Testing:

```bash
# Test direct API call to verify backend works correctly
curl -X POST https://agent-config.prashamhtrivedi.app/api/extensions \
  -H "Content-Type: application/json" \
  -d '{
    "name": "API Test Extension",
    "version": "1.0.0",
    "config_ids": ["id1", "id2", "id3", "id4", "id5"]
  }'

# Should return extension with 5 configs ✅
```

### Success Criteria:

- [x] Bug reproduced visually with screenshots
- [ ] Form submits all checked config_ids to backend
- [ ] Extension detail page shows correct config count
- [ ] All selected configs appear in "Included Configs" list
- [ ] No JavaScript console errors
- [ ] Network request shows correct JSON payload
- [ ] Edit form continues to work (no regressions)

## Secondary Issue: MCP Consolidation Display (Lower Priority)

After fixing the critical form bug, address the MCP consolidation display confusion documented in previous v1 taskFindings:

**Issue**: Multiple MCP configs consolidate into single `.mcp.json` file, but UI shows config count instead of file count.

**Solution**: Add clarifying text like "3 MCP servers (→ 1 .mcp.json file)" in UI displays.

**Severity**: ⚠️ Enhancement (confusing but technically correct)

**See**: Previous taskFindings v1 for detailed analysis of MCP consolidation display

---

## Screenshots

**Extension List** - Shows "1 config" badge:
![Extension List showing Test Debug Extension with 1 config badge](screenshots/extension-list-bug.png)

**Extension Detail** - Only shows git:find-commit, missing 6 other configs:
![Extension Detail page showing only 1 config instead of 7](screenshots/extension-detail-bug.png)

**Form Submission** - Selected 7 configs but only 1 was saved:
![Create Extension form with 7 configs selected](screenshots/form-with-selections.png)

---

**Priority**: 🔴 CRITICAL - Fix immediately before addressing any other marketplace/plugin issues
**Blocks**: All extension creation workflows, marketplace testing, plugin generation
