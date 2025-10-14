# Extension Marketplace Implementation

## Purpose

Create a three-tier marketplace system that allows users to discover, select, and install configurations:
1. **Configs** - Individual slash commands, agent definitions, MCP servers (existing)
2. **Extensions/Plugins** - Bundles of configs (new)
3. **Marketplaces** - Collections of extensions/plugins (new)

Compatible with both Gemini CLI (browse-only) and Claude Code (full marketplace.json support) formats.

## Original Ask

Find online about Gemini CLI extensions and Claude Code extension marketplace.

Allow the users to select the components, and expose them as extensions/extension market place

If it requires any files, expose them via R2, if it doesn't, expose them via Database or KV which never expires.

For MCP, consolidate entire selection in one JSON.

## Complexity and the reason behind it

**Complexity Score: 3.5/5**

**Reasoning:**
- **Three-tier hierarchy**: Configs → Extensions → Marketplaces (all reference-based, no duplication)
- 4 new database tables: `extensions`, `extension_configs`, `marketplaces`, `marketplace_extensions`
- Optional 2 tables: `extension_files` (R2 tracking), `user_selections` (cart workflow)
- R2 integration for optional file storage (context files, icons, README files)
- New API endpoints for both extensions and marketplaces
- **Three manifest formats**: Gemini extension, Claude Code plugin, Claude Code marketplace
- MCP config consolidation: merge multiple existing MCP configs into single JSON with conflict resolution
- UI for browsing and creating extensions AND marketplaces
- **Platform differences**: Claude Code has marketplace.json support, Gemini CLI only has browse UI
- **Key Simplification**: All tiers use references only - no data duplication

**Why not 3/5:**
- Added marketplace tier increases scope
- Claude Code marketplace.json generation adds complexity
- More API endpoints and services needed
- Platform-specific behavior (marketplace manifest only for Claude Code)

**Why not 4/5:**
- No data duplication - all references
- Existing conversion logic handles format differences
- Clear specifications from research
- Straightforward database schema (just junction tables)

## Architectural changes required

### 1. Data Model Extensions

**Key Insight:** Extensions don't store configs - they just **reference** existing configs from the `configs` table. This eliminates data duplication and simplifies the architecture.

**New Database Tables:**

```sql
-- Extensions table (metadata only - references existing configs)
CREATE TABLE extensions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  author TEXT,
  version TEXT NOT NULL,
  icon_url TEXT,  -- Optional icon URL (can be R2 or external)
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Extension configs relationship (many-to-many junction table)
-- Links extensions to existing configs - NO config duplication
CREATE TABLE extension_configs (
  extension_id TEXT NOT NULL,
  config_id TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,  -- For display ordering
  PRIMARY KEY (extension_id, config_id),
  FOREIGN KEY (extension_id) REFERENCES extensions(id) ON DELETE CASCADE,
  FOREIGN KEY (config_id) REFERENCES configs(id) ON DELETE CASCADE
);

-- Extension files (OPTIONAL - for R2 storage tracking)
-- Only needed for additional files (README, icons, context files)
CREATE TABLE extension_files (
  id TEXT PRIMARY KEY,
  extension_id TEXT NOT NULL,
  file_path TEXT NOT NULL,  -- Logical path (e.g., "README.md")
  r2_key TEXT NOT NULL,      -- R2 storage key
  file_size INTEGER,
  mime_type TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (extension_id) REFERENCES extensions(id) ON DELETE CASCADE
);

-- User selections (OPTIONAL - for cart/selection workflow)
-- Can be implemented via client-side state instead of database
CREATE TABLE user_selections (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  config_ids TEXT NOT NULL,  -- JSON array of config IDs
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL   -- Auto-cleanup after 24 hours
);
```

**Marketplace Tables** (added for grouping extensions):

```sql
-- Marketplaces table (collections of extensions)
CREATE TABLE marketplaces (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  owner_name TEXT NOT NULL,
  owner_email TEXT,
  version TEXT NOT NULL,
  homepage TEXT,
  repository TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Marketplace extensions relationship (many-to-many junction table)
-- Links marketplaces to existing extensions - NO extension duplication
CREATE TABLE marketplace_extensions (
  marketplace_id TEXT NOT NULL,
  extension_id TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,  -- For display ordering
  PRIMARY KEY (marketplace_id, extension_id),
  FOREIGN KEY (marketplace_id) REFERENCES marketplaces(id) ON DELETE CASCADE,
  FOREIGN KEY (extension_id) REFERENCES extensions(id) ON DELETE CASCADE
);
```

