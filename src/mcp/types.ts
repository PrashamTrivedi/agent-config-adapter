import { AgentFormat, ConfigType } from '../domain/types';

/**
 * MCP Server Environment (bindings)
 */
export interface MCPContext {
  DB: D1Database;
  CONFIG_CACHE: KVNamespace;
  // OpenAI API key for AI-powered format conversion (used by convert_config tool)
  // Falls back to rule-based conversion if not provided
  // See: src/infrastructure/ai-converter.ts
  OPENAI_API_KEY?: string;
  ACCOUNT_ID: string;
  GATEWAY_ID: string;
  AI_GATEWAY_TOKEN?: string;
  // SHA-256 hash of admin token for /mcp/admin endpoint
  // Temporary security measure until full user auth is implemented
  MCP_ADMIN_TOKEN_HASH?: string;
}

/**
 * Input schema for MCP tools
 */
export interface CreateConfigToolInput {
  name: string;
  type: ConfigType;
  original_format: AgentFormat;
  content: string;
}

export interface UpdateConfigToolInput {
  configId: string;
  name?: string;
  type?: ConfigType;
  original_format?: AgentFormat;
  content?: string;
}

export interface DeleteConfigToolInput {
  configId: string;
}

export interface ConvertConfigToolInput {
  configId: string;
  targetFormat: AgentFormat;
}

export interface InvalidateCacheToolInput {
  configId: string;
}

/**
 * Prompt arguments
 */
export interface MigrateConfigPromptArgs {
  sourceConfigId: string;
  targetFormat: AgentFormat;
  newName?: string;
}

export interface BatchConvertPromptArgs {
  targetFormat: AgentFormat;
  configTypes?: ConfigType[];
}

export interface SyncConfigVersionsPromptArgs {
  configId: string;
}
