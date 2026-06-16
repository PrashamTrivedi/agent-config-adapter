-- Migration: Add 'workflow' to the config type enum + workflow metadata columns
-- Purpose: Support Claude Code Workflows as a first-class, Claude-Code-only config type.
--
-- SQLite cannot ALTER a CHECK constraint, so we recreate the configs table
-- (same production-safe pattern as 0005_add_skill_config_type.sql). To stay
-- correct across the columns added by 0007 (slash-command metadata) and 0009
-- (user_id ownership), we list every column EXPLICITLY in the INSERT ... SELECT
-- rather than relying on positional `SELECT *`.
--
-- Workflow metadata columns (all nullable / defaulted, so existing rows are
-- unaffected): extracted from the workflow's `export const meta = {...}` block.
-- Forward-only (D1 migrations are not auto-reversed); data is preserved by copy.

PRAGMA foreign_keys = OFF;

-- Recreate configs with 'workflow' added to the type CHECK and the new columns.
CREATE TABLE configs_new (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('slash_command', 'agent_definition', 'mcp_config', 'skill', 'workflow')),
  original_format TEXT NOT NULL CHECK(original_format IN ('claude_code', 'codex', 'gemini')),
  content TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  -- 0007: slash-command analysis metadata
  has_arguments INTEGER DEFAULT 0,
  argument_hint TEXT,
  agent_references TEXT,
  skill_references TEXT,
  analysis_version TEXT DEFAULT '1.0',
  -- 0009: ownership
  user_id TEXT REFERENCES "user"(id) ON DELETE SET NULL,
  -- 0011: workflow metadata
  workflow_description TEXT,
  workflow_phases TEXT,            -- JSON array of {title, detail}
  workflow_when_to_use TEXT,
  metadata_unreadable INTEGER DEFAULT 0  -- 0=meta parsed ok, 1=meta unreadable
);

-- Copy existing data (explicit columns; new workflow columns take their defaults).
INSERT INTO configs_new (
  id, name, type, original_format, content, created_at, updated_at,
  has_arguments, argument_hint, agent_references, skill_references, analysis_version,
  user_id
)
SELECT
  id, name, type, original_format, content, created_at, updated_at,
  has_arguments, argument_hint, agent_references, skill_references, analysis_version,
  user_id
FROM configs;

DROP TABLE configs;
ALTER TABLE configs_new RENAME TO configs;

-- Recreate all existing indexes.
CREATE INDEX idx_configs_type ON configs(type);
CREATE INDEX idx_configs_format ON configs(original_format);
CREATE INDEX idx_configs_created_at ON configs(created_at DESC);
CREATE INDEX idx_configs_has_arguments ON configs(has_arguments) WHERE type = 'slash_command';
CREATE INDEX IF NOT EXISTS idx_configs_user_id ON configs(user_id);

PRAGMA foreign_keys = ON;
