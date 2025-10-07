export type ConfigType = 'slash_command' | 'agent_definition' | 'mcp_config';

export type ConfigFormat = 'claude_code' | 'codex_agents' | 'jules_manifest';

export interface AgentConfig {
  id: string;
  name: string;
  type: ConfigType;
  originalFormat: ConfigFormat;
  content: string;
  createdAt: string;
}

export interface ConfigCreateInput {
  name: string;
  type: ConfigType;
  originalFormat: ConfigFormat;
  content: string;
}

export interface ConfigUpdateInput {
  name?: string;
  type?: ConfigType;
  originalFormat?: ConfigFormat;
  content?: string;
}

export interface ConfigWithConversions extends AgentConfig {
  conversions: Record<ConfigFormat, string>;
}
