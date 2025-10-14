# Extension Marketplace - Updated Plan Summary

## What Changed

Added **Marketplace tier** - a collection of extensions that can be browsed and installed as a group.

## Three-Tier Hierarchy

```
┌─────────────────────────────────────────────────┐
│  TIER 3: MARKETPLACES (NEW)                    │
│  Collections of extensions                      │
│  - Claude Code: Full marketplace.json support   │
│  - Gemini CLI: Browse-only (no manifest)        │
└─────────────────────────────────────────────────┘
                    ▼ references
┌─────────────────────────────────────────────────┐
│  TIER 2: EXTENSIONS/PLUGINS (NEW)              │
│  Bundles of configs                             │
│  - Generate plugin.json (Claude Code)           │
│  - Generate gemini-extension.json (Gemini)      │
└─────────────────────────────────────────────────┘
                    ▼ references
┌─────────────────────────────────────────────────┐
│  TIER 1: CONFIGS (EXISTING)                    │
│  Individual slash commands, MCP servers, agents │
│  - Already in database                          │
│  - No changes needed                            │
└─────────────────────────────────────────────────┘
```

## Complexity Update

**Changed from 3/5 to 3.5/5**

**Why increased:**
- Added marketplace tier (2 more tables)
- Claude Code marketplace.json generation
- More API endpoints and services
- Platform-specific behavior differences

**Still reasonable because:**
- All tiers use references only (no duplication)
- Straightforward junction table pattern
- Clear specifications exist

## Database Schema Summary

**6 total tables:**
1. ✅ `configs` - Existing
2. 🆕 `extensions` - Extension metadata
3. 🆕 `extension_configs` - Extension→Config junction
4. 🆕 `marketplaces` - Marketplace metadata
5. 🆕 `marketplace_extensions` - Marketplace→Extension junction
6. 🔧 `extension_files` - Optional R2 file tracking

## Manifest Formats (3 Types)

### 1. Gemini Extension Manifest
```json
{
  "name": "my-extension",
  "version": "1.0.0",
  "mcpServers": { /* consolidated */ },
  "commands": { /* from configs */ }
}
```

### 2. Claude Code Plugin Manifest
```json
{
  "name": "my-plugin",
  "version": "1.0.0",
  "commands": ["./commands/"],
  "agents": ["./agents/"],
  "mcpServers": { /* consolidated */ }
}
```

### 3. Claude Code Marketplace Manifest (NEW)
```json
{
  "name": "company-tools",
  "version": "1.0.0",
  "owner": {
    "name": "DevTeam",
    "email": "[email protected]"
  },
  "plugins": [
    {
      "name": "plugin-1",
      "source": "./plugins/plugin-1",
      "description": "...",
      "version": "1.0.0"
    }
  ]
}
```

## Platform Differences

| Feature | Claude Code | Gemini CLI |
|---------|-------------|------------|
| **Marketplace Manifest** | ✅ marketplace.json | ❌ No manifest support |
| **Browse Experience** | In-CLI + Web | Web only |
| **Installation** | Two-step (add marketplace, install plugin) | Single-step (install extension) |
| **Grouping** | Marketplaces group plugins | Individual extensions only |
| **Discovery** | `/plugin` command | geminicli.com website |

## API Endpoints Summary

### Extension Endpoints (existing plan)
```
POST   /api/extensions
GET    /api/extensions
GET    /api/extensions/:id
PUT    /api/extensions/:id
DELETE /api/extensions/:id
POST   /api/extensions/:id/configs
DELETE /api/extensions/:id/configs/:configId
GET    /api/extensions/:id/manifest/:format
```

### Marketplace Endpoints (NEW)
```
POST   /api/marketplaces
GET    /api/marketplaces
GET    /api/marketplaces/:id
PUT    /api/marketplaces/:id
DELETE /api/marketplaces/:id
POST   /api/marketplaces/:id/extensions
DELETE /api/marketplaces/:id/extensions/:extensionId
GET    /api/marketplaces/:id/manifest           # Claude Code only
```

## Services Summary

### Existing Services (from original plan)
- `ExtensionService` - CRUD for extensions
- `ManifestService` - Generate extension manifests (Gemini, Claude Code)
- `FileStorageService` - R2 file management

### New Service
- `MarketplaceService` - CRUD for marketplaces + marketplace.json generation

## UI Pages Summary

### Extension Pages (existing plan)
```
/marketplace              Browse extensions (grid view)
/marketplace/:id          Extension detail
/marketplace/create       Create extension
```

### Marketplace Pages (NEW)
```
/marketplaces             Browse marketplaces (grid view)
/marketplaces/:id         Marketplace detail + extensions list
/marketplaces/create      Create marketplace
/marketplaces/:id/edit    Edit marketplace
```

## Installation Workflows

### Claude Code (Marketplace-aware)
```bash
# Add marketplace
/plugin marketplace add https://worker.dev/api/marketplaces/mp-123

# Browse plugins
/plugin
→ Select marketplace: "Company Tools"
→ Browse plugins

# Install plugin
/plugin install plugin-name@company-tools
```

### Gemini CLI (Extension-focused)
```bash
# Browse web UI
open https://worker.dev/marketplace

# Click marketplace → see extensions → copy install command
gemini extensions install https://worker.dev/api/extensions/ext-456/bundle/gemini
```

## Key Implementation Points

1. **No Data Duplication**: All tiers use references via junction tables
2. **Backward Compatible**: Extensions work without marketplaces
3. **Platform-Specific**:
   - Claude Code gets full marketplace.json
   - Gemini gets browse-only UI
4. **Manifest Generation**: Three formats, all generated on-demand
5. **Caching**: KV cache for all generated manifests (never expires)

## Files Created

1. ✅ [taskFindings.md](./taskFindings.md) - Main detailed plan (updated)
2. ✅ [ARCHITECTURE-SUMMARY.md](./ARCHITECTURE-SUMMARY.md) - Visual architecture
3. ✅ [MARKETPLACE-FEATURE.md](./MARKETPLACE-FEATURE.md) - Marketplace-specific details
4. ✅ [UPDATED-PLAN-SUMMARY.md](./UPDATED-PLAN-SUMMARY.md) - This file

## Next Steps

Ready for implementation via `/startWork` command!
