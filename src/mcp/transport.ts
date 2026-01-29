import { StreamableHTTPTransport } from '@hono/mcp';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Context } from 'hono';

/**
 * Handle MCP requests via Streamable HTTP transport
 * Uses @hono/mcp for native Cloudflare Workers support
 *
 * Stateless mode: No session management needed, each request is independent
 *
 * @param c - Hono context (provides access to request and environment)
 * @param server - Pre-configured MCP server instance (readonly or full access)
 */
export async function handleMCPStreamable(
  c: Context,
  server: McpServer
): Promise<Response> {
  try {
    // @hono/mcp supports same options as official MCP SDK
    const transport = new StreamableHTTPTransport({
      sessionIdGenerator: undefined, // Stateless mode
      enableJsonResponse: true
    });

    // Connect server to transport
    await server.connect(transport);

    // Handle the request - returns native Web Response
    return transport.handleRequest(c) as Promise<Response>;
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
