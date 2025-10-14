# Plugin File Generation - Fully Qualified Paths and ZIP Download

## Purpose

Enable proper Claude Code and Gemini CLI plugin installation by providing complete file hierarchies with fully qualified URLs or downloadable ZIP packages.

## Original Ask

When generating plugins we need fully qualified path (from server to exact contents) for any files (commands, agents, mcp files) everything, or a zip download which downloads everything.

## Complexity and the reason behind it

**Complexity Score: 2/5**

**Reasoning:**
- Backend infrastructure (R2, manifest generation, file storage) already exists
- Need to add file generation logic to create actual command/agent/MCP files from database configs
- Need to implement directory structure serving over HTTP
- Optional: Add ZIP download endpoint for convenience
- Clear understanding of required file formats from research

**Why not 1/5:**
- Requires generating actual file content from database records (not just metadata)
- Need to serve proper directory hierarchies via HTTP
- Multiple file formats (Markdown for commands/agents, JSON for MCP, TOML for Gemini)
- ZIP generation adds implementation complexity

**Why not 3/5:**
- All storage infrastructure already exists
- Clear specifications from Claude Code documentation research
- Straightforward file generation from existing config content
- No new database tables or complex business logic needed
- Well-defined directory structures from official documentation

## Architectural changes required

None required. Current architecture with R2 file storage, manifest service, and HTTP routes can handle this with additions only.

## Backend changes required

### 1. File Generation Service (`src/services/file-generation-service.ts`)

**New service for generating actual plugin files:**

```typescript
export class FileGenerationService {
  /**
   * Generate all files for an extension and upload to R2
   * Returns map of logical paths to R2 keys
   */
  async generateExtensionFiles(
    extension: ExtensionWithConfigs,
    format: 'claude_code' | 'gemini'
  ): Promise<Map<string, string>>

  /**
   * Generate Claude Code plugin files
   * Structure:
   * - .claude-plugin/plugin.json
   * - commands/*.md (from slash_command configs)
   * - agents/*.md (from agent_definition configs)
   * - .mcp.json (consolidated from mcp_config configs)
   */
  private async generateClaudeCodeFiles(extension, configs): Promise<FileMap>

  /**
   * Generate Gemini extension files
   * Structure:
   * - gemini.json (manifest)
   * - commands/*.md (from slash_command configs)
   * - GEMINI.md (context file from extension description)
   * - .mcp.json (consolidated from mcp_config configs)
   */
  private async generateGeminiFiles(extension, configs): Promise<FileMap>

  /**
   * Generate command markdown file from slash_command config
   * Converts database content to proper .md file format
   */
  private generateCommandFile(config: Config, format: 'claude_code' | 'gemini'): string

  /**
   * Generate agent markdown file from agent_definition config
   * Only for Claude Code (Gemini doesn't support agents)
   */
  private generateAgentFile(config: Config): string

  /**
   * Generate consolidated MCP JSON from multiple mcp_config configs
   * Merges all MCP server configs into single .mcp.json file
   */
  private generateMCPFile(configs: Config[], format: 'claude_code' | 'gemini'): string
}
```

**Key functionality:**
- Takes extension with configs from database
- Generates actual file content (not just metadata)
- Uploads files to R2 under organized directory structure
- Maintains file tracking in `extension_files` table
- Handles format-specific differences (Claude Code vs Gemini)

### 2. Plugin Directory HTTP Routes (`src/routes/plugins.ts`)

**New routes for serving plugin directories over HTTP:**

```typescript
// Serve plugin directory structure (auto-index)
GET /plugins/:extensionId/:format
  - Returns directory listing in HTML format
  - Shows clickable links to all files in plugin
  - Mimics file system directory browsing

// Serve individual plugin files
GET /plugins/:extensionId/:format/*
  - Wildcard route serves any file in plugin directory
  - Examples:
    - /plugins/dev-tools-ext/claude_code/.claude-plugin/plugin.json
    - /plugins/dev-tools-ext/claude_code/commands/code-review.md
    - /plugins/dev-tools-ext/gemini/commands/deploy-app.md
  - Returns proper Content-Type for each file type
  - Fetches from R2 based on path

// Download complete plugin as ZIP
GET /plugins/:extensionId/:format/download
  - Generates ZIP archive containing all plugin files
  - Proper directory structure maintained in ZIP
  - Sets Content-Disposition header for download
  - Filename: {extension-name}-{format}.zip
```

