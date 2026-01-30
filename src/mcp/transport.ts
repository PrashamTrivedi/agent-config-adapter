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
    const response = await transport.handleRequest(c) as Response;

    // Add CORS headers for MCP Inspector and other clients
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, Mcp-Session-Id',
    };

    // Clone response with CORS headers
    const newHeaders = new Headers(response.headers);
    Object.entries(corsHeaders).forEach(([key, value]) => {
      newHeaders.set(key, value);
    });

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders,
    });
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
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, Mcp-Session-Id',
        }
      }
    );
  }
}
