# Format Adapters

Format-specific parsing and conversion logic. NO business logic or infrastructure dependencies.

## Conversion Strategy

- **AI-first with fallback**: Tries AI conversion first, falls back to rule-based
- **MCP configs skip AI**: Rule-based only for accurate structured data
- All conversions preserve semantic meaning
- Return metadata: `{content, usedAI, fallbackUsed}`

## Implemented Adapters

- **SlashCommandAdapter**: Slash commands (AI-enhanced)
- **MCPConfigAdapter**: MCP configs (rule-based only)
- **PassthroughAdapter**: Agent definitions and skills (MVP)

## Format Specifications

### Slash Commands

**Claude Code**: Markdown with YAML frontmatter
```markdown
---
name: command-name
description: Brief description
---
Prompt content
```

**Codex**: AGENTS.md style
```markdown
# command-name
Brief description

## Prompt
Prompt content
```

**Gemini**: TOML format
```toml
description = "Brief description"
prompt = """
Prompt content
"""
args = []  # optional
```

## Parser Rules

- **Claude Code**: Parse frontmatter between `---` markers, prompt is everything after
- **Codex**: `# name`, first non-header line is description, content after `## Prompt` is prompt
- **Gemini**: TOML with triple-quoted strings for multi-line prompts, no name field (derive from description)

### MCP Configurations

**Claude Code**: JSON with type field
```json
{
  "mcpServers": {
    "server-name": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "package"],
      "env": { "KEY": "value" }
    }
  }
}
```

**Gemini**: JSON without type field (uses httpUrl for remote servers)
```json
{
  "mcpServers": {
    "server-name": {
      "command": "npx",
      "args": ["-y", "package"],
      "env": { "KEY": "value" }
    }
  }
}
```

**Codex**: TOML with startup_timeout_ms
```toml
[mcp_servers.server-name]
command = "npx"
args = ["-y", "package"]
startup_timeout_ms = 20000

[mcp_servers.server-name.env]
KEY = "value"
```

## MCP Config Field Mapping

- **type field**: Claude Code only (stdio or http)
- **httpUrl vs url**: Gemini uses httpUrl, Claude/Codex use url
- **startup_timeout_ms**: Codex only (default 20000)
- **Server types**: stdio (command/args) or HTTP/SSE (url/httpUrl)

## Adding New Formats

1. Add format to `AgentFormat` type in domain
2. Implement parsing and conversion methods in adapter
3. Update factory in `index.ts`
4. Update AI format spec in `infrastructure/ai-converter.ts`
