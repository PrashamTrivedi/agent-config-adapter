import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SkillsService } from '../../src/services/skills-service';
import { createMockD1Database, createMockR2Bucket } from '../test-utils';

describe('SkillsService', () => {
  let mockDb: D1Database;
  let mockR2: R2Bucket;
  let service: SkillsService;

  beforeEach(() => {
    mockDb = createMockD1Database();
    mockR2 = createMockR2Bucket();
    service = new SkillsService({ DB: mockDb, EXTENSION_FILES: mockR2 });
  });

  describe('createSkill', () => {
    it('should create a skill', async () => {
      const mockInsert = vi.fn().mockResolvedValue({ success: true });

      mockDb.prepare = vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          run: mockInsert,
        }),
      });

      const skill = await service.createSkill({
        name: 'Test Skill',
        type: 'skill',
        original_format: 'claude_code',
        content: '# Test Skill',
      });

      expect(skill.name).toBe('Test Skill');
      expect(skill.type).toBe('skill');
    });

    it('should reject non-skill type', async () => {
      await expect(
        service.createSkill({
          name: 'Test',
          type: 'slash_command' as any,
          original_format: 'claude_code',
          content: 'content',
        })
      ).rejects.toThrow('Invalid type: must be "skill"');
    });
  });

  describe('getSkillWithFiles', () => {
    it('should return skill with companion files', async () => {
      const mockSkill = {
        id: 'skill-1',
        name: 'Test Skill',
        type: 'skill',
        original_format: 'claude_code',
        content: '# Test',
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      };

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
            all: vi.fn().mockResolvedValue({ results: mockFiles }),
          }),
        };
      });

      const result = await service.getSkillWithFiles('skill-1');

      expect(result).toBeDefined();
      expect(result?.files).toHaveLength(1);
      expect(result?.files[0].file_path).toBe('FORMS.md');
    });
  });

  describe('deleteSkill', () => {
    it('should delete skill and companion files', async () => {
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

      mockDb.prepare = vi.fn((query: string) => {
        if (query.includes('SELECT * FROM skill_files')) {
          return {
            bind: vi.fn().mockReturnValue({
              all: vi.fn().mockResolvedValue({ results: mockFiles }),
            }),
          };
        }
        return {
          bind: vi.fn().mockReturnValue({
            run: vi.fn().mockResolvedValue({ success: true }),
          }),
        };
      });

      const success = await service.deleteSkill('skill-1');
      expect(success).toBe(true);
    });
  });
});
