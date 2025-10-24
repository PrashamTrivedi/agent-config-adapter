// Domain types for agent configurations

export type ConfigType = 'slash_command' | 'agent_definition' | 'mcp_config' | 'skill';
export type AgentFormat = 'claude_code' | 'codex' | 'gemini';

export interface Config {
  id: string;
  name: string;
  type: ConfigType;
  original_format: AgentFormat;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface CreateConfigInput {
  name: string;
  type: ConfigType;
  original_format: AgentFormat;
  content: string;
}

export interface UpdateConfigInput {
  name?: string;
  type?: ConfigType;
  original_format?: AgentFormat;
  content?: string;
}

// Parsed config structures for different formats
export interface ClaudeCodeSlashCommand {
  name: string;
  prompt: string;
  description?: string;
}

export interface CodexAgentDefinition {
  name: string;
  description: string;
  tools: string[];
  prompt?: string;
}

export interface GeminiSlashCommand {
  description: string;
  prompt: string;
  args?: string[];
}

// Skill types
export interface ClaudeSkillMetadata {
  name: string;
  description: string;
  license?: string;
  allowed_tools?: string[];  // Claude Code only
  metadata?: Record<string, any>;
}

export interface ClaudeSkill {
  metadata: ClaudeSkillMetadata;
  content: string;  // Markdown body after frontmatter
  references?: Record<string, string>;  // Additional files (FORMS.md, etc.)
}

export interface GeminiSkill {
  name: string;
  description: string;
  prompt: string;  // Combined content
}

export interface CodexSkill {
  name: string;
  description: string;
  instructions: string;  // Combined content
}

// MCP Configuration types
export interface MCPServerConfig {
  type?: 'stdio' | 'http' | 'sse';  // Claude Code, can be stdio, http, or sse
  command?: string;  // For stdio servers
  args?: string[];  // For stdio servers
  env?: Record<string, string>;
  url?: string;  // For http/sse servers (Claude Code and Codex use this)
  httpUrl?: string;  // Alternative field name (Gemini uses this)
  startup_timeout_ms?: number;  // Codex only
}

export interface MCPConfig {
  mcpServers: Record<string, MCPServerConfig>;
}

// Extension types (bundles of configs)
export interface Extension {
  id: string;
  name: string;
  description: string | null;
  author: string | null;
  version: string;
  icon_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExtensionWithConfigs extends Extension {
  configs: Config[];
}

export interface CreateExtensionInput {
  name: string;
  description?: string;
  author?: string;
  version: string;
  icon_url?: string;
  config_ids?: string[];
}

export interface UpdateExtensionInput {
  name?: string;
  description?: string;
  author?: string;
  version?: string;
  icon_url?: string;
}

// Marketplace types (collections of extensions)
export interface Marketplace {
  id: string;
  name: string;
  description: string | null;
  owner_name: string;
  owner_email: string | null;
  version: string;
  homepage: string | null;
  repository: string | null;
  created_at: string;
  updated_at: string;
}

export interface MarketplaceWithExtensions extends Marketplace {
  extensions: ExtensionWithConfigs[];
}

export interface CreateMarketplaceInput {
  name: string;
  description?: string;
  owner_name: string;
  owner_email?: string;
  version: string;
  homepage?: string;
  repository?: string;
  extension_ids?: string[];
}

export interface UpdateMarketplaceInput {
  name?: string;
  description?: string;
  owner_name?: string;
  owner_email?: string;
  version?: string;
  homepage?: string;
  repository?: string;
}

// Extension file types (for R2 storage)
export interface ExtensionFile {
  id: string;
  extension_id: string;
  file_path: string;
  r2_key: string;
  file_size: number | null;
  mime_type: string | null;
  created_at: string;
}

export interface CreateExtensionFileInput {
  extension_id: string;
  file_path: string;
  r2_key: string;
  file_size?: number;
  mime_type?: string;
}

// User selection types (cart workflow)
export interface UserSelection {
  id: string;
  session_id: string;
  config_ids: string;
  created_at: string;
  expires_at: string;
}

export interface CreateUserSelectionInput {
  session_id: string;
  config_ids: string[];
}

export interface UpdateUserSelectionInput {
  config_ids: string[];
}

// Manifest types for different formats
export interface GeminiExtensionManifest {
  name: string;
  version: string;
  mcpServers?: Record<string, MCPServerConfig>;
  contextFileName?: string;
  commands?: Record<string, string>;
  skills?: Record<string, string>;
}

export interface ClaudeCodePluginManifest {
  name: string;
  version: string;
  description?: string;
  author?: {
    name: string;
    email?: string;
  };
  commands?: string[];
  agents?: string[];
  skills?: string[];
  mcpServers?: Record<string, MCPServerConfig>;
  source?: string | {
    type: 'git' | 'local';
    url: string;
  };
}

export interface ClaudeCodeMarketplaceManifest {
  name: string;
  version: string;
  description?: string;
  owner: {
    name: string;
    email?: string;
  };
  homepage?: string;
  repository?: string;
  plugins: ClaudeCodePluginManifest[];
}
