# Marketplace Feature - Group of Extensions/Plugins

## Concept

A **marketplace** is a collection of extensions/plugins that can be browsed and installed as a group. This adds a layer above individual extensions for organization and discovery.

```
┌──────────────────────────────────────────┐
│         MARKETPLACE                      │
│  (Collection of Extensions)              │
├──────────────────────────────────────────┤
│  ├─ Extension 1 (multiple configs)       │
│  ├─ Extension 2 (multiple configs)       │
│  └─ Extension 3 (multiple configs)       │
└──────────────────────────────────────────┘
                 ▼
    ┌────────────────────────┐
    │      EXTENSION         │
    │  (Bundle of Configs)   │
    ├────────────────────────┤
    │  ├─ Config 1           │
    │  ├─ Config 2           │
    │  └─ Config 3           │
    └────────────────────────┘
```

## Platform Differences

### Claude Code
- **Has marketplace.json manifest** - Groups multiple plugins
- Users add marketplace, then install individual plugins
- Marketplace is a Git repository with `.claude-plugin/marketplace.json`
- Installation:
  1. `/plugin marketplace add owner/repo`
  2. `/plugin install plugin-name@marketplace-name`

### Gemini CLI
- **No marketplace manifest** - Just web-based browsing
- Extensions are installed individually from GitHub/npm
- Web catalog at geminicli.com/extensions/browse
- Installation: `gemini extensions install github-url`

## Database Schema Addition

Add one new table for marketplaces:

```sql
-- Marketplaces table
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

-- Marketplace extensions relationship (many-to-many)
CREATE TABLE marketplace_extensions (
  marketplace_id TEXT NOT NULL,
  extension_id TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  PRIMARY KEY (marketplace_id, extension_id),
  FOREIGN KEY (marketplace_id) REFERENCES marketplaces(id) ON DELETE CASCADE,
  FOREIGN KEY (extension_id) REFERENCES extensions(id) ON DELETE CASCADE
);
```

**Complete hierarchy:**
```
Marketplaces (new)
  └─> marketplace_extensions (junction)
       └─> Extensions (existing)
            └─> extension_configs (junction)
                 └─> Configs (existing)
```

## Claude Code Marketplace Manifest Format

```json
{
  "name": "company-tools",
  "version": "1.0.0",
  "description": "Company development tools",
  "owner": {
    "name": "DevTools Team",
    "email": "[email protected]"
  },
  "plugins": [
    {
      "name": "code-formatter",
      "source": "./plugins/formatter",
      "description": "Automatic code formatting",
      "version": "2.1.0",
      "author": {
        "name": "Author Name",
        "email": "[email protected]"
      },
      "category": "productivity",
      "keywords": ["formatter", "style"],
      "strict": true
    },
    {
      "name": "deployment-tools",
      "source": {
        "source": "github",
        "repo": "company/deploy-plugin"
      },
      "description": "Deployment automation"
    }
  ]
}
```

### Field Mapping to Our System

```typescript
// marketplace.json → Our marketplace table
{
  name: marketplace.name,
  description: marketplace.description,
  owner_name: marketplace.owner.name,
  owner_email: marketplace.owner.email,
  version: marketplace.version
}

// plugins array → Our marketplace_extensions junction
marketplace.plugins.forEach(plugin => {
  // Create extension if needed
  // Link to marketplace via junction table
})
```

## API Endpoints - Marketplace

```typescript
// Marketplace CRUD
POST   /api/marketplaces                 Create marketplace
GET    /api/marketplaces                 List all marketplaces
GET    /api/marketplaces/:id             Get marketplace details
PUT    /api/marketplaces/:id             Update marketplace
DELETE /api/marketplaces/:id             Delete marketplace

// Marketplace <-> Extension Association
POST   /api/marketplaces/:id/extensions  Add extension to marketplace
DELETE /api/marketplaces/:id/extensions/:extId  Remove extension
GET    /api/marketplaces/:id/extensions  List marketplace extensions

// Manifest Generation (Claude Code only)
GET    /api/marketplaces/:id/manifest    Generate marketplace.json

// Browsing (UI-focused for Gemini)
GET    /marketplace                      UI: Browse all marketplaces
GET    /marketplace/:id                  UI: Marketplace detail page
GET    /marketplace/:id/extensions       UI: Extensions in marketplace
```

## Services Layer - Marketplace

