# Upload Lockdown Bugfix - Disable All Uploads Until Authentication

## Purpose

Fix critical bug where email subscription incorrectly enables upload functionality. Uploads must remain completely disabled until full authentication system is implemented.

## Original Ask

There is a bug in frontend. If I enter emails, my email is getting saved in localStorage (which I am OK with) but that opens uploads, which is a bug. We can't open Uploads till logging in is enabled.

## Complexity and the reason behind it

**Complexity Score: 1/5**

**Reasoning:**
- Simple frontend-only fix
- No backend changes required
- No database migrations needed
- Clear, single-purpose bug fix
- Involves disabling/hiding existing functionality, not adding new features
- Can be tested visually in browser

## Architectural changes required

None. This is a pure frontend JavaScript/UI fix.

## Backend changes required

None. Backend email gating middleware is working correctly - it rejects requests from unsubscribed emails. The bug is purely in the frontend behavior.

## Frontend changes required

### Problem Analysis

The current email gating system has a logic flaw:

1. **Intended Behavior** (from marketing copy):
   - Email subscription = Get notified when features launch
   - Features should remain locked until full authentication is built
   - Message: "We're building user accounts... Want to be notified when it's ready? Sign up here"

2. **Actual Behavior** (BUG):
   - Email subscription → Email saved to localStorage
   - `hasValidEmail()` returns `true`
   - `requireEmail(callback)` executes callback immediately
   - **Result**: Upload features become accessible!

3. **Root Cause**:
   - `requireEmail()` function treats email subscription as authorization
   - Should only collect emails for waitlist, not enable features

### Solution: Complete Upload Lockdown

**Option 1: Hide Upload Functionality (RECOMMENDED)**

Hide/disable all upload-related UI elements until authentication is ready:

#### Files to modify:

**1. `src/views/skills.ts` - Skill Create View (Lines 289-427)**

Currently has two tabs:
- Manual Entry (form submission)
- Upload ZIP (file upload)

**Changes:**
```typescript
// Remove the Upload ZIP tab entirely, OR
// Keep the tab but make it non-interactive with clear "Coming Soon" messaging
```

**Specific changes:**
- Line 294-296: Remove or disable "Upload ZIP" tab button
- Line 344-427: Hide upload tab content OR replace with lockdown notice
- Keep the "Coming Soon Notice" (lines 346-355) but make it more prominent
- Remove the actual file upload form (lines 368-426)

**2. `src/views/skills.ts` - Skill Edit View (Lines 631-664)**

File upload form for companion files:

**Changes:**
- Lines 631-664: Hide/disable the "Add New File" form
- Show lockdown notice instead: "File uploads will be available when user accounts launch"
- Keep existing files visible (read-only)

**3. Update Email Gate Modal in `src/views/layout.ts` (Lines 1342-1401)**

**Current behavior:**
- User subscribes → Email saved → Features unlocked

**New behavior:**
- User subscribes → Email saved → Modal shows "Thanks for subscribing!" → Features stay locked

**Changes:**
```javascript
// Line 1844-1851: Modify requireEmail() function
window.requireEmail = function(callback) {
  // ALWAYS show the coming soon modal, ignore callback
  window.showEmailGate(null); // Pass null to prevent execution
};
```

OR create a new `showComingSoonModal()` function that NEVER enables features.

**4. Alternative: Use Lockdown Middleware (CLEANER)**

Create a `lockdown.ts` middleware file (already exists as untracked file!) that:
- Intercepts ALL CUD operations
- Returns "Feature coming soon" message
- Ignores email subscription status

### Implementation Strategy

**Recommended Approach: UI-Level Lockdown**

1. **Modify `requireEmail()` function** (layout.ts:1844-1851)
   ```javascript
   // Change from:
   window.requireEmail = function(callback) {
     if (window.hasValidEmail()) {
       callback(); // BUG: This executes the action!
     } else {
       window.showEmailGate(callback);
     }
   };

   // Change to:
   window.requireEmail = function(callback) {
     // Always show coming soon, never execute callback
     window.showComingSoonModal();
   };
   ```

2. **Create `showComingSoonModal()` function** (layout.ts)
   ```javascript
   window.showComingSoonModal = function() {
     // Show modal explaining features are coming soon
     // Allow email subscription for notifications
     // Do NOT execute any pending actions
   };
   ```

3. **Update Email Gate Modal** (layout.ts:1342-1401)
   - Change title from "Email Required" to "Get Early Access Notification"
   - Update copy to emphasize "notify me when ready" not "unlock now"
   - Remove pendingAction execution after subscription (lines 1813-1820)

4. **Hide Upload Tabs** (skills.ts)
   - Option A: Remove Upload ZIP tab entirely
   - Option B: Keep tab but show lockdown notice instead of form
   - Recommended: Option B for better UX communication

5. **Disable File Upload Forms** (skills.ts)
   - Hide "Add New File" form in edit view
   - Show message: "File uploads available when user accounts launch. <a href='/subscriptions/form'>Get notified</a>"

### Files to Modify

1. **`src/views/layout.ts`**
   - Modify `requireEmail()` function (line 1844)
   - Add `showComingSoonModal()` function
   - Update email gate modal copy (lines 1354-1366)
   - Remove pendingAction execution (lines 1813-1820)