**Implementation details:**
- Uses R2 to fetch generated files
- Serves files with proper MIME types
- Auto-generates files if not already generated (lazy generation)
- Caches file generation (invalidate when configs change)

### 3. Update Extension Service

**Add file generation orchestration:**

```typescript
// In ExtensionService
async generatePluginFiles(extensionId: string, format: 'claude_code' | 'gemini'): Promise<void> {
  const extension = await this.getExtensionWithConfigs(extensionId);
  const fileGenService = new FileGenerationService(this.env);

  // Generate and upload all files
  await fileGenService.generateExtensionFiles(extension, format);
}

async invalidatePluginFiles(extensionId: string): Promise<void> {
  // Delete generated files from R2
  // Clear from extension_files table
  // Trigger regeneration on next access
}
```

### 4. Update Manifest Service

**Fix plugin.json source field to use directory URLs:**

```typescript
// Current (INCORRECT):
pluginManifest.source = `./plugins/${this.toKebabCase(extension.name)}`;

// New (CORRECT):
pluginManifest.source = {
  source: "url",
  url: `${baseUrl}/plugins/${extension.id}/claude_code`
};

// Or for relative paths (if hosting in same repo):
pluginManifest.source = `./plugins/${extension.id}`;
```

**Note**: The source field points to the **directory**, not individual files. Claude Code discovers files by fetching the directory.

### 5. Marketplace Manifest Updates

**Marketplace.json must use proper source URLs:**

```json
{
  "name": "my-marketplace",
  "version": "1.0.0",
  "plugins": [
    {
      "name": "dev-tools",
      "version": "1.0.0",
      "source": {
        "source": "url",
        "url": "https://agent-config-adapter.com/plugins/dev-tools-ext/claude_code"
      }
    }
  ]
}
```

**Not this (incorrect):**
```json
{
  "source": "https://agent-config-adapter.com/api/extensions/dev-tools-ext/manifest/claude_code"
}
```

### 6. ZIP Generation Utility

**Add ZIP archive generation:**

```typescript
// Use a Cloudflare Workers-compatible ZIP library
import { ZipWriter } from '@zip.js/zip.js';

async function generatePluginZip(
  extension: ExtensionWithConfigs,
  format: 'claude_code' | 'gemini'
): Promise<ReadableStream> {
  const zipWriter = new ZipWriter();

  // Add all files to ZIP maintaining directory structure
  for (const file of generatedFiles) {
    await zipWriter.add(file.path, file.content);
  }

  return zipWriter.close();
}
```

## Frontend changes required

### 1. Extension Detail View Updates

**Add download buttons to extension detail page:**

```html
<!-- In extension detail view -->
<div class="plugin-downloads">
  <h3>Download Plugin</h3>

  <!-- Claude Code format -->
  <div class="download-option">
    <h4>Claude Code Plugin</h4>
    <a href="/plugins/{extensionId}/claude_code" class="btn">
      Browse Files
    </a>
    <a href="/plugins/{extensionId}/claude_code/download" class="btn btn-primary">
      Download ZIP
    </a>
  </div>

  <!-- Gemini format -->
  <div class="download-option">
    <h4>Gemini CLI Extension</h4>
    <a href="/plugins/{extensionId}/gemini" class="btn">
      Browse Files
    </a>
    <a href="/plugins/{extensionId}/gemini/download" class="btn btn-primary">
      Download ZIP
    </a>
  </div>
</div>

<!-- Installation instructions -->
<div class="installation-guide">
  <h3>Installation</h3>

  <h4>Claude Code (Option 1: Marketplace)</h4>
  <pre>
Add to your marketplace.json:
{
  "plugins": [
    {
      "source": {
        "source": "url",
        "url": "{baseUrl}/plugins/{extensionId}/claude_code"
      }
    }
  ]
}
  </pre>

  <h4>Claude Code (Option 2: Direct Install)</h4>
  <pre>
1. Download the ZIP
2. Extract to ~/.claude/plugins/{extension-name}/
3. Restart Claude Code
  </pre>

  <h4>Gemini CLI</h4>
  <pre>
1. Download the ZIP
2. Extract to your extensions directory
3. Run: gemini extension install {path}
  </pre>
</div>
```

### 2. Marketplace Detail View Updates

**Add marketplace installation instructions:**