**Complete Hierarchy:**
```
Marketplaces (new)
  └─> marketplace_extensions (junction)
       └─> Extensions (new)
            └─> extension_configs (junction)
                 └─> Configs (existing)
```

**Database Query Pattern:**
```typescript
// To get extension with all configs:
// 1. SELECT * FROM extensions WHERE id = ?
// 2. SELECT c.* FROM configs c
//    INNER JOIN extension_configs ec ON c.id = ec.config_id
//    WHERE ec.extension_id = ?
//    ORDER BY ec.sort_order

// To get marketplace with all extensions and their configs:
// 1. SELECT * FROM marketplaces WHERE id = ?
// 2. SELECT e.* FROM extensions e
//    INNER JOIN marketplace_extensions me ON e.id = me.extension_id
//    WHERE me.marketplace_id = ?
//    ORDER BY me.sort_order
// 3. For each extension, SELECT configs as above
```

### 2. Cloudflare R2 Integration

**New Binding:** `EXTENSION_FILES` (R2 bucket)

**Purpose:**
- Store binary files required by extensions (scripts, images, etc.)
- Store generated manifest files (gemini-extension.json, plugin.json)
- Serve files via public URL or signed URLs

**Configuration in wrangler.jsonc:**
```jsonc
"r2_buckets": [
  {
    "binding": "EXTENSION_FILES",
    "bucket_name": "agent-config-extension-files"
  }
]
```

### 3. New Services Layer

**ExtensionService** (`src/services/extension-service.ts`)
- Create/update/delete extensions
- Add/remove configs from extensions
- List marketplace extensions
- Bundle extension for installation

**ManifestService** (`src/services/manifest-service.ts`)
- Generate Gemini CLI extension manifest (`gemini-extension.json`)
- Generate Claude Code plugin manifest (`.claude-plugin/plugin.json`)
- Consolidate MCP servers from multiple configs into single JSON
- Handle format-specific requirements (context files, command structures)

**FileStorageService** (`src/services/file-storage-service.ts`)
- Upload files to R2
- Generate signed URLs for downloads
- Track file metadata in database
- Clean up orphaned files

### 4. Extension Manifest Formats

**Gemini CLI Extension Format:**
```json
{
  "name": "extension-name",
  "version": "1.0.0",
  "mcpServers": {
    "server1": { /* consolidated MCP config */ },
    "server2": { /* consolidated MCP config */ }
  },
  "contextFileName": "GEMINI.md",
  "commands": {
    "command1": "commands/command1.md",
    "command2": "commands/command2.md"
  }
}
```

**Claude Code Plugin Format:**
```json
{
  "name": "plugin-name",
  "version": "1.0.0",
  "description": "Plugin description",
  "author": {
    "name": "Author Name"
  },
  "commands": ["./commands/"],
  "agents": ["./agents/"],
  "mcpServers": {
    "server1": { /* consolidated MCP config */ },
    "server2": { /* consolidated MCP config */ }
  }
}
```

## Backend changes required

### 1. Database Migrations

**Create new migration:** `migrations/0004_add_extensions.sql`
- Add extensions, extension_configs, extension_files, user_selections tables
- Add indexes for performance (extension_id, config_id, session_id)

### 2. New API Endpoints

**Extension Management:**
- `POST /api/extensions` - Create extension
- `PUT /api/extensions/:id` - Update extension
- `DELETE /api/extensions/:id` - Delete extension
- `GET /api/extensions` - List all extensions
- `GET /api/extensions/:id` - Get extension details

**Extension Config Association:**
- `POST /api/extensions/:id/configs` - Add config to extension
- `DELETE /api/extensions/:id/configs/:configId` - Remove config from extension
- `GET /api/extensions/:id/configs` - List configs in extension

