/**
 * Profile routes
 * User profile and API key management
 */

import { Hono } from 'hono';
import { ApiKeyService } from '../services/api-key-service';
import { requireAuth } from '../auth/session-middleware';
import '../auth/types';

type Bindings = {
  DB: D1Database;
  WEB_ANALYTICS_TOKEN?: string;
};

export const profileRouter = new Hono<{ Bindings: Bindings }>();

// All profile routes require authentication
profileRouter.use('/*', requireAuth);

/**
 * Profile JSON - user info
 */
profileRouter.get('/', async (c) => {
  const user = c.get('user');
  return c.json({ user });
});

/**
 * API: Create new API key
 */
profileRouter.post('/keys', async (c) => {
  const user = c.get('user');
  const body = await c.req.json<{ name: string; expires_in_days?: number | null }>();

  if (!body.name?.trim()) {
    return c.json({ error: 'Key name is required' }, 400);
  }

  const apiKeyService = new ApiKeyService(c.env.DB);

  // Limit keys per user
  const count = await apiKeyService.countByUser(user.id);
  if (count >= 10) {
    return c.json({ error: 'Maximum of 10 API keys per user' }, 400);
  }

  const result = await apiKeyService.create(
    user.id,
    body.name.trim(),
    body.expires_in_days || undefined
  );

  return c.json(result, 201);
});

/**
 * API: List user's API keys
 */
profileRouter.get('/keys', async (c) => {
  const user = c.get('user');
  const apiKeyService = new ApiKeyService(c.env.DB);
  const keys = await apiKeyService.listByUser(user.id);

  return c.json({ keys });
});

/**
 * API: Revoke an API key
 */
profileRouter.post('/keys/:id/revoke', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');
  const apiKeyService = new ApiKeyService(c.env.DB);

  const success = await apiKeyService.revoke(id, user.id);

  if (!success) {
    return c.json({ error: 'Key not found or already revoked' }, 404);
  }

  return c.json({ success: true });
});

/**
 * API: Reactivate an API key
 */
profileRouter.post('/keys/:id/reactivate', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');
  const apiKeyService = new ApiKeyService(c.env.DB);

  const success = await apiKeyService.reactivate(id, user.id);

  if (!success) {
    return c.json({ error: 'Key not found' }, 404);
  }

  return c.json({ success: true });
});

/**
 * API: Delete an API key permanently
 */
profileRouter.delete('/keys/:id', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');
  const apiKeyService = new ApiKeyService(c.env.DB);

  const success = await apiKeyService.delete(id, user.id);

  if (!success) {
    return c.json({ error: 'Key not found' }, 404);
  }

  return c.json({ success: true });
});