```html
<!-- In marketplace detail view -->
<div class="marketplace-install">
  <h3>Install Marketplace</h3>

  <!-- Copy-paste marketplace.json URL -->
  <div class="install-option">
    <label>Marketplace URL (for Claude Code):</label>
    <input
      type="text"
      readonly
      value="{baseUrl}/api/marketplaces/{marketplaceId}/manifest"
      class="url-input"
    />
    <button onclick="copyToClipboard(this)" class="btn">Copy</button>
  </div>

  <!-- Instructions -->
  <pre>
Add to your Claude Code settings:
{
  "marketplaces": [
    "{baseUrl}/api/marketplaces/{marketplaceId}/manifest"
  ]
}
  </pre>

  <!-- Download all plugins at once -->
  <a href="/marketplaces/{marketplaceId}/download" class="btn btn-primary">
    Download All Plugins (ZIP)
  </a>
</div>
```

### 3. Plugin File Browser View

**New view for browsing plugin directory structure:**

```html
<!-- /plugins/:id/:format route -->
<div class="plugin-browser">
  <h2>{extension.name} - {format} Plugin Files</h2>

  <div class="file-tree">
    <ul>
      <li class="directory">
        <span class="icon">📁</span> .claude-plugin/
        <ul>
          <li class="file">
            <a href="/plugins/{id}/claude_code/.claude-plugin/plugin.json">
              <span class="icon">📄</span> plugin.json
            </a>
          </li>
        </ul>
      </li>

      <li class="directory">
        <span class="icon">📁</span> commands/
        <ul>
          {foreach command}
          <li class="file">
            <a href="/plugins/{id}/claude_code/commands/{command}.md">
              <span class="icon">📝</span> {command}.md
            </a>
          </li>
          {/foreach}
        </ul>
      </li>

      {if hasAgents}
      <li class="directory">
        <span class="icon">📁</span> agents/
        <ul>
          {foreach agent}
          <li class="file">
            <a href="/plugins/{id}/claude_code/agents/{agent}.md">
              <span class="icon">🤖</span> {agent}.md
            </a>
          </li>
          {/foreach}
        </ul>
      </li>
      {/if}

      {if hasMCP}
      <li class="file">
        <a href="/plugins/{id}/claude_code/.mcp.json">
          <span class="icon">⚙️</span> .mcp.json
        </a>
      </li>
      {/if}
    </ul>
  </div>

  <div class="actions">
    <a href="/plugins/{id}/claude_code/download" class="btn btn-primary">
      Download Complete Plugin (ZIP)
    </a>
  </div>
</div>
```

## Acceptance Criteria

### 1. File Generation

✅ Command files generated correctly from slash_command configs
✅ Agent files generated correctly from agent_definition configs
✅ MCP config consolidated and generated as .mcp.json
✅ Manifest files (plugin.json, gemini.json) generated correctly
✅ Files uploaded to R2 with proper directory structure
✅ File metadata tracked in extension_files table

### 2. HTTP Directory Serving

✅ `/plugins/:id/:format` returns browsable directory listing
✅ Individual files accessible via full paths
✅ Proper Content-Type headers for each file type
✅ 404 handling for missing files
✅ Lazy generation (files generated on first access)

### 3. ZIP Download

✅ `/plugins/:id/:format/download` returns complete plugin ZIP
✅ Directory structure preserved in ZIP
✅ Proper filename in Content-Disposition header
✅ All files included (manifest, commands, agents, MCP)
✅ ZIP extracts cleanly to working plugin directory

### 4. Marketplace Integration

✅ marketplace.json uses correct source URLs (directory URLs, not file URLs)
✅ Plugin source field uses proper format (URL object with source and url fields)
✅ Marketplace download includes all plugins as ZIP
✅ Installation instructions displayed correctly

### 5. UI Integration

✅ Extension detail page shows "Browse Files" and "Download ZIP" buttons
✅ Marketplace detail page shows installation instructions
✅ Plugin file browser renders correctly
✅ Copy-to-clipboard functionality works
✅ Installation instructions are accurate and helpful

### 6. Format Differences

✅ Claude Code format includes .claude-plugin/plugin.json
✅ Claude Code format includes agents/ directory
✅ Gemini format includes gemini.json (not plugin.json)
✅ Gemini format includes GEMINI.md context file
✅ Gemini format excludes agents (not supported)
✅ Both formats include properly consolidated .mcp.json

## Validation

### Backend API Validation

**1. Test file generation:**
```bash
# Generate plugin files for extension
curl -X POST http://localhost:8787/api/extensions/dev-tools-ext/generate/claude_code

# Verify files were created
curl http://localhost:8787/api/files/extensions/dev-tools-ext | jq .
```