**Marketplace & Installation:**
- `GET /api/marketplace` - Browse marketplace (paginated, searchable)
- `GET /api/marketplace/:id` - Get extension with full details
- `POST /api/marketplace/:id/install` - Generate installation bundle
- `GET /api/marketplace/:id/manifest/:format` - Get manifest (gemini|claude_code)

**User Selections (Cart):**
- `POST /api/selections` - Create selection session
- `PUT /api/selections/:id` - Update selected configs
- `GET /api/selections/:id` - Get selection details
- `POST /api/selections/:id/bundle` - Bundle selected configs as extension
- `DELETE /api/selections/:id` - Clear selection

**File Management:**
- `POST /api/extensions/:id/files` - Upload file to extension
- `GET /api/extensions/:id/files` - List extension files
- `DELETE /api/extensions/:id/files/:fileId` - Delete file
- `GET /api/files/:id/download` - Download file (signed URL)

### 3. Services Implementation

**ExtensionService:**
```typescript
class ExtensionService {
  async createExtension(input: CreateExtensionInput): Promise<Extension>
  async getExtension(id: string): Promise<Extension | null>
  async listExtensions(filters?: ExtensionFilters): Promise<Extension[]>
  async updateExtension(id: string, input: UpdateExtensionInput): Promise<Extension>
  async deleteExtension(id: string): Promise<void>
  async addConfig(extensionId: string, configId: string): Promise<void>
  async removeConfig(extensionId: string, configId: string): Promise<void>
  async getExtensionConfigs(extensionId: string): Promise<Config[]>
}
```

**ManifestService:**
```typescript
class ManifestService {
  async generateGeminiManifest(extensionId: string): Promise<GeminiExtensionManifest>
  async generateClaudeCodeManifest(extensionId: string): Promise<ClaudeCodePluginManifest>
  async consolidateMCPServers(configIds: string[]): Promise<MCPConfig>
  async bundleExtension(extensionId: string, format: 'gemini' | 'claude_code'): Promise<BundleResult>
}
```

**FileStorageService:**
```typescript
class FileStorageService {
  async uploadFile(extensionId: string, file: File): Promise<ExtensionFile>
  async getFile(fileId: string): Promise<ExtensionFile | null>
  async deleteFile(fileId: string): Promise<void>
  async getSignedDownloadUrl(fileId: string, expiresIn?: number): Promise<string>
  async listExtensionFiles(extensionId: string): Promise<ExtensionFile[]>
}
```

### 4. MCP Server Consolidation Logic

**Algorithm:**
1. Fetch all configs in extension
2. Filter for `mcp_config` type
3. Parse each config's MCP servers
4. Merge into single `mcpServers` object
5. Handle naming conflicts (append suffix if duplicate server names)
6. Validate final consolidated config

**Example:**
```typescript
// Config 1: filesystem MCP
{ "mcpServers": { "filesystem": { "command": "npx", "args": [...] } } }

// Config 2: github MCP
{ "mcpServers": { "github": { "command": "gh-mcp", "args": [] } } }

// Consolidated result:
{
  "mcpServers": {
    "filesystem": { "command": "npx", "args": [...] },
    "github": { "command": "gh-mcp", "args": [] }
  }
}
```

### 5. KV Caching Strategy

**Cache Keys:**
- `extension:${id}` - Extension metadata (never expires)
- `extension:${id}:configs` - Extension configs list (never expires)
- `manifest:${extensionId}:${format}` - Generated manifests (never expires)
- `selection:${sessionId}` - User selection session (expires in 24 hours)

**Cache Invalidation:**
- Invalidate on extension update
- Invalidate on config add/remove
- Invalidate on extension deletion
- Selection cache expires automatically

## Frontend changes required

### 1. Marketplace Browse UI

**New Pages:**

**`/marketplace` - Marketplace Browse**
- Grid/list view of available extensions
- Search functionality
- Filter by type (commands, agents, MCP servers)
- Extension cards showing:
  - Name, description, author
  - Version
  - Number of configs included
  - Install button

**`/marketplace/:id` - Extension Detail**
- Full extension information
- List of included configs
- Preview of manifest files
- Format selection (Gemini CLI vs Claude Code)
- Install instructions
- Download bundle button

