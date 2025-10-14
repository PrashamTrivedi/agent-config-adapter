# Plugin ZIP Downloads and Gemini JSON Definition Support

## Purpose

Add ZIP download functionality for plugins and JSON definition downloads for Gemini format, with clear UI messaging about format differences

## Original Ask

Allow users to download zip of the plugin files, including manifest plugins etc

And for gemini, allow them to download the JSON definitions and that's only option for plugins and marketplaces.
We also need to convey this in UI

## Complexity and the reason behind it

**Complexity Score: 2/5**

**Reasoning:**
- Plugin file generation service already exists and works
- ZIP generation service already exists and works
- Plugin browser view already exists with download buttons
- Routes for ZIP downloads already exist (`/plugins/:id/:format/download`)
- Main work is UI updates and messaging clarification
- Need to add JSON definition download option specifically for Gemini
- Need to update UI to clearly convey Gemini's JSON-only nature

**Why not 1/5:**
- Multiple UI views need updating (extensions, marketplaces, plugin browser)
- Need to add new route for Gemini JSON downloads
- Need clear messaging about format differences
- Need to ensure UI accurately reflects capabilities

**Why not 3/5:**
- Backend infrastructure already complete
- File generation already working
- Just need UI polish and format-specific handling
- No complex business logic changes needed

## Architectural changes required

None required. All backend services for file generation and ZIP creation already exist.

## Backend changes required

### 1. Add Gemini JSON Definition Route

**New route in `src/routes/plugins.ts`:**

```typescript
// Download Gemini JSON definition (manifest only)
pluginsRouter.get('/:extensionId/gemini/definition', async (c) => {
  const extensionId = c.req.param('extensionId');
  const extensionService = new ExtensionService(c.env);

  try {
    const extension = await extensionService.getExtensionWithConfigs(extensionId);
    if (!extension) {
      return c.json({ error: 'Extension not found' }, 404);
    }

    // Generate Gemini manifest
    const manifestService = new ManifestService();
    const manifest = await manifestService.generateGeminiManifest(extension);
    const filename = `${extension.name}-gemini.json`;

    return new Response(JSON.stringify(manifest, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});
```

**Purpose**: Gemini extensions use JSON manifests that reference commands by path. The JSON definition file (gemini.json) is the primary way to work with Gemini extensions.

### 2. Add Marketplace Gemini JSON Download (Optional)

**New route in `src/routes/marketplaces.ts`:**

```typescript
// Download marketplace manifest for Gemini format
pluginsRouter.get('/marketplaces/:marketplaceId/gemini/definition', async (c) => {
  const marketplaceId = c.req.param('marketplaceId');
  const marketplaceService = new MarketplaceService(c.env);

  try {
    const marketplace = await marketplaceService.getMarketplaceWithExtensions(marketplaceId);
    if (!marketplace) {
      return c.json({ error: 'Marketplace not found' }, 404);
    }

    // For Gemini, marketplace would be a JSON file listing extensions
    // Structure: Array of gemini.json manifests
    const geminiMarketplace = {
      name: marketplace.name,
      version: marketplace.version,
      description: marketplace.description,
      extensions: await Promise.all(
        marketplace.extensions.map(async ext => {
          const manifestService = new ManifestService();
          return await manifestService.generateGeminiManifest(ext);
        })
      )
    };

    const filename = `${marketplace.name}-gemini-marketplace.json`;

    return new Response(JSON.stringify(geminiMarketplace, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});
```

## Frontend changes required

### 1. Update Extension Detail View (`src/views/extensions.ts`)

**Current state**: Shows download sections for both Claude Code and Gemini with identical options

**Required changes**:

