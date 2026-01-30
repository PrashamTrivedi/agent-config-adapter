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
    // enableJsonResponse: true = HTTP Streamable (direct JSON responses)
    // enableJsonResponse: false = SSE streaming
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
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, Mcp-Session-Id, Mcp-Protocol-Version',
      'Access-Control-Expose-Headers': 'Mcp-Session-Id',
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
    // Workaround: @hono/mcp@0.2.3 with enableJsonResponse:true throws HTTPException
    // even on success, but the actual response is in error.res. Extract and return it.
    if (error?.res && error.res.status >= 200 && error.res.status < 300) {
      const response = error.res as Response;

      // Add CORS headers
      const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, Mcp-Session-Id, Mcp-Protocol-Version',
        'Access-Control-Expose-Headers': 'Mcp-Session-Id',
      };

      const newHeaders = new Headers(response.headers);
      Object.entries(corsHeaders).forEach(([key, value]) => {
        newHeaders.set(key, value);
      });

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders,
      });
    }

    return new Response(
      JSON.stringify({
        jsonrpc: '2.0',
        id: null,
        error: {
          code: -32603,
          message: 'Internal error',
          data: error.message || String(error)
        }
      }),
      {
        status: error?.status || 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, Mcp-Session-Id, Mcp-Protocol-Version',
          'Access-Control-Expose-Headers': 'Mcp-Session-Id',
        }
      }
    );
  }
}
