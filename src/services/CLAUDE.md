# Services Layer

Business logic and service coordination. Shared by REST API and MCP server.

## Core Services

### ConfigService
- Config CRUD operations
- **Smart matching** for config references:
  - Exact name match preferred
  - Partial match fallback
- Used by REST routes and MCP tools

### ConversionService
- Format conversion orchestration
- AI-first with rule-based fallback
- Returns metadata: provider, model, tokens, cost, duration
- Caches conversions in KV

### SlashCommandAnalyzerService
- Pre-computes metadata on create/update
- Metadata fields:
  - `has_arguments`: Boolean
  - `argument_hint`: String
  - `agent_references`: Array of agent names
  - `skill_references`: Array of skill names
  - `analysis_version`: Number
- Lazy analysis fallback for existing configs

### SlashCommandConverterService
- AI-enhanced command conversion
- **Reference Inlining**: Fetches and inlines agent/skill content
- Uses SlashCommandAnalyzerService for metadata
- Handles missing references gracefully

### SkillsService
- Multi-file skill management
- Required SKILL.md + optional companion files
- Integration with SkillZipService

### SkillZipService
- ZIP upload/download
- Preserves directory structure
- Companion file management

### ExtensionService
- Bundles multiple configs
- Manifest generation
- Config associations

### MarketplaceService
- Groups extensions
- Marketplace manifest
- Bulk operations

### ManifestService
- Platform-specific manifests:
  - Claude Code: Full ZIP with manifest.json
  - Gemini: JSON definition (recommended)

### FileStorageService
- R2 file operations
- Upload/download companion files
- Binary file handling

### FileGenerationService
- Plugin file generation
- Converts configs to plugin format
- Lazy generation and caching

### ZipGenerationService
- Plugin bundling
- Extension/marketplace ZIPs

## Service Patterns

- **Shared logic**: Services used by both REST API routes and MCP tools
- **Consistent behavior**: Same operations via REST or MCP
- **Separation**: Business logic isolated from HTTP/protocol layers
- **Coordination**: Services orchestrate infrastructure (DB, cache, AI, R2)