```typescript
<h3>📥 Download Plugin</h3>
<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin-bottom: 30px;">
  <!-- Claude Code Plugin -->
  <div style="background: var(--bg-secondary); padding: 20px; border-radius: 8px; border: 1px solid var(--border-color);">
    <h4 style="margin-top: 0;">🔵 Claude Code Plugin</h4>
    <p style="font-size: 0.875rem; color: var(--text-secondary); margin-bottom: 15px;">
      Full plugin with manifest, commands, agents, and MCP configs
    </p>
    <div style="display: flex; flex-direction: column; gap: 10px;">
      <a href="/plugins/${extension.id}/claude_code" class="btn" style="text-align: center;">
        📁 Browse Files
      </a>
      <a href="/plugins/${extension.id}/claude_code/download" class="btn btn-primary" style="text-align: center;">
        📥 Download ZIP
      </a>
    </div>
  </div>

  <!-- Gemini CLI Extension -->
  <div style="background: var(--bg-secondary); padding: 20px; border-radius: 8px; border: 1px solid var(--border-color);">
    <h4 style="margin-top: 0;">🔶 Gemini CLI Extension</h4>
    <p style="font-size: 0.875rem; color: var(--text-secondary); margin-bottom: 15px;">
      JSON definition file - recommended for Gemini extensions
    </p>
    <div style="display: flex; flex-direction: column; gap: 10px;">
      <a href="/plugins/${extension.id}/gemini/definition" class="btn btn-primary" style="text-align: center;">
        📄 Download JSON Definition
      </a>
      <details style="margin-top: 10px;">
        <summary style="cursor: pointer; font-size: 0.875rem; color: var(--text-secondary);">
          Advanced: Full Plugin Files
        </summary>
        <div style="display: flex; flex-direction: column; gap: 10px; margin-top: 10px;">
          <a href="/plugins/${extension.id}/gemini" class="btn btn-secondary" style="text-align: center; font-size: 0.875rem;">
            📁 Browse Files
          </a>
          <a href="/plugins/${extension.id}/gemini/download" class="btn btn-secondary" style="text-align: center; font-size: 0.875rem;">
            📥 Download ZIP
          </a>
        </div>
      </details>
    </div>
  </div>
</div>
```

**Key changes**:
- Added icons to distinguish formats (🔵 Claude, 🔶 Gemini)
- Added descriptive text explaining what each download includes
- Primary Gemini option is JSON definition download
- ZIP download for Gemini moved to "Advanced" collapsible section
- Visual hierarchy shows JSON as recommended for Gemini

### 2. Update Installation Instructions Section

**Update the installation instructions to reflect format differences:**

```typescript
<h3>Installation Instructions</h3>

<details open style="background: var(--bg-secondary); padding: 15px; border-radius: 6px; margin-bottom: 20px;">
  <summary style="cursor: pointer; font-weight: 600; margin-bottom: 10px;">🔵 Claude Code Installation</summary>
  <div style="padding-left: 20px;">
    <p><strong>Option 1: From Marketplace</strong></p>
    <p style="font-size: 0.875rem; color: var(--text-secondary);">
      Add this plugin to your marketplace.json for automatic updates
    </p>
    <pre style="background: var(--bg-primary); padding: 10px; border-radius: 4px; overflow-x: auto; font-size: 0.875rem;"><code>{
  "plugins": [
    {
      "source": {
        "source": "url",
        "url": "${getBaseUrl(c)}/plugins/${extension.id}/claude_code"
      }
    }
  ]
}</code></pre>

    <p style="margin-top: 15px;"><strong>Option 2: Manual Installation</strong></p>
    <ol style="font-size: 0.875rem;">
      <li>Click "Download ZIP" above</li>
      <li>Extract to <code>~/.claude/plugins/${escapeHtml(extension.name)}/</code></li>
      <li>Restart Claude Code</li>
    </ol>
  </div>
</details>

<details style="background: var(--bg-secondary); padding: 15px; border-radius: 6px; margin-bottom: 20px;">
  <summary style="cursor: pointer; font-weight: 600; margin-bottom: 10px;">🔶 Gemini CLI Installation</summary>
  <div style="padding-left: 20px;">
    <p><strong>Recommended: JSON Definition</strong></p>
    <p style="font-size: 0.875rem; color: var(--text-secondary); margin-bottom: 10px;">
      Gemini extensions use JSON manifest files that reference command files by path
    </p>
    <ol style="font-size: 0.875rem;">
      <li>Click "Download JSON Definition" above</li>
      <li>Save to your extensions directory as <code>${escapeHtml(extension.name)}.json</code></li>
      <li>Run: <code>gemini extension install ${escapeHtml(extension.name)}.json</code></li>
    </ol>

    <p style="margin-top: 15px; font-size: 0.875rem; color: var(--text-secondary);">
      <strong>Note:</strong> Command files must be accessible at the paths specified in the JSON manifest
    </p>
  </div>
</details>
```

### 3. Update Plugin Browser View (`src/views/plugin-browser.ts`)

**Update the download section to differentiate formats:**

