-- Example extensions and marketplaces seed data

-- Extension 1: Development Tools
INSERT INTO extensions (id, name, description, author, version, icon_url, created_at, updated_at) VALUES
(
  'dev-tools-ext',
  'Development Tools',
  'Essential development commands for code review and API design',
  'Agent Config Team',
  '1.0.0',
  NULL,
  datetime('now'),
  datetime('now')
);

-- Link configs to Development Tools extension
INSERT INTO extension_configs (extension_id, config_id, sort_order) VALUES
('dev-tools-ext', 'example-1', 0),
('dev-tools-ext', 'example-2', 1);

-- Extension 2: Testing Suite
INSERT INTO extensions (id, name, description, author, version, icon_url, created_at, updated_at) VALUES
(
  'testing-suite-ext',
  'Testing Suite',
  'Comprehensive testing tools and generators',
  'Agent Config Team',
  '1.0.0',
  NULL,
  datetime('now'),
  datetime('now')
);

-- Link config to Testing Suite extension
INSERT INTO extension_configs (extension_id, config_id, sort_order) VALUES
('testing-suite-ext', 'example-3', 0);

-- Extension 3: MCP Servers Bundle
INSERT INTO extensions (id, name, description, author, version, icon_url, created_at, updated_at) VALUES
(
  'mcp-servers-ext',
  'MCP Servers Collection',
  'Curated collection of useful MCP servers for filesystem, GitHub, and PostgreSQL',
  'Agent Config Team',
  '1.0.0',
  NULL,
  datetime('now'),
  datetime('now')
);

-- Link MCP configs to MCP Servers extension
INSERT INTO extension_configs (extension_id, config_id, sort_order) VALUES
('mcp-servers-ext', 'example-mcp-claude', 0),
('mcp-servers-ext', 'example-mcp-gemini', 1),
('mcp-servers-ext', 'example-mcp-codex', 2);

-- Marketplace 1: Complete Developer Toolkit
INSERT INTO marketplaces (id, name, description, owner_name, owner_email, version, homepage, repository, created_at, updated_at) VALUES
(
  'dev-toolkit-market',
  'Complete Developer Toolkit',
  'A comprehensive marketplace of development tools, testing utilities, and MCP servers',
  'Agent Config Team',
  'team@agent-config.dev',
  '1.0.0',
  'https://agent-config-adapter.dev',
  'https://github.com/agent-config/marketplace',
  datetime('now'),
  datetime('now')
);

-- Link extensions to marketplace
INSERT INTO marketplace_extensions (marketplace_id, extension_id, sort_order) VALUES
('dev-toolkit-market', 'dev-tools-ext', 0),
('dev-toolkit-market', 'testing-suite-ext', 1),
('dev-toolkit-market', 'mcp-servers-ext', 2);
