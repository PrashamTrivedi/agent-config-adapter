# Extension Marketplace - Architecture Summary

## Core Concept

Extensions are **metadata bundles** that group existing configs together. They don't duplicate config data - they just reference it.

```
┌─────────────────────────────────────┐
│         EXISTING SYSTEM             │
├─────────────────────────────────────┤
│  configs table:                     │
│  - slash_command configs            │
│  - agent_definition configs         │
│  - mcp_config configs               │
└─────────────────────────────────────┘
              ▲
              │ REFERENCES (no duplication)
              │
┌─────────────┴───────────────────────┐
│         NEW SYSTEM                  │
├─────────────────────────────────────┤
│  extensions table:                  │
│  - name, description, version       │
│                                     │
│  extension_configs table:           │
│  - (extension_id, config_id)        │
│  - Many-to-many junction            │
└─────────────────────────────────────┘
```

## How It Works

### 1. Extension Creation Flow

```typescript
// User selects existing configs: ["cmd1", "cmd2", "mcp1"]
POST /api/extensions
{
  "name": "DevTools Extension",
  "description": "Useful dev commands",
  "author": "Team",
  "version": "1.0.0",
  "configIds": ["cmd1", "cmd2", "mcp1"]  // References only
}

// System creates:
// 1. Extension record (metadata)
// 2. 3 junction records linking extension to each config
```

### 2. Manifest Generation Flow

```typescript
GET /api/marketplace/{extensionId}/manifest/gemini

// System does:
// 1. Fetch extension metadata
// 2. JOIN configs via extension_configs junction table
// 3. Group by config type:
//    - slash_command → commands section
//    - mcp_config → mcpServers section (consolidated)
//    - agent_definition → agents section (Claude Code only)
// 4. Convert each config to target format (gemini)
// 5. Generate manifest JSON
```

### 3. MCP Consolidation Example

```typescript
// Extension contains 3 MCP configs:
// Config 1: { mcpServers: { filesystem: {...} } }
// Config 2: { mcpServers: { github: {...} } }
// Config 3: { mcpServers: { filesystem: {...} } }  // Duplicate name!

// System consolidates to:
{
  mcpServers: {
    filesystem: {...},      // First occurrence
    github: {...},
    "filesystem-2": {...}   // Renamed to avoid conflict
  }
}
```

## Database Schema (Simplified)

### Core Tables (Required)

```sql
-- 1. Extensions (metadata only)
CREATE TABLE extensions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  author TEXT,
  version TEXT NOT NULL,
  icon_url TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- 2. Extension-Config Junction (references only)
CREATE TABLE extension_configs (
  extension_id TEXT NOT NULL,
  config_id TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  PRIMARY KEY (extension_id, config_id),
  FOREIGN KEY (extension_id) REFERENCES extensions(id) ON DELETE CASCADE,
  FOREIGN KEY (config_id) REFERENCES configs(id) ON DELETE CASCADE
);
```

### Optional Tables

```sql
-- 3. Extension Files (for R2 tracking - OPTIONAL)
-- Only if extension needs additional files (README, icons, etc.)
CREATE TABLE extension_files (
  id TEXT PRIMARY KEY,
  extension_id TEXT NOT NULL,
  file_path TEXT NOT NULL,
  r2_key TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (extension_id) REFERENCES extensions(id) ON DELETE CASCADE
);

-- 4. User Selections (cart workflow - OPTIONAL)
-- Alternative: use client-side session storage
CREATE TABLE user_selections (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  config_ids TEXT NOT NULL,  -- JSON array
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);
```

## Manifest Formats

### Gemini CLI Extension Format

```json
{
  "name": "my-extension",
  "version": "1.0.0",
  "mcpServers": {
    // Consolidated from all mcp_config type configs
    "filesystem": { "command": "npx", "args": [...] },
    "github": { "command": "gh-mcp", "args": [] }
  },
  "contextFileName": "GEMINI.md",
  "commands": {
    // From slash_command type configs
    "code-review": "commands/code-review.md",
    "deploy": "commands/deploy.md"
  }
}
```

