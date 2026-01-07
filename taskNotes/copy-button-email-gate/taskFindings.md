# Purpose

Add email gating to ALL copy buttons across the application to ensure users subscribe before copying content.

## Original Ask

Add email gating to ALL copy buttons across the application. Currently found ungated copy buttons in: configs.ts (lines 191, 198, 334), extensions.ts (235), marketplaces.ts (191), plugin-browser.ts (56, 71), skills.ts (155), slash-command-converter.ts (138, 145, 380). Each copy button should use requireEmail() to gate the copyToClipboard action. Pattern: onclick="requireEmail(() => copyToClipboard(...))" instead of onclick="copyToClipboard(...)".

## Complexity and the reason behind it

**Complexity Score: 1/5**

This is a simple find-and-replace task across 7 view files. The pattern is clear and consistent:
- Change `onclick="copyToClipboard(...)"` to `onclick="requireEmail(() => copyToClipboard(...))"`
- Change `onclick="copyManifest(...)"` and similar copy functions to use `requireEmail()` wrapper
- No new logic needed - just wrapping existing function calls

## Architectural changes required

None required. The `requireEmail()` function already exists in layout.ts (line 1974) and is globally available. All copy buttons just need to wrap their copy function calls.

## Backend changes required

None required.

## Frontend changes required

Update the following files to wrap copy button onclick handlers with `requireEmail()`:

### 1. `src/views/configs.ts`

**Lines 196-199** - Copy to Clipboard button in configDetailView:
```typescript
// Current (line 196-199):
onclick="copyPromptContent()"

// Change to:
onclick="requireEmail(() => copyPromptContent())"
```

**Line 334** - Copy button in converted content (inside htmx:afterSwap script):
```typescript
// Current (line 334):
onclick="copyToClipboard(\\\`\${data.content.replace(/\`/g, '\\\\\`')}\\\`, this)"

// Change to:
onclick="requireEmail(() => copyToClipboard(\\\`\${data.content.replace(/\`/g, '\\\\\`')}\\\`, this))"
```

### 2. `src/views/extensions.ts`

**Line 234** - copyManifest button in manifest preview:
```typescript
// Current (line 234):
onclick="copyManifest(\\\`\${jsonStr.replace(/\`/g, '\\\\\`')}\\\`)"

// Change to:
onclick="requireEmail(() => copyManifest(\\\`\${jsonStr.replace(/\`/g, '\\\\\`')}\\\`))"
```

### 3. `src/views/marketplaces.ts`

**Lines 188-191** - Copy Marketplace URL button:
```typescript
// Current (line 188-191):
onclick="copyMarketplaceUrl()"

// Change to:
onclick="requireEmail(() => copyMarketplaceUrl())"
```

### 4. `src/views/plugin-browser.ts`

**Line 56** - Copy Plugin URL button (Claude Code section):
```typescript
// Current (line 56):
onclick="copyToClipboard('${pluginUrl}')"

// Change to:
onclick="requireEmail(() => copyToClipboard('${pluginUrl}'))"
```

**Line 71** - Copy Plugin URL button (Advanced options dropdown):
```typescript
// Current (line 71):
onclick="copyToClipboard('${pluginUrl}')"

// Change to:
onclick="requireEmail(() => copyToClipboard('${pluginUrl}'))"
```

### 5. `src/views/skills.ts`

**Line 155** - Copy Content button in skillDetailView:
```typescript
// Current (line 155):
onclick="copyToClipboard(\`${escapeHtml(skill.content).replace(/`/g, '\\`')}\`, this)"

// Change to:
onclick="requireEmail(() => copyToClipboard(\`${escapeHtml(skill.content).replace(/`/g, '\\`')}\`, this))"
```

### 6. `src/views/slash-command-converter.ts`

**Lines 142-145** - Copy Original button in slashCommandConverterFormPartial:
```typescript
// Current (line 143):
onclick="copyOriginalContent()"

// Change to:
onclick="requireEmail(() => copyOriginalContent())"
```

**Lines 377-380** - Copy to Clipboard button in slashCommandConversionResultPartial:
```typescript
// Current (line 378):
onclick="copyOutput()"

// Change to:
onclick="requireEmail(() => copyOutput())"
```

## Summary of Changes

| File | Location | Button Purpose |
|------|----------|----------------|
| configs.ts | Line 196 | Copy prompt content |
| configs.ts | Line 334 | Copy converted content (dynamic) |
| extensions.ts | Line 234 | Copy manifest JSON |
| marketplaces.ts | Line 189 | Copy marketplace URL |
| plugin-browser.ts | Line 56 | Copy plugin URL (Claude Code) |
| plugin-browser.ts | Line 71 | Copy plugin URL (Advanced) |
| skills.ts | Line 155 | Copy skill content |
| slash-command-converter.ts | Line 143 | Copy original prompt |
| slash-command-converter.ts | Line 378 | Copy converted output |

**Total: 9 copy buttons across 6 files**

## Validation

### Manual Testing Steps

1. **Config Detail Page** (`/configs/:id`)
   - Click "Copy to Clipboard" button for the prompt content
   - Should show email subscription modal if not subscribed
   - After subscribing, copy should work normally

2. **Config Conversion** (`/configs/:id`)
   - Click a format conversion button (Claude Code/Codex/Gemini)
   - Wait for conversion to complete
   - Click "Copy" button on converted content
   - Should require email subscription

3. **Extension Detail Page** (`/extensions/:id`)
   - Click "Gemini Format" or "Claude Code Format" manifest preview button
   - Click "Copy" on the manifest preview
   - Should require email subscription

4. **Marketplace Detail Page** (`/marketplaces/:id`)
   - Click "Copy Marketplace URL" button
   - Should require email subscription

5. **Plugin Browser** (`/plugins/:extensionId/claude_code` or `/plugins/:extensionId/gemini`)
   - Click "Copy Plugin URL" button
   - Should require email subscription
   - Also test the Advanced Options dropdown copy button (Gemini)

6. **Skill Detail Page** (`/skills/:id`)
   - Click "Copy Content" button
   - Should require email subscription

7. **Slash Command Converter** (`/slash-commands/convert`)
   - Select a command
   - Click "Copy Original" button
   - Should require email subscription
   - Convert the command
   - Click "Copy to Clipboard" on the result
   - Should require email subscription

### Verification Commands

```bash
# Check that all copy buttons now use requireEmail wrapper
grep -n "onclick.*copy" src/views/*.ts | grep -v requireEmail
# Expected: No results (all copy buttons should have requireEmail)

# Verify pattern is correct
grep -n "requireEmail.*copy" src/views/*.ts
# Expected: 9 matches across the 6 files
```

### Test with localStorage cleared
1. Open DevTools > Application > Local Storage
2. Delete `subscriberEmail` and `subscribedAt` keys
3. Test each copy button - all should trigger email modal

### Test with valid subscription
1. Subscribe with a valid email
2. Test each copy button - all should work immediately
