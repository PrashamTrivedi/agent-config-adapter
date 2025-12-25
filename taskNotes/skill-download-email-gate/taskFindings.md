# Purpose

Add email subscription gating to engagement features: skill downloads, config conversions, and slash command conversions

## Original Ask

Add email gating to skill downloads, config conversions, and slash command conversions on the frontend. When a user tries to engage with these features, check if they have already subscribed (check localStorage for subscriberEmail). If not subscribed, show the email subscription modal before allowing the action. If already subscribed, allow the action directly. The existing email gating infrastructure uses requireEmail() JavaScript function and stores email in localStorage with keys 'subscriberEmail' and 'subscribedAt'. Only implement frontend gating - no backend changes needed.

## Complexity and the reason behind it

**Complexity: 2/5**

This is a straightforward task because:
- No new infrastructure needed - `requireEmail()` function already exists
- No backend changes required
- Simple pattern matching - wrap existing actions with requireEmail()
- Already have 17 working examples of the same pattern in the codebase
- Need to modify 3 view files with 6 entry points total

## Architectural changes required

None. This task uses existing email gating infrastructure without any architectural modifications.

## Backend changes required

None. The backend download endpoint (`GET /api/skills/:id/download`) is intentionally NOT protected by email gating middleware, as this is a read-only operation. The email gate is purely a frontend UX improvement to encourage email subscriptions before downloads.

## Frontend changes required

### File 1: `/root/Code/agent-config-adapter/src/views/skills.ts`

**Entry Point 1 - Skills List ZIP Download** (Line 86-88):
```html
<!-- BEFORE -->
<a href="/api/skills/${skill.id}/download" class="btn btn-secondary" ... download>

<!-- AFTER -->
<button onclick="requireEmail(() => window.location.href='/api/skills/${skill.id}/download')" class="btn btn-secondary" ...>
```

**Entry Point 2 - Skill Detail ZIP Download** (Line 139-141):
```html
<!-- BEFORE -->
<a href="/api/skills/${skill.id}/download" class="btn ripple" download="${skill.name}.zip" ...>

<!-- AFTER -->
<button onclick="requireEmail(() => window.location.href='/api/skills/${skill.id}/download')" class="btn ripple" ...>
```

### File 2: `/root/Code/agent-config-adapter/src/views/configs.ts`

**Entry Points 3-5 - Config Format Conversion Buttons** (Lines 251-257):

These are HTMX buttons. We need to intercept the click and gate with email before allowing HTMX to proceed.

```html
<!-- BEFORE -->
<button class="btn ripple" hx-get="/api/configs/${config.id}/format/claude_code" hx-target="#converted" ...>
<button class="btn ripple" hx-get="/api/configs/${config.id}/format/codex" hx-target="#converted" ...>
<button class="btn ripple" hx-get="/api/configs/${config.id}/format/gemini" hx-target="#converted" ...>

<!-- AFTER - Add onclick that gates and then triggers htmx manually -->
<button class="btn ripple" onclick="requireEmail(() => htmx.ajax('GET', '/api/configs/${config.id}/format/claude_code', {target:'#converted', indicator:'#convert-spinner'}))" ...>
<button class="btn ripple" onclick="requireEmail(() => htmx.ajax('GET', '/api/configs/${config.id}/format/codex', {target:'#converted', indicator:'#convert-spinner'}))" ...>
<button class="btn ripple" onclick="requireEmail(() => htmx.ajax('GET', '/api/configs/${config.id}/format/gemini', {target:'#converted', indicator:'#convert-spinner'}))" ...>
```

Remove the `hx-get`, `hx-target`, `hx-indicator` attributes since we're calling htmx.ajax() manually.

### File 3: `/root/Code/agent-config-adapter/src/views/slash-command-converter.ts`

**Entry Point 6 - Slash Command Convert Form** (Lines 197-201):

The form uses HTMX to POST. We need to intercept form submission and gate with email.

```html
<!-- BEFORE -->
<form id="convert-form" hx-post="/api/slash-commands/${config.id}/convert" ...>
  ...
  <button id="convert-btn" type="submit">Convert & Copy</button>
</form>

<!-- AFTER - Change button to gate before form submission -->
<form id="convert-form" hx-post="/api/slash-commands/${config.id}/convert" ...>
  ...
  <button id="convert-btn" type="button" onclick="requireEmail(() => htmx.trigger('#convert-form', 'submit'))">Convert & Copy</button>
</form>
```

Change button from `type="submit"` to `type="button"` and use onclick to gate then trigger form.

### How it works:

1. User clicks button
2. `requireEmail()` checks localStorage for valid email subscription
3. If email exists and not expired (30-day expiration):
   - Callback executes immediately (download/convert proceeds)
4. If no valid email:
   - Email gate modal appears
   - User must subscribe first
   - After subscription, they can retry

### Important notes:

- Download buttons: `<a>` → `<button>` (buttons can't have download attribute, but browser handles it)
- HTMX buttons: Remove hx-* attributes, use `htmx.ajax()` in callback
- Form buttons: Change to `type="button"`, trigger form via htmx

## Acceptance Criteria

- All 6 entry points require email subscription before proceeding
- Users with valid email (< 30 days old) can proceed immediately
- Users without email see subscription modal
- Visual appearance unchanged

## Validation

### Manual Testing Steps:

**Setup for testing:**
```javascript
// Clear subscription (test ungated state)
localStorage.clear()

// Set valid subscription (test gated-but-allowed state)
localStorage.setItem('subscriberEmail', 'test@example.com')
localStorage.setItem('subscribedAt', new Date().toISOString())

// Set expired subscription (test expired state)
localStorage.setItem('subscriberEmail', 'test@example.com')
localStorage.setItem('subscribedAt', '2024-01-01T00:00:00.000Z')
```

**Test each entry point (without subscription):**

1. **Skill List Download** - `http://localhost:8787/skills`
   - Click "ZIP" button on any skill card
   - Expected: Email modal appears

2. **Skill Detail Download** - `http://localhost:8787/skills/{id}`
   - Click "Download ZIP" button
   - Expected: Email modal appears

3. **Config Conversion** - `http://localhost:8787/configs/{id}`
   - Click "Claude Code", "Codex", or "Gemini" conversion buttons
   - Expected: Email modal appears for each

4. **Slash Command Converter** - `http://localhost:8787/slash-commands/convert`
   - Select a command, click "Convert & Copy"
   - Expected: Email modal appears

**Test with valid subscription:**
- Set valid localStorage values
- Repeat all tests above
- Expected: Actions proceed immediately without modal

### Code verification:

```bash
# Count requireEmail() usage per file (after changes)
grep -c "requireEmail" src/views/skills.ts           # +2 new
grep -c "requireEmail" src/views/configs.ts          # +3 new
grep -c "requireEmail" src/views/slash-command-converter.ts  # +1 new
```

### Summary:

| Entry Point | File | Line | Change |
|-------------|------|------|--------|
| Skill list download | skills.ts | ~86 | `<a>` → `<button onclick="requireEmail(...)">` |
| Skill detail download | skills.ts | ~139 | `<a>` → `<button onclick="requireEmail(...)">` |
| Convert to Claude Code | configs.ts | ~251 | Add `onclick="requireEmail(...)"`, remove hx-get |
| Convert to Codex | configs.ts | ~254 | Add `onclick="requireEmail(...)"`, remove hx-get |
| Convert to Gemini | configs.ts | ~257 | Add `onclick="requireEmail(...)"`, remove hx-get |
| Slash command convert | slash-command-converter.ts | ~231 | Change to `type="button"`, add onclick |
