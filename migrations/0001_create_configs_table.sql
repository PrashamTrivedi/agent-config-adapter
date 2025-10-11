-- Create configs table
CREATE TABLE IF NOT EXISTS configs (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('slash_command', 'agent_definition', 'mcp_config')),
  original_format TEXT NOT NULL CHECK(original_format IN ('claude_code', 'codex', 'jules')),
  content TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster lookups
CREATE INDEX idx_configs_type ON configs(type);
CREATE INDEX idx_configs_format ON configs(original_format);
CREATE INDEX idx_configs_created_at ON configs(created_at DESC);
