/**
 * CLI-specific types
 * Re-exports domain types and defines CLI-only interfaces
 */

// Re-export domain types used by CLI
export type ConfigType = 'slash_command' | 'agent_definition' | 'mcp_config' | 'skill';

export interface LocalConfigInput {
  name: string;
  type: ConfigType;
  content: string;
  companionFiles?: CompanionFile[];
}

export interface CompanionFile {
  path: string;
  content: string;
  mimeType?: string;
}

export interface SyncResultItem {
  name: string;
  type: ConfigType;
  id: string;
}

export interface SyncResponse {
  success: boolean;
  summary: {
    created: number;
    updated: number;
    unchanged: number;
    deletionCandidates: number;
  };
  details: {
    created: SyncResultItem[];
    updated: SyncResultItem[];
    unchanged: Array<{ name: string; type: ConfigType }>;
    deletionCandidates: SyncResultItem[];
  };
}

export interface DeleteResponse {
  success: boolean;
  deleted: string[];
  failed: string[];
}

export interface CLIConfig {
  server_url: string;
  api_key: string;
  last_sync?: string;
}

export interface SyncFlags {
  global: boolean;
  project: boolean;
  dryRun: boolean;
  types?: ConfigType[];
  server?: string;
  verbose: boolean;
  delete: boolean;
}
