-- Replace Jules format with Gemini format
-- Update any existing Jules configs to Gemini
UPDATE configs SET original_format = 'gemini' WHERE original_format = 'jules';

-- SQLite doesn't support modifying CHECK constraints directly
-- So we need to recreate the table with the updated constraint
-- First, create a temporary table with the new schema
CREATE TABLE configs_new (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('slash_command', 'agent_definition', 'mcp_config')),
  original_format TEXT NOT NULL CHECK(original_format IN ('claude_code', 'codex', 'gemini')),
  content TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Copy all data from old table to new table
INSERT INTO configs_new SELECT * FROM configs;

-- Drop the old table
DROP TABLE configs;

-- Rename the new table to the original name
ALTER TABLE configs_new RENAME TO configs;

-- Recreate indexes
CREATE INDEX idx_configs_type ON configs(type);
CREATE INDEX idx_configs_format ON configs(original_format);
CREATE INDEX idx_configs_created_at ON configs(created_at DESC);
