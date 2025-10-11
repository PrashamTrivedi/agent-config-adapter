-- Example slash command in Claude Code format
INSERT INTO configs (id, name, type, original_format, content, created_at, updated_at) VALUES
(
  'example-1',
  'code-review',
  'slash_command',
  'claude_code',
  '---
name: code-review
description: Review code for quality and security issues
---

Review the current code for:
1. Code quality issues
2. Security vulnerabilities
3. Best practices violations
4. Performance concerns

Provide specific recommendations for improvements.',
  datetime('now'),
  datetime('now')
);

-- Example in Codex format
INSERT INTO configs (id, name, type, original_format, content, created_at, updated_at) VALUES
(
  'example-2',
  'api-design',
  'slash_command',
  'codex',
  '# api-design

Design a RESTful API following best practices

## Prompt

Design a RESTful API with the following considerations:
- Proper HTTP methods (GET, POST, PUT, DELETE)
- Resource naming conventions
- Status code usage
- Authentication and authorization
- Rate limiting
- Versioning strategy',
  datetime('now'),
  datetime('now')
);

-- Example in Gemini format
INSERT INTO configs (id, name, type, original_format, content, created_at, updated_at) VALUES
(
  'example-3',
  'test-generator',
  'slash_command',
  'gemini',
  'description = "Generate comprehensive unit tests for the code"
prompt = """
Generate unit tests for the provided code with:
- Test coverage for all major functions
- Edge cases and error scenarios
- Clear test descriptions
- Mock external dependencies where needed
"""',
  datetime('now'),
  datetime('now')
);

-- Example MCP config in Claude Code format (JSON with type)
INSERT INTO configs (id, name, type, original_format, content, created_at, updated_at) VALUES
(
  'example-mcp-claude',
  'filesystem-mcp-claude',
  'mcp_config',
  'claude_code',
  '{"mcpServers":{"filesystem":{"type":"stdio","command":"npx","args":["-y","@modelcontextprotocol/server-filesystem","/home/user/projects"],"env":{"READ_ONLY":"true"}}}}',
  datetime('now'),
  datetime('now')
);

-- Example MCP config in Gemini format (JSON without type)
INSERT INTO configs (id, name, type, original_format, content, created_at, updated_at) VALUES
(
  'example-mcp-gemini',
  'github-mcp-gemini',
  'mcp_config',
  'gemini',
  '{"mcpServers":{"github":{"command":"npx","args":["-y","@modelcontextprotocol/server-github"],"env":{"GITHUB_TOKEN":"ghp_xxxxxxxxxxxx"}}}}',
  datetime('now'),
  datetime('now')
);

-- Example MCP config in Codex format (TOML)
INSERT INTO configs (id, name, type, original_format, content, created_at, updated_at) VALUES
(
  'example-mcp-codex',
  'postgres-mcp-codex',
  'mcp_config',
  'codex',
  '[mcp_servers.postgres]
command = "npx"
args = ["-y", "@modelcontextprotocol/server-postgres"]
startup_timeout_ms = 30000

[mcp_servers.postgres.env]
DATABASE_URL = "postgresql://user:pass@localhost:5432/mydb"',
  datetime('now'),
  datetime('now')
);
