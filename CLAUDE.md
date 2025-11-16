# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Agent Config Adapter - Universal configuration adapter for AI coding agents. Stores configurations (slash commands, agent definitions, MCP configs) and converts between Claude Code, Codex, and Gemini formats.

**Tech Stack**: Cloudflare Workers, Hono, D1 (SQLite), KV cache, R2, AI Gateway (Multi-Provider: OpenAI GPT-5-Mini, Google Gemini 2.5 Flash)

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
npx wrangler d1 execute agent-config-adapter --local --file=./migrations/0007_add_slash_command_metadata.sql

# Load sample data
npx wrangler d1 execute agent-config-adapter --local --file=./seeds/example-configs.sql

# Setup environment variables for local development
cp .dev.vars.example .dev.vars
# LOCAL DEVELOPMENT (Recommended):
# 1. Get API keys from OpenAI and/or Google
# 2. Edit .dev.vars: Set OPENAI_API_KEY and/or GEMINI_API_KEY
# 3. Keys route through AI Gateway for logging, analytics, caching
# 4. Optional: Set AI_PROVIDER, OPENAI_REASONING_MODE, GEMINI_THINKING_BUDGET
#
# PRODUCTION BYOK (Bring Your Own Key):
# 1. Store provider API keys in Cloudflare Dashboard → AI Gateway → Provider Keys
# 2. Create gateway token in Cloudflare Dashboard → AI Gateway → Settings
# 3. Set AI_GATEWAY_TOKEN as Worker secret (see Deployment section below)
# Provider keys NEVER stored in Worker code or .dev.vars!
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
npx wrangler kv:namespace create EMAIL_SUBSCRIPTIONS
npx wrangler r2 bucket create agent-config-extension-files
# Update IDs in wrangler.jsonc
# Configure Email Routing in Cloudflare Dashboard
# Update send_email binding and ADMIN_EMAIL in wrangler.jsonc

# PRODUCTION BYOK Setup:
# 1. Store provider API keys in Cloudflare Dashboard → AI Gateway → Provider Keys
#    (NOT as Worker secrets - keys stored in AI Gateway only)
# 2. Create gateway token and store as Worker secret:
npx wrangler secret put AI_GATEWAY_TOKEN
# 3. Update wrangler.jsonc vars: ACCOUNT_ID, GATEWAY_ID, AI_PROVIDER
# 4. Optional vars: OPENAI_REASONING_MODE, GEMINI_THINKING_BUDGET
```

## Architecture

**Layer Structure**:
- `src/domain/` - Core types and business entities (no infrastructure dependencies)
- `src/infrastructure/` - D1, KV, R2, Email Routing, AI services (OpenAI GPT-5-Mini, Gemini 2.5 Flash)
- `src/services/` - Business logic (shared between REST API and MCP server, includes SubscriptionService and EmailService)
- `src/middleware/` - Request middleware (email gating for upload protection)
- `src/adapters/` - Format converters (Claude Code ↔ Codex ↔ Gemini)
- `src/routes/` - Hono REST HTTP handlers (includes subscriptions routes)
- `src/mcp/` - MCP server (6 tools, 3 resources, 3 prompts)
- `src/views/` - HTMX server-rendered templates (Neural Lab design, includes subscription form)

**Conversion Flow**: AI-first with automatic fallback to rule-based conversion.

**Bindings** (wrangler.jsonc): `DB` (D1), `CONFIG_CACHE` (KV), `EMAIL_SUBSCRIPTIONS` (KV), `EXTENSION_FILES` (R2), `EMAIL` (send_email), `AI_GATEWAY_TOKEN` (secret), `ACCOUNT_ID`, `GATEWAY_ID`, `AI_PROVIDER`, `OPENAI_REASONING_MODE`, `GEMINI_THINKING_BUDGET`, `ADMIN_EMAIL`

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

**Slash Command Converter Features:**
- Pre-computed metadata for fast lookups
- Reference inlining (agents/skills)
- Smart matching with fallback
- Frontend UI with search and refresh

### REST API - Skills
```
GET    /api/skills                     List all skills
GET    /api/skills/:id                 Get skill with companion files
POST   /api/skills                     Create skill (JSON or form-data)
POST   /api/skills/upload-zip          Create skill from ZIP upload (email gated)
PUT    /api/skills/:id                 Update skill metadata/content
DELETE /api/skills/:id                 Delete skill and all companion files

GET    /api/skills/:id/files           List all companion files
POST   /api/skills/:id/files           Upload companion file(s) (email gated)
GET    /api/skills/:id/files/:fileId   Download companion file
DELETE /api/skills/:id/files/:fileId   Delete companion file

GET    /api/skills/:id/download        Download skill as ZIP with all files
```

**Email Gating**: Upload endpoints require `X-Subscriber-Email` header with subscribed email.

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

### REST API - Subscriptions
```
GET    /subscriptions/form                 Show subscription form (HTML) with optional return URL
POST   /api/subscriptions/subscribe        Subscribe email (stores in KV, sends admin notification)
GET    /api/subscriptions/verify/:email    Check if email is subscribed
GET    /api/subscriptions/verify?email=    Alternative verification endpoint
```

**Email Subscription Flow**:
1. User submits email via `/subscriptions/form` or API
2. Email stored in `EMAIL_SUBSCRIPTIONS` KV namespace
3. Admin notification sent via Cloudflare Email Routing
4. User can access upload endpoints with `X-Subscriber-Email` header

Same routes work for UI at `/configs`, `/skills`, `/extensions`, `/marketplaces` (returns HTML instead of JSON). PUT endpoints support both JSON and form data.

### MCP Server
```
POST   /mcp                            MCP JSON-RPC endpoint (Streamable HTTP transport)
GET    /mcp/info                       Server info and capabilities (HTML/JSON)
```

**MCP Capabilities**:
- **6 Tools**: create_config, update_config, delete_config, get_config, convert_config, invalidate_cache
- **3 Resources**: config://list, config://{id}, config://{id}/cached/{format}
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
- Test services layer (ConfigService, ConversionService, SkillsService, SkillZipService, SubscriptionService, EmailService)
- Test routes layer (configs, skills, extensions, marketplaces, subscriptions)
- Test middleware layer (email gating)
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
- Update production database and KV IDs after creating resources (DB, CONFIG_CACHE, EMAIL_SUBSCRIPTIONS)
- Configure `send_email` binding with admin email address
- Set `ADMIN_EMAIL` in vars section
- `nodejs_compat` flag required for nanoid, OpenAI SDK, Gemini SDK, mimetext, and other Node.js modules
- Set `ACCOUNT_ID` and `GATEWAY_ID` in vars section
- For production BYOK: Set `AI_GATEWAY_TOKEN` as a secret using wrangler CLI
- For local dev: Set `OPENAI_API_KEY` and/or `GEMINI_API_KEY` in .dev.vars (not as secrets)

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
- Email gating for upload protection:
  - Upload endpoints require email subscription verification
  - Email stored in `EMAIL_SUBSCRIPTIONS` KV namespace
  - Admin notifications sent via Cloudflare Email Routing
  - Prevents abuse while building user community
  - Protected endpoints: `/api/skills/upload-zip`, `/api/skills/:id/files`

## MVP Limitations

- Agent definitions use passthrough (no conversion yet)
- Skills use passthrough (no conversion yet)
- Email gating for upload protection (simple subscription-based, no full authentication)
- No user accounts or per-user config management
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
