# Domain

Core types and business rules.

## Config Types

- `slash_command`: Slash commands (fully implemented with conversion)
- `agent_definition`: Agent configs (passthrough only - MVP)
- `mcp_config`: MCP configurations (passthrough only - MVP)

## Agent Formats

- `claude_code`: Default input format
- `codex`: AGENTS.md style
- `gemini`: TOML-based

## Business Rules

- Agent definitions are NOT available in Codex and Claude Code formats
- All conversions must preserve semantic meaning
- Original format is stored, conversions are on-demand
- Config names must be provided, generated for Gemini from description