**2. Test directory browsing:**
```bash
# Browse plugin directory
curl http://localhost:8787/plugins/dev-tools-ext/claude_code

# Should return HTML with file listing
# Verify all files are linked

# Access individual files
curl http://localhost:8787/plugins/dev-tools-ext/claude_code/.claude-plugin/plugin.json
curl http://localhost:8787/plugins/dev-tools-ext/claude_code/commands/code-review.md
curl http://localhost:8787/plugins/dev-tools-ext/claude_code/.mcp.json
```

**3. Test ZIP download:**
```bash
# Download plugin as ZIP
curl -O http://localhost:8787/plugins/dev-tools-ext/claude_code/download

# Verify ZIP contents
unzip -l dev-tools-ext-claude_code.zip

# Expected structure:
# .claude-plugin/plugin.json
# commands/command1.md
# commands/command2.md
# agents/agent1.md
# .mcp.json
```

**4. Test marketplace manifest:**
```bash
# Get marketplace manifest
curl http://localhost:8787/api/marketplaces/dev-toolkit-market/manifest | jq .

# Verify plugin source URLs are correct (directory URLs, not file URLs)
# Should see: "source": {"source": "url", "url": "http://...../plugins/xxx/claude_code"}
```

### Frontend Validation

**1. Extension Detail Page:**
- Navigate to `/extensions/{id}`
- Verify "Browse Files" button visible for both formats
- Verify "Download ZIP" button visible for both formats
- Click "Browse Files" → should navigate to file browser
- Click "Download ZIP" → should download ZIP file
- Verify installation instructions displayed
- Test copy-to-clipboard button

**2. Plugin File Browser:**
- Navigate to `/plugins/{id}/claude_code`
- Verify directory tree renders correctly
- Verify all files listed (manifest, commands, agents, MCP)
- Click file links → should navigate to raw file content
- Verify download button works

**3. Marketplace Detail Page:**
- Navigate to `/marketplaces/{id}`
- Verify marketplace URL displayed
- Test copy-to-clipboard for marketplace URL
- Verify installation instructions shown
- Test "Download All Plugins" button

### End-to-End Validation

**Scenario 1: Install Claude Code plugin from HTTP URL**
```bash
# 1. Get extension with configs
EXTENSION_ID="dev-tools-ext"

# 2. View extension in browser
open http://localhost:8787/extensions/$EXTENSION_ID

# 3. Copy plugin URL from page
PLUGIN_URL="http://localhost:8787/plugins/$EXTENSION_ID/claude_code"

# 4. Add to marketplace.json (manual)
cat > ~/.claude/marketplaces/test.json <<EOF
{
  "plugins": [
    {
      "source": {
        "source": "url",
        "url": "$PLUGIN_URL"
      }
    }
  ]
}
EOF

# 5. Restart Claude Code and verify plugin loads
```

**Scenario 2: Install Claude Code plugin from ZIP**
```bash
# 1. Download ZIP
curl -O http://localhost:8787/plugins/dev-tools-ext/claude_code/download

# 2. Extract to plugins directory
unzip dev-tools-ext-claude_code.zip -d ~/.claude/plugins/dev-tools/

# 3. Restart Claude Code and verify plugin loads
```

**Scenario 3: Install Gemini extension**
```bash
# 1. Download Gemini format ZIP
curl -O http://localhost:8787/plugins/dev-tools-ext/gemini/download

# 2. Extract
unzip dev-tools-ext-gemini.zip -d ~/gemini-extensions/dev-tools/

# 3. Install via Gemini CLI
gemini extension install ~/gemini-extensions/dev-tools/
```

### File Content Validation

**Verify generated command file format:**
```bash
# Get command file
curl http://localhost:8787/plugins/dev-tools-ext/claude_code/commands/code-review.md

# Should contain:
# ---
# name: code-review
# description: ...
# ---
#
# [prompt content]
```

**Verify generated MCP file format:**
```bash
# Get MCP config
curl http://localhost:8787/plugins/dev-tools-ext/claude_code/.mcp.json

# Should contain consolidated MCP servers:
# {
#   "mcpServers": {
#     "server1": {...},
#     "server2": {...}
#   }
# }
```

