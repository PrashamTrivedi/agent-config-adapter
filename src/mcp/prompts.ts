import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { MCPContext } from './types';

/**
 * Register all MCP prompts (workflow automation)
 * Prompts provide pre-filled templates for AI to execute complex workflows
 */
export function registerPrompts(server: Server, env: MCPContext): void {
  // List available prompts
  server.setRequestHandler(
    {
      method: 'prompts/list',
    },
    async () => {
      return {
        prompts: [
          {
            name: 'migrate_config_format',
            description: 'Migrate a configuration from one agent format to another',
            arguments: [
              {
                name: 'sourceConfigId',
                description: 'ID of the config to migrate',
                required: true
              },
              {
                name: 'targetFormat',
                description: 'Target format (claude_code, codex, or gemini)',
                required: true
              },
              {
                name: 'newName',
                description: 'Name for the new config (optional, defaults to original name + format)',
                required: false
              }
            ]
          },
          {
            name: 'batch_convert',
            description: 'Bulk convert multiple configs to a specific format (slash_command and mcp_config only)',
            arguments: [
              {
                name: 'targetFormat',
                description: 'Target format for all configs',
                required: true
              },
              {
                name: 'configTypes',
                description: 'Types to convert (comma-separated: slash_command,mcp_config). Defaults to all convertible types.',
                required: false
              }
            ]
          },
          {
            name: 'sync_config_versions',
            description: 'Synchronize cached format conversions for a config',
            arguments: [
              {
                name: 'configId',
                description: 'ID of the config to sync',
                required: true
              }
            ]
          }
        ]
      };
    }
  );

  // Get prompt with pre-filled message
  server.setRequestHandler(
    {
      method: 'prompts/get',
    },
    async (request: any) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'migrate_config_format': {
            const sourceConfigId = args.sourceConfigId;
            const targetFormat = args.targetFormat;
            const newName = args.newName || `Migrated to ${targetFormat}`;

            return {
              messages: [
                {
                  role: 'user',
                  content: {
                    type: 'text',
                    text: `# Config Migration Workflow

I need to migrate a configuration to a different agent format.

**Source Config ID**: ${sourceConfigId}
**Target Format**: ${targetFormat}
**New Config Name**: ${newName}

Please follow these steps:

1. **Read source config** using the resource:
   - URI: config://${sourceConfigId}
   - Review the current content and format

2. **Convert to target format** using the tool:
   - Tool: convert_config
   - Arguments: { configId: "${sourceConfigId}", targetFormat: "${targetFormat}" }
   - Save the converted content

3. **Create new config** using the tool:
   - Tool: create_config
   - Arguments: {
       name: "${newName}",
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
                }
              ]
            };
          }

          case 'batch_convert': {
            const targetFormat = args.targetFormat;
            const configTypes = args.configTypes
              ? args.configTypes.split(',').map((t: string) => t.trim())
              : ['slash_command', 'mcp_config']; // Default: only convertible types

            return {
              messages: [
                {
                  role: 'user',
                  content: {
                    type: 'text',
                    text: `# Batch Conversion Workflow

I need to convert multiple configurations to ${targetFormat} format.

**Target Format**: ${targetFormat}
**Config Types**: ${configTypes.join(', ')}

**Important**: agent_definition configs are NOT convertible (passthrough only).

Please follow these steps:

1. **List all configs** using the resource:
   - URI: config://list
   - Filter for types: ${configTypes.join(', ')}

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
                }
              ]
            };
          }

          case 'sync_config_versions': {
            const configId = args.configId;

            return {
              messages: [
                {
                  role: 'user',
                  content: {
                    type: 'text',
                    text: `# Config Version Sync Workflow

I need to synchronize cached format conversions for a configuration.

**Config ID**: ${configId}

Please follow these steps:

1. **Read config details** using the resource:
   - URI: config://${configId}
   - Note the original_format and updated_at timestamp

2. **Check cached conversions** for all formats:
   - Check: config://${configId}/cached/claude_code
   - Check: config://${configId}/cached/codex
   - Check: config://${configId}/cached/gemini
   - Identify which conversions exist vs missing

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
                }
              ]
            };
          }

          default:
            throw new Error(`Unknown prompt: ${name}`);
        }
      } catch (error: any) {
        throw new Error(`Failed to get prompt: ${error.message}`);
      }
    }
  );
}
