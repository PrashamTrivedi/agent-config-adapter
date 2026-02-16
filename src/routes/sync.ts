/**
 * Sync routes — batch sync endpoint for CLI tool
 * Requires API key authentication
 */

import { Hono } from 'hono';
import { SyncService, type LocalConfigInput } from '../services/sync-service';
import { requireApiKey } from '../middleware/api-key-auth';
import type { ConfigType } from '../domain/types';
import '../auth/types';

type Bindings = {
  DB: D1Database;
  EXTENSION_FILES: R2Bucket;
};

export const syncRouter = new Hono<{ Bindings: Bindings }>();

// All sync routes require API key auth
syncRouter.use('/*', requireApiKey);

/**
 * POST /api/sync — Batch sync local configs to remote
 */
syncRouter.post('/', async (c) => {
  const userId = c.get('userId');

  const body = await c.req.json<{
    configs: LocalConfigInput[];
    types?: ConfigType[];
    dry_run?: boolean;
  }>();

  if (!body.configs || !Array.isArray(body.configs)) {
    return c.json({ error: 'configs array is required' }, 400);
  }

  const syncService = new SyncService({
    DB: c.env.DB,
    EXTENSION_FILES: c.env.EXTENSION_FILES,
  });

  const result = await syncService.syncConfigs(
    body.configs,
    userId,
    body.types,
    body.dry_run ?? false
  );

  return c.json({
    success: true,
    summary: {
      created: result.created.length,
      updated: result.updated.length,
      unchanged: result.unchanged.length,
      deletionCandidates: result.deletionCandidates.length,
    },
    details: result,
  });
});

/**
 * DELETE /api/sync/batch — Batch delete confirmed deletion candidates
 */
syncRouter.delete('/batch', async (c) => {
  const body = await c.req.json<{ config_ids: string[] }>();

  if (!body.config_ids || !Array.isArray(body.config_ids) || body.config_ids.length === 0) {
    return c.json({ error: 'config_ids array is required and must not be empty' }, 400);
  }

  const syncService = new SyncService({
    DB: c.env.DB,
    EXTENSION_FILES: c.env.EXTENSION_FILES,
  });

  const result = await syncService.deleteConfigs(body.config_ids);

  return c.json({
    success: true,
    ...result,
  });
});