```typescript
<div class="actions-bar">
  ${format === 'claude_code' ? `
    <a href="${pluginUrl}/download" class="btn btn-primary">
      📥 Download Complete Plugin (ZIP)
    </a>
    <button onclick="copyToClipboard('${pluginUrl}')" class="btn">
      📋 Copy Plugin URL
    </button>
  ` : `
    <a href="/plugins/${extension.id}/gemini/definition" class="btn btn-primary">
      📄 Download JSON Definition (Recommended)
    </a>
    <details style="display: inline-block; margin-left: 10px;">
      <summary class="btn btn-secondary" style="list-style: none; cursor: pointer;">
        Advanced Options
      </summary>
      <div style="position: absolute; background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 6px; padding: 10px; margin-top: 5px; z-index: 10;">
        <a href="${pluginUrl}/download" class="btn btn-secondary" style="display: block; margin-bottom: 5px;">
          📥 Download Full ZIP
        </a>
        <button onclick="copyToClipboard('${pluginUrl}')" class="btn btn-secondary" style="display: block; width: 100%;">
          📋 Copy Plugin URL
        </button>
      </div>
    </details>
  `}
  <a href="/extensions/${extension.id}" class="btn btn-secondary">
    ← Back to Extension
  </a>
</div>
```

**Update installation instructions in plugin browser:**

```typescript
function renderGeminiInstructions(extension: ExtensionWithConfigs): string {
  return `
    <div class="installation-step">
      <h4>📄 JSON Definition Installation (Recommended)</h4>
      <p style="color: var(--text-secondary); font-size: 0.875rem; margin-bottom: 10px;">
        Gemini extensions work best with JSON manifest files
      </p>
      <ol>
        <li>Download the JSON definition file</li>
        <li>Save to your extensions directory</li>
        <li>Run: <code>gemini extension install /path/to/${escapeHtml(extension.name)}.json</code></li>
      </ol>
    </div>

    <div class="installation-step">
      <h4>📦 Full Plugin Installation (Advanced)</h4>
      <p style="color: var(--text-secondary); font-size: 0.875rem; margin-bottom: 10px;">
        Only needed if you want to inspect or modify individual files
      </p>
      <ol>
        <li>Download the ZIP file using the button above (under Advanced Options)</li>
        <li>Extract to your Gemini extensions directory</li>
        <li>Run: <code>gemini extension install /path/to/${escapeHtml(extension.name)}/</code></li>
      </ol>
    </div>

    <div class="installation-step">
      <h4>What's Included</h4>
      <ul>
        <li><strong>JSON Definition:</strong> References ${extension.configs.filter((c) => c.type === 'slash_command').length} command file(s)</li>
        ${extension.configs.filter((c) => c.type === 'mcp_config').length > 0 ? `<li><strong>MCP Servers:</strong> ${extension.configs.filter((c) => c.type === 'mcp_config').length} server(s) configured</li>` : ''}
        ${extension.description ? `<li><strong>Context:</strong> GEMINI.md file with extension info</li>` : ''}
      </ul>
    </div>
  `;
}
```

### 4. Update Marketplace Detail View (`src/views/marketplaces.ts`)

**Add format-specific download options:**

