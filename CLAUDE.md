# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Agent Config Adapter - Universal configuration adapter for AI coding agents. Stores configurations (slash commands, agent definitions, MCP configs) and converts between Claude Code, Codex, and Gemini formats.

**Tech Stack**: Cloudflare Workers, Hono, D1 (SQLite), KV cache, Workers AI (Llama 3.1)

## Development Commands

### Setup
```bash
npm install

# Initialize local D1 database
npx wrangler d1 execute agent-config-adapter --local --file=./migrations/0001_create_configs_table.sql
npx wrangler d1 execute agent-config-adapter --local --file=./migrations/0002_add_updated_at.sql
npx wrangler d1 execute agent-config-adapter --local --file=./migrations/0003_replace_jules_with_gemini.sql

# Load sample data
npx wrangler d1 execute agent-config-adapter --local --file=./seeds/example-configs.sql
```

### Development
```bash
npm run dev        # Start dev server (http://localhost:8787)
npm test           # Run all tests
npm run test:watch # Watch mode
npm run lint       # Lint code
```

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
```

## Architecture

**Layer Structure**:
- `src/domain/` - Core types and business entities (no infrastructure dependencies)
- `src/infrastructure/` - D1, KV, AI services
- `src/adapters/` - Format converters (Claude Code ↔ Codex ↔ Gemini)
- `src/routes/` - Hono HTTP handlers
- `src/views/` - HTMX server-rendered templates

**Conversion Flow**: AI-first with automatic fallback to rule-based conversion. Returns metadata tracking which method was used.

**Bindings** (wrangler.jsonc): `DB` (D1), `CONFIG_CACHE` (KV), `AI` (Workers AI)

## API Endpoints

```
GET    /api/configs                    List all configs
GET    /api/configs/:id                Get specific config
GET    /api/configs/:id/format/:format Convert to format (claude_code|codex|gemini)
POST   /api/configs                    Create config
PUT    /api/configs/:id                Update config
DELETE /api/configs/:id                Delete config
POST   /api/configs/:id/invalidate     Invalidate cached conversions

GET    /configs/:id/edit               Edit config form (UI)
```

Same routes work for UI at `/configs` (returns HTML instead of JSON). The PUT endpoint supports both JSON and form data.

## Testing

- Use Vitest for all tests
- Test adapter conversion logic (critical)
- Test D1 and KV operations
- All tests must pass before committing

## Configuration

**wrangler.jsonc**: Uses JSONC format (comments allowed)
- Update production database and KV IDs after creating resources
- `nodejs_compat` flag required for nanoid and other Node.js modules

## Business Rules

- Agent definitions are NOT available in Codex and Claude Code formats
- Default input format is Claude Code
- All conversions maintain semantic meaning
- Config types:
  - `slash_command` (fully implemented with AI-enhanced conversion)
  - `agent_definition` (passthrough only - MVP)
  - `mcp_config` (fully implemented with rule-based conversion, no AI)

## MVP Limitations

- Agent definitions use passthrough (no conversion yet)
- No authentication/authorization

## MCP Config Adapter

MCP configs are fully implemented with rule-based conversion:
- Supports stdio and HTTP/SSE server types
- Converts between Claude Code JSON (with type field), Gemini JSON (uses httpUrl), and Codex TOML (uses startup_timeout_ms)
- Handles field mapping: type field (Claude only), httpUrl vs url, startup_timeout_ms (Codex only)
- Uses smol-toml library (Cloudflare Workers compatible)
- Skips AI conversion to ensure accurate structured data transformation
- 24 passing tests covering all format combinations and edge cases
