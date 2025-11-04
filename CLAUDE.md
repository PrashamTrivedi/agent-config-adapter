# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Agent Config Adapter - Universal configuration adapter for AI coding agents. Stores configurations (slash commands, agent definitions, MCP configs) and converts between Claude Code, Codex, and Gemini formats.

**Tech Stack**: Cloudflare Workers, Hono, D1 (SQLite), KV cache, AI Gateway (OpenAI GPT-5-mini)

## Development Commands

### Setup
```bash
npm install

# Initialize local D1 database
npx wrangler d1 execute agent-config-adapter --local --file=./migrations/0001_create_configs_table.sql
npx wrangler d1 execute agent-config-adapter --local --file=./migrations/0002_add_updated_at.sql
npx wrangler d1 execute agent-config-adapter --local --file=./migrations/0003_replace_jules_with_gemini.sql
npx wrangler d1 execute agent-config-adapter --local --file=./migrations/0004_add_extensions_and_marketplaces.sql
npx wrangler d1 execute agent-config-adapter --local --file=./migrations/0005_add_skill_config_type.sql
npx wrangler d1 execute agent-config-adapter --local --file=./migrations/0006_add_skill_files.sql

# Load sample data
npx wrangler d1 execute agent-config-adapter --local --file=./seeds/example-configs.sql

# Setup environment variables for local development
cp .dev.vars.example .dev.vars
# REQUIRED: Add your OpenAI API key from https://platform.openai.com/api-keys
# AI Gateway does NOT store provider keys - you must provide your own
# Edit .dev.vars: Set OPENAI_API_KEY, ACCOUNT_ID, and GATEWAY_ID
```

### Development
```bash
npm run dev        # Start dev server (http://localhost:8787)
npm test           # Run all tests
npm test -- --run --coverage  # Run tests with coverage
npm run test:watch # Watch mode
npm run lint       # Lint code
```

**CI/CD**: GitHub Actions workflow runs tests with coverage on all pushes and PRs. Coverage reports posted as PR comments, artifacts uploaded for 30 days, README badge auto-updated on main.

### Database
```bash
# Apply migration to local
npx wrangler d1 execute agent-config-adapter --local --file=./migrations/[file].sql

# Apply migrations to production
npx wrangler d1 migrations apply agent-config-adapter --remote
```

### Deployment
```bash
npm run deploy

# First-time setup
npx wrangler d1 create agent-config-adapter
npx wrangler kv:namespace create CONFIG_CACHE
# Update IDs in wrangler.jsonc

# Set production secrets
npx wrangler secret put OPENAI_API_KEY
# Update ACCOUNT_ID and GATEWAY_ID in wrangler.jsonc vars section
```

## Architecture

**Layer Structure**:
- `src/domain/` - Core types and business entities (no infrastructure dependencies)
- `src/infrastructure/` - D1, KV, R2, AI services
- `src/services/` - Business logic layer
  - ConfigService, ConversionService (for configs)
  - SkillsService, SkillZipService (for multi-file skills)
  - ExtensionService, MarketplaceService (for bundling)
  - ManifestService (platform-specific manifests)
  - FileGenerationService, ZipGenerationService (plugin files)
  - Shared between REST API routes and MCP server tools
  - Ensures consistent behavior across interfaces
- `src/adapters/` - Format converters (Claude Code ↔ Codex ↔ Gemini)
- `src/routes/` - Hono REST HTTP handlers (configs, skills, extensions, marketplaces, plugins, files)
- `src/mcp/` - MCP server implementation (server, transport, types)
  - Exposes 6 tools, 1 resource, 3 prompts
  - Uses Streamable HTTP transport for Cloudflare Workers
- `src/views/` - HTMX server-rendered templates (configs, skills, extensions, marketplaces, plugin browser)

**Conversion Flow**: AI-first with automatic fallback to rule-based conversion. Returns metadata tracking which method was used.

**AI Gateway Authentication**: Requires a valid OpenAI API key. AI Gateway proxies requests to OpenAI but does NOT store provider API keys. You must provide your own OpenAI API key via the `OPENAI_API_KEY` environment variable/secret. Without a valid key, the system falls back to rule-based conversions only.

