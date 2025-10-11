# Agent Config Adapter - MVP

Universal adapter for AI coding agent configurations. Store Claude Code commands and MCP configs once, deploy across Codex, Jules, and other agents.

## Features

- 🔄 **Format Conversion**: Convert slash commands between Claude Code, Codex, and Jules formats
- 💾 **Persistent Storage**: D1 database for reliable config storage
- ⚡ **Fast Caching**: KV namespace for quick config retrieval
- 🎨 **Web UI**: HTMX-powered interface for managing configurations
- 🔌 **REST API**: Full CRUD API for programmatic access

## Quick Start

### Prerequisites

- Node.js 18+
- npm

### Installation

```bash
# Install dependencies
npm install

# Initialize local D1 database
npx wrangler d1 execute agent-config-adapter --local --file=./migrations/0001_create_configs_table.sql
npx wrangler d1 execute agent-config-adapter --local --file=./migrations/0002_add_updated_at.sql

# Load sample data (optional)
npx wrangler d1 execute agent-config-adapter --local --file=./seeds/example-configs.sql

# Start development server
npm run dev
```

The app will be available at `http://localhost:8787` (or another port shown in console).

## Project Structure

```
/src
  /domain          # Domain models and business logic
  /infrastructure  # DB, KV, external services
  /adapters        # Format converters (Claude ↔ Codex ↔ Jules)
  /routes          # Hono route handlers
  /views           # HTMX templates
  index.ts         # Entry point
/migrations        # D1 migrations
/seeds             # Seed data
```

## API Endpoints

### Configs

- `GET /api/configs` - List all configs
- `GET /api/configs/:id` - Get specific config
- `GET /api/configs/:id/format/:format` - Get config in specific format (claude_code, codex, jules)
- `POST /api/configs` - Create new config
- `PUT /api/configs/:id` - Update config
- `DELETE /api/configs/:id` - Delete config

### Example: Create a Config

```bash
curl -X POST http://localhost:8787/api/configs \
  -H "Content-Type: application/json" \
  -d '{
    "name": "code-review",
    "type": "slash_command",
    "original_format": "claude_code",
    "content": "---\nname: code-review\n---\n\nReview code for quality issues"
  }'
```

### Example: Convert Format

```bash
# Get Claude Code format config as Codex format
curl http://localhost:8787/api/configs/{id}/format/codex
```

## Configuration Types

- **slash_command**: Slash commands for AI agents
- **agent_definition**: Agent configuration definitions
- **mcp_config**: Model Context Protocol configurations

## Supported Formats

- **claude_code**: Claude Code format (markdown with YAML frontmatter)
- **codex**: Codex AGENTS.md format
- **jules**: Jules format (coming soon)

## Format Conversion Examples

### Claude Code to Codex

**Input (Claude Code):**
```markdown
---
name: code-review
description: Review code for quality issues
---

Review the code and provide feedback
```

**Output (Codex):**
```markdown
# code-review

Review code for quality issues

## Prompt

Review the code and provide feedback
```

## Development

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Lint code
npm run lint

# Apply migrations
npm run d1:migrations:apply
```

## Deployment

### Automatic Deployment (Recommended)

Use **Cloudflare Workers Builds** for automatic deployment on every push:

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com) > Workers & Pages
2. Click "Create Application" > "Connect to Git"
3. Connect your GitHub account and select this repository
4. Configure build settings:
   - **Build command**: `npm install`
   - **Build output directory**: Leave empty (Worker script)
   - **Root directory**: `/`
5. Add environment variables (if needed)
6. Click "Save and Deploy"

Now every push to your repository will automatically trigger a deployment!

**Benefits:**
- 6,000 free build minutes/month (paid plan)
- 6 concurrent builds
- No need to manage GitHub secrets
- Built-in preview deployments for branches

### Manual Deployment

```bash
# Deploy to Cloudflare Workers
npm run deploy
```

Before deploying (first time setup):

1. Create production D1 database:
   ```bash
   npx wrangler d1 create agent-config-adapter
   ```

2. Create KV namespace:
   ```bash
   npx wrangler kv:namespace create CONFIG_CACHE
   ```

3. Update [wrangler.jsonc](wrangler.jsonc) with production IDs

4. Apply migrations to production:
   ```bash
   npx wrangler d1 migrations apply agent-config-adapter --remote
   ```

## Tech Stack

- **Backend**: Hono (lightweight web framework)
- **Platform**: Cloudflare Workers
- **Database**: Cloudflare D1 (SQLite)
- **Cache**: Cloudflare KV
- **Frontend**: HTMX with server-side rendering
- **Language**: TypeScript

## Architecture

The project follows domain-driven design principles:

- **Domain Layer**: Core business logic and types
- **Infrastructure Layer**: Database and cache implementations
- **Adapter Layer**: Format conversion logic (extensible for new formats)
- **Routes Layer**: HTTP request handlers
- **Views Layer**: HTML template generation

## Extensibility

Adding a new agent format is straightforward:

1. Add the format to [src/domain/types.ts](src/domain/types.ts)
2. Create a new adapter in [src/adapters/](src/adapters/)
3. Update the factory in [src/adapters/index.ts](src/adapters/index.ts)

## Current Limitations (MVP)

- Agent definitions and MCP configs use passthrough adapters (no format conversion yet)
- Jules format conversion not implemented
- No authentication/authorization
- Basic UI (can be enhanced)

## Next Steps

- [ ] Implement agent definition adapters
- [ ] Implement MCP config adapters
- [ ] Add Jules format support
- [ ] Add authentication
- [ ] Enhanced UI with better UX
- [ ] API documentation (OpenAPI/Swagger)
- [ ] Export/import functionality
- [ ] Version history for configs

## Contributing

See [AGENTS.md](AGENTS.md) for development guidelines and architecture details.

## License

ISC