```typescript
// MarketplaceService
class MarketplaceService {
  async createMarketplace(input: CreateMarketplaceInput): Promise<Marketplace>
  async getMarketplace(id: string): Promise<Marketplace | null>
  async listMarketplaces(): Promise<Marketplace[]>
  async updateMarketplace(id: string, input: UpdateMarketplaceInput): Promise<Marketplace>
  async deleteMarketplace(id: string): Promise<void>

  async addExtension(marketplaceId: string, extensionId: string): Promise<void>
  async removeExtension(marketplaceId: string, extensionId: string): Promise<void>
  async getExtensions(marketplaceId: string): Promise<Extension[]>

  // Generate Claude Code marketplace.json
  async generateManifest(marketplaceId: string): Promise<ClaudeCodeMarketplaceManifest>
}
```

## Manifest Generation Logic (Claude Code)

```typescript
async function generateClaudeCodeMarketplaceManifest(
  marketplaceId: string
): Promise<ClaudeCodeMarketplaceManifest> {
  // 1. Fetch marketplace metadata
  const marketplace = await getMarketplace(marketplaceId)

  // 2. Fetch all extensions in marketplace
  const extensions = await getMarketplaceExtensions(marketplaceId)

  // 3. Convert each extension to plugin entry
  const plugins = extensions.map(ext => ({
    name: ext.name,
    source: `./plugins/${ext.name}`,  // Or use R2 URL
    description: ext.description,
    version: ext.version,
    author: {
      name: ext.author,
    },
    strict: true,  // Each extension has its own plugin.json
  }))

  // 4. Generate manifest
  return {
    name: marketplace.name,
    version: marketplace.version,
    description: marketplace.description,
    owner: {
      name: marketplace.owner_name,
      email: marketplace.owner_email,
    },
    plugins,
  }
}
```

## Gemini CLI - Browse Experience

For Gemini CLI (no marketplace manifest support), we provide a **web-based browsing UI**:

```html
<!-- /marketplace page -->
<div class="marketplace-grid">
  <!-- Marketplace cards -->
  <div class="marketplace-card">
    <h3>Company Tools</h3>
    <p>Internal development utilities</p>
    <span class="badge">5 extensions</span>
    <a href="/marketplace/mp-123">Browse →</a>
  </div>
</div>

<!-- /marketplace/:id page -->
<div class="marketplace-detail">
  <h2>Company Tools</h2>
  <p>Internal development utilities</p>

  <h3>Extensions in this Marketplace</h3>
  <ul class="extension-list">
    <li>
      <h4>Code Formatter</h4>
      <p>Automatic code formatting</p>
      <a href="/marketplace/mp-123/extensions/ext-456">View →</a>
    </li>
    <!-- More extensions... -->
  </ul>
</div>
```

**Key difference**: Gemini users browse via web UI, but install extensions individually (not as grouped marketplace)

## Installation Workflows

### Claude Code (Marketplace-first)

```bash
# 1. User adds marketplace
/plugin marketplace add https://your-worker.dev/api/marketplaces/mp-123

# System downloads marketplace.json:
GET /api/marketplaces/mp-123/manifest

# 2. User browses plugins in marketplace
/plugin
→ Select marketplace: "Company Tools"
→ Browse plugins: [code-formatter, deployment-tools, ...]

# 3. User installs specific plugin
/plugin install code-formatter@company-tools

# System downloads plugin files and installs
```

### Gemini CLI (Extension-first with browsing)

```bash
# 1. User browses web UI
Open: https://your-worker.dev/marketplace

# 2. User clicks marketplace → sees extensions
Click: "Company Tools" → Shows 5 extensions

# 3. User clicks extension → gets install command
Click: "Code Formatter"
Copy: gemini extensions install https://your-worker.dev/api/extensions/ext-456/bundle/gemini

# 4. User runs install command
gemini extensions install https://your-worker.dev/api/extensions/ext-456/bundle/gemini
```

## UI Pages - Marketplace

### New Pages

**`/marketplaces` - Marketplace List (Browse)**
- Grid/list view of all marketplaces
- Shows: name, description, extension count, owner
- Search and filter functionality
- "Create Marketplace" button

**`/marketplaces/:id` - Marketplace Detail**
- Marketplace metadata display
- List of included extensions (cards)
- For Claude Code: "Add Marketplace" button with install command
- For Gemini: Browse extensions individually

**`/marketplaces/create` - Create Marketplace**
- Marketplace metadata form (name, description, owner, version)
- Extension selector (multi-select from existing extensions)
- Preview marketplace.json (Claude Code)
- Create button

**`/marketplaces/:id/edit` - Edit Marketplace**
- Update metadata
- Add/remove extensions
- Reorder extensions

