export type ConfigType = 'slash_command' | 'agent_definition' | 'mcp_config' | 'skill' | 'workflow';
export type AgentFormat = 'claude_code' | 'codex' | 'gemini';

export interface User {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image?: string | null;
}

export interface SessionPayload {
  user: User;
  session: {
    id: string;
    expiresAt: string;
    token: string;
    userId: string;
  };
}

export interface Config {
  id: string;
  name: string;
  type: ConfigType;
  original_format: AgentFormat;
  content: string;
  created_at: string;
  updated_at: string;
  user_id?: string | null;
  owner_name?: string | null;
  has_arguments?: boolean;
  argument_hint?: string | null;
  agent_references?: string;
  skill_references?: string;
  workflow_description?: string | null;
  workflow_phases?: string;
  workflow_when_to_use?: string | null;
  metadata_unreadable?: boolean;
}

export interface SkillFile {
  id: string;
  skill_id: string;
  file_path: string;
  r2_key: string;
  file_size: number | null;
  mime_type: string | null;
  created_at: string;
}

export interface SkillWithFiles extends Config {
  type: 'skill';
  files: SkillFile[];
}

export interface Extension {
  id: string;
  name: string;
  description: string | null;
  author: string | null;
  version: string;
  icon_url: string | null;
  created_at: string;
  updated_at: string;
  user_id?: string | null;
  owner_name?: string | null;
}

export interface ExtensionWithConfigs extends Extension {
  configs: Config[];
}

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
  user_id?: string | null;
}

export interface MarketplaceWithExtensions extends Marketplace {
  extensions: ExtensionWithConfigs[];
}

export interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  created_at: string;
  last_used_at: string | null;
  expires_at: string | null;
  is_active: boolean;
}

export interface PluginFile {
  path: string;
  r2Key?: string;
  size: number | null;
  mimeType: string | null;
}

export interface McpInfo {
  name: string;
  version: string;
  description: string;
  transport: string;
  endpoint: string;
  access: string;
  capabilities: {
    tools: string[];
    resources: string[];
    prompts: string[];
  };
  usage: {
    connection: string;
    authentication: string;
    example_client_config: unknown;
  };
  documentation: {
    access_level: string;
    resources_behavior: string;
    tools_behavior: string;
  };
}
