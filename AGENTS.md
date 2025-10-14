# agent-config-adapter

Universal adapter for AI coding agent configurations. Store Claude Code commands and MCP configs once, deploy across Codex, Gemini, and other agents.

## Project Overview

This app stores Claude Code slash commands, agent definitions, and MCP (Model Context Protocol) configs online, then converts them for different coding agents (Codex, Gemini, etc.). Think of it as a universal translator for AI agent configurations.

## Tech Stack

- **Backend**: Hono (lightweight web framework)
- **Platform**: Cloudflare Workers
- **Database**: Cloudflare D1 (SQLite)
- **Cache**: Cloudflare KV (for quick config lookups)
- **Storage**: Cloudflare R2 (for plugin files)
- **AI**: OpenAI GPT-5-mini via Cloudflare AI Gateway
- **MCP**: @modelcontextprotocol/sdk (Model Context Protocol server)
- **Transport Bridge**: fetch-to-node (Web Fetch to Node.js HTTP adapter)
- **Frontend**: HTMX with server-side rendering
- **Language**: TypeScript throughout
- **TOML Parser**: smol-toml (Cloudflare Workers compatible)
- **ZIP Generation**: fflate (Cloudflare Workers compatible)

## Architecture Approach

We use domain-driven design with a services layer for shared business logic. Core domains:
- **Config Storage**: Persist agent configurations (slash commands, MCP configs, agent definitions)
- **Format Adapter**: Convert between different agent formats (Claude Code ↔ Codex ↔ Gemini)
- **AI Conversion**: Intelligent format conversion using OpenAI GPT-5-mini via Cloudflare AI Gateway with automatic fallback
- **Config Retrieval**: Fast lookup and serving of converted configs
- **Extension Bundling**: Group configs into distributable extensions
- **Marketplace Management**: Organize extensions into marketplaces for discovery
- **Plugin Generation**: Generate platform-specific plugin files and store in R2
- **Services Layer**: Business logic orchestration
  - ConfigService, ConversionService (configs and format conversion)
  - ExtensionService, MarketplaceService (bundling and organization)
  - ManifestService (platform-specific manifests)
  - FileGenerationService, ZipGenerationService (plugin files and downloads)
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
  /infrastructure  # DB (D1), KV, R2, AI converter, external services
  /services        # Business logic layer
                   # - ConfigService, ConversionService
                   # - ExtensionService, MarketplaceService, ManifestService
                   # - FileGenerationService, ZipGenerationService
  /adapters        # Format converters (Claude ↔ Codex ↔ Gemini)
  /routes          # Hono REST route handlers
                   # - configs, extensions, marketplaces, plugins, files
  /mcp             # MCP server implementation (server, transport, types)
  /views           # HTMX templates
                   # - configs, extensions, marketplaces, plugin-browser
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
- This project has 5 main entities: Configs (Slash Commands, Agent Definitions, MCP configs), Extensions, and Marketplaces
- Agent definitions are not available in Codex and Claude Code (passthrough only)
- Slash commands use AI-enhanced conversion with rule-based fallback
- MCP configs use rule-based conversion only (no AI) for accurate structured data transformation
- User right now mostly inputs Claude Code configs which is the default format
- Extensions bundle multiple configs into distributable packages
- Marketplaces group multiple extensions for discovery
- Plugin downloads are format-specific:
  - Claude Code: Full ZIP with all files (primary)
  - Gemini: JSON definition file (recommended primary), ZIP available (advanced)
- Plugin files are lazily generated and stored in R2
- Cache is automatically invalidated on config updates
- Manual cache invalidation available via UI, REST API, and MCP tools for forcing conversion re-processing
- Services layer ensures consistent behavior between REST API and MCP server
- MCP server provides tools (write operations), resources (read operations), and prompts (workflows)

## UI Features
- Full CRUD operations through web interface for configs, extensions, and marketplaces
- Edit functionality with form validation
- Manual cache refresh button for re-processing conversions
- AI conversion status indicators (AI-powered vs fallback)
- Extension management with config bundling
- Marketplace management with extension organization
- Plugin browser with browsable file structure
- Format-specific download options (ZIP for Claude Code, JSON for Gemini)
- HTMX for seamless page updates without full reloads
