/**
 * OAuth token validation middleware for MCP endpoints
 * Supports both JWT access tokens and API keys
 */

import type { Context, Next } from 'hono';
import { verifyAccessToken } from './jwt';
import { ApiKeyService } from '../../services/api-key-service';

/**
 * Authenticate request using either JWT access token or API key
 * Sets userId and authType on context
 */
export async function mcpOAuthMiddleware(c: Context, next: Next): Promise<Response | void> {
  const authHeader = c.req.header('Authorization');
  const jwtSecret = c.env.JWT_SECRET || c.env.BETTER_AUTH_SECRET;

  // No auth header - allow anonymous access to public tools only
  if (!authHeader) {
    c.set('userId', null);
    c.set('authType', null);
    return next();
  }

  // Extract token
  if (!authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'invalid_token', error_description: 'Bearer token required' }, 401);
  }

  const token = authHeader.substring(7).trim();
  if (!token) {
    return c.json({ error: 'invalid_token', error_description: 'Token is empty' }, 401);
  }

  // Try JWT access token first
  if (jwtSecret) {
    const payload = await verifyAccessToken(token, jwtSecret);
    if (payload) {
      c.set('userId', payload.sub);
      c.set('authType', 'jwt');
      return next();
    }
  }

  // Try API key
  if (token.startsWith('aca_')) {
    const apiKeyService = new ApiKeyService(c.env.DB);
    const result = await apiKeyService.validate(token);

    if (result) {
      c.set('userId', result.userId);
      c.set('authType', 'api_key');
      return next();
    }
  }

  // Token invalid
  return c.json({ error: 'invalid_token', error_description: 'Invalid or expired token' }, 401);
}

/**
 * Require authenticated user for MCP operations
 * Must be used after mcpOAuthMiddleware
 */
export async function requireMCPAuth(c: Context, next: Next): Promise<Response | void> {
  const userId = c.get('userId');

  if (!userId) {
    return c.json(
      {
        error: 'unauthorized',
        error_description: 'Authentication required',
        auth_url: `${new URL(c.req.url).origin}/mcp/oauth/authorize`,
      },
      401
    );
  }

  return next();
}

/**
 * Check if request has specific scope
 */
export function requireScope(requiredScope: string) {
  return async (c: Context, next: Next): Promise<Response | void> => {
    const authType = c.get('authType');

    // API keys have implicit full access (admin scope)
    if (authType === 'api_key') {
      return next();
    }

    // Session auth has implicit full access
    if (authType === 'session') {
      return next();
    }

    // For JWT tokens, we'd check the scope claim
    // For now, allow all authenticated requests
    return next();
  };
}

/**
 * Get user info from current auth context
 */
export interface MCPUserInfo {
  userId: string;
  authType: 'session' | 'api_key' | 'jwt';
}

export function getMCPUser(c: Context): MCPUserInfo | null {
  const userId = c.get('userId');
  const authType = c.get('authType');

  if (!userId || !authType) {
    return null;
  }

  return { userId, authType };
}
