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

    // Create a minimal Response object for the transport
    // The transport will handle the actual response generation
    let responseInit: ResponseInit = {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    let responseBody = '';
    const mockRes = {
      status: (code: number) => {
        responseInit.status = code;
        return mockRes;
      },
      setHeader: (name: string, value: string) => {
        if (!responseInit.headers) responseInit.headers = {};
        (responseInit.headers as Record<string, string>)[name] = value;
        return mockRes;
      },
      write: (chunk: any) => {
        responseBody += chunk.toString();
        return mockRes;
      },
      end: (data?: any) => {
        if (data) responseBody += data.toString();
        return mockRes;
      },
      on: () => mockRes
    };

    // Handle the request using the transport
    await transport.handleRequest(request as any, mockRes as any, body);

    return new Response(responseBody, responseInit);
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
