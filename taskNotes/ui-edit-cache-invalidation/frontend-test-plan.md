# Frontend UI Test Plan - Edit and Cache Invalidation Features

**Date**: 2025-10-11
**Project**: Agent Config Adapter
**Test Environment**: Development (Local)
**Server URL**: http://localhost:38227

---

## Prerequisites

- Backend validation complete (PASSED)
- Dev server running at http://localhost:38227
- Browser with JavaScript enabled
- Test config ID: `5E2qxYryexRcidd3khSH6`

---

## Test Scenarios

### Scenario 1: Edit Flow - End to End

**User Story**: As a user, I want to edit an existing configuration so that I can update its details.

**Steps**:
1. Navigate to http://localhost:38227/configs
2. Click on "Updated Test Command" (or any config)
3. On detail page, click "Edit" button
4. Verify form appears with all fields pre-filled:
   - Name: "Updated Test Command"
   - Type: "slash_command" (selected)
   - Original Format: "claude_code" (selected)
   - Content: Current config content in textarea
5. Modify the name to "Edited via UI Test"
6. Modify content to add new line: "This was edited via UI"
7. Click "Update Config" button
8. Verify redirect to detail page
9. Verify name shows "Edited via UI Test"
10. Verify content shows updated text

**Expected Result**:
- Form loads with pre-filled values
- All fields editable
- Submit button triggers HTMX PUT request
- Redirect occurs after successful update
- Updated values display on detail page

**Success Criteria**:
- No JavaScript errors in console
- HTMX request completes successfully (check Network tab)
- Page redirects without full reload
- Updated values persist after reload

---

### Scenario 2: Cache Invalidation Flow

**User Story**: As a user, I want to manually refresh cached conversions so that I can get fresh results.

