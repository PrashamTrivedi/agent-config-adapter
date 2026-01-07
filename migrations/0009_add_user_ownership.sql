-- Migration: Add user ownership columns to existing tables
-- Purpose: Enable per-user resource ownership for configs, extensions, marketplaces

-- Add user_id to configs
ALTER TABLE configs ADD COLUMN user_id TEXT REFERENCES "user"(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_configs_user_id ON configs(user_id);

-- Add user_id to extensions
ALTER TABLE extensions ADD COLUMN user_id TEXT REFERENCES "user"(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_extensions_user_id ON extensions(user_id);

-- Add user_id to marketplaces
ALTER TABLE marketplaces ADD COLUMN user_id TEXT REFERENCES "user"(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_marketplaces_user_id ON marketplaces(user_id);