```typescript
<h3>📥 Download Marketplace</h3>
<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin-bottom: 30px;">
  <!-- Claude Code Marketplace -->
  <div style="background: var(--bg-secondary); padding: 20px; border-radius: 8px; border: 1px solid var(--border-color);">
    <h4 style="margin-top: 0;">🔵 Claude Code Marketplace</h4>
    <p style="font-size: 0.875rem; color: var(--text-secondary); margin-bottom: 15px;">
      marketplace.json with plugin references
    </p>
    <div style="display: flex; flex-direction: column; gap: 10px;">
      <button onclick="copyToClipboard('${getBaseUrl(c)}/api/marketplaces/${marketplace.id}/manifest')" class="btn btn-primary" style="text-align: center;">
        📋 Copy Marketplace URL
      </button>
      <a href="/api/marketplaces/${marketplace.id}/manifest?format=text" target="_blank" class="btn" style="text-align: center;">
        📄 View JSON
      </a>
      <a href="/plugins/marketplaces/${marketplace.id}/download?format=claude_code" class="btn" style="text-align: center;">
        📦 Download All Plugins (ZIP)
      </a>
    </div>
  </div>

  <!-- Gemini Marketplace -->
  <div style="background: var(--bg-secondary); padding: 20px; border-radius: 8px; border: 1px solid var(--border-color);">
    <h4 style="margin-top: 0;">🔶 Gemini Marketplace</h4>
    <p style="font-size: 0.875rem; color: var(--text-secondary); margin-bottom: 15px;">
      Collection of JSON definitions for all extensions
    </p>
    <div style="display: flex; flex-direction: column; gap: 10px;">
      <a href="/plugins/marketplaces/${marketplace.id}/gemini/definition" class="btn btn-primary" style="text-align: center;">
        📄 Download JSON Collection
      </a>
      <details style="margin-top: 10px;">
        <summary style="cursor: pointer; font-size: 0.875rem; color: var(--text-secondary);">
          Advanced: Full Plugin Files
        </summary>
        <div style="display: flex; flex-direction: column; gap: 10px; margin-top: 10px;">
          <a href="/plugins/marketplaces/${marketplace.id}/download?format=gemini" class="btn btn-secondary" style="text-align: center; font-size: 0.875rem;">
            📦 Download All Plugins (ZIP)
          </a>
        </div>
      </details>
    </div>
  </div>
</div>

<h3>Installation Instructions</h3>

<details open style="background: var(--bg-secondary); padding: 15px; border-radius: 6px; margin-bottom: 20px;">
  <summary style="cursor: pointer; font-weight: 600; margin-bottom: 10px;">🔵 Claude Code Setup</summary>
  <div style="padding-left: 20px;">
    <p><strong>Add to Claude Code settings:</strong></p>
    <pre style="background: var(--bg-primary); padding: 10px; border-radius: 4px; overflow-x: auto; font-size: 0.875rem;"><code>{
  "marketplaces": [
    "${getBaseUrl(c)}/api/marketplaces/${marketplace.id}/manifest"
  ]
}</code></pre>
    <p style="margin-top: 10px; font-size: 0.875rem; color: var(--text-secondary);">
      Claude Code will automatically discover and load all ${marketplace.extensions.length} plugin(s)
    </p>
  </div>
</details>

<details style="background: var(--bg-secondary); padding: 15px; border-radius: 6px; margin-bottom: 20px;">
  <summary style="cursor: pointer; font-weight: 600; margin-bottom: 10px;">🔶 Gemini CLI Setup</summary>
  <div style="padding-left: 20px;">
    <p><strong>Download and install all extensions:</strong></p>
    <ol style="font-size: 0.875rem;">
      <li>Click "Download JSON Collection" above</li>
      <li>Extract JSON files to your extensions directory</li>
      <li>Run: <code>gemini extension install /path/to/extensions/*.json</code></li>
    </ol>
    <p style="margin-top: 15px; font-size: 0.875rem; color: var(--text-secondary);">
      <strong>Note:</strong> This marketplace contains ${marketplace.extensions.length} extension(s) with ${totalConfigs} total config(s)
    </p>
  </div>
</details>
```

### 5. Add Visual Indicators

**Add badges/indicators to show format capabilities:**

```css
.format-badge {
  display: inline-block;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
  margin-right: 5px;
}

.format-badge.claude-code {
  background: #3b82f6;
  color: white;
}

.format-badge.gemini {
  background: #f59e0b;
  color: white;
}

.recommended {
  border: 2px solid var(--accent-primary);
  position: relative;
}

.recommended::before {
  content: "⭐ RECOMMENDED";
  position: absolute;
  top: -10px;
  left: 10px;
  background: var(--accent-primary);
  color: white;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
}
```

## Acceptance Criteria

### Functional Requirements

1. **Extension Detail View - Download Options**
   - ✅ Claude Code shows: Browse Files + Download ZIP (both primary)
   - ✅ Gemini shows: Download JSON Definition (primary) + Advanced options (secondary)
   - ✅ Visual distinction between formats (icons, colors, descriptions)
   - ✅ JSON definition download works for Gemini

2. **Extension Detail View - Installation Instructions**
   - ✅ Claude Code instructions show marketplace URL and manual ZIP install
   - ✅ Gemini instructions emphasize JSON definition as recommended
   - ✅ Clear explanation of what each option provides
   - ✅ Code examples are copy-paste ready

3. **Plugin Browser View**
   - ✅ Claude Code format shows ZIP download prominently
   - ✅ Gemini format shows JSON definition prominently
   - ✅ Advanced options available but not primary for Gemini
   - ✅ Format-specific installation instructions
   - ✅ Clear explanation of file structure

