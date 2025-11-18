import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Hono } from 'hono';
import { skillsRouter } from '../../src/routes/skills';
import { createMockD1Database, createMockR2Bucket, createMockKVNamespace } from '../test-utils';

describe('Skills Routes', () => {
  let app: Hono;
  let mockDb: D1Database;
  let mockR2: R2Bucket;
  let mockKV: KVNamespace;
  const TEST_EMAIL = 'test@example.com';

  beforeEach(async () => {
    mockDb = createMockD1Database();
    mockR2 = createMockR2Bucket();
    mockKV = createMockKVNamespace();

    // Pre-populate KV with test subscription
    await mockKV.put(TEST_EMAIL, JSON.stringify({
      email: TEST_EMAIL,
      projectName: 'agentConfig',
      subscribedAt: new Date().toISOString(),
    }));

    app = new Hono();

    // Add env to context BEFORE routing
    app.use('*', async (c, next) => {
      c.env = {
        DB: mockDb,
        EXTENSION_FILES: mockR2,
        EMAIL_SUBSCRIPTIONS: mockKV,
      } as any;
      await next();
    });

    app.route('/', skillsRouter);
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

    it('should return HTML when Accept header is not JSON', async () => {
      const mockSkills = [
        {
          id: 'skill-1',
          name: 'Test Skill',
          type: 'skill',
          original_format: 'claude_code',
          content: '# Test',
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        },
      ];

      mockDb.prepare = vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          all: vi.fn().mockResolvedValue({ results: mockSkills }),
        }),
      });

      const req = new Request('http://localhost/', {
        headers: { Accept: 'text/html' },
      });

      const res = await app.request(req);
      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toContain('text/html');
    });
  });

  describe('GET /new', () => {
    it('should return HTML form for creating new skill', async () => {
      const req = new Request('http://localhost/new');

      const res = await app.request(req);
      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toContain('text/html');
    });
  });

  describe('GET /:id/edit', () => {
    it('should return HTML form for editing skill', async () => {
      const mockSkill = {
        id: 'skill-1',
        name: 'Test Skill',
        type: 'skill',
        original_format: 'claude_code',
        content: '# Test',
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      };

      mockDb.prepare = vi.fn((query: string) => {
        if (query.includes('SELECT * FROM configs')) {
          return {
            bind: vi.fn().mockReturnValue({
              first: vi.fn().mockResolvedValue(mockSkill),
            }),
          };
        }
        return {
          bind: vi.fn().mockReturnValue({
            all: vi.fn().mockResolvedValue({ results: [] }),
          }),
        };
      });

      const req = new Request('http://localhost/skill-1/edit');

      const res = await app.request(req);
      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toContain('text/html');
    });

    it('should return 404 for non-existent skill', async () => {
      mockDb.prepare = vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(null),
        }),
      });

      const req = new Request('http://localhost/nonexistent/edit');

      const res = await app.request(req);
      expect(res.status).toBe(404);
    });
  });

  describe('GET /:id', () => {
    it('should get skill with files (JSON)', async () => {
      const mockSkill = {
        id: 'skill-1',
        name: 'Test Skill',
        type: 'skill',
        original_format: 'claude_code',
        content: '# Test',
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      };

      mockDb.prepare = vi.fn((query: string) => {
        if (query.includes('SELECT * FROM configs')) {
          return {
            bind: vi.fn().mockReturnValue({
              first: vi.fn().mockResolvedValue(mockSkill),
            }),
          };
        }
        return {
          bind: vi.fn().mockReturnValue({
            all: vi.fn().mockResolvedValue({ results: [] }),
          }),
        };
      });

      const req = new Request('http://localhost/skill-1', {
        headers: { Accept: 'application/json' },
      });

      const res = await app.request(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.skill).toBeDefined();
      expect(data.skill.id).toBe('skill-1');
    });

    it('should return 404 for non-existent skill', async () => {
      mockDb.prepare = vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(null),
        }),
      });

      const req = new Request('http://localhost/nonexistent', {
        headers: { Accept: 'application/json' },
      });

      const res = await app.request(req);
      expect(res.status).toBe(404);
    });

    it('should return HTML when Accept header is not JSON', async () => {
      const mockSkill = {
        id: 'skill-1',
        name: 'Test Skill',
        type: 'skill',
        original_format: 'claude_code',
        content: '# Test',
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      };

      mockDb.prepare = vi.fn((query: string) => {
        if (query.includes('SELECT * FROM configs')) {
          return {
            bind: vi.fn().mockReturnValue({
              first: vi.fn().mockResolvedValue(mockSkill),
            }),
          };
        }
        return {
          bind: vi.fn().mockReturnValue({
            all: vi.fn().mockResolvedValue({ results: [] }),
          }),
        };
      });

      const req = new Request('http://localhost/skill-1', {
        headers: { Accept: 'text/html' },
      });

      const res = await app.request(req);
      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toContain('text/html');
    });
  });

  describe('POST /', () => {
    it('should return 403 due to lockdown (JSON)', async () => {
      const req = new Request('http://localhost/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Subscriber-Email': TEST_EMAIL,
        },
        body: JSON.stringify({
          name: 'Test Skill',
          type: 'skill',
          original_format: 'claude_code',
          content: '# Test Skill',
        }),
      });

      const res = await app.request(req);
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.coming_soon).toBe(true);
    });

    it('should return 403 due to lockdown (form data)', async () => {
      const formData = new FormData();
      formData.append('name', 'Test Skill');
      formData.append('type', 'skill');
      formData.append('original_format', 'claude_code');
      formData.append('content', '# Test Skill');

      const req = new Request('http://localhost/', {
        method: 'POST',
        headers: {
          'X-Subscriber-Email': TEST_EMAIL,
        },
        body: formData,
      });

      const res = await app.request(req);
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.coming_soon).toBe(true);
    });

    it('should return 403 even with invalid skill data', async () => {
      const req = new Request('http://localhost/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Subscriber-Email': TEST_EMAIL,
        },
        body: JSON.stringify({
          name: 'Test',
          type: 'slash_command', // Invalid type
          original_format: 'claude_code',
          content: 'content',
        }),
      });

      const res = await app.request(req);
      expect(res.status).toBe(403);
    });
  });

  describe('POST /upload-zip', () => {
    it('should return 403 due to lockdown', async () => {
      // Create a minimal ZIP file with SKILL.md
      const zipContent = new Uint8Array([
        0x50, 0x4b, 0x03, 0x04, // ZIP header
      ]);

      const formData = new FormData();
      formData.append('skill_zip', new Blob([zipContent]), 'skill.zip');
      formData.append('name', 'Test Skill');
      formData.append('original_format', 'claude_code');

      const req = new Request('http://localhost/upload-zip', {
        method: 'POST',
        headers: {
          'X-Subscriber-Email': TEST_EMAIL,
        },
        body: formData,
      });

      const res = await app.request(req);
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.coming_soon).toBe(true);
    });

    it('should return 403 due to lockdown (wrong content type)', async () => {
      const req = new Request('http://localhost/upload-zip', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Subscriber-Email': TEST_EMAIL,
        },
        body: JSON.stringify({}),
      });

      const res = await app.request(req);
      expect(res.status).toBe(403);
    });

    it('should return 403 due to lockdown (missing file)', async () => {
      const formData = new FormData();
      formData.append('name', 'Test Skill');

      const req = new Request('http://localhost/upload-zip', {
        method: 'POST',
        headers: {
          'X-Subscriber-Email': TEST_EMAIL,
        },
        body: formData,
      });

      const res = await app.request(req);
      expect(res.status).toBe(403);
    });
  });

  describe('PUT /:id', () => {
    it('should return 403 due to lockdown (JSON)', async () => {
      const req = new Request('http://localhost/skill-1', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Subscriber-Email': TEST_EMAIL,
        },
        body: JSON.stringify({
          name: 'Updated Skill',
          content: '# Updated',
        }),
      });

      const res = await app.request(req);
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.coming_soon).toBe(true);
    });

    it('should return 403 due to lockdown (form data)', async () => {
      const formData = new FormData();
      formData.append('name', 'Updated Skill');
      formData.append('content', '# Updated');

      const req = new Request('http://localhost/skill-1', {
        method: 'PUT',
        headers: {
          'X-Subscriber-Email': TEST_EMAIL,
        },
        body: formData,
      });

      const res = await app.request(req);
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.coming_soon).toBe(true);
    });

    it('should return 403 due to lockdown (non-existent skill)', async () => {
      const req = new Request('http://localhost/nonexistent', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Subscriber-Email': TEST_EMAIL,
        },
        body: JSON.stringify({ name: 'Updated' }),
      });

      const res = await app.request(req);
      expect(res.status).toBe(403);
    });
  });

  describe('DELETE /:id', () => {
    it('should return 403 due to lockdown', async () => {
      const req = new Request('http://localhost/skill-1', {
        method: 'DELETE',
        headers: {
          'X-Subscriber-Email': TEST_EMAIL,
        },
      });

      const res = await app.request(req);
      expect(res.status).toBe(403);

      const data = await res.json();
      expect(data.coming_soon).toBe(true);
    });

    it('should return 403 due to lockdown (non-existent skill)', async () => {
      const req = new Request('http://localhost/nonexistent', {
        method: 'DELETE',
        headers: {
          'X-Subscriber-Email': TEST_EMAIL,
        },
      });

      const res = await app.request(req);
      expect(res.status).toBe(403);
    });
  });

  describe('GET /:id/files', () => {
    it('should list companion files for a skill', async () => {
      const mockFiles = [
        {
          id: 'file-1',
          skill_id: 'skill-1',
          file_path: 'FORMS.md',
          r2_key: 'skills/skill-1/files/FORMS.md',
          file_size: 100,
          mime_type: 'text/markdown',
          created_at: '2024-01-01',
        },
      ];

      mockDb.prepare = vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          all: vi.fn().mockResolvedValue({ results: mockFiles }),
        }),
      });

      const req = new Request('http://localhost/skill-1/files');

      const res = await app.request(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.files).toHaveLength(1);
      expect(data.files[0].file_path).toBe('FORMS.md');
    });
  });

  describe('POST /:id/files', () => {
    it('should return 403 due to lockdown', async () => {
      const fileContent = new Blob(['# Test Form'], { type: 'text/markdown' });
      const formData = new FormData();
      formData.append('file_path', 'FORMS.md');
      formData.append('file_content', fileContent, 'FORMS.md');

      const req = new Request('http://localhost/skill-1/files', {
        method: 'POST',
        headers: {
          'X-Subscriber-Email': TEST_EMAIL,
        },
        body: formData,
      });

      const res = await app.request(req);
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.coming_soon).toBe(true);
    });

    it('should return 403 due to lockdown (wrong content type)', async () => {
      const req = new Request('http://localhost/skill-1/files', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Subscriber-Email': TEST_EMAIL,
        },
        body: JSON.stringify({}),
      });

      const res = await app.request(req);
      expect(res.status).toBe(403);
    });

    it('should return 403 due to lockdown (no files)', async () => {
      const formData = new FormData();

      const req = new Request('http://localhost/skill-1/files', {
        method: 'POST',
        headers: {
          'X-Subscriber-Email': TEST_EMAIL,
        },
        body: formData,
      });

      const res = await app.request(req);
      expect(res.status).toBe(403);
    });

    it('should return 403 due to lockdown (skill not found)', async () => {
      const fileContent = new Blob(['# Test'], { type: 'text/markdown' });
      const formData = new FormData();
      formData.append('file_path', 'test.md');
      formData.append('file_content', fileContent);

      const req = new Request('http://localhost/nonexistent/files', {
        method: 'POST',
        headers: {
          'X-Subscriber-Email': TEST_EMAIL,
        },
        body: formData,
      });

      const res = await app.request(req);
      expect(res.status).toBe(403);
    });

    it('should return 403 due to lockdown (duplicate file)', async () => {
      const fileContent = new Blob(['# Test'], { type: 'text/markdown' });
      const formData = new FormData();
      formData.append('file_path', 'FORMS.md');
      formData.append('file_content', fileContent);

      const req = new Request('http://localhost/skill-1/files', {
        method: 'POST',
        headers: {
          'X-Subscriber-Email': TEST_EMAIL,
        },
        body: formData,
      });

      const res = await app.request(req);
      expect(res.status).toBe(403);
    });
  });

  describe('GET /:id/files/:fileId', () => {
    it('should download companion file', async () => {
      const mockFile = {
        id: 'file-1',
        skill_id: 'skill-1',
        file_path: 'FORMS.md',
        r2_key: 'skills/skill-1/files/FORMS.md',
        file_size: 100,
        mime_type: 'text/markdown',
        created_at: '2024-01-01',
      };

      const fileContent = '# Test Form';
      const fileBytes = new TextEncoder().encode(fileContent);

      mockDb.prepare = vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(mockFile),
        }),
      });

      mockR2.get = vi.fn().mockResolvedValue({
        body: fileBytes,
        size: fileBytes.length,
        httpMetadata: { contentType: 'text/markdown' },
      });

      const req = new Request('http://localhost/skill-1/files/file-1');

      const res = await app.request(req);
      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toBe('text/markdown');
    });

    it('should return 404 if file not found', async () => {
      mockDb.prepare = vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(null),
        }),
      });

      const req = new Request('http://localhost/skill-1/files/nonexistent');

      const res = await app.request(req);
      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /:id/files/:fileId', () => {
    it('should return 403 due to lockdown', async () => {
      const req = new Request('http://localhost/skill-1/files/file-1', {
        method: 'DELETE',
        headers: {
          'X-Subscriber-Email': TEST_EMAIL,
        },
      });

      const res = await app.request(req);
      expect(res.status).toBe(403);

      const data = await res.json();
      expect(data.coming_soon).toBe(true);
    });

    it('should return 403 due to lockdown (file not found)', async () => {
      const req = new Request('http://localhost/skill-1/files/nonexistent', {
        method: 'DELETE',
        headers: {
          'X-Subscriber-Email': TEST_EMAIL,
        },
      });

      const res = await app.request(req);
      expect(res.status).toBe(403);
    });
  });

  describe('GET /:id/download', () => {
    it('should download skill as ZIP', async () => {
      const mockSkill = {
        id: 'skill-1',
        name: 'Test Skill',
        type: 'skill',
        original_format: 'claude_code',
        content: '# Test',
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      };

      mockDb.prepare = vi.fn((query: string) => {
        if (query.includes('SELECT * FROM configs')) {
          return {
            bind: vi.fn().mockReturnValue({
              first: vi.fn().mockResolvedValue(mockSkill),
            }),
          };
        }
        return {
          bind: vi.fn().mockReturnValue({
            all: vi.fn().mockResolvedValue({ results: [] }),
          }),
        };
      });

      const req = new Request('http://localhost/skill-1/download');

      const res = await app.request(req);
      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toBe('application/zip');
      expect(res.headers.get('content-disposition')).toContain('attachment');
    });

    it('should return 404 if skill not found', async () => {
      mockDb.prepare = vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(null),
        }),
      });

      const req = new Request('http://localhost/nonexistent/download');

      const res = await app.request(req);
      expect(res.status).toBe(404);
    });
  });
});