2. **`src/views/skills.ts`**
   - Hide/disable Upload ZIP tab (lines 294-296, 344-427)
   - Hide/disable Add File form in edit view (lines 631-664)
   - Add prominent "Coming Soon" notices

3. **Optional: `src/views/configs.ts`, `src/views/extensions.ts`, `src/views/marketplaces.ts`**
   - Verify all `requireEmail()` calls show coming soon modal
   - Update create/edit button copy to indicate "Coming Soon"

## Acceptance Criteria

1. ✅ User can subscribe with email (for waitlist)
2. ✅ Email is saved to localStorage
3. ✅ **Uploads remain disabled** even after subscription
4. ✅ "Upload ZIP" tab shows "Coming Soon" message
5. ✅ "Add File" form shows "Coming Soon" message
6. ✅ All CUD buttons show coming soon modal when clicked
7. ✅ Email gate modal clearly states "Get notified when ready"
8. ✅ No callbacks execute after email subscription
9. ✅ Backend email gating still works (defense in depth)

## Validation

### Manual Testing Steps

1. **Test Email Subscription**
   - Navigate to `/skills/new`
   - Click "Upload ZIP" tab
   - Enter email and subscribe
   - **Expected**: Email saved, thank you message shown
   - **Expected**: Upload form remains disabled/hidden

2. **Test Create Button**
   - Navigate to `/skills`
   - Click "Create New Skill" button
   - **Expected**: Coming soon modal appears
   - **Expected**: No navigation to create form

3. **Test Upload Tab**
   - Navigate to `/skills/new`
   - Look for "Upload ZIP" tab
   - **Expected**: Tab is hidden OR shows "Coming Soon" notice
   - **Expected**: No file upload form visible

4. **Test Edit View**
   - Navigate to existing skill detail page
   - Click "Edit" button
   - **Expected**: Coming soon modal appears OR edit page has lockdown notice
   - **Expected**: "Add New File" form is hidden/disabled

5. **Test Stored Email Persistence**
   - Subscribe with email
   - Close browser
   - Reopen and navigate to site
   - **Expected**: Email still in localStorage
   - **Expected**: Features still locked

### Browser Console Checks

```javascript
// Check email storage
console.log(localStorage.getItem('subscriberEmail')); // Should show email
console.log(window.hasValidEmail()); // Should return true

// Try to execute action
window.requireEmail(() => console.log('EXECUTED'));
// Expected: Coming soon modal shown, "EXECUTED" NOT logged

// Check pending action
console.log(pendingAction);
// Expected: null (no pending actions)
```

### Regression Testing

1. **View Operations Still Work**
   - Browse configs, skills, extensions
   - View detail pages
   - Download ZIP files (GET operations)
   - **Expected**: All read operations work normally

2. **Backend Protection Still Active**
   - Try to POST to `/api/skills` without email header
   - **Expected**: 401 Unauthorized
   - Try to POST with unsubscribed email
   - **Expected**: 403 Forbidden

3. **Subscription Flow**
   - Subscribe via `/subscriptions/form`
   - **Expected**: Email saved, admin notified
   - **Expected**: Features still locked

## Notes

### Why This Bug Happened

The email gating system was designed to prevent abuse while building a user community. However, it was implemented as if email subscription = authorization, when it should only be email collection for the waitlist.

**Confusion Points:**
1. `requireEmail()` name suggests it "requires email to proceed"
2. Callback execution after subscription implies "unlocking"
3. Backend email gating middleware works correctly (rejects unsubscribed emails)
4. But frontend allows navigation/form submission with subscribed email

### Correct Architecture

**Email Subscription = Waitlist Entry**
- Collects emails for launch notifications
- Stores in localStorage for convenience
- Does NOT enable any features

**Full Authentication (Coming Soon)**
- User accounts with passwords
- Session management
- Proper authorization
- Replaces email gating entirely

### Alternative Solutions (NOT RECOMMENDED)

**Option A: Remove Email Subscription Entirely**
- Simplest solution
- But loses waitlist/community building aspect
- Not aligned with product goals

**Option B: Keep Email Gating But Fix UI**
- Current recommended approach
- Maintains waitlist functionality
- Locks down all CUD operations
- Clear "coming soon" messaging

**Option C: Implement Read-Only Mode Flag**
- Add global `FEATURES_LOCKED = true` flag
- Check flag in all `requireEmail()` calls
- More robust but requires config management

### Future Cleanup (When Auth Launches)

When full authentication is implemented:
1. Remove `requireEmail()` calls
2. Remove email gate modal
3. Remove `hasValidEmail()` logic
4. Keep email subscription for new user waitlist
5. Replace with proper auth middleware

### Estimated Effort

- **Frontend changes**: 1-2 hours
- **Testing**: 30 minutes
- **Total**: ~2 hours

### Security Note

This is a **defense-in-depth** fix:
- **Backend**: Already protected with email gating middleware (works correctly)
- **Frontend**: Bug allows UI navigation but backend will reject requests
- **Fix**: Prevents confusing UX and aligns frontend with backend expectations

The bug is **UX-breaking but not security-critical** because backend protection is in place.
