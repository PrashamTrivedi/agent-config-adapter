import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { toReqRes, toFetchResponse } from 'fetch-to-node';
import { createMCPServer } from './server';
import { MCPContext } from './types';

/**
 * Handle MCP requests via Streamable HTTP transport
 * This is the recommended transport for serverless environments like Cloudflare Workers
 *
 * Uses fetch-to-node to bridge between Web Fetch API (Cloudflare Workers)
 * and Node.js HTTP interfaces (required by MCP SDK)
 *
 * Stateless mode: No session management needed, each request is independent
 */
export async function handleMCPStreamable(
  request: Request,
  env: MCPContext
): Promise<Response> {
  try {
    // Convert Web Request to Node.js-compatible req/res objects
    const { req, res } = toReqRes(request);

    // Create a new transport for each request (stateless mode)
    // This prevents request ID collisions when different clients use same IDs
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined, // Stateless mode
      enableJsonResponse: true
    });

    // Create MCP server instance with environment bindings
    const server = createMCPServer(env);

    // Connect server to transport
    await server.connect(transport);

    // Parse request body
    const body = await request.json();

    // Handle the request using Node.js-compatible req/res
    await transport.handleRequest(req, res, body);

    // Convert Node.js response back to Web Response
    return await toFetchResponse(res);
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
