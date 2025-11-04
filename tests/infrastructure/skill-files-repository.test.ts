import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SkillFilesRepository } from '../../src/infrastructure/skill-files-repository';
import { createMockD1Database } from '../test-utils';

describe('SkillFilesRepository', () => {
  let mockDb: D1Database;
  let repo: SkillFilesRepository;

  beforeEach(() => {
    mockDb = createMockD1Database();
    repo = new SkillFilesRepository(mockDb);
  });

  describe('create', () => {
    it('should create a skill file record', async () => {
      const mockRun = vi.fn().mockResolvedValue({ success: true, meta: { changes: 1 } });

      mockDb.prepare = vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          run: mockRun,
        }),
      });

      const file = await repo.create({
        skill_id: 'skill-123',
        file_path: 'FORMS.md',
        r2_key: 'skills/skill-123/files/FORMS.md',
        file_size: 1024,
        mime_type: 'text/markdown',
      });

      expect(file.skill_id).toBe('skill-123');
      expect(file.file_path).toBe('FORMS.md');
      expect(file.r2_key).toBe('skills/skill-123/files/FORMS.md');
      expect(mockRun).toHaveBeenCalled();
    });
  });

  describe('findBySkillId', () => {
    it('should return files for a skill', async () => {
      const mockFiles = [
        {
          id: 'file-1',
          skill_id: 'skill-123',
          file_path: 'FORMS.md',
          r2_key: 'skills/skill-123/files/FORMS.md',
          file_size: 1024,
          mime_type: 'text/markdown',
          created_at: '2024-01-01T00:00:00.000Z',
        },
      ];

      mockDb.prepare = vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          all: vi.fn().mockResolvedValue({ results: mockFiles }),
        }),
      });

      const files = await repo.findBySkillId('skill-123');
      expect(files).toEqual(mockFiles);
    });
  });

  describe('delete', () => {
    it('should delete a skill file', async () => {
      mockDb.prepare = vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          run: vi.fn().mockResolvedValue({ success: true, meta: { changes: 1 } }),
        }),
      });

      const success = await repo.delete('file-1');
      expect(success).toBe(true);
    });
  });
});
