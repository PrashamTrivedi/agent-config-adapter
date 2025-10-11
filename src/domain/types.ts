// Domain types for agent configurations

export type ConfigType = 'slash_command' | 'agent_definition' | 'mcp_config';
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

// MCP Configuration types
export interface MCPServerConfig {
  type?: 'stdio' | 'http';  // Claude Code only
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  httpUrl?: string;  // Gemini remote servers
  startup_timeout_ms?: number;  // Codex only
}

export interface MCPConfig {
  mcpServers: Record<string, MCPServerConfig>;
}
