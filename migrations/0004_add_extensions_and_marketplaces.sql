-- Migration: Add extensions and marketplaces tables
-- Description: Creates three-tier marketplace system (Configs → Extensions → Marketplaces)

-- Extensions table (bundles of configs)
CREATE TABLE extensions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  author TEXT,
  version TEXT NOT NULL,
  icon_url TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Extension configs relationship (many-to-many junction table)
-- Links extensions to existing configs - NO config duplication
CREATE TABLE extension_configs (
  extension_id TEXT NOT NULL,
  config_id TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  PRIMARY KEY (extension_id, config_id),
  FOREIGN KEY (extension_id) REFERENCES extensions(id) ON DELETE CASCADE,
  FOREIGN KEY (config_id) REFERENCES configs(id) ON DELETE CASCADE
);

-- Extension files (for R2 storage tracking)
-- Stores metadata for additional files (README, icons, context files)
CREATE TABLE extension_files (
  id TEXT PRIMARY KEY,
  extension_id TEXT NOT NULL,
  file_path TEXT NOT NULL,
  r2_key TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (extension_id) REFERENCES extensions(id) ON DELETE CASCADE
);

-- User selections (for cart/selection workflow)
-- Stores temporary user selections for bundling
CREATE TABLE user_selections (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  config_ids TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);

-- Marketplaces table (collections of extensions)
CREATE TABLE marketplaces (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  owner_name TEXT NOT NULL,
  owner_email TEXT,
  version TEXT NOT NULL,
  homepage TEXT,
  repository TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Marketplace extensions relationship (many-to-many junction table)
-- Links marketplaces to existing extensions - NO extension duplication
CREATE TABLE marketplace_extensions (
  marketplace_id TEXT NOT NULL,
  extension_id TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  PRIMARY KEY (marketplace_id, extension_id),
  FOREIGN KEY (marketplace_id) REFERENCES marketplaces(id) ON DELETE CASCADE,
  FOREIGN KEY (extension_id) REFERENCES extensions(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX idx_extension_configs_extension_id ON extension_configs(extension_id);
CREATE INDEX idx_extension_configs_config_id ON extension_configs(config_id);
CREATE INDEX idx_extension_files_extension_id ON extension_files(extension_id);
CREATE INDEX idx_user_selections_session_id ON user_selections(session_id);
CREATE INDEX idx_user_selections_expires_at ON user_selections(expires_at);
CREATE INDEX idx_marketplace_extensions_marketplace_id ON marketplace_extensions(marketplace_id);
CREATE INDEX idx_marketplace_extensions_extension_id ON marketplace_extensions(extension_id);