**Bindings** (wrangler.jsonc): `DB` (D1), `CONFIG_CACHE` (KV), `EXTENSION_FILES` (R2), `OPENAI_API_KEY` (secret), `ACCOUNT_ID` (var), `GATEWAY_ID` (var)

## API Endpoints

### REST API - Configs
```
GET    /api/configs                    List all configs
GET    /api/configs/:id                Get specific config (redirects to /skills/:id if skill type)
GET    /api/configs/:id/format/:format Convert to format (claude_code|codex|gemini)
POST   /api/configs                    Create config
PUT    /api/configs/:id                Update config
DELETE /api/configs/:id                Delete config
POST   /api/configs/:id/invalidate     Invalidate cached conversions

GET    /configs/:id/edit               Edit config form (redirects to /skills/:id/edit if skill type)
```

### REST API - Slash Command Converter
```
GET    /api/slash-commands                 List all slash commands with metadata
GET    /api/slash-commands/:id             Get specific slash command with metadata
POST   /api/slash-commands/:id/convert     Convert slash command (body: { "userArguments": "optional" })
```

**Slash Command Converter Notes:**
- Uses proactive analysis with pre-computed metadata (computed on create/update)
- Lazy analysis available for existing configs (analyzed on first access)
- Returns `convertedContent`, `needsUserInput`, and full analysis metadata
- Metadata includes: `has_arguments`, `argument_hint`, `agent_references`, `skill_references`, `analysis_version`
- Frontend UI not yet implemented (backend-only in MVP)

### REST API - Skills
```
GET    /api/skills                     List all skills
GET    /api/skills/:id                 Get skill with companion files
POST   /api/skills                     Create skill (JSON or form-data)
POST   /api/skills/upload-zip          Create skill from ZIP upload
PUT    /api/skills/:id                 Update skill metadata/content
DELETE /api/skills/:id                 Delete skill and all companion files

GET    /api/skills/:id/files           List all companion files
POST   /api/skills/:id/files           Upload companion file(s)
GET    /api/skills/:id/files/:fileId   Download companion file
DELETE /api/skills/:id/files/:fileId   Delete companion file

GET    /api/skills/:id/download        Download skill as ZIP with all files
```

### REST API - Extensions
```
GET    /api/extensions                           List all extensions
GET    /api/extensions/:id                       Get specific extension with configs
GET    /api/extensions/:id/manifest/:format      Get extension manifest (gemini|claude_code)
POST   /api/extensions                           Create new extension
PUT    /api/extensions/:id                       Update extension
DELETE /api/extensions/:id                       Delete extension
GET    /api/extensions/:id/configs               Get configs for extension
POST   /api/extensions/:id/configs               Add configs to extension (batch)
POST   /api/extensions/:id/configs/:configId     Add single config to extension
DELETE /api/extensions/:id/configs/:configId     Remove config from extension
POST   /api/extensions/:id/invalidate            Invalidate extension cache
```

### REST API - Marketplaces
```
GET    /api/marketplaces                                List all marketplaces
GET    /api/marketplaces/:id                            Get specific marketplace with extensions
GET    /api/marketplaces/:id/manifest                   Get marketplace manifest (Claude Code format)
POST   /api/marketplaces                                Create new marketplace
PUT    /api/marketplaces/:id                            Update marketplace
DELETE /api/marketplaces/:id                            Delete marketplace
POST   /api/marketplaces/:id/extensions                 Add extensions to marketplace (batch)
POST   /api/marketplaces/:id/extensions/:extensionId    Add single extension to marketplace
DELETE /api/marketplaces/:id/extensions/:extensionId    Remove extension from marketplace
POST   /api/marketplaces/:id/invalidate                 Invalidate marketplace cache
```

### Plugin Downloads
```
GET    /plugins/:extensionId/:format                    Browse plugin files (claude_code|gemini)
GET    /plugins/:extensionId/:format/download           Download complete plugin as ZIP
GET    /plugins/:extensionId/gemini/definition          Download Gemini JSON definition (recommended)
GET    /plugins/:extensionId/:format/*                  Serve individual plugin file
POST   /plugins/:extensionId/:format/invalidate         Invalidate/regenerate plugin files
GET    /plugins/marketplaces/:marketplaceId/gemini/definition  Download marketplace Gemini JSON collection
GET    /plugins/marketplaces/:marketplaceId/download?format=   Download all marketplace plugins as ZIP
```

