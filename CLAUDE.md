# CLAUDE.md

## Project Overview

Agent Config Adapter - Universal configuration adapter for AI coding agents. Stores configurations (slash commands, agent definitions, MCP configs, skills) and converts between Claude Code, Codex, and Gemini formats.

**Tech Stack**: Cloudflare Workers, Hono, D1, KV, R2, AI Gateway (OpenAI GPT-5-Mini, Gemini 2.5 Flash)

## Development Commands

```bash
npm install
npm run dev        # http://localhost:8787
npm test           # Run all tests
npm run lint

# Database setup
npx wrangler d1 execute agent-config-adapter --local --file=./migrations/0001_create_configs_table.sql
# ... apply all migrations in order (0001-0007)
npx wrangler d1 execute agent-config-adapter --local --file=./seeds/example-configs.sql

# Environment: cp .dev.vars.example .dev.vars
# Set OPENAI_API_KEY and/or GEMINI_API_KEY for local dev
```

## Architecture

```
src/domain/        Core types (no dependencies)
src/infrastructure/  D1, KV, R2, AI services
src/services/      Business logic (shared by REST + MCP)
src/middleware/    Request middleware (email gating)
src/adapters/      Format converters
src/routes/        Hono REST handlers
src/mcp/           MCP server
src/views/         HTMX templates
```

**Conversion Flow**: AI-first with automatic fallback to rule-based conversion.

**Bindings**: `DB` (D1), `CONFIG_CACHE` (KV), `EMAIL_SUBSCRIPTIONS` (KV), `EXTENSION_FILES` (R2), `EMAIL`, `ANALYTICS`

## Config Types

- `slash_command`: AI-enhanced conversion
- `agent_definition`: Passthrough only (MVP)
- `mcp_config`: Rule-based conversion (no AI)
- `skill`: Multi-file with SKILL.md + companions

## Business Rules

- Default input format is Claude Code
- All conversions preserve semantic meaning
- Agent definitions NOT available in Codex/Claude Code formats
- Skills require SKILL.md, companions stored in R2
- Extensions bundle configs, Marketplaces group extensions
- Email gating protects all CUD operations (26 endpoints)

## Testing

- Vitest for all tests
- Test adapters, services, routes, middleware, infrastructure
- All tests must pass before committing
- CI/CD: GitHub Actions with coverage reports

## Deployment

```bash
npm run deploy

# First-time: create D1, KV namespaces, R2 bucket
# Update IDs in wrangler.jsonc
# Set secrets: AI_GATEWAY_TOKEN, MCP_ADMIN_TOKEN_HASH, EMAIL_API_KEY
```

## MVP Limitations

- Agent definitions and skills use passthrough (no conversion)
- Email gating instead of full authentication
- Extensions/marketplaces/skills not in MCP tools yet
