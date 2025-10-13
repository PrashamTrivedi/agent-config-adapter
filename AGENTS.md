# agent-config-adapter

Universal adapter for AI coding agent configurations. Store Claude Code commands and MCP configs once, deploy across Codex, Gemini, and other agents.

## Project Overview

This app stores Claude Code slash commands, agent definitions, and MCP (Model Context Protocol) configs online, then converts them for different coding agents (Codex, Gemini, etc.). Think of it as a universal translator for AI agent configurations.

## Tech Stack

- **Backend**: Hono (lightweight web framework)
- **Platform**: Cloudflare Workers
- **Database**: Cloudflare D1 (SQLite)
- **Storage**: Cloudflare KV (for quick config lookups)
- **AI**: OpenAI GPT-5-mini via Cloudflare AI Gateway
- **MCP**: @modelcontextprotocol/sdk (Model Context Protocol server)
- **Transport Bridge**: fetch-to-node (Web Fetch to Node.js HTTP adapter)
- **Frontend**: HTMX with server-side rendering
- **Language**: TypeScript throughout
- **TOML Parser**: smol-toml (Cloudflare Workers compatible)

## Architecture Approach

We use domain-driven design with a services layer for shared business logic. Core domains:
- **Config Storage**: Persist agent configurations (slash commands, MCP configs, agent definitions)
- **Format Adapter**: Convert between different agent formats (Claude Code ↔ Codex ↔ Gemini)
- **AI Conversion**: Intelligent format conversion using OpenAI GPT-5-mini via Cloudflare AI Gateway with automatic fallback
- **Config Retrieval**: Fast lookup and serving of converted configs
- **Services Layer**: Business logic orchestration (ConfigService, ConversionService)
  - Shared between REST API routes and MCP server tools
  - Ensures consistent behavior across interfaces
- **MCP Server**: Model Context Protocol integration with tools, resources, and prompts
  - 6 tools for CRUD and conversion operations
  - 1 resource for listing configs
  - 3 prompts for guided workflows

## Dev Environment

- Use `npm install` to install dependencies
- Use `npm run dev` for local development with Wrangler
- Database migrations in `/migrations` folder
- Seed data in `/seeds` folder

## Code Style

- TypeScript strict mode enabled
- Use Hono's type-safe routing patterns
- Prefer functional composition for adapters
- Keep domain models in `/src/domain`
- Keep infrastructure (DB, KV) in `/src/infrastructure`
- Keep adapters in `/src/adapters`

## File Organization

```
/src
  /domain          # Domain models and business logic
  /infrastructure  # DB, KV, AI converter, external services
  /services        # Business logic layer (ConfigService, ConversionService)
  /adapters        # Format converters (Claude ↔ Codex ↔ Gemini)
  /routes          # Hono REST route handlers
  /mcp             # MCP server implementation (server, transport, types)
  /views           # HTMX templates
  index.ts         # Entry point (mounts REST and MCP endpoints)
/migrations        # D1 migrations
/seeds             # Seed data
```

## Testing Instructions

- Run `npm test` to execute all tests
- Run `npm run test:watch` for watch mode
- Write tests for all adapter logic (critical for format conversion accuracy)
- Test both D1 and KV operations
- Test services layer (ConfigService, ConversionService)
- Test MCP tools via `/mcp` endpoint
- All tests must pass before committing

## Database

- Use D1 for relational config storage
- Schema migrations with `wrangler d1 migrations apply`
- Keep KV for caching frequently accessed configs

## HTMX Patterns

- Use `hx-boost` for enhanced navigation
- Server returns HTML fragments for updates
- Keep JavaScript minimal - HTMX handles most interactions
- Use Alpine.js only if absolutely necessary for complex UI state

## PR Instructions

- Title format: `[Feature/Fix] Brief description`
- Include:
  - What: What was changed
  - Why: Business/technical reason
  - Testing: How you verified it works
- Run `npm run lint` and `npm test` before committing
- All tests and type checks must pass

## Deployment

- Deploys to Cloudflare Workers via `npm run deploy`
- Secrets managed through `wrangler secret put`
- Environment variables in `wrangler.toml`

## Business Rules
- This project has 3 main entities: Slash Commands, Agent Definitions, and MCP configurations.
- Agent definitions are not available in Codex and Claude Code (passthrough only)
- Slash commands use AI-enhanced conversion with rule-based fallback
- MCP configs use rule-based conversion only (no AI) for accurate structured data transformation
- User right now mostly inputs Claude Code configs which is the default format
- Cache is automatically invalidated on config updates
- Manual cache invalidation available via UI, REST API, and MCP tools for forcing conversion re-processing
- Services layer ensures consistent behavior between REST API and MCP server
- MCP server provides tools (write operations), resources (read operations), and prompts (workflows)

## UI Features
- Full CRUD operations through web interface
- Edit functionality with form validation
- Manual cache refresh button for re-processing conversions
- AI conversion status indicators (AI-powered vs fallback)
- HTMX for seamless page updates without full reloads