4. **Marketplace Detail View**
   - ✅ Claude Code shows marketplace URL for settings
   - ✅ Gemini shows JSON collection download
   - ✅ Both formats show "Download All Plugins" option
   - ✅ Installation instructions specific to each format
   - ✅ Clear count of extensions/configs included

5. **Downloads Work Correctly**
   - ✅ Claude Code ZIP contains: plugin.json, commands/, agents/, .mcp.json
   - ✅ Gemini ZIP contains: gemini.json, commands/, GEMINI.md, .mcp.json
   - ✅ Gemini JSON definition downloads as standalone file
   - ✅ Marketplace Claude Code returns marketplace.json
   - ✅ Marketplace Gemini returns collection of JSON definitions
   - ✅ All downloads have proper Content-Disposition headers
   - ✅ Filenames are descriptive and format-specific

### UI/UX Requirements

6. **Visual Hierarchy**
   - ✅ Primary actions are visually prominent (btn-primary)
   - ✅ Secondary actions are less prominent (btn-secondary, collapsible)
   - ✅ Format badges/icons distinguish Claude vs Gemini
   - ✅ Recommended options clearly marked

7. **Messaging Clarity**
   - ✅ Users understand Gemini prefers JSON definitions
   - ✅ Users understand Claude Code prefers full plugin ZIPs
   - ✅ Clear explanation of when to use ZIP vs JSON
   - ✅ No confusion about which format to use

8. **Responsive Design**
   - ✅ Download cards stack properly on mobile
   - ✅ Code blocks scroll horizontally when needed
   - ✅ Buttons are touch-friendly
   - ✅ Collapsible sections work on all screen sizes

## Validation

### Backend Validation

**Test new Gemini JSON definition routes:**

```bash
# Test Gemini JSON definition download for extension
curl -I http://localhost:8787/plugins/dev-tools-ext/gemini/definition

# Expected:
# - HTTP 200 OK
# - Content-Type: application/json
# - Content-Disposition: attachment; filename="dev-tools-gemini.json"

# Verify content
curl http://localhost:8787/plugins/dev-tools-ext/gemini/definition | jq .

# Expected structure:
# {
#   "name": "dev-tools",
#   "version": "1.0.0",
#   "commands": [...],
#   ...
# }

# Test Gemini marketplace JSON collection download
curl -I http://localhost:8787/plugins/marketplaces/dev-toolkit-market/gemini/definition

# Expected:
# - HTTP 200 OK
# - Content-Type: application/json
# - Content-Disposition: attachment; filename="dev-toolkit-market-gemini-marketplace.json"

# Verify content
curl http://localhost:8787/plugins/marketplaces/dev-toolkit-market/gemini/definition | jq .

# Expected structure:
# {
#   "name": "dev-toolkit-market",
#   "version": "1.0.0",
#   "extensions": [
#     { gemini manifest 1 },
#     { gemini manifest 2 }
#   ]
# }
```

### Frontend Validation

**1. Extension Detail Page - Claude Code Format:**
```
Navigate to: /extensions/{id}

Verify Claude Code section:
- [ ] Shows "🔵 Claude Code Plugin" header
- [ ] Has description: "Full plugin with manifest, commands, agents, and MCP configs"
- [ ] "Browse Files" button links to /plugins/{id}/claude_code
- [ ] "Download ZIP" button links to /plugins/{id}/claude_code/download
- [ ] Installation instructions show marketplace URL
- [ ] Installation instructions show manual ZIP install steps
```

**2. Extension Detail Page - Gemini Format:**
```
Verify Gemini section:
- [ ] Shows "🔶 Gemini CLI Extension" header
- [ ] Has description: "JSON definition file - recommended for Gemini extensions"
- [ ] "Download JSON Definition" button is primary (btn-primary)
- [ ] "Download JSON Definition" links to /plugins/{id}/gemini/definition
- [ ] Has "Advanced: Full Plugin Files" collapsible section
- [ ] Advanced section contains "Browse Files" and "Download ZIP" as secondary
- [ ] Installation instructions emphasize JSON definition
- [ ] Clear note about command file paths
```

**3. Plugin Browser - Claude Code:**
```
Navigate to: /plugins/{id}/claude_code

Verify:
- [ ] "Download Complete Plugin (ZIP)" button is prominent
- [ ] "Copy Plugin URL" button available
- [ ] File tree shows all files (plugin.json, commands/, agents/, .mcp.json)
- [ ] Installation instructions show 3 options (marketplace, manual, HTTP)
- [ ] Each option clearly explained
```