Same routes work for UI at `/configs`, `/skills`, `/extensions`, `/marketplaces` (returns HTML instead of JSON). PUT endpoints support both JSON and form data.

**Skills Management Notes:**
- Skills support multi-file structure: one required SKILL.md file plus optional companion files
- Gist-like editing interface with tab-based file management
- ZIP upload/download preserves directory structure and companion files
- Config interface automatically redirects skill-type configs to skills interface
- Companion files stored in R2 at `skills/{skill_id}/files/{file_path}`

### MCP Server
```
POST   /mcp                            MCP JSON-RPC endpoint (Streamable HTTP transport)
GET    /mcp/info                       Server info and capabilities (HTML/JSON)
```

**MCP Capabilities**:
- **6 Tools**: create_config, update_config, delete_config, get_config, convert_config, invalidate_cache
- **1 Resource**: config://list (lists all configs)
- **3 Prompts**: migrate_config_format, batch_convert, sync_config_versions

**MCP Client Config**:
```json
{
  "mcpServers": {
    "agent-config-adapter": {
      "type": "http",
      "url": "http://localhost:8787/mcp"
    }
  }
}
```

## Testing

- Use Vitest for all tests
- Test adapter conversion logic (critical)
- Test D1 and KV operations
- Test services layer (ConfigService, ConversionService, SkillsService, SkillZipService)
- Test routes layer (configs, skills, extensions, marketplaces)
- Test infrastructure layer (repositories, file storage)
- All tests must pass before committing

### MCP Testing
- Test MCP tools via `/mcp` endpoint
- Use `GET /mcp/info` to verify server capabilities
- Test workflows using prompts (migrate_config_format, batch_convert, sync_config_versions)

### CI/CD Testing
- GitHub Actions workflow (`.github/workflows/test-coverage.yml`) runs on all pushes and PRs
- Automated coverage reporting with PR comments and artifacts
- README badge automatically updated on main branch with current coverage percentage

## Configuration

**wrangler.jsonc**: Uses JSONC format (comments allowed)
- Update production database and KV IDs after creating resources
- `nodejs_compat` flag required for nanoid, OpenAI SDK, and other Node.js modules
- Set `ACCOUNT_ID` and `GATEWAY_ID` in vars section
- Set `OPENAI_API_KEY` as a secret using wrangler CLI

## Business Rules

- Agent definitions are NOT available in Codex and Claude Code formats
- Default input format is Claude Code
- All conversions maintain semantic meaning
- Config types:
  - `slash_command` (fully implemented with AI-enhanced conversion)
  - `agent_definition` (passthrough only - MVP)
  - `mcp_config` (fully implemented with rule-based conversion, no AI)
  - `skill` (fully implemented with multi-file support, passthrough conversion)
- Skills management:
  - Required SKILL.md file plus optional companion files
  - ZIP upload/download with structure preservation
  - Gist-like editing interface with tab-based file management
  - Automatic redirect from config interface to skills interface
  - Companion files stored in R2 bucket
- Extensions bundle multiple configs into distributable packages
- Marketplaces group multiple extensions for discovery
- Plugin downloads:
  - Claude Code: Full ZIP with manifest, commands, agents, MCP configs, skills (primary)
    - Extension ZIPs: Include plugin manifest and all config files
    - Marketplace ZIPs: Include marketplace.json at root with all plugin directories
  - Gemini: JSON definition file (recommended primary), ZIP available (advanced)
- Plugin files are lazily generated and stored in R2
- File generation is cached until invalidated

## MVP Limitations

- Agent definitions use passthrough (no conversion yet)
- Skills use passthrough (no conversion yet)
- No authentication/authorization
- Extension and marketplace features not yet integrated with MCP tools
- Skills features not yet integrated with MCP tools

## MCP Config Adapter

MCP configs are fully implemented with rule-based conversion:
- Supports stdio and HTTP/SSE server types
- Converts between Claude Code JSON (with type field), Gemini JSON (uses httpUrl), and Codex TOML (uses startup_timeout_ms)
- Handles field mapping: type field (Claude only), httpUrl vs url, startup_timeout_ms (Codex only)
- Uses smol-toml library (Cloudflare Workers compatible)
- Skips AI conversion to ensure accurate structured data transformation
- 24 passing tests covering all format combinations and edge cases
