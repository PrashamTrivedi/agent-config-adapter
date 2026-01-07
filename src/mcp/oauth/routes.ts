/**
 * MCP OAuth 2.0 routes
 * Provides authorization endpoints for MCP clients
 */

import { Hono } from 'hono';
import { getOAuthMetadata, getMCPServerMetadata } from './metadata';
import {
  handleAuthorizeGet,
  handleAuthorizePost,
  handleTokenExchange,
  handleClientRegistration,
} from './handlers';
import { mcpOAuthMiddleware, requireMCPAuth } from './middleware';
import { handleMCPStreamable } from '../transport';
import { createMCPServer } from '../server';

type Bindings = {
  DB: D1Database;
  CONFIG_CACHE: KVNamespace;
  EXTENSION_FILES: R2Bucket;
  OAUTH_TOKENS: KVNamespace;
  JWT_SECRET?: string;
  BETTER_AUTH_SECRET?: string;
  MCP_ADMIN_TOKEN_HASH?: string;
};

export const mcpOAuthRouter = new Hono<{ Bindings: Bindings }>();

/**
 * OAuth 2.0 Authorization Server Metadata (RFC 8414)
 * GET /.well-known/oauth-authorization-server
 */
mcpOAuthRouter.get('/.well-known/oauth-authorization-server', (c) => {
  const baseUrl = new URL(c.req.url).origin;
  return c.json(getOAuthMetadata(baseUrl));
});

/**
 * MCP Server Discovery Metadata
 * GET /mcp/oauth/metadata
 */
mcpOAuthRouter.get('/metadata', (c) => {
  const baseUrl = new URL(c.req.url).origin;
  return c.json(getMCPServerMetadata(baseUrl));
});

/**
 * Authorization endpoint - consent page
 * GET /mcp/oauth/authorize
 */
mcpOAuthRouter.get('/authorize', handleAuthorizeGet);

/**
 * Authorization endpoint - process approval
 * POST /mcp/oauth/authorize
 */
mcpOAuthRouter.post('/authorize', handleAuthorizePost);

/**
 * Token endpoint - exchange code for access token
 * POST /mcp/oauth/token
 */
mcpOAuthRouter.post('/token', handleTokenExchange);

/**
 * Dynamic client registration (RFC 7591)
 * POST /mcp/oauth/register
 */
mcpOAuthRouter.post('/register', handleClientRegistration);

/**
 * Authenticated MCP endpoint - uses OAuth tokens or API keys
 * POST /mcp/oauth
 *
 * This is the main MCP endpoint for authenticated clients.
 * Supports both JWT access tokens and API keys.
 */
mcpOAuthRouter.post('/', mcpOAuthMiddleware, async (c) => {
  const userId = c.get('userId');

  // Create MCP server with appropriate access level
  // If authenticated, user gets full access; otherwise read-only
  const mode = userId ? 'full' : 'readonly';
  const server = createMCPServer(c.env as any, mode);

  return handleMCPStreamable(c.req.raw, server);
});

/**
 * Token introspection endpoint (RFC 7662)
 * POST /mcp/oauth/introspect
 *
 * Allows clients to check if a token is still valid
 */
mcpOAuthRouter.post('/introspect', mcpOAuthMiddleware, async (c) => {
  const userId = c.get('userId');
  const authType = c.get('authType');

  if (!userId) {
    return c.json({
      active: false,
    });
  }

  return c.json({
    active: true,
    sub: userId,
    token_type: 'Bearer',
    // Include auth type for debugging
    client_id: authType === 'api_key' ? 'api_key_client' : 'oauth_client',
  });
});

/**
 * Token revocation endpoint (RFC 7009)
 * POST /mcp/oauth/revoke
 *
 * Allows clients to revoke their tokens
 */
mcpOAuthRouter.post('/revoke', async (c) => {
  const kvStore = c.env.OAUTH_TOKENS as KVNamespace;
  const body = await c.req.parseBody();

  const token = body.token as string;
  const tokenTypeHint = body.token_type_hint as string | undefined;

  if (!token) {
    // Per RFC 7009, return 200 even if token is missing
    return c.json({});
  }

  // Try to revoke as refresh token
  if (!tokenTypeHint || tokenTypeHint === 'refresh_token') {
    await kvStore.delete(`refresh_token:${token}`);
  }

  // Access tokens are stateless JWTs, can't revoke without a blocklist
  // For API keys, users should use the profile page to revoke

  return c.json({});
});
