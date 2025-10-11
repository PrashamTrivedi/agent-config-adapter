# agent-config-adapter

Universal adapter for AI coding agent configurations. Store Claude Code commands and MCP configs once, deploy across Codex, Gemini, and other agents.

## Project Overview

This app stores Claude Code slash commands, agent definitions, and MCP (Model Context Protocol) configs online, then converts them for different coding agents (Codex, Gemini, etc.). Think of it as a universal translator for AI agent configurations.

## Tech Stack

- **Backend**: Hono (lightweight web framework)
- **Platform**: Cloudflare Workers
- **Database**: Cloudflare D1 (SQLite)
- **Storage**: Cloudflare KV (for quick config lookups)
- **Frontend**: HTMX with server-side rendering
- **Language**: TypeScript throughout

## Architecture Approach

We use domain-driven design. Core domains:
- **Config Storage**: Persist agent configurations (slash commands, MCP configs, agent definitions)
- **Format Adapter**: Convert between different agent formats (Claude Code ↔ Codex ↔ Gemini)
- **AI Conversion**: Intelligent format conversion using Cloudflare Workers AI with automatic fallback
- **Config Retrieval**: Fast lookup and serving of converted configs

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
  /adapters        # Format converters (Claude ↔ Codex ↔ Gemini)
  /routes          # Hono route handlers
  /views           # HTMX templates
  index.ts         # Entry point
/migrations        # D1 migrations
/seeds             # Seed data
```

## Testing Instructions

- Run `npm test` to execute all tests
- Run `npm run test:watch` for watch mode
- Write tests for all adapter logic (critical for format conversion accuracy)
- Test both D1 and KV operations
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
- This project has 3 main entities: Slash Commands, Agents and MCP configurations.
- Agent configuration is not available in Codex and Claude Code
- User right now mostly inputs claude code configs which is a default value.
