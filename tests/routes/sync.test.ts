import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Hono } from 'hono';
import { syncRouter } from '../../src/routes/sync';
import { createMockD1Database, createMockR2Bucket } from '../test-utils';

// Mock ApiKeyService as a class
vi.mock('../../src/services/api-key-service', () => {
  return {
    ApiKeyService: class {
      async validate(key: string) {
        if (key === 'aca_valid_key_for_testing_1234567') {
          return { userId: 'user-123', keyId: 'key-1' };
        }
        return null;
      }
    },
  };
});

describe('Sync Routes', () => {
  let app: Hono;
  let mockDb: D1Database;
  let mockR2: R2Bucket;

  beforeEach(() => {
    mockDb = createMockD1Database();
    mockR2 = createMockR2Bucket();

    app = new Hono();
    app.use('*', async (c, next) => {
      c.env = { DB: mockDb, EXTENSION_FILES: mockR2 } as any;
      await next();
    });
    app.route('/api/sync', syncRouter);
  });

  describe('POST /api/sync', () => {
    it('should return 401 without auth header', async () => {
      const res = await app.request('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ configs: [] }),
      });

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error).toContain('Authentication required');
    });

    it('should return 401 with invalid API key', async () => {
      const res = await app.request('/api/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer aca_invalid_key_here_12345678',
        },
        body: JSON.stringify({ configs: [] }),
      });

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error).toContain('Invalid or expired');
    });

    it('should return 401 with non-aca token', async () => {
      const res = await app.request('/api/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer some_other_token',
        },
        body: JSON.stringify({ configs: [] }),
      });

      expect(res.status).toBe(401);
    });

    it('should return 400 when configs is missing', async () => {
      const res = await app.request('/api/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer aca_valid_key_for_testing_1234567',
        },
        body: JSON.stringify({}),
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toContain('configs array is required');
    });

    it('should sync configs with valid API key', async () => {
      const res = await app.request('/api/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer aca_valid_key_for_testing_1234567',
        },
        body: JSON.stringify({
          configs: [
            {
              name: 'test-command',
              type: 'slash_command',
              content: '# Test\nContent here',
            },
          ],
          dry_run: true,
        }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.summary).toHaveProperty('created');
      expect(body.summary).toHaveProperty('updated');
      expect(body.summary).toHaveProperty('unchanged');
      expect(body.summary).toHaveProperty('deletionCandidates');
      expect(body.details).toHaveProperty('created');
    });

    it('should filter by types when provided', async () => {
      const res = await app.request('/api/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer aca_valid_key_for_testing_1234567',
        },
        body: JSON.stringify({
          configs: [
            { name: 'cmd', type: 'slash_command', content: 'content' },
            { name: 'agent', type: 'agent_definition', content: 'content' },
          ],
          types: ['slash_command'],
          dry_run: true,
        }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      // Only slash_command should be processed
      expect(body.summary.created).toBe(1);
    });
  });

  describe('DELETE /api/sync/batch', () => {
    it('should return 401 without auth', async () => {
      const res = await app.request('/api/sync/batch', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config_ids: ['id-1'] }),
      });

      expect(res.status).toBe(401);
    });

    it('should return 400 when config_ids is missing', async () => {
      const res = await app.request('/api/sync/batch', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer aca_valid_key_for_testing_1234567',
        },
        body: JSON.stringify({}),
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toContain('config_ids');
    });

    it('should return 400 when config_ids is empty', async () => {
      const res = await app.request('/api/sync/batch', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer aca_valid_key_for_testing_1234567',
        },
        body: JSON.stringify({ config_ids: [] }),
      });

      expect(res.status).toBe(400);
    });

    it('should delete configs with valid API key', async () => {
      const res = await app.request('/api/sync/batch', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer aca_valid_key_for_testing_1234567',
        },
        body: JSON.stringify({ config_ids: ['config-1', 'config-2'] }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body).toHaveProperty('deleted');
      expect(body).toHaveProperty('failed');
    });
  });
});