### Enhanced Pages

**`/marketplace` - Unified Browse (existing page)**
- Tab switching: "All Extensions" | "Marketplaces"
- When viewing marketplaces, shows grouped view
- When viewing extensions, shows flat list

## Caching Strategy (KV)

```typescript
// Marketplace cache keys (never expire)
`marketplace:${id}`                           // Marketplace metadata
`marketplace:${id}:extensions`                // Extensions list
`marketplace:${id}:manifest:claude_code`      // Generated marketplace.json
```

## Acceptance Criteria - Marketplace

1. **Marketplace Creation**
   - Users can create marketplaces with metadata
   - Marketplaces can group multiple extensions
   - Extensions can belong to multiple marketplaces

2. **Marketplace Browsing**
   - Web UI shows list of marketplaces
   - Users can browse extensions within a marketplace
   - Search and filter work across marketplaces

3. **Claude Code Marketplace Manifest**
   - Generate valid marketplace.json format
   - Include all extensions as plugin entries
   - Support installation via `/plugin marketplace add`
   - Handle plugin source URLs correctly

4. **Gemini CLI Browse Experience**
   - Web UI provides intuitive marketplace browsing
   - Extensions show install commands
   - Individual extension installation works

5. **Hierarchy Navigation**
   - Users can navigate: Marketplaces → Extensions → Configs
   - Each level shows appropriate metadata
   - Links work correctly at all levels

## Validation

### Claude Code Marketplace

```bash
# Create marketplace
curl -X POST http://localhost:8787/api/marketplaces \
  -H "Content-Type: application/json" \
  -d '{
    "name": "company-tools",
    "description": "Internal tools",
    "owner_name": "DevTeam",
    "owner_email": "[email protected]",
    "version": "1.0.0"
  }'

# Add extensions to marketplace
curl -X POST http://localhost:8787/api/marketplaces/{id}/extensions \
  -H "Content-Type: application/json" \
  -d '{"extensionId": "ext-123"}'

# Generate marketplace.json
curl http://localhost:8787/api/marketplaces/{id}/manifest

# Verify structure
curl http://localhost:8787/api/marketplaces/{id}/manifest | jq '.plugins | length'

# Test Claude Code installation
/plugin marketplace add http://localhost:8787/api/marketplaces/{id}
```

### Gemini CLI Browse

```bash
# Open marketplace browse UI
open http://localhost:8787/marketplace

# Verify marketplace list loads
curl http://localhost:8787/api/marketplaces | jq '.'

# Verify marketplace detail page
open http://localhost:8787/marketplace/{id}

# Verify extension list in marketplace
curl http://localhost:8787/api/marketplaces/{id}/extensions | jq '.'
```

## Migration Path

**Phase 1** (Current): Extensions referencing configs
**Phase 2** (New): Marketplaces grouping extensions

No migration needed for existing data - marketplaces are purely additive. Extensions work standalone without marketplace association.

## Example Data Flow

```typescript
// User creates configs
POST /api/configs → config-1, config-2, config-3

// User creates extension from configs
POST /api/extensions {
  name: "formatter",
  configIds: ["config-1", "config-2"]
} → extension-1

// User creates another extension
POST /api/extensions {
  name: "deploy",
  configIds: ["config-3"]
} → extension-2

// User creates marketplace grouping extensions
POST /api/marketplaces {
  name: "company-tools",
  description: "Internal tools",
  owner_name: "DevTeam",
  version: "1.0.0"
} → marketplace-1

// User adds extensions to marketplace
POST /api/marketplaces/marketplace-1/extensions {
  extensionId: "extension-1"
}
POST /api/marketplaces/marketplace-1/extensions {
  extensionId: "extension-2"
}

// User generates Claude Code manifest
GET /api/marketplaces/marketplace-1/manifest
→ Returns marketplace.json with 2 plugins

// Claude Code user installs
/plugin marketplace add https://worker.dev/api/marketplaces/marketplace-1
/plugin install formatter@company-tools
/plugin install deploy@company-tools
```

## Summary

**For Claude Code:**
- Full marketplace.json support
- Two-step installation (add marketplace, install plugins)
- Generates proper manifest format

**For Gemini CLI:**
- Web-based marketplace browsing
- Individual extension installation
- No manifest file (not supported by Gemini)
- Enhanced discovery experience

**Database Impact:**
- +2 tables: marketplaces, marketplace_extensions
- Simple hierarchy: Marketplace → Extension → Config
- Backward compatible (extensions work without marketplaces)