**`/marketplace/create` - Create Extension**
- Extension metadata form (name, description, author, version)
- Config selector (multi-select from existing configs)
- File upload for additional resources
- Preview generated manifest
- Create button

### 2. Config Selection UI

**`/configs` - Enhanced List View**
- Add checkbox column for multi-select
- "Add to Selection" button (batch action)
- "Create Extension from Selected" button
- Selection counter badge

**Selection Panel (Modal/Sidebar):**
- Show selected configs
- Remove from selection
- "Bundle as Extension" button
- "Export MCP Consolidated" button

### 3. Installation Flow UI

**Installation Modal:**
- Format selector (Gemini CLI / Claude Code)
- Generated manifest preview (syntax highlighted JSON/TOML)
- Installation instructions
- "Download Bundle" button
- "Copy Install Command" button

**Example Install Commands:**
```bash
# Gemini CLI
gemini extensions install https://your-worker.dev/api/marketplace/abc123/bundle/gemini

# Claude Code
/plugin install https://your-worker.dev/api/marketplace/abc123/bundle/claude_code
```

### 4. MCP Consolidation UI

**MCP Export View (`/configs/mcp/export`):**
- Multi-select MCP configs
- Preview consolidated JSON
- Download consolidated JSON
- Copy to clipboard
- Installation instructions

## Acceptance Criteria

1. **Extension Creation**
   - Users can create extensions by selecting multiple configs
   - Extensions have metadata (name, description, author, version)
   - Configs can be added/removed from extensions

2. **Marketplace Browsing**
   - Users can browse available extensions
   - Search and filter functionality works
   - Extension details page shows all included configs

3. **Manifest Generation**
   - Gemini CLI manifest format is correctly generated
   - Claude Code plugin manifest format is correctly generated
   - MCP servers from multiple configs are consolidated into single JSON
   - Naming conflicts are handled gracefully

4. **File Storage**
   - Files can be uploaded to R2
   - Files are associated with extensions
   - Files can be downloaded via signed URLs
   - Orphaned files are cleaned up on extension deletion

5. **Installation Flow**
   - Users can download extension bundles in chosen format
   - Installation instructions are clear and format-specific
   - Generated manifests are valid and usable

6. **MCP Consolidation**
   - Multiple MCP configs can be selected
   - Consolidated JSON is valid and contains all servers
   - Naming conflicts are resolved automatically
   - Consolidated config can be downloaded

7. **Caching**
   - Extensions and manifests are cached in KV
   - Cache invalidation works correctly
   - Selection sessions expire after 24 hours

8. **UI/UX**
   - Marketplace is intuitive and easy to browse
   - Multi-select config workflow is clear
   - Installation instructions are copy-pasteable
   - Preview functionality works for all formats

## Validation

### Backend Validation

**1. Database Operations**
```bash
# Create extension
curl -X POST http://localhost:8787/api/extensions \
  -H "Content-Type: application/json" \
  -d '{"name": "My Extension", "description": "Test", "author": "Test", "version": "1.0.0"}'

# Add configs to extension
curl -X POST http://localhost:8787/api/extensions/{id}/configs \
  -H "Content-Type: application/json" \
  -d '{"configId": "config1"}'

# List marketplace
curl http://localhost:8787/api/marketplace

# Get extension details
curl http://localhost:8787/api/marketplace/{id}
```

**2. Manifest Generation**
```bash
# Get Gemini CLI manifest
curl http://localhost:8787/api/marketplace/{id}/manifest/gemini

# Get Claude Code manifest
curl http://localhost:8787/api/marketplace/{id}/manifest/claude_code

# Verify JSON structure
curl http://localhost:8787/api/marketplace/{id}/manifest/gemini | jq .
```

**3. MCP Consolidation**
```bash
# Create selection with MCP configs
curl -X POST http://localhost:8787/api/selections \
  -H "Content-Type: application/json" \
  -d '{"configIds": ["mcp1", "mcp2", "mcp3"]}'

# Bundle and verify consolidated MCP
curl -X POST http://localhost:8787/api/selections/{id}/bundle \
  -H "Content-Type: application/json" \
  -d '{"format": "gemini"}' | jq '.mcpServers'
```