### Claude Code Plugin Format

```json
{
  "name": "my-plugin",
  "version": "1.0.0",
  "description": "Plugin description",
  "author": {
    "name": "Author Name"
  },
  "commands": ["./commands/"],  // From slash_command configs
  "agents": ["./agents/"],      // From agent_definition configs
  "mcpServers": {
    // Consolidated from all mcp_config type configs
    "filesystem": { "command": "npx", "args": [...] },
    "github": { "command": "gh-mcp", "args": [] }
  }
}
```

## API Endpoints (Simplified)

### Essential Endpoints

```
# Extension Management
POST   /api/extensions              Create extension (with config IDs)
GET    /api/extensions              List all extensions
GET    /api/extensions/:id          Get extension + configs
PUT    /api/extensions/:id          Update extension metadata
DELETE /api/extensions/:id          Delete extension
POST   /api/extensions/:id/configs  Add config to extension
DELETE /api/extensions/:id/configs/:configId  Remove config

# Marketplace (Browse & Install)
GET    /api/marketplace             Browse extensions
GET    /api/marketplace/:id         Extension detail + configs
GET    /api/marketplace/:id/manifest/:format  Generate manifest
```

### Optional Endpoints

```
# File Management (if using R2)
POST   /api/extensions/:id/files    Upload file
GET    /api/extensions/:id/files    List files
DELETE /api/extensions/:id/files/:fileId  Delete file
GET    /api/files/:id/download      Get signed download URL

# Selection/Cart (if using database for cart)
POST   /api/selections              Create selection
PUT    /api/selections/:id          Update selection
GET    /api/selections/:id          Get selection
POST   /api/selections/:id/bundle   Bundle as extension
DELETE /api/selections/:id          Clear selection
```

## Services Layer

```typescript
// ExtensionService - CRUD for extensions
class ExtensionService {
  async create(input: CreateExtensionInput): Promise<Extension>
  async get(id: string): Promise<Extension | null>
  async list(): Promise<Extension[]>
  async update(id: string, input: UpdateExtensionInput): Promise<Extension>
  async delete(id: string): Promise<void>
  async addConfig(extensionId: string, configId: string): Promise<void>
  async removeConfig(extensionId: string, configId: string): Promise<void>
  async getConfigs(extensionId: string): Promise<Config[]>  // JOIN query
}

// ManifestService - Generate format-specific manifests
class ManifestService {
  async generateGeminiManifest(extensionId: string): Promise<GeminiManifest>
  async generateClaudeCodeManifest(extensionId: string): Promise<ClaudeCodeManifest>
  async consolidateMCPServers(configs: Config[]): Promise<Record<string, MCPServerConfig>>
}

// FileStorageService - R2 integration (OPTIONAL)
class FileStorageService {
  async upload(extensionId: string, file: File): Promise<ExtensionFile>
  async delete(fileId: string): Promise<void>
  async getSignedUrl(fileId: string): Promise<string>
}
```

## Caching Strategy (KV)

```typescript
// Cache keys (never expire per requirements)
`extension:${id}`                    // Extension metadata
`extension:${id}:configs`            // Extension's config list
`manifest:${extensionId}:gemini`     // Generated Gemini manifest
`manifest:${extensionId}:claude_code` // Generated Claude Code manifest

// Invalidate on:
// - Extension update/delete
// - Config add/remove from extension
// - Underlying config content change
```

## UI Pages (Simplified)

```
/marketplace              List of extensions (grid/list view)
/marketplace/:id          Extension detail + manifest preview
/marketplace/create       Create new extension (select configs)
/configs                  Enhanced with multi-select checkbox
```

## Key Benefits of This Architecture

1. **No Data Duplication**: Configs stored once, referenced many times
2. **Consistency**: Changes to config automatically reflected in all extensions
3. **Flexibility**: Same config can belong to multiple extensions
4. **Simplicity**: Minimal new tables, leverage existing config system
5. **Efficiency**: JOIN queries are fast, cache layer speeds up manifest generation
6. **Scalability**: Extensions don't increase storage proportionally