**4. Plugin Browser - Gemini:**
```
Navigate to: /plugins/{id}/gemini

Verify:
- [ ] "Download JSON Definition (Recommended)" button is primary
- [ ] "Advanced Options" dropdown available
- [ ] Advanced options contain "Download Full ZIP" and "Copy Plugin URL"
- [ ] File tree shows gemini.json, commands/, GEMINI.md, .mcp.json
- [ ] Installation instructions emphasize JSON definition
- [ ] Advanced full plugin install option available but secondary
- [ ] Clear explanation of what's included
```

**5. Marketplace Detail Page:**
```
Navigate to: /marketplaces/{id}

Verify Claude Code section:
- [ ] Shows "🔵 Claude Code Marketplace" header
- [ ] "Copy Marketplace URL" button works
- [ ] "View JSON" opens in new tab
- [ ] "Download All Plugins (ZIP)" available
- [ ] Installation instructions show settings.json format

Verify Gemini section:
- [ ] Shows "🔶 Gemini Marketplace" header
- [ ] "Download JSON Collection" is primary
- [ ] Advanced section has "Download All Plugins (ZIP)"
- [ ] Installation instructions show JSON install steps
- [ ] Shows count of extensions/configs
```

### Download Validation

**Test all download endpoints:**

```bash
# 1. Claude Code plugin ZIP
curl -O http://localhost:8787/plugins/dev-tools-ext/claude_code/download
unzip -l dev-tools-ext-claude_code-plugin.zip
# Expected: .claude-plugin/, commands/, agents/, .mcp.json

# 2. Gemini plugin ZIP
curl -O http://localhost:8787/plugins/dev-tools-ext/gemini/download
unzip -l dev-tools-ext-gemini-plugin.zip
# Expected: gemini.json, commands/, GEMINI.md, .mcp.json

# 3. Gemini JSON definition
curl -O http://localhost:8787/plugins/dev-tools-ext/gemini/definition
cat dev-tools-gemini.json | jq .
# Expected: Valid JSON with Gemini manifest structure

# 4. Claude Code marketplace
curl http://localhost:8787/api/marketplaces/dev-toolkit-market/manifest | jq .
# Expected: marketplace.json with plugin references

# 5. Gemini marketplace JSON collection
curl -O http://localhost:8787/plugins/marketplaces/dev-toolkit-market/gemini/definition
cat dev-toolkit-market-gemini-marketplace.json | jq .
# Expected: JSON with array of Gemini manifests

# 6. Claude Code marketplace all plugins ZIP
curl -O "http://localhost:8787/plugins/marketplaces/dev-toolkit-market/download?format=claude_code"
unzip -l dev-toolkit-market-claude_code-marketplace.zip
# Expected: plugins/plugin1/, plugins/plugin2/, etc.

# 7. Gemini marketplace all plugins ZIP
curl -O "http://localhost:8787/plugins/marketplaces/dev-toolkit-market/download?format=gemini"
unzip -l dev-toolkit-market-gemini-marketplace.zip
# Expected: plugins/plugin1/, plugins/plugin2/, etc. (Gemini format)
```

### User Experience Validation

**Scenario 1: New user wants Claude Code plugin**
```
User journey:
1. Navigate to extension detail page
2. See "Claude Code Plugin" section
3. Click "Download ZIP" (primary action)
4. Download completes
5. Read installation instructions
6. Extract to ~/.claude/plugins/
7. Restart Claude Code
8. Plugin loads successfully

Validation:
- [ ] Process is clear and straightforward
- [ ] No confusion about which button to click
- [ ] ZIP contains everything needed
- [ ] Instructions are accurate
```

**Scenario 2: New user wants Gemini extension**
```
User journey:
1. Navigate to extension detail page
2. See "Gemini CLI Extension" section
3. See "Download JSON Definition" as primary
4. Click download button
5. JSON file downloads
6. Read installation instructions
7. Save JSON to extensions directory
8. Run: gemini extension install <file>
9. Extension loads successfully

Validation:
- [ ] User immediately sees JSON is recommended
- [ ] Not confused by ZIP options (they're hidden)
- [ ] JSON file contains complete manifest
- [ ] Instructions match Gemini's expected workflow
```

