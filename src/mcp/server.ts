import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { ConfigService, ConversionService } from '../services';
import { MCPContext } from './types';
import { AgentFormat, ConfigType } from '../domain/types';

/**
 * Create and configure MCP server instance
 * This server exposes configs, conversion tools, and workflow prompts
 * via the Model Context Protocol
 */
export function createMCPServer(env: MCPContext): McpServer {
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

  // ===== TOOLS (Write Operations) =====

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

  // Tool: get_config (added since we simplified resources)
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

  return server;
}
