# Agent Config Adapter - MVP

Universal adapter for AI coding agent configurations. Store Claude Code commands and MCP configs once, deploy across Codex, Gemini, and other agents.

## Features

- 🔄 **Format Conversion**: Convert slash commands between Claude Code, Codex, and Gemini formats
- 🤖 **AI-Powered Conversion**: Uses OpenAI GPT-5-mini via Cloudflare AI Gateway for intelligent format conversion
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

# Setup environment variables for local development
cp .dev.vars.example .dev.vars
# REQUIRED: Get OpenAI API key from https://platform.openai.com/api-keys
# IMPORTANT: AI Gateway does NOT store provider keys - you must provide your own
# Edit .dev.vars: Set OPENAI_API_KEY, ACCOUNT_ID, and GATEWAY_ID

# Start development server
npm run dev
```

### OpenAI API Key Setup

**IMPORTANT**: Cloudflare AI Gateway proxies requests to OpenAI but **does NOT store** your OpenAI API key. You must provide your own API key:

1. Get an API key from [OpenAI Platform](https://platform.openai.com/api-keys)
2. Add it to `.dev.vars`:
   ```bash
   OPENAI_API_KEY=sk-proj-your-key-here
   ```
3. For production, use Wrangler secrets:
   ```bash
   npx wrangler secret put OPENAI_API_KEY
   ```

**Without a valid OpenAI API key**, the system will fall back to rule-based conversions only (no AI-powered conversion).

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

- **slash_command**: Slash commands for AI agents (fully implemented with AI-enhanced conversion)
- **agent_definition**: Agent configuration definitions (passthrough only - MVP)
- **mcp_config**: Model Context Protocol configurations (fully implemented with rule-based conversion)

## Supported Formats

- **claude_code**: Claude Code format (markdown with YAML frontmatter)
- **codex**: Codex AGENTS.md format
- **gemini**: Gemini format (TOML-based slash commands)

## Format Conversion Examples

### Slash Command Conversion

Slash command conversions are powered by AI (OpenAI GPT-5-mini via Cloudflare AI Gateway) with automatic fallback to rule-based conversion if needed.

#### Claude Code to Codex

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

### MCP Config Conversion

MCP config conversions use rule-based conversion (no AI) to ensure accurate transformation of structured data between JSON and TOML formats.

#### Claude Code to Codex

**Input (Claude Code JSON):**
```json
{
  "mcpServers": {
    "filesystem": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem"],
      "env": {
        "ALLOWED_DIRS": "/workspace"
      }
    }
  }
}
```

**Output (Codex TOML):**
```toml
[mcp_servers.filesystem]
command = "npx"
args = ["-y", "@modelcontextprotocol/server-filesystem"]
startup_timeout_ms = 20000

[mcp_servers.filesystem.env]
ALLOWED_DIRS = "/workspace"
```

#### Claude Code to Gemini

**Input (Claude Code JSON):**
```json
{
  "mcpServers": {
    "github": {
      "type": "stdio",
      "command": "gh-mcp",
      "args": [],
      "env": {
        "GITHUB_TOKEN": "ghp_xxx"
      }
    }
  }
}
```

**Output (Gemini JSON):**
```json
{
  "mcpServers": {
    "github": {
      "command": "gh-mcp",
      "args": [],
      "env": {
        "GITHUB_TOKEN": "ghp_xxx"
      }
    }
  }
}
```

#### HTTP/SSE MCP Servers

MCP configs also support HTTP and SSE server types:

**Claude Code format:**
```json
{
  "mcpServers": {
    "remote-api": {
      "type": "http",
      "url": "https://api.example.com/mcp"
    }
  }
}
```

**Gemini format (uses httpUrl):**
```json
{
  "mcpServers": {
    "remote-api": {
      "httpUrl": "https://api.example.com/mcp"
    }
  }
}
```

**Codex format:**
```toml
[mcp_servers.remote-api]
url = "https://api.example.com/mcp"
startup_timeout_ms = 20000
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

4. Set OpenAI API key secret:
   ```bash
   npx wrangler secret put OPENAI_API_KEY
   ```

5. Update `ACCOUNT_ID` and `GATEWAY_ID` in [wrangler.jsonc](wrangler.jsonc) vars section

6. Apply migrations to production:
   ```bash
   npx wrangler d1 migrations apply agent-config-adapter --remote
   ```

## Tech Stack

- **Backend**: Hono (lightweight web framework)
- **Platform**: Cloudflare Workers
- **Database**: Cloudflare D1 (SQLite)
- **Cache**: Cloudflare KV
- **AI**: OpenAI GPT-5-mini via Cloudflare AI Gateway
- **Frontend**: HTMX with server-side rendering
- **Language**: TypeScript
- **TOML Parser**: smol-toml (Cloudflare Workers compatible)

## Architecture

The project follows domain-driven design principles:

- **Domain Layer**: Core business logic and types
- **Infrastructure Layer**: Database, cache, and AI conversion service implementations
- **Adapter Layer**: Format conversion logic with AI enhancement (extensible for new formats)
- **Routes Layer**: HTTP request handlers
- **Views Layer**: HTML template generation

### AI-Powered Conversion

The system uses different strategies based on configuration type:

#### Slash Commands (AI-Enhanced)

1. **Primary**: AI-powered conversion using OpenAI GPT-5-mini via Cloudflare AI Gateway
   - Provides intelligent, context-aware format conversion
   - Preserves semantic meaning across different agent formats
   - Handles edge cases better than rule-based conversion
   - Superior conversion quality compared to previous Llama 3.1 implementation

2. **Fallback**: Rule-based conversion using format-specific adapters
   - Automatically used if AI conversion fails
   - Ensures reliable conversion in all scenarios
   - Transparent to the user

#### MCP Configs (Rule-Based Only)

- Uses rule-based conversion exclusively (no AI)
- Ensures accurate transformation of structured data (JSON ↔ TOML)
- Handles field mapping between formats (type field, httpUrl vs url, startup_timeout_ms)
- Supports both stdio and HTTP/SSE server types

The UI displays which conversion method was used, providing transparency while maintaining reliability.

## Extensibility

Adding a new agent format is straightforward:

1. Add the format to [src/domain/types.ts](src/domain/types.ts)
2. Create a new adapter in [src/adapters/](src/adapters/)
3. Update the factory in [src/adapters/index.ts](src/adapters/index.ts)

## Current Limitations (MVP)

- Agent definitions use passthrough adapter (no format conversion yet)
- No authentication/authorization
- No search or filter functionality in UI
- No batch operations for multiple configs

## Next Steps

- [ ] Implement agent definition adapters
- [ ] Add authentication
- [ ] API documentation (OpenAPI/Swagger)
- [ ] Export/import functionality
- [ ] Version history for configs
- [x] Upgrade to GPT-5 via Cloudflare AI Gateway (completed)
- [ ] Add unit tests for AI conversion service
- [ ] Support for HTTP/SSE MCP servers in UI
- [ ] Batch operations for multiple configs
- [ ] Search and filter functionality in UI

## Contributing

See [AGENTS.md](AGENTS.md) for development guidelines and architecture details.

## License

ISC
