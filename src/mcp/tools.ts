import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import { ConfigService, ConversionService } from '../services';
import { MCPContext } from './types';
import { AgentFormat, ConfigType } from '../domain/types';

/**
 * Register all MCP tools (write operations)
 * Tools allow AI to perform operations with side effects
 */
export function registerTools(server: Server, env: MCPContext): void {
  // Tool 1: create_config
  server.setRequestHandler(
    {
      method: 'tools/list',
    },
    async () => {
      return {
        tools: [
          {
            name: 'create_config',
            description: 'Create a new agent configuration (slash command, MCP config, or agent definition)',
            inputSchema: {
              type: 'object',
              properties: {
                name: { type: 'string', description: 'Config name' },
                type: {
                  type: 'string',
                  enum: ['slash_command', 'mcp_config', 'agent_definition'],
                  description: 'Config type'
                },
                original_format: {
                  type: 'string',
                  enum: ['claude_code', 'codex', 'gemini'],
                  description: 'Original format of the config'
                },
                content: { type: 'string', description: 'Config content' }
              },
              required: ['name', 'type', 'original_format', 'content']
            }
          },
          {
            name: 'update_config',
            description: 'Update an existing configuration',
            inputSchema: {
              type: 'object',
              properties: {
                configId: { type: 'string', description: 'Config ID to update' },
                name: { type: 'string', description: 'New config name (optional)' },
                type: {
                  type: 'string',
                  enum: ['slash_command', 'mcp_config', 'agent_definition'],
                  description: 'New config type (optional)'
                },
                original_format: {
                  type: 'string',
                  enum: ['claude_code', 'codex', 'gemini'],
                  description: 'New format (optional)'
                },
                content: { type: 'string', description: 'New content (optional)' }
              },
              required: ['configId']
            }
          },
          {
            name: 'delete_config',
            description: 'Delete a configuration',
            inputSchema: {
              type: 'object',
              properties: {
                configId: { type: 'string', description: 'Config ID to delete' }
              },
              required: ['configId']
            }
          },
          {
            name: 'invalidate_cache',
            description: 'Invalidate all cached format conversions for a config',
            inputSchema: {
              type: 'object',
              properties: {
                configId: { type: 'string', description: 'Config ID' }
              },
              required: ['configId']
            }
          },
          {
            name: 'convert_config',
            description: 'Convert a config to a different agent format (on-demand, with caching). This is the OPERATION that triggers conversion, unlike the resource which only reads cache.',
            inputSchema: {
              type: 'object',
              properties: {
                configId: { type: 'string', description: 'Config ID to convert' },
                targetFormat: {
                  type: 'string',
                  enum: ['claude_code', 'codex', 'gemini'],
                  description: 'Target format'
                }
              },
              required: ['configId', 'targetFormat']
            }
          }
        ]
      };
    }
  );

  // Tool call handler
  server.setRequestHandler(
    {
      method: 'tools/call',
    },
    async (request: any) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'create_config': {
            const configService = new ConfigService(env);
            const config = await configService.createConfig({
              name: args.name,
              type: args.type as ConfigType,
              original_format: args.original_format as AgentFormat,
              content: args.content
            });

            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({
                    success: true,
                    config,
                    message: `Config "${config.name}" created successfully with ID: ${config.id}`
                  }, null, 2)
                }
              ]
            };
          }

          case 'update_config': {
            const configService = new ConfigService(env);
            const updated = await configService.updateConfig(args.configId, {
              name: args.name,
              type: args.type as ConfigType | undefined,
              original_format: args.original_format as AgentFormat | undefined,
              content: args.content
            });

            if (!updated) {
              return {
                content: [
                  {
                    type: 'text',
                    text: JSON.stringify({
                      success: false,
                      error: `Config not found: ${args.configId}`
                    }, null, 2)
                  }
                ],
                isError: true
              };
            }

            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({
                    success: true,
                    config: updated,
                    message: `Config "${updated.name}" updated successfully`
                  }, null, 2)
                }
              ]
            };
          }

          case 'delete_config': {
            const configService = new ConfigService(env);
            const success = await configService.deleteConfig(args.configId);

            if (!success) {
              return {
                content: [
                  {
                    type: 'text',
                    text: JSON.stringify({
                      success: false,
                      error: `Config not found: ${args.configId}`
                    }, null, 2)
                  }
                ],
                isError: true
              };
            }

            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({
                    success: true,
                    message: `Config ${args.configId} deleted successfully`
                  }, null, 2)
                }
              ]
            };
          }

          case 'invalidate_cache': {
            const configService = new ConfigService(env);
            await configService.invalidateCache(args.configId);

            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({
                    success: true,
                    message: `Cache invalidated for config ${args.configId}`
                  }, null, 2)
                }
              ]
            };
          }

          case 'convert_config': {
            const conversionService = new ConversionService(env);
            const result = await conversionService.convertWithMetadata(
              args.configId,
              args.targetFormat as AgentFormat
            );

            return {
              content: [
                {
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
                      : `Converted to ${args.targetFormat} format ${result.usedAI ? '(AI-enhanced)' : '(rule-based)'}`
                  }, null, 2)
                }
              ]
            };
          }

          default:
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({
                    success: false,
                    error: `Unknown tool: ${name}`
                  }, null, 2)
                }
              ],
              isError: true
            };
        }
      } catch (error: any) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: false,
                error: error.message || 'Internal error'
              }, null, 2)
            }
          ],
          isError: true
        };
      }
    }
  );
}
