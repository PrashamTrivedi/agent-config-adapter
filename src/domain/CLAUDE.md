# Domain

Core types and business rules.

## Config Types

- `slash_command`: Slash commands (fully implemented with AI-enhanced conversion)
- `agent_definition`: Agent configs (passthrough only - MVP)
- `mcp_config`: MCP configurations (fully implemented with rule-based conversion)
- `skill`: Multi-file skills with SKILL.md and companion files

## Agent Formats

- `claude_code`: Default input format
- `codex`: AGENTS.md style
- `gemini`: TOML-based

## Business Rules

- Agent definitions are NOT available in Codex and Claude Code formats
- All conversions must preserve semantic meaning
- Original format is stored, conversions are on-demand
- Config names must be provided, generated for Gemini from description

## Additional Types

### Email Subscriptions

`SubscriptionRecord` - Email subscription for upload access:
- `email`: Normalized email address (lowercase, trimmed)
- `projectName`: Always 'agentConfig'
- `subscribedAt`: ISO datetime string
- `ipAddress`: Optional client IP (from CF-Connecting-IP header)

Stored in EMAIL_SUBSCRIPTIONS KV namespace for fast verification.
