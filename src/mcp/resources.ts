import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { ConfigService } from '../services';
import { MCPContext } from './types';

/**
 * Register all MCP resources (pure read operations)
 * Resources provide context to AI without triggering processing or side effects
 *
 * IMPORTANT: Resources intentionally diverge from REST API behavior
 * - Resources are PURE READS (no conversion processing)
 * - For format conversion, use the convert_config TOOL instead
 */
export function registerResources(server: Server, env: MCPContext): void {
  // List available resources
  server.setRequestHandler(
    {
      method: 'resources/list',
    },
    async () => {
      const configService = new ConfigService(env);
      const configs = await configService.listConfigs();

      // Build resource list dynamically based on existing configs
      const resources = [
        {
          uri: 'config://list',
          name: 'All Configurations',
          description: 'List all agent configurations from database',
          mimeType: 'application/json'
        }
      ];

      // Add individual config resources
      for (const config of configs) {
        resources.push({
          uri: `config://${config.id}`,
          name: `Config: ${config.name}`,
          description: `${config.type} in ${config.original_format} format`,
          mimeType: 'application/json'
        });

        // Add cached conversion resources
        const formats = ['claude_code', 'codex', 'gemini'];
        for (const format of formats) {
          if (format !== config.original_format) {
            resources.push({
              uri: `config://${config.id}/cached/${format}`,
              name: `Cached ${format} version of ${config.name}`,
              description: `Cached conversion to ${format} format (null if not cached)`,
              mimeType: 'text/plain'
            });
          }
        }
      }

      return { resources };
    }
  );

  // Read resource content
  server.setRequestHandler(
    {
      method: 'resources/read',
    },
    async (request: any) => {
      const { uri } = request.params;
      const configService = new ConfigService(env);

      try {
        // Resource 1: config://list
        if (uri === 'config://list') {
          const configs = await configService.listConfigs();

          return {
            contents: [
              {
                uri,
                mimeType: 'application/json',
                text: JSON.stringify(configs, null, 2)
              }
            ]
          };
        }

        // Resource 2: config://{configId}
        const configMatch = uri.match(/^config:\/\/([a-zA-Z0-9_-]+)$/);
        if (configMatch) {
          const configId = configMatch[1];
          const config = await configService.getConfig(configId);

          if (!config) {
            return {
              contents: [
                {
                  uri,
                  mimeType: 'text/plain',
                  text: `Config not found: ${configId}`
                }
              ]
            };
          }

          return {
            contents: [
              {
                uri,
                mimeType: 'application/json',
                text: JSON.stringify(config, null, 2)
              }
            ]
          };
        }

        // Resource 3: config://{configId}/cached/{format}
        const cachedMatch = uri.match(/^config:\/\/([a-zA-Z0-9_-]+)\/cached\/([a-z_]+)$/);
        if (cachedMatch) {
          const [, configId, format] = cachedMatch;

          // Verify config exists
          const config = await configService.getConfig(configId);
          if (!config) {
            return {
              contents: [
                {
                  uri,
                  mimeType: 'text/plain',
                  text: `Config not found: ${configId}`
                }
              ]
            };
          }

          // IMPORTANT: Only read from cache, never trigger conversion
          // This is intentional divergence from REST API behavior
          const cached = await configService.getCachedConversion(configId, format);

          if (cached === null) {
            return {
              contents: [
                {
                  uri,
                  mimeType: 'text/plain',
                  text: `Not cached. Use convert_config tool to generate this conversion.`
                }
              ]
            };
          }

          return {
            contents: [
              {
                uri,
                mimeType: 'text/plain',
                text: cached
              }
            ]
          };
        }

        // Unknown resource URI
        return {
          contents: [
            {
              uri,
              mimeType: 'text/plain',
              text: `Unknown resource URI: ${uri}\n\nValid patterns:\n- config://list\n- config://{configId}\n- config://{configId}/cached/{format}`
            }
          ]
        };
      } catch (error: any) {
        return {
          contents: [
            {
              uri,
              mimeType: 'text/plain',
              text: `Error reading resource: ${error.message}`
            }
          ]
        };
      }
    }
  );
}