**Verify plugin.json:**
```bash
curl http://localhost:8787/plugins/dev-tools-ext/claude_code/.claude-plugin/plugin.json

# Should match ManifestService output:
# {
#   "name": "dev-tools",
#   "version": "1.0.0",
#   "commands": ["./commands/code-review.md", ...],
#   "agents": ["./agents/code-helper.md", ...],
#   "mcpServers": {...}
# }
```

### Performance Validation

- First access triggers generation: ~500-1000ms
- Subsequent accesses use cached files: <100ms
- ZIP generation: <2s for typical plugin (<10 files)
- Directory listing: <50ms

### Error Handling Validation

**Test error scenarios:**
```bash
# Non-existent extension
curl http://localhost:8787/plugins/fake-id/claude_code
# Expected: 404 with error message

# Non-existent file
curl http://localhost:8787/plugins/dev-tools-ext/claude_code/commands/fake.md
# Expected: 404 with error message

# Invalid format
curl http://localhost:8787/plugins/dev-tools-ext/invalid-format
# Expected: 400 with error message
```

## Implementation Notes

### File Generation Strategy

**Lazy generation (recommended):**
- Generate files on first access to `/plugins/:id/:format`
- Cache generated files in R2
- Invalidate cache when configs change
- Pros: No upfront cost, always up-to-date
- Cons: First access is slower

**Eager generation (alternative):**
- Generate files when extension/configs are created/updated
- Always have files ready
- Pros: Fast access, predictable performance
- Cons: Wastes storage if never accessed

**Recommendation**: Start with lazy generation, add eager option later if needed.

### Directory Structure in R2

```
extensions/
  {extension-id}/
    claude_code/
      .claude-plugin/
        plugin.json
      commands/
        command1.md
        command2.md
      agents/
        agent1.md
      .mcp.json
    gemini/
      gemini.json
      commands/
        command1.md
      GEMINI.md
      .mcp.json
```

### Content-Type Mapping

```typescript
const MIME_TYPES = {
  '.json': 'application/json',
  '.md': 'text/markdown',
  '.txt': 'text/plain',
  '.html': 'text/html',
};
```

### ZIP Library Selection

**Options for Cloudflare Workers:**
1. `fflate` - Modern, fast, no dependencies
2. `jszip` - Popular but larger
3. Native streams API - Most lightweight

**Recommendation**: Use `fflate` for best balance of features and size.

### Cache Invalidation Strategy

**When to invalidate:**
- Extension updated (name, version, description)
- Config added to extension
- Config removed from extension
- Config content updated
- Extension deleted

**How to invalidate:**
```typescript
async function invalidateExtensionFiles(extensionId: string) {
  // Delete all files from R2
  await deleteR2Prefix(`extensions/${extensionId}/`);

  // Clear file metadata from database
  await fileStorageRepo.deleteByExtensionId(extensionId);

  // Next access will regenerate files
}
```

### Security Considerations

- Sanitize file paths to prevent directory traversal
- Validate extension IDs to prevent unauthorized access
- Set proper CORS headers for cross-origin requests
- Consider rate limiting for ZIP downloads
- Add file size limits for ZIP generation

### Testing Strategy

**Unit tests:**
- FileGenerationService: Test each file generation method
- File path sanitization
- Content format validation

**Integration tests:**
- End-to-end file generation and retrieval
- ZIP archive creation and extraction
- HTTP directory serving

**Manual tests:**
- Install plugin in real Claude Code
- Install extension in real Gemini CLI
- Verify all commands/agents work

## Files to Create

### New Files
- `src/services/file-generation-service.ts` (~300 lines)
- `src/routes/plugins.ts` (~200 lines)
- `src/views/plugin-browser.ts` (~150 lines)

### Files to Modify
- `src/services/manifest-service.ts` - Update source field format
- `src/services/extension-service.ts` - Add file generation methods
- `src/views/extensions.ts` - Add download buttons and installation instructions
- `src/views/marketplaces.ts` - Add marketplace installation instructions
- `src/index.ts` - Register plugins router

### Dependencies to Add
```json
{
  "dependencies": {
    "fflate": "^0.8.1"  // For ZIP generation
  }
}
```

## Success Metrics

✅ Users can browse all plugin files via HTTP
✅ Users can download complete plugins as ZIP
✅ Claude Code can install plugins from HTTP URLs
✅ Gemini CLI can install extensions from downloaded ZIPs
✅ Marketplace manifest uses correct plugin source URLs
✅ All file formats are correct and loadable
✅ Performance is acceptable (<2s for ZIP, <100ms for files)
✅ Cache invalidation works correctly
