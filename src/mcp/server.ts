import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { ConfigService, ConversionService, SyncService } from '../services';
import { MCPContext } from './types';
import { AgentFormat, ConfigType } from '../domain/types';

/**
 * Create and configure MCP server instance
 * This server exposes configs, conversion tools, and workflow prompts
 * via the Model Context Protocol
 *
 * @param env - MCP context with database and service dependencies
 * @param mode - Access mode: 'readonly' (public) or 'full' (admin with token)
 * @param userId - User ID for ownership tracking (required for full mode sync operations)
 *
 * Access modes:
 * - readonly: Only get_config tool + all resources (no prompts)
 * - full: All 8 tools + all resources + all 3 prompts (includes sync tools)
 *
 * Note: This is a temporary security measure until full user auth is implemented
 */
export function createMCPServer(
	env: MCPContext,
	mode: 'readonly' | 'full' = 'readonly',
	userId?: string
): McpServer {
  const server = new McpServer(
    {
      name: 'agent-config-adapter',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
        resources: {},
        prompts: {},
      },
    }
  );

  const configService = new ConfigService(env);
  const conversionService = new ConversionService(env);
  const syncService = new SyncService(env as MCPContext & { EXTENSION_FILES: R2Bucket });

  // ===== TOOLS =====

  // Tool: get_config (Read-only - available in both modes)
  server.tool(
    'get_config',
    'Get a single configuration by ID',
    {
      configId: z.string().describe('Config ID to retrieve')
    },
    async ({ configId }) => {
      try {
        const config = await configService.getConfig(configId);

        if (!config) {
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                success: false,
                error: `Config not found: ${configId}`
              }, null, 2)
            }],
            isError: true
          };
        }

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              config
            }, null, 2)
          }]
        };
      } catch (error: any) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error.message
            }, null, 2)
          }],
          isError: true
        };
      }
    }
  );

  // Write tools - only available in 'full' mode
  if (mode === 'full') {
    // Tool: create_config
    server.tool(
    'create_config',
    'Create a new agent configuration (slash command, MCP config, or agent definition)',
    {
      name: z.string().describe('Config name'),
      type: z.enum(['slash_command', 'mcp_config', 'agent_definition']).describe('Config type'),
      original_format: z.enum(['claude_code', 'codex', 'gemini']).describe('Original format'),
      content: z.string().describe('Config content')
    },
    async ({ name, type, original_format, content }) => {
      try {
        const config = await configService.createConfig({
          name,
          type: type as ConfigType,
          original_format: original_format as AgentFormat,
          content
        });

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              config,
              message: `Config "${config.name}" created successfully with ID: ${config.id}`
            }, null, 2)
          }]
        };
      } catch (error: any) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error.message
            }, null, 2)
          }],
          isError: true
        };
      }
      }
    );

    // Tool: update_config
    server.tool(
    'update_config',
    'Update an existing configuration',
    {
      configId: z.string().describe('Config ID to update'),
      name: z.string().optional().describe('New config name'),
      type: z.enum(['slash_command', 'mcp_config', 'agent_definition']).optional().describe('New config type'),
      original_format: z.enum(['claude_code', 'codex', 'gemini']).optional().describe('New format'),
      content: z.string().optional().describe('New content')
    },
    async ({ configId, name, type, original_format, content }) => {
      try {
        const updated = await configService.updateConfig(configId, {
          name,
          type: type as ConfigType | undefined,
          original_format: original_format as AgentFormat | undefined,
          content
        });

        if (!updated) {
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                success: false,
                error: `Config not found: ${configId}`
              }, null, 2)
            }],
            isError: true
          };
        }

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              config: updated,
              message: `Config "${updated.name}" updated successfully`
            }, null, 2)
          }]
        };
      } catch (error: any) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error.message
            }, null, 2)
          }],
          isError: true
        };
      }
      }
    );

    // Tool: delete_config
    server.tool(
    'delete_config',
    'Delete a configuration',
    {
      configId: z.string().describe('Config ID to delete')
    },
    async ({ configId }) => {
      try {
        const success = await configService.deleteConfig(configId);

        if (!success) {
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                success: false,
                error: `Config not found: ${configId}`
              }, null, 2)
            }],
            isError: true
          };
        }

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              message: `Config ${configId} deleted successfully`
            }, null, 2)
          }]
        };
      } catch (error: any) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error.message
            }, null, 2)
          }],
          isError: true
        };
      }
      }
    );

    // Tool: invalidate_cache
    server.tool(
    'invalidate_cache',
    'Invalidate all cached format conversions for a config',
    {
      configId: z.string().describe('Config ID')
    },
    async ({ configId }) => {
      try {
        await configService.invalidateCache(configId);

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              message: `Cache invalidated for config ${configId}`
            }, null, 2)
          }]
        };
      } catch (error: any) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error.message
            }, null, 2)
          }],
          isError: true
        };
      }
      }
    );

    // Tool: convert_config
    server.tool(
    'convert_config',
    'Convert a config to a different agent format (on-demand, with caching). This is the OPERATION that triggers conversion, unlike the resource which only reads cache.',
    {
      configId: z.string().describe('Config ID to convert'),
      targetFormat: z.enum(['claude_code', 'codex', 'gemini']).describe('Target format')
    },
    async ({ configId, targetFormat }) => {
      try {
        const result = await conversionService.convertWithMetadata(
          configId,
          targetFormat as AgentFormat
        );

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              content: result.content,
              metadata: {
                cached: result.cached,
                usedAI: result.usedAI,
                fallbackUsed: result.fallbackUsed
              },
              message: result.cached
                ? 'Returned cached conversion'
                : `Converted to ${targetFormat} format ${result.usedAI ? '(AI-enhanced)' : '(rule-based)'}`
            }, null, 2)
          }]
        };
      } catch (error: any) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error.message
            }, null, 2)
          }],
          isError: true
        };
      }
      }
    );

    // Tool: sync_local_configs
    server.tool(
      'sync_local_configs',
      'Sync local Claude Code configs to remote. Push-only: creates new, updates existing (local wins). Returns deletion candidates for user confirmation. Never auto-deletes.',
      {
        configs: z.array(z.object({
          name: z.string().describe('Config name'),
          type: z.enum(['slash_command', 'agent_definition', 'skill']).describe('Config type'),
          content: z.string().describe('Config content (SKILL.md content for skills)'),
          companionFiles: z.array(z.object({
            path: z.string().describe('File path relative to skill directory'),
            content: z.string().describe('File content (base64 encoded for binary files)'),
            mimeType: z.string().optional().describe('MIME type of the file')
          })).optional().describe('Companion files for skills')
        })).describe('Array of local configs to sync'),
        types: z.array(z.enum(['slash_command', 'agent_definition', 'skill'])).optional().describe('Filter sync to specific types'),
        dry_run: z.boolean().optional().describe('Preview changes without applying')
      },
      async ({ configs, types, dry_run }) => {
        try {
          if (!userId) {
            return {
              content: [{
                type: 'text',
                text: JSON.stringify({
                  success: false,
                  error: 'Authentication required for sync operations'
                }, null, 2)
              }],
              isError: true
            };
          }

          const result = await syncService.syncConfigs(
            configs.map(c => ({
              ...c,
              type: c.type as ConfigType
            })),
            userId,
            types as ConfigType[] | undefined,
            dry_run ?? false
          );

          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                success: true,
                summary: {
                  created: result.created.length,
                  updated: result.updated.length,
                  unchanged: result.unchanged.length,
                  deletionCandidates: result.deletionCandidates.length
                },
                details: result,
                message: dry_run
                  ? 'Dry run complete - no changes applied'
                  : `Sync complete: ${result.created.length} created, ${result.updated.length} updated`
              }, null, 2)
            }]
          };
        } catch (error: any) {
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                success: false,
                error: error.message
              }, null, 2)
            }],
            isError: true
          };
        }
      }
    );

    // Tool: delete_configs_batch
    server.tool(
      'delete_configs_batch',
      'Delete multiple configs by ID. Use after reviewing deletion candidates from sync_local_configs. Requires explicit confirmation.',
      {
        configIds: z.array(z.string()).describe('Array of config IDs to delete'),
        confirm: z.boolean().describe('Must be true to execute deletion')
      },
      async ({ configIds, confirm }) => {
        try {
          if (!confirm) {
            return {
              content: [{
                type: 'text',
                text: JSON.stringify({
                  success: false,
                  error: 'Deletion cancelled - confirm must be true',
                  message: 'Set confirm: true to proceed with deletion'
                }, null, 2)
              }]
            };
          }

          if (!userId) {
            return {
              content: [{
                type: 'text',
                text: JSON.stringify({
                  success: false,
                  error: 'Authentication required for delete operations'
                }, null, 2)
              }],
              isError: true
            };
          }

          const result = await syncService.deleteConfigs(configIds);

          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                success: true,
                deleted: result.deleted,
                failed: result.failed,
                message: `Deleted ${result.deleted.length} configs${result.failed.length > 0 ? `, ${result.failed.length} failed` : ''}`
              }, null, 2)
            }]
          };
        } catch (error: any) {
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                success: false,
                error: error.message
              }, null, 2)
            }],
            isError: true
          };
        }
      }
    );
  }

  // ===== RESOURCES (Read Operations) =====
  // Note: MCP resources are for providing context to AI, not for operations
  // For now, we only expose the list of configs as a resource
  // Individual config access is done via tools for simplicity

  // Resource: config://list
  server.resource(
    'config-list',
    'config://list',
    { mimeType: 'application/json', description: 'List all agent configurations' },
    async () => {
      const configs = await configService.listConfigs();
      return {
        contents: [{
          uri: 'config://list',
          text: JSON.stringify(configs, null, 2)
        }]
      };
    }
  );

  // ===== PROMPTS (Workflow Automation) =====
  // Prompts only available in 'full' mode (they describe write workflows)

  if (mode === 'full') {
    // Prompt: migrate_config_format
    server.prompt(
    'migrate_config_format',
    'Migrate a configuration from one agent format to another',
    {
      sourceConfigId: z.string().describe('ID of the config to migrate'),
      targetFormat: z.enum(['claude_code', 'codex', 'gemini']).describe('Target format'),
      newName: z.string().optional().describe('Name for the new config')
    },
    async ({ sourceConfigId, targetFormat, newName }) => {
      const name = newName || `Migrated to ${targetFormat}`;

      return {
        messages: [{
          role: 'user',
          content: {
            type: 'text',
            text: `# Config Migration Workflow

I need to migrate a configuration to a different agent format.

**Source Config ID**: ${sourceConfigId}
**Target Format**: ${targetFormat}
**New Config Name**: ${name}

Please follow these steps:

1. **Read source config** using the tool:
   - Tool: get_config
   - Arguments: { configId: "${sourceConfigId}" }
   - Review the current content and format

2. **Convert to target format** using the tool:
   - Tool: convert_config
   - Arguments: { configId: "${sourceConfigId}", targetFormat: "${targetFormat}" }
   - Save the converted content

3. **Create new config** using the tool:
   - Tool: create_config
   - Arguments: {
       name: "${name}",
       type: <same as source>,
       original_format: "${targetFormat}",
       content: <converted content from step 2>
     }

4. **Provide summary**:
   - Source config details
   - Converted content preview
   - New config ID
   - Differences or notes about the conversion

Please execute this workflow and provide detailed results for each step.`
          }
        }]
      };
    }
  );

  // Prompt: batch_convert
  server.prompt(
    'batch_convert',
    'Bulk convert multiple configs to a specific format (slash_command and mcp_config only)',
    {
      targetFormat: z.enum(['claude_code', 'codex', 'gemini']).describe('Target format'),
      configTypes: z.string().optional().describe('Comma-separated types (slash_command,mcp_config)')
    },
    async ({ targetFormat, configTypes }) => {
      const types = configTypes || 'slash_command,mcp_config';

      return {
        messages: [{
          role: 'user',
          content: {
            type: 'text',
            text: `# Batch Conversion Workflow

I need to convert multiple configurations to ${targetFormat} format.

**Target Format**: ${targetFormat}
**Config Types**: ${types}

**Important**: agent_definition configs are NOT convertible (passthrough only).

Please follow these steps:

1. **List all configs** using the resource:
   - URI: config://list
   - Filter for types: ${types}

2. **For each config that needs conversion**:
   - Skip if already in ${targetFormat} format
   - Skip if type is "agent_definition" (not convertible)
   - Use convert_config tool: { configId: <id>, targetFormat: "${targetFormat}" }
   - Track success/failure for each conversion

3. **Provide batch summary**:
   - Total configs processed
   - Successfully converted: <count>
   - Already in target format: <count>
   - Skipped (agent_definition): <count>
   - Failed conversions: <count> (with error details)
   - Conversion method used (AI vs rule-based) for each

4. **List all converted configs** with:
   - Config ID
   - Original format → Target format
   - Whether AI was used
   - Whether fallback was needed

Please execute this batch conversion workflow and provide a detailed summary.`
          }
        }]
      };
    }
  );

  // Prompt: sync_config_versions
  server.prompt(
    'sync_config_versions',
    'Synchronize cached format conversions for a config',
    {
      configId: z.string().describe('ID of the config to sync')
    },
    async ({ configId }) => {
      return {
        messages: [{
          role: 'user',
          content: {
            type: 'text',
            text: `# Config Version Sync Workflow

I need to synchronize cached format conversions for a configuration.

**Config ID**: ${configId}

Please follow these steps:

1. **Read config details** using the tool:
   - Tool: get_config
   - Arguments: { configId: "${configId}" }
   - Note the original_format and updated_at timestamp

2. **Plan conversions** for all formats (claude_code, codex, gemini) except the original format

3. **Invalidate cache** using the tool:
   - Tool: invalidate_cache
   - Arguments: { configId: "${configId}" }
   - This clears all cached conversions

4. **Regenerate conversions** using the tool:
   - For each format (except original_format):
     - Tool: convert_config
     - Arguments: { configId: "${configId}", targetFormat: <format> }
     - This creates fresh cached versions

5. **Provide sync summary**:
   - Config name and type
   - Original format
   - Conversions regenerated (list formats)
   - Whether AI was used for each conversion
   - Any errors encountered

Please execute this sync workflow and provide a detailed summary.`
          }
        }]
      };
      }
    );

  // Prompt: sync_from_local
  server.prompt(
    'sync_from_local',
    'Sync local Claude Code configurations to the remote server. Scans commands, agents, and skills directories.',
    {
      workingDirectory: z.string().optional().describe('Current working directory (defaults to pwd)')
    },
    async ({ workingDirectory }) => {
      const cwd = workingDirectory || 'current directory';

      return {
        messages: [{
          role: 'user',
          content: {
            type: 'text',
            text: `# Local Config Sync Workflow

I need to sync local Claude Code configurations to the remote server.

**Working Directory**: ${cwd}

## Step 1: Detect Configuration Directory

First, determine if we're in a valid Claude Code config context:

1. Run \`pwd\` to get the current working directory
2. Check if current directory is \`~/.claude\` (global configs)
3. OR check if current directory contains a \`.claude\` subdirectory (project configs)

If NEITHER condition is met:
- Report: "No Claude Code configuration directory found. Expected ~/.claude or ./.claude directory."
- Exit gracefully - do not proceed with sync.

## Step 2: Identify Config Source Type

Based on the directory detection:
- **Global (~/.claude)**: These are user's personal configs
- **Project (./.claude)**: These are project-specific configs
  - Extract project name from the parent directory name
  - This will be used as context when reporting

## Step 3: Scan Local Configurations

Scan the following directories for configs:

### Slash Commands
- Path: \`{config_dir}/commands/*.md\`
- Type: \`slash_command\`
- Each \`.md\` file is one command
- File name (without .md) becomes the config name
- Skip symlinks

### Agent Definitions
- Path: \`{config_dir}/agents/*.md\`
- Type: \`agent_definition\`
- Each \`.md\` file is one agent
- File name (without .md) becomes the config name
- Skip symlinks

### Skills
- Path: \`{config_dir}/skills/{skill-name}/SKILL.md\`
- Type: \`skill\`
- Directory name becomes the skill name
- SKILL.md is the main content
- All other files in the directory are companion files
- Skip symlinked directories

For each file found, read its content using the Read tool.

## Step 4: Preview and Confirm

Before syncing, show the user what was found:

\`\`\`
Found configurations to sync:
- Slash Commands: {count} [list names]
- Agent Definitions: {count} [list names]
- Skills: {count} [list names with companion file counts]

Source: {global or project: project-name}
\`\`\`

Use AskUserQuestion to confirm:
- Question: "Proceed with sync?"
- Options: "Yes, sync all" / "No, cancel"

If user cancels, exit gracefully.

## Step 5: Execute Sync (Dry Run First)

Call the \`sync_local_configs\` tool with \`dry_run: true\` first:

\`\`\`json
{
  "configs": [
    {
      "name": "config-name",
      "type": "slash_command|agent_definition|skill",
      "content": "file content here",
      "companionFiles": [
        {"path": "relative/path.md", "content": "base64 or text content"}
      ]
    }
  ],
  "dry_run": true
}
\`\`\`

Review the dry run results which will show:
- **Would create**: New configs not on server
- **Would update**: Configs that differ from server (WILL BE SKIPPED)
- **Unchanged**: Configs already in sync
- **Deletion candidates**: Configs on server but not locally

## Step 6: Handle Existing Configs (Skip, Don't Overwrite)

IMPORTANT: Do NOT overwrite existing configs.

From the dry run results:
- **Would create**: These will be synced
- **Would update**: SKIP these and log them for user
- **Unchanged**: Already in sync, no action needed

If there are configs that would be updated (skipped), inform the user:
\`\`\`
Skipped (already exists on server with different content):
- {config name} ({type})
- {config name} ({type})

These configs were NOT overwritten. Update them manually if needed.
\`\`\`

## Step 7: Handle Deletion Candidates

If there are remote-only configs (deletion candidates):

Use AskUserQuestion:
- Question: "Found {N} configs on server that don't exist locally. What would you like to do?"
- Options:
  - "Keep all on server (don't delete)"
  - "Show me the list to review"

If user chooses to review:
- List each deletion candidate with name and type
- Use AskUserQuestion for each: "Delete '{name}' ({type}) from server?"
- Options: "Yes, delete" / "No, keep"

NEVER auto-delete. User must explicitly confirm deletions.

## Step 8: Execute Final Sync

Call \`sync_local_configs\` without dry_run, but ONLY include configs that should be CREATED (not updated):

Filter to only include configs from the "would create" list in dry run results.

\`\`\`json
{
  "configs": [
    // Only NEW configs that don't exist on server
  ],
  "dry_run": false
}
\`\`\`

If there are no new configs to create, skip this step.

## Step 9: Execute Deletions (if confirmed)

If user confirmed any deletions in Step 7, call \`delete_configs_batch\`:

\`\`\`json
{
  "configIds": ["id1", "id2"],
  "confirm": true
}
\`\`\`

## Step 10: Summary Report

Provide a final summary:

\`\`\`
Sync Complete!

Created: {N} configs
  - {list created config names}
Skipped (already exists): {N} configs
  - {list skipped config names}
Unchanged: {N} configs
Deleted: {N} configs (or "None - kept all on server")
  - {list deleted config names if any}

Source: {global ~/.claude or project: project-name}
\`\`\`

## Error Handling

If any operation fails:
- Report the specific error clearly
- Use AskUserQuestion to ask:
  - Question: "An error occurred: {error}. How would you like to proceed?"
  - Options: "Retry" / "Skip and continue" / "Abort sync"
`
          }
        }]
      };
    }
  );
  }

  return server;
}