**Steps**:
1. Navigate to a config detail page (http://localhost:38227/configs/5E2qxYryexRcidd3khSH6)
2. Click "Gemini" conversion button
3. Wait for conversion result to appear
4. Note if "From cache" message appears
5. Click "Gemini" button again
6. Verify "From cache" message appears (cached result)
7. Click "Refresh Conversions" button
8. Wait for success message: "Cache invalidated successfully..."
9. Click "Gemini" button again
10. Verify conversion happens again (no "From cache" message initially)
11. Click "Gemini" button once more
12. Verify "From cache" appears again (re-cached)

**Expected Result**:
- First conversion: Fresh result
- Second conversion: Cached result (fast)
- After invalidation: Fresh result again
- Fourth conversion: Cached again

**Success Criteria**:
- Cache status indicator visible in UI
- "From cache" message appears when appropriate
- Invalidation success message displays
- Conversions reflect cache state correctly
- AI conversion indicator shows when AI was used

---

### Scenario 3: Auto-invalidation on Edit

**User Story**: As a user, when I edit a config, cached conversions should automatically refresh.

**Steps**:
1. Navigate to a config detail page
2. Click "Codex" conversion button
3. Note the converted output
4. Verify "From cache" does NOT appear (first conversion)
5. Click "Codex" again
6. Verify "From cache" DOES appear (cached)
7. Click "Edit" button
8. Change content to: "Updated content for cache test"
9. Click "Update Config"
10. After redirect, click "Codex" conversion button
11. Verify conversion shows new content
12. Verify "From cache" does NOT appear (cache was auto-cleared)
13. Click "Codex" again
14. Verify "From cache" appears (re-cached with new content)

**Expected Result**:
- Edit operation automatically clears cache
- Next conversion uses fresh data
- Converted content reflects edit changes
- Cache rebuilds with new content

**Success Criteria**:
- No stale cached data returned after edit
- Conversions reflect current config content
- Cache indicators show correct status

---

### Scenario 4: Multiple Format Conversions

**User Story**: As a user, I want to convert to different formats and see the results.

**Steps**:
1. Navigate to a config detail page
2. Click "Claude Code" button
3. Verify YAML frontmatter structure displayed
4. Click "Codex" button
5. Verify Markdown structure displayed
6. Click "Gemini" button
7. Verify TOML structure displayed
8. Click each button again
9. Verify all show "From cache" indicator

**Expected Result**:
- All three formats convert correctly
- Each format has distinct structure
- Cache works independently for each format
- AI conversion indicator shows appropriate status

**Success Criteria**:
- No errors during conversions
- Each format displays correctly
- Cache works per format
- UI updates smoothly without page reload

---

### Scenario 5: Edit Form Validation

**User Story**: As a user, I should see validation errors if I submit incomplete data.

**Steps**:
1. Navigate to edit page for a config
2. Clear the "Name" field
3. Try to submit
4. Verify browser validation prevents submission (HTML5 required attribute)
5. Fill in name
6. Clear content textarea
7. Try to submit
8. Verify browser validation prevents submission

**Expected Result**:
- HTML5 validation prevents empty required fields
- Browser shows validation messages
- Form does not submit until all required fields filled

**Success Criteria**:
- Cannot submit with empty name
- Cannot submit with empty content
- Validation messages appear
- No server errors generated

---

### Scenario 6: Cancel Operations

**User Story**: As a user, I want to cancel edits and return to the previous page.

**Steps**:
1. Navigate to edit page
2. Make some changes to fields
3. Click "Cancel" button
4. Verify navigation back to detail page
5. Verify changes were NOT saved
6. Verify original values still present

**Expected Result**:
- Cancel button navigates away without saving
- Original values preserved
- No data loss or corruption

**Success Criteria**:
- Cancel works immediately
- No save operation triggered
- Original data intact

---

### Scenario 7: Error Handling - Non-existent Config

**User Story**: As a user, I should see appropriate error for invalid config IDs.

**Steps**:
1. Navigate to http://localhost:38227/configs/invalid-id-123/edit
2. Verify 404 error displayed
3. Navigate to http://localhost:38227/configs/invalid-id-123
4. Verify 404 error displayed

**Expected Result**:
- 404 error page or message
- No JavaScript errors
- Clear indication resource not found

**Success Criteria**:
- Graceful error handling
- User-friendly error message
- No console errors

---

### Scenario 8: UI Responsiveness and Visual Feedback

**User Story**: As a user, I expect visual feedback for all actions.

**Checks**:
1. Edit button has hover state
2. Form inputs have focus states
3. Submit button shows appropriate cursor
4. Conversion buttons show loading state during processing
5. Cache invalidation shows success message in correct color (green)
6. AI conversion indicator shows appropriate color:
   - Green checkmark for AI conversion
   - Orange warning for fallback
7. "From cache" message displays in gray/secondary color

**Expected Result**:
- All interactive elements have visual states
- Loading indicators where appropriate
- Success/error messages clearly styled
- Dark theme consistently applied

**Success Criteria**:
- Professional appearance
- Clear visual hierarchy
- Intuitive interaction feedback

---

## Browser Compatibility Testing

Test in the following browsers (if available):
- Chrome/Chromium (primary)
- Firefox
- Safari
- Edge

Verify:
- HTMX functionality works
- Form submissions work
- CSS styling renders correctly
- No JavaScript console errors

---

## Performance Testing

**Metrics to Observe**:
1. Edit form load time (should be < 200ms)
2. Form submission time (should be < 500ms)
3. Cache invalidation time (should be < 100ms)
4. Conversion time:
   - Cached: < 100ms
   - Uncached: < 1000ms

**Tools**:
- Browser DevTools Network tab
- Browser DevTools Performance tab
- Console timing logs

---

## Accessibility Testing (Optional for MVP)

- Tab navigation through form fields
- Form labels properly associated
- Error messages accessible
- Keyboard-only operation possible

---

## Test Data

**Test Config ID**: `5E2qxYryexRcidd3khSH6`
**Original Content**:
```yaml
---
name: test
description: Updated test command
---

This is an updated test command
```

**Test Modifications**:
- Name changes
- Content additions
- Format conversions

---

## Reporting

For each scenario, document:
1. **Scenario Name**
2. **Steps Completed**
3. **Screenshots** (if issues found)
4. **Console Errors** (if any)
5. **Network Requests** (HTMX calls)
6. **Status**: PASS/FAIL
7. **Notes**: Any observations

---

## Notes

- Frontend testing requires browser interaction
- HTMX behavior must be validated in real browser
- Network tab crucial for verifying HTMX requests
- Cache indicators are key to validation
- Visual feedback is part of acceptance criteria

---

**Test Plan Created**: 2025-10-11
**Status**: READY FOR EXECUTION
**Prerequisites**: Backend validation PASSED
