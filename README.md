# Agent Config Adapter - MVP

Universal adapter for AI coding agent configurations. Store Claude Code commands and MCP configs once, deploy across Codex, Gemini, and other agents.

## Features

- 🔄 **Format Conversion**: Convert slash commands between Claude Code, Codex, and Gemini formats
- 🤖 **AI-Powered Conversion**: Uses Cloudflare Workers AI (Llama 3.1) for intelligent format conversion
- 💾 **Persistent Storage**: D1 database for reliable config storage
- ⚡ **Fast Caching**: KV namespace for quick config retrieval with manual invalidation
- 🎨 **Web UI**: HTMX-powered interface for managing configurations with edit and conversion refresh capabilities
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
  /infrastructure  # DB, KV, AI converter, external services
  /adapters        # Format converters (Claude ↔ Codex ↔ Gemini)
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
- `GET /api/configs/:id/format/:format` - Get config in specific format (claude_code, codex, gemini)
- `POST /api/configs` - Create new config
- `PUT /api/configs/:id` - Update config
- `DELETE /api/configs/:id` - Delete config
- `POST /api/configs/:id/invalidate` - Invalidate cached conversions for a config

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

### Example: Invalidate Cache

```bash
# Force re-processing of conversions by invalidating cache
curl -X POST http://localhost:8787/api/configs/{id}/invalidate
```

## Web UI Features

The web interface provides a user-friendly way to manage configurations:

- **List View** (`/configs`): Browse all configurations with type and format badges
- **Detail View** (`/configs/:id`): View configuration details and convert to different formats
- **Create Form** (`/configs/new`): Add new configurations through a web form
- **Edit Form** (`/configs/:id/edit`): Update existing configurations
- **Conversion Buttons**: One-click conversion to Claude Code, Codex, or Gemini formats
- **Cache Refresh**: "Refresh Conversions" button to invalidate cached conversions and force re-processing
- **AI Status**: Visual indicators showing whether AI or fallback conversion was used
- **Delete Confirmation**: Safe deletion with confirmation prompt

All UI interactions use HTMX for seamless updates without full page reloads.

## Configuration Types

- **slash_command**: Slash commands for AI agents
- **agent_definition**: Agent configuration definitions
- **mcp_config**: Model Context Protocol configurations

## Supported Formats

- **claude_code**: Claude Code format (markdown with YAML frontmatter)
- **codex**: Codex AGENTS.md format
- **gemini**: Gemini format (TOML-based slash commands)

## Format Conversion Examples

All format conversions are powered by AI (Cloudflare Workers AI with Llama 3.1 model) with automatic fallback to rule-based conversion if needed.

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

### Claude Code to Gemini

**Input (Claude Code):**
```markdown
---
name: code-review
description: Review code for quality issues
---

Review the code and provide feedback
```

**Output (Gemini TOML):**
```toml
description = "Review code for quality issues"
prompt = """
Review the code and provide feedback
"""
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
- **AI**: Cloudflare Workers AI (Llama 3.1 8B Instruct)
- **Frontend**: HTMX with server-side rendering
- **Language**: TypeScript

## Architecture

The project follows domain-driven design principles:

- **Domain Layer**: Core business logic and types
- **Infrastructure Layer**: Database, cache, and AI conversion service implementations
- **Adapter Layer**: Format conversion logic with AI enhancement (extensible for new formats)
- **Routes Layer**: HTTP request handlers
- **Views Layer**: HTML template generation

### AI-Powered Conversion

The system uses a hybrid approach for format conversion:

1. **Primary**: AI-powered conversion using Cloudflare Workers AI (Llama 3.1 8B Instruct model)
   - Provides intelligent, context-aware format conversion
   - Preserves semantic meaning across different agent formats
   - Handles edge cases better than rule-based conversion

2. **Fallback**: Rule-based conversion using format-specific adapters
   - Automatically used if AI conversion fails
   - Ensures reliable conversion in all scenarios
   - Transparent to the user

The UI displays which conversion method was used, providing transparency while maintaining reliability.

## Extensibility

Adding a new agent format is straightforward:

1. Add the format to [src/domain/types.ts](src/domain/types.ts)
2. Create a new adapter in [src/adapters/](src/adapters/)
3. Update the factory in [src/adapters/index.ts](src/adapters/index.ts)

## Current Limitations (MVP)

- Agent definitions and MCP configs use passthrough adapters (no format conversion yet)
- No authentication/authorization
- TOML parsing for Gemini format is basic (doesn't handle all TOML features)
- No search or filter functionality in UI
- No batch operations for multiple configs

## Next Steps

- [ ] Implement agent definition adapters
- [ ] Implement MCP config adapters
- [ ] Add authentication
- [ ] API documentation (OpenAPI/Swagger)
- [ ] Export/import functionality
- [ ] Version history for configs
- [ ] Improve TOML parsing for Gemini format
- [ ] Add unit tests for AI conversion service
- [ ] Upgrade to GPT-5 when available in Cloudflare Workers AI
- [ ] Batch operations for multiple configs
- [ ] Search and filter functionality in UI

## Contributing

See [AGENTS.md](AGENTS.md) for development guidelines and architecture details.

## License

ISC
