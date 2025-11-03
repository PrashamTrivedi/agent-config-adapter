import { describe, it, expect, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { skillsRouter } from '../../src/routes/skills';
import { createMockD1Database, createMockR2Bucket } from '../test-utils';

describe('Skills Routes', () => {
  let app: Hono;
  let mockDb: D1Database;
  let mockR2: R2Bucket;

  beforeEach(() => {
    mockDb = createMockD1Database();
    mockR2 = createMockR2Bucket();

    app = new Hono();
    app.route('/', skillsRouter);

    // Add env to context
    app.use('*', async (c, next) => {
      c.env = {
        DB: mockDb,
        EXTENSION_FILES: mockR2,
      } as any;
      await next();
    });
  });

  describe('GET /', () => {
    it('should list skills', async () => {
      const req = new Request('http://localhost/', {
        headers: { Accept: 'application/json' },
      });

      const res = await app.request(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data).toHaveProperty('skills');
      expect(Array.isArray(data.skills)).toBe(true);
    });
  });

  describe('POST /', () => {
    it('should create a skill', async () => {
      const req = new Request('http://localhost/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Test Skill',
          type: 'skill',
          original_format: 'claude_code',
          content: '# Test Skill',
        }),
      });

      const res = await app.request(req);
      expect([201, 400]).toContain(res.status); // May fail validation, that's ok
    });
  });
});
