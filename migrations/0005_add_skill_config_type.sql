-- Add 'skill' to config type enum
-- SQLite doesn't have ALTER TYPE, so we use a check constraint update

-- Temporarily disable foreign key constraints
PRAGMA foreign_keys = OFF;

-- Create new table with updated constraint
CREATE TABLE configs_new (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('slash_command', 'agent_definition', 'mcp_config', 'skill')),
  original_format TEXT NOT NULL CHECK(original_format IN ('claude_code', 'codex', 'gemini')),
  content TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Copy data from old table
INSERT INTO configs_new SELECT * FROM configs;

-- Drop old table
DROP TABLE configs;

-- Rename new table
ALTER TABLE configs_new RENAME TO configs;

-- Recreate indexes
CREATE INDEX idx_configs_type ON configs(type);
CREATE INDEX idx_configs_format ON configs(original_format);
CREATE INDEX idx_configs_created_at ON configs(created_at DESC);

-- Re-enable foreign key constraints
PRAGMA foreign_keys = ON;
