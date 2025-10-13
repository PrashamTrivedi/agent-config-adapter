import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createMCPServer } from './server';
import { MCPContext } from './types';

/**
 * Handle MCP requests via Streamable HTTP transport
 * This is the recommended transport for serverless environments like Cloudflare Workers
 *
 * Stateless mode: No session management needed, each request is independent
 */
export async function handleMCPStreamable(
  request: Request,
  env: MCPContext
): Promise<Response> {
  try {
    // Create stateless transport (recommended for serverless)
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined, // Stateless mode
      enableJsonResponse: true
    });

    // Create MCP server instance with environment bindings
    const server = createMCPServer(env);

    // Connect server to transport
    await server.connect(transport);

    // Handle the HTTP request
    const response = await transport.handlePostMessage(request);

    return response;
  } catch (error: any) {
    console.error('MCP transport error:', error);

    return new Response(
      JSON.stringify({
        jsonrpc: '2.0',
        id: null,
        error: {
          code: -32603,
          message: 'Internal error',
          data: error.message
        }
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
  }
}
