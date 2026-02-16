/**
 * API Key Authentication Middleware
 * Validates Bearer token API keys and sets userId on context
 */

import type { Context, Next } from 'hono';
import { ApiKeyService } from '../services/api-key-service';

/**
 * Require API key authentication via Authorization: Bearer aca_... header
 * Sets userId on context if valid
 */
export const requireApiKey = async (c: Context, next: Next) => {
  const authHeader = c.req.header('Authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7).trim() : null;

  if (!token || !token.startsWith('aca_')) {
    return c.json(
      { error: 'Authentication required. Provide API key via Authorization: Bearer aca_... header' },
      401
    );
  }

  const apiKeyService = new ApiKeyService(c.env.DB);
  const result = await apiKeyService.validate(token);

  if (!result) {
    return c.json(
      { error: 'Invalid or expired API key' },
      401
    );
  }

  c.set('userId', result.userId);
  c.set('authType', 'api_key');

  await next();
};
