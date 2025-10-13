import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { MCPContext } from './types';
import { registerTools } from './tools';
import { registerResources } from './resources';
import { registerPrompts } from './prompts';

/**
 * Create and configure MCP server instance
 * This server exposes configs, conversion tools, and workflow prompts
 * via the Model Context Protocol
 */
export function createMCPServer(env: MCPContext): Server {
  const server = new Server(
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

  // Register all MCP capabilities
  registerTools(server, env);
  registerResources(server, env);
  registerPrompts(server, env);

  return server;
}
