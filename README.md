# Agent Config Adapter - MVP

[![Coverage](https://img.shields.io/badge/Coverage-64%25-yellow)](https://github.com/PrashamTrivedi/agent-config-adapter/actions/workflows/test-coverage.yml)

Universal adapter for AI coding agent configurations. Store Claude Code commands
and MCP configs once, deploy across Codex, Gemini, and other agents.

## Features

- 🔄 **Format Conversion**: Convert slash commands between Claude Code, Codex,
  and Gemini formats
- 🤖 **AI-Powered Conversion**: Uses OpenAI GPT-5-mini via Cloudflare AI Gateway
  for intelligent format conversion
- 💾 **Persistent Storage**: D1 database for reliable config storage
- ⚡ **Fast Caching**: KV namespace for quick config retrieval with manual
  invalidation
- 🎨 **Web UI**: HTMX-powered interface for managing configurations with edit
  and conversion refresh capabilities
- 🔌 **REST API**: Full CRUD API for programmatic access
- 🌐 **MCP Server**: Model Context Protocol server for AI agent integration with
  tools, resources, and prompts
- 📦 **Extension Marketplace**: Bundle configs into extensions and marketplaces
  with format-specific downloads
- 🔽 **Plugin Downloads**: Generate and serve plugins as ZIP files or JSON
  definitions for both Claude Code and Gemini
- 🌐 **Claude Code Web Sync**: Automatically download and sync configurations
  from a ZIP file when running in Claude Code Web

## Claude Code Web Configuration Sync

When using this project in **Claude Code Web** (claude.ai/code), you can
automatically sync configurations from a remote ZIP file on session startup.

### Setup

1. Create `.claude/additionalSettings.json` in your project:

```json
{
  "ConfigZipLocation": "https://your-domain.com/configs.zip",
  "rootPath": "optional/path/within/zip"
}
```

2. The SessionStart hook will automatically:
   - Download the ZIP file
   - Extract configurations
   - Copy them to `~/.claude/`
   - Report success or errors (non-blocking)

### Features

- ✅ **Auto-detects environment**: Only runs in Claude Code Web, not Desktop
- ✅ **Non-blocking**: Errors don't prevent your session from starting
- ✅ **Configurable**: Extract entire ZIP or specific subdirectory
- ✅ **Safe**: Preserves existing local configurations (no overwrites)

📖 **Full Documentation**: See
[.claude/hooks/README.md](.claude/hooks/README.md) for detailed usage, testing,
and troubleshooting.

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
npx wrangler d1 execute agent-config-adapter --local --file=./migrations/0003_replace_jules_with_gemini.sql

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

**IMPORTANT**: Cloudflare AI Gateway proxies requests to OpenAI but **does NOT
store** your OpenAI API key. You must provide your own API key:

1. Get an API key from [OpenAI Platform](https://platform.openai.com/api-keys)
2. Add it to `.dev.vars`:
   ```bash
   OPENAI_API_KEY=sk-proj-your-key-here
   ```
3. For production, use Wrangler secrets:
   ```bash
   npx wrangler secret put OPENAI_API_KEY
   ```

**Without a valid OpenAI API key**, the system will fall back to rule-based
conversions only (no AI-powered conversion).

The app will be available at `http://localhost:8787` (or another port shown in
console).

## Project Structure

```
/src
  /domain          # Domain models and business logic
  /infrastructure  # DB, KV, R2, AI converter, external services
  /adapters        # Format converters (Claude ↔ Codex ↔ Gemini)
  /services        # Business logic layer (config, conversion, extension, marketplace, file generation services)
  /routes          # Hono REST route handlers (configs, extensions, marketplaces, plugins, files)
  /mcp             # MCP server implementation (server, transport, types)
  /views           # HTMX templates (configs, extensions, marketplaces, plugin browser)
  index.ts         # Entry point
/migrations        # D1 migrations
/seeds             # Seed data
```

## API Endpoints

### Configs

- `GET /api/configs` - List all configs
- `GET /api/configs/:id` - Get specific config
- `GET /api/configs/:id/format/:format` - Get config in specific format
  (claude_code, codex, gemini)
- `POST /api/configs` - Create new config
- `PUT /api/configs/:id` - Update config
- `DELETE /api/configs/:id` - Delete config
- `POST /api/configs/:id/invalidate` - Invalidate cached conversions for a
  config

### Extensions

- `GET /api/extensions` - List all extensions
- `GET /api/extensions/:id` - Get specific extension with configs
- `GET /api/extensions/:id/manifest/:format` - Get extension manifest (gemini or
  claude_code format)
- `POST /api/extensions` - Create new extension
- `PUT /api/extensions/:id` - Update extension
- `DELETE /api/extensions/:id` - Delete extension
- `GET /api/extensions/:id/configs` - Get configs for an extension
- `POST /api/extensions/:id/configs` - Add configs to extension (batch)
- `POST /api/extensions/:id/configs/:configId` - Add single config to extension
- `DELETE /api/extensions/:id/configs/:configId` - Remove config from extension
- `POST /api/extensions/:id/invalidate` - Invalidate extension cache

### Marketplaces

- `GET /api/marketplaces` - List all marketplaces
- `GET /api/marketplaces/:id` - Get specific marketplace with extensions
- `GET /api/marketplaces/:id/manifest` - Get marketplace manifest (Claude Code
  format)
- `POST /api/marketplaces` - Create new marketplace
- `PUT /api/marketplaces/:id` - Update marketplace
- `DELETE /api/marketplaces/:id` - Delete marketplace
- `POST /api/marketplaces/:id/extensions` - Add extensions to marketplace
  (batch)
- `POST /api/marketplaces/:id/extensions/:extensionId` - Add single extension to
  marketplace
- `DELETE /api/marketplaces/:id/extensions/:extensionId` - Remove extension from
  marketplace
- `POST /api/marketplaces/:id/invalidate` - Invalidate marketplace cache

### Plugin Downloads

- `GET /plugins/:extensionId/:format` - Browse plugin files (format: claude_code
  or gemini)
- `GET /plugins/:extensionId/:format/download` - Download complete plugin as ZIP
- `GET /plugins/:extensionId/gemini/definition` - Download Gemini JSON
  definition file (recommended for Gemini)
- `GET /plugins/:extensionId/:format/*` - Serve individual plugin file
- `POST /plugins/:extensionId/:format/invalidate` - Invalidate/regenerate plugin
  files
- `GET /plugins/marketplaces/:marketplaceId/gemini/definition` - Download
  marketplace Gemini JSON collection
- `GET /plugins/marketplaces/:marketplaceId/download?format=` - Download all
  marketplace plugins as ZIP (format: claude_code or gemini)

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

## MCP Server

The Agent Config Adapter includes a full Model Context Protocol (MCP) server
implementation, allowing AI agents to interact with configurations
programmatically. The MCP server provides a standardized interface for reading,
writing, and converting agent configurations.

### MCP Endpoints

- `POST /mcp` - MCP JSON-RPC endpoint (Streamable HTTP transport)
- `GET /mcp/info` - Server information and capabilities (HTML/JSON)

### MCP Capabilities

The MCP server exposes three types of capabilities:

#### 1. Tools (Write Operations)

Tools perform operations with side effects:

- **create_config** - Create a new agent configuration
  - Arguments: `name`, `type` (slash_command|mcp_config|agent_definition),
    `original_format` (claude_code|codex|gemini), `content`
  - Returns: Created config with ID

- **update_config** - Update an existing configuration
  - Arguments: `configId`, optional: `name`, `type`, `original_format`,
    `content`
  - Returns: Updated config or error if not found

- **delete_config** - Delete a configuration
  - Arguments: `configId`
  - Returns: Success status

- **get_config** - Get a single configuration by ID
  - Arguments: `configId`
  - Returns: Config object or error if not found

- **convert_config** - Convert config to a different format (on-demand, with
  caching)
  - Arguments: `configId`, `targetFormat` (claude_code|codex|gemini)
  - Returns: Converted content with metadata (cached, usedAI, fallbackUsed)
  - Note: This is the operation that triggers conversion and caching

- **invalidate_cache** - Invalidate all cached conversions for a config
  - Arguments: `configId`
  - Returns: Success status

#### 2. Resources (Read Operations)

Resources provide context to AI agents (pure reads, no processing):

- **config://list** - List all agent configurations
  - Returns: Array of all configs with metadata
  - MimeType: application/json

#### 3. Prompts (Workflow Automation)

Prompts provide guided workflows for complex multi-step operations:

- **migrate_config_format** - Migrate a configuration from one agent format to
  another
  - Arguments: `sourceConfigId`, `targetFormat` (claude_code|codex|gemini),
    optional: `newName`
  - Workflow: Reads source config, converts to target format, creates new config
  - Returns: Step-by-step instructions for the AI agent to follow

- **batch_convert** - Bulk convert multiple configs to a specific format
  - Arguments: `targetFormat` (claude_code|codex|gemini), optional:
    `configTypes` (comma-separated)
  - Workflow: Lists all configs, filters by type, converts each to target format
  - Returns: Batch conversion instructions with summary reporting
  - Note: Skips agent_definition types (not convertible)

- **sync_config_versions** - Synchronize cached format conversions for a config
  - Arguments: `configId`
  - Workflow: Reads config, invalidates cache, regenerates all format
    conversions
  - Returns: Sync workflow instructions with status reporting

### Connecting MCP Clients

Add the following configuration to your MCP client:

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

For production deployments, replace `localhost:8787` with your deployed Worker
URL.

### MCP Client Examples

#### Using Claude Code

Claude Code can connect to the MCP server automatically if configured in your
MCP settings. Once connected, Claude can:

- Create new configurations: "Create a new slash command called 'code-review'
  that reviews code quality"
- Convert formats: "Convert config abc123 to Codex format"
- Batch operations: "Convert all slash_command configs to Gemini format"
- Migrate configs: "Migrate my Claude Code config xyz789 to Codex format and
  save it as a new config"

#### Using Python MCP SDK

```python
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

async with stdio_client(StdioServerParameters(
    command="curl",
    args=["-X", "POST", "http://localhost:8787/mcp"]
)) as (read, write):
    async with ClientSession(read, write) as session:
        # List all resources
        resources = await session.list_resources()

        # Call a tool
        result = await session.call_tool("create_config", {
            "name": "my-command",
            "type": "slash_command",
            "original_format": "claude_code",
            "content": "---\nname: my-command\n---\n\nDo something"
        })
```

### MCP Architecture

The MCP implementation uses a services layer to share business logic between
REST and MCP interfaces:

- **ConfigService** - Handles CRUD operations for configurations
- **ConversionService** - Handles format conversion with caching and metadata
- **MCP Server** - Exposes tools, resources, and prompts via MCP protocol
- **Transport Layer** - Streamable HTTP transport for Cloudflare Workers
  compatibility

The transport layer uses `fetch-to-node` to bridge between Cloudflare Workers'
Web Fetch API and the Node.js HTTP interfaces required by the MCP SDK.

## Extension Marketplace

The extension marketplace feature allows you to bundle configurations into
distributable extensions and organize them into marketplaces. Extensions can be
downloaded as complete plugins for different agent platforms.

### Creating Extensions

Extensions group related configurations (slash commands, MCP configs, agent
definitions) into a single distributable package:

1. Navigate to `/extensions/new` in the web UI
2. Provide extension metadata (name, description, author, version)
3. Select configurations to include
4. Create the extension

Extensions can be viewed at `/extensions/:id` and edited at
`/extensions/:id/edit`.

### Creating Marketplaces

Marketplaces are collections of extensions that can be distributed together:

1. Navigate to `/marketplaces/new` in the web UI
2. Provide marketplace metadata (name, description, owner, version)
3. Select extensions to include
4. Create the marketplace

Marketplaces can be viewed at `/marketplaces/:id` and edited at
`/marketplaces/:id/edit`.

### Plugin Downloads

Extensions can be downloaded in format-specific ways:

#### Claude Code Format

- **Full ZIP Plugin**: Complete plugin with manifest, commands, agents, and MCP
  configs
  - Browse files: `/plugins/:extensionId/claude_code`
  - Download ZIP: `/plugins/:extensionId/claude_code/download`
  - Installation: Add to Claude Code via marketplace URL or manual ZIP install

#### Gemini Format

- **JSON Definition (Recommended)**: Single JSON file with extension manifest
  - Download: `/plugins/:extensionId/gemini/definition`
  - Installation: Use Gemini CLI to install the JSON definition
- **Full ZIP (Advanced)**: Complete plugin structure
  - Browse files: `/plugins/:extensionId/gemini`
  - Download ZIP: `/plugins/:extensionId/gemini/download`

#### Marketplace Downloads

- **Claude Code**: Marketplace URL for settings.json or ZIP with all plugins
  - Manifest: `/marketplaces/:id/manifest`
  - Download all: `/plugins/marketplaces/:id/download?format=claude_code`
  - ZIP structure: Includes `marketplace.json` at root with plugin directories
- **Gemini**: JSON collection with all extension definitions
  - Download: `/plugins/marketplaces/:marketplaceId/gemini/definition`

### Format-Specific Recommendations

The UI provides clear guidance on recommended download methods:

- **Claude Code**: Full ZIP downloads are primary, with browsable file structure
- **Gemini**: JSON definition downloads are primary (recommended), with ZIP as
  advanced option
- Visual indicators (🔵 Claude Code, 🔶 Gemini) help users identify
  format-specific options

### Installation Examples

**Claude Code Marketplace:**

```json
{
  "extensionMarketplaces": [
    {
      "url": "https://your-worker.workers.dev/marketplaces/{id}/manifest"
    }
  ]
}
```

**Gemini JSON Definition:**

```bash
# Install single extension
gemini install extension-name-gemini.json

# Install marketplace collection
gemini install marketplace-name-gemini-marketplace.json
```

## Web UI Features

The web interface provides a user-friendly way to manage configurations:

- **List View** (`/configs`): Browse all configurations with type and format
  badges
- **Detail View** (`/configs/:id`): View configuration details and convert to
  different formats
- **Create Form** (`/configs/new`): Add new configurations through a web form
- **Edit Form** (`/configs/:id/edit`): Update existing configurations
- **Conversion Buttons**: One-click conversion to Claude Code, Codex, or Gemini
  formats
- **Cache Refresh**: "Refresh Conversions" button to invalidate cached
  conversions and force re-processing
- **AI Status**: Visual indicators showing whether AI or fallback conversion was
  used
- **Delete Confirmation**: Safe deletion with confirmation prompt
- **Extension Management** (`/extensions`): Create, edit, and manage extensions
- **Marketplace Management** (`/marketplaces`): Create, edit, and manage
  marketplaces
- **Plugin Browser**: Browse and download plugin files with format-specific
  options

All UI interactions use HTMX for seamless updates without full page reloads.

## Configuration Types

- **slash_command**: Slash commands for AI agents (fully implemented with
  AI-enhanced conversion)
- **agent_definition**: Agent configuration definitions (passthrough only - MVP)
- **mcp_config**: Model Context Protocol configurations (fully implemented with
  rule-based conversion)

## Supported Formats

- **claude_code**: Claude Code format (markdown with YAML frontmatter)
- **codex**: Codex AGENTS.md format
- **gemini**: Gemini format (TOML-based slash commands)

## Format Conversion Examples

### Slash Command Conversion

Slash command conversions are powered by AI (OpenAI GPT-5-mini via Cloudflare AI
Gateway) with automatic fallback to rule-based conversion if needed.

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

MCP config conversions use rule-based conversion (no AI) to ensure accurate
transformation of structured data between JSON and TOML formats.

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

# Run tests with coverage
npm test -- --run --coverage

# Run tests in watch mode
npm run test:watch

# Lint code
npm run lint

# Apply migrations
npm run d1:migrations:apply
```

### Continuous Integration

The project uses GitHub Actions for automated testing and coverage reporting:

- **Test Coverage Workflow**: Runs automatically on all branch pushes and pull
  requests
  - Executes full test suite with coverage metrics
  - Posts detailed coverage reports as PR comments (statements, branches,
    functions, lines)
  - Uploads coverage artifacts (HTML reports, JSON summaries) for 30-day
    retention
  - Automatically updates README coverage badge on main branch commits
  - Skips execution on commits containing `[skip ci]` to prevent infinite loops

- **Coverage Badge**: Located at the top of this README, automatically updated
  by the workflow
  - Shows overall statement coverage percentage
  - Color-coded: green (80%+), yellow (60-79%), orange (40-59%), red (<40%)
  - Links to the GitHub Actions workflow for detailed reports

- **Viewing Coverage Reports**:
  - PR comments: Check the pull request conversation tab for coverage summaries
  - Artifacts: Navigate to Actions tab → Workflow run → Artifacts section
  - Download `coverage-report` artifact for complete HTML coverage report

- **Coverage Configuration**: Configured in `vitest.config.ts` with v8 provider
  - Excludes: test files, entry points, download routes, AI Gateway, file
    generation services

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

3. Create R2 bucket for plugin files:
   ```bash
   npx wrangler r2 bucket create extension-files
   ```

4. Update [wrangler.jsonc](wrangler.jsonc) with production IDs

5. Set OpenAI API key secret:
   ```bash
   npx wrangler secret put OPENAI_API_KEY
   ```

6. Update `ACCOUNT_ID` and `GATEWAY_ID` in [wrangler.jsonc](wrangler.jsonc) vars
   section

7. Apply migrations to production:
   ```bash
   npx wrangler d1 migrations apply agent-config-adapter --remote
   ```

## Tech Stack

- **Backend**: Hono (lightweight web framework)
- **Platform**: Cloudflare Workers
- **Database**: Cloudflare D1 (SQLite)
- **Cache**: Cloudflare KV
- **Storage**: Cloudflare R2 (for plugin files)
- **AI**: OpenAI GPT-5-mini via Cloudflare AI Gateway
- **MCP**: @modelcontextprotocol/sdk (Model Context Protocol server)
- **Transport Bridge**: fetch-to-node (Web Fetch to Node.js HTTP adapter)
- **Frontend**: HTMX with server-side rendering
- **Language**: TypeScript
- **TOML Parser**: smol-toml (Cloudflare Workers compatible)
- **ZIP Generation**: fflate (Cloudflare Workers compatible)

## Architecture

The project follows domain-driven design principles with a services layer for
shared business logic:

- **Domain Layer**: Core business logic and types (no infrastructure
  dependencies)
- **Infrastructure Layer**: Database (D1), cache (KV), storage (R2), and AI
  conversion service implementations
- **Services Layer**: Business logic orchestration
  - ConfigService: Configuration CRUD operations
  - ConversionService: Format conversion with caching
  - ExtensionService: Extension management and bundling
  - MarketplaceService: Marketplace management and manifest generation
  - ManifestService: Generate platform-specific manifests (Claude Code, Gemini)
  - FileGenerationService: Generate plugin files and store in R2
  - ZipGenerationService: Create ZIP archives for plugin downloads
  - Used by both REST API routes and MCP server tools
  - Provides consistent behavior across different interfaces
- **Adapter Layer**: Format conversion logic with AI enhancement (extensible for
  new formats)
- **Routes Layer**: REST HTTP request handlers (Hono) for configs, extensions,
  marketplaces, and plugins
- **MCP Layer**: Model Context Protocol server with tools, resources, and
  prompts
- **Views Layer**: HTML template generation (HTMX) for configs, extensions,
  marketplaces, and plugin browser

### AI-Powered Conversion

The system uses different strategies based on configuration type:

#### Slash Commands (AI-Enhanced)

1. **Primary**: AI-powered conversion using OpenAI GPT-5-mini via Cloudflare AI
   Gateway
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
- Handles field mapping between formats (type field, httpUrl vs url,
  startup_timeout_ms)
- Supports both stdio and HTTP/SSE server types

The UI displays which conversion method was used, providing transparency while
maintaining reliability.

## Extensibility

Adding a new agent format is straightforward:

1. Add the format to [src/domain/types.ts](src/domain/types.ts)
2. Create a new adapter in [src/adapters/](src/adapters/)
3. Update the factory in [src/adapters/index.ts](src/adapters/index.ts)

## Current Limitations (MVP)

- Agent definitions use passthrough adapter (no format conversion yet)
- No authentication/authorization (both REST and MCP)
- No search or filter functionality in UI
- Batch operations available via MCP prompts only (not in UI yet)
- Extension and marketplace features do not yet have MCP tool integration

## Next Steps

- [ ] Implement agent definition adapters
- [ ] Add authentication (both REST and MCP)
- [ ] API documentation (OpenAPI/Swagger for REST API)
- [ ] Export/import functionality
- [ ] Version history for configs
- [x] Upgrade to GPT-5 via Cloudflare AI Gateway (completed)
- [x] MCP server implementation with tools, resources, and prompts (completed)
- [x] Services layer for shared business logic (completed)
- [x] Extension marketplace feature with bundling and downloads (completed)
- [x] Plugin file generation and storage in R2 (completed)
- [x] Format-specific download options (ZIP for Claude Code, JSON for Gemini)
      (completed)
- [x] Plugin browser with browsable file structure (completed)
- [ ] Add unit tests for AI conversion service
- [ ] Support for HTTP/SSE MCP servers in UI
- [ ] Search and filter functionality in UI
- [ ] MCP client examples and integration tests
- [ ] MCP tools for extension and marketplace management

## Contributing

See [AGENTS.md](AGENTS.md) for development guidelines and architecture details.

## License

ISC