**4. File Storage (R2)**
```bash
# Upload file
curl -X POST http://localhost:8787/api/extensions/{id}/files \
  -F "file=@test-script.js"

# List files
curl http://localhost:8787/api/extensions/{id}/files

# Get signed download URL
curl http://localhost:8787/api/files/{fileId}/download
```

**5. Caching Verification**
```bash
# First request (cold cache)
time curl http://localhost:8787/api/marketplace/{id}

# Second request (warm cache)
time curl http://localhost:8787/api/marketplace/{id}

# Verify cache hit (should be significantly faster)
```

### Frontend Validation

**1. Marketplace Browse**
- Open `/marketplace`
- Verify extensions load
- Test search functionality
- Test filters
- Click extension card → navigates to detail page

**2. Extension Detail**
- View extension details
- See list of included configs
- Select format (Gemini CLI / Claude Code)
- Preview manifest
- Download bundle
- Copy install command

**3. Extension Creation**
- Navigate to `/marketplace/create`
- Fill extension metadata
- Select multiple configs from list
- Upload test file
- Preview generated manifest
- Create extension
- Verify extension appears in marketplace

**4. Config Multi-Select**
- Go to `/configs`
- Select multiple configs using checkboxes
- Click "Create Extension from Selected"
- Verify selected configs are pre-populated in form

**5. MCP Consolidation**
- Go to `/configs`
- Filter for MCP configs
- Select 3+ MCP configs
- Click "Export MCP Consolidated"
- Verify consolidated JSON contains all servers
- Download JSON file
- Copy to clipboard

**6. Installation Flow**
- Select extension from marketplace
- Choose Gemini CLI format
- Verify manifest shows `gemini-extension.json` structure
- Copy install command
- Switch to Claude Code format
- Verify manifest changes to `.claude-plugin/plugin.json` structure
- Copy install command

### Integration Testing

**1. End-to-End Extension Creation Flow**
1. Create 3 slash commands via API
2. Create 2 MCP configs via API
3. Create extension including all 5 configs
4. Generate Gemini manifest → verify contains 2 MCP servers and 3 commands
5. Generate Claude Code manifest → verify structure matches spec
6. Download bundle → verify file structure

**2. Naming Conflict Resolution**
1. Create 2 MCP configs with same server name "github"
2. Add both to extension
3. Generate consolidated MCP → verify one is renamed (github-2)
4. Verify both servers are functional

**3. File Storage Lifecycle**
1. Upload file to extension
2. Verify file appears in R2 bucket
3. Download file via signed URL
4. Delete extension
5. Verify file is removed from R2 (cleanup job)

**4. Cache Invalidation**
1. Get extension (warm cache)
2. Update extension metadata
3. Get extension again → verify new data returned
4. Add config to extension
5. Get extension configs → verify new config included

### Performance Testing

**1. Large Extension Bundle**
- Create extension with 50+ configs
- Measure manifest generation time (target: < 2s)
- Measure bundle download time
- Verify no memory issues

**2. Marketplace Pagination**
- Create 100 extensions
- Load marketplace page
- Measure load time (target: < 500ms)
- Test pagination (10 items per page)

**3. MCP Consolidation Scale**
- Consolidate 20+ MCP servers
- Measure consolidation time (target: < 1s)
- Verify resulting JSON is valid
- Verify all servers present

### Format Validation

**1. Gemini CLI Format**
```bash
# Validate against Gemini CLI spec
gemini extensions validate <downloaded-manifest>

# Test installation
gemini extensions install <bundle-url>
```

**2. Claude Code Format**
```bash
# Validate plugin structure
/plugin validate <plugin-directory>

# Test installation
/plugin install <bundle-url>
```

**3. MCP Config Format**
- Parse consolidated JSON with MCP SDK
- Verify all servers initialize correctly
- Test with actual MCP client

### Security Validation

**1. R2 Access Control**
- Verify public files are accessible
- Verify private files require signed URLs
- Test expired signed URL (should fail)

**2. Input Validation**
- Test XSS in extension name/description
- Test SQL injection in search
- Test file upload with invalid MIME types
- Test file upload size limits

**3. Rate Limiting** (future)
- Test rapid manifest generation requests
- Test rapid file upload requests
- Verify rate limits enforced