**Scenario 3: Advanced user inspecting Gemini files**
```
User journey:
1. Navigate to extension detail page
2. See "Gemini CLI Extension" section
3. Expand "Advanced: Full Plugin Files"
4. Click "Browse Files"
5. View file structure
6. Navigate through directories
7. View individual files

Validation:
- [ ] Advanced option is discoverable but not prominent
- [ ] File browser works correctly
- [ ] All files are viewable
- [ ] User understands this is optional
```

**Scenario 4: Marketplace installation (Claude Code)**
```
User journey:
1. Navigate to marketplace detail page
2. See Claude Code section
3. Click "Copy Marketplace URL"
4. Open Claude Code settings
5. Add URL to marketplaces array
6. Restart Claude Code
7. All plugins from marketplace load

Validation:
- [ ] Copy button works reliably
- [ ] URL format is correct
- [ ] Instructions match Claude Code's docs
- [ ] Marketplace manifest is valid
```

**Scenario 5: Marketplace installation (Gemini)**
```
User journey:
1. Navigate to marketplace detail page
2. See Gemini section
3. Click "Download JSON Collection"
4. Save/extract JSON files
5. Run: gemini extension install *.json
6. All extensions load successfully

Validation:
- [ ] Download contains all extension JSONs
- [ ] Each JSON is valid Gemini manifest
- [ ] Instructions are clear
- [ ] Batch install works
```

## Implementation Notes

### Route Changes Summary

**New routes to add:**

1. `GET /plugins/:extensionId/gemini/definition` - Download Gemini JSON manifest
2. `GET /plugins/marketplaces/:marketplaceId/gemini/definition` - Download marketplace JSON collection

**Existing routes that stay:**
- All existing ZIP download routes continue to work
- All existing browse routes continue to work
- These are used for advanced/optional access

### View Changes Summary

**Files to modify:**
1. `src/views/extensions.ts` - Update extensionDetailView():
   - Redesign download section with format-specific options
   - Update installation instructions
   - Add visual indicators (icons, colors)

2. `src/views/plugin-browser.ts` - Update pluginBrowserView():
   - Add format-specific download buttons
   - Update renderGeminiInstructions()
   - Update renderClaudeCodeInstructions()

3. `src/views/marketplaces.ts` - Update marketplaceDetailView():
   - Add download section with both formats
   - Add format-specific installation instructions
   - Add extension/config counts

4. `src/views/layout.ts` - Add new CSS classes:
   - .format-badge
   - .recommended
   - Additional styling for collapsible sections

### Key Messaging Points

**Claude Code:**
- "Full plugin with everything included"
- "ZIP download or marketplace URL"
- "Automatically discovers files"
- "Easy marketplace integration"

**Gemini:**
- "JSON definition file (recommended)"
- "Lightweight manifest format"
- "References command files by path"
- "ZIP available for advanced users"

### Testing Checklist

- [ ] All download links return correct content
- [ ] All download filenames are descriptive
- [ ] Content-Disposition headers set correctly
- [ ] JSON files are valid and properly formatted
- [ ] ZIP files contain expected directory structure
- [ ] UI clearly shows recommended options
- [ ] Installation instructions are accurate
- [ ] Copy buttons work reliably
- [ ] Collapsible sections work on all browsers
- [ ] Responsive design works on mobile
- [ ] No console errors
- [ ] All links go to correct destinations

## Success Metrics

✅ Users can easily download plugins in their preferred format
✅ Clear understanding of JSON definition vs ZIP for Gemini
✅ No confusion about which format to use
✅ Installation instructions match actual tool requirements
✅ Downloads work reliably
✅ UI is intuitive and well-organized
✅ Visual hierarchy guides users to recommended options
✅ Advanced options available but not cluttering primary flow

## Files to Create

**New files:**
- None (all functionality in existing files)

## Files to Modify

**Routes:**
- `src/routes/plugins.ts` - Add Gemini JSON definition route (~20 lines)
- `src/routes/marketplaces.ts` - Add marketplace Gemini JSON route (~30 lines)

**Views:**
- `src/views/extensions.ts` - Update download section (~100 lines modified)
- `src/views/plugin-browser.ts` - Update format-specific sections (~80 lines modified)
- `src/views/marketplaces.ts` - Add download section (~120 lines modified)
- `src/views/layout.ts` - Add CSS classes (~40 lines)

**Estimated total changes:** ~390 lines across 6 files
