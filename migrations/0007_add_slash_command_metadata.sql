-- Migration: Add metadata columns for slash command analysis
-- Purpose: Store pre-computed analysis results for slash commands to enable:
--   1. Fast conversion (no AI analysis during conversion)
--   2. Dynamic UI (show/hide controls based on metadata)
--   3. Proactive architecture (analyze once on create/update)

-- Add metadata columns for slash command analysis
ALTER TABLE configs ADD COLUMN has_arguments INTEGER DEFAULT 0;  -- 0=false, 1=true
ALTER TABLE configs ADD COLUMN argument_hint TEXT;               -- Hint for user input
ALTER TABLE configs ADD COLUMN agent_references TEXT;            -- JSON array: ["triage", "web-search-specialist"]
ALTER TABLE configs ADD COLUMN skill_references TEXT;            -- JSON array: ["conventional-commit"]
ALTER TABLE configs ADD COLUMN analysis_version TEXT DEFAULT '1.0';  -- For cache invalidation

-- Index for filtering commands that need arguments
CREATE INDEX idx_configs_has_arguments ON configs(has_arguments) WHERE type = 'slash_command';
