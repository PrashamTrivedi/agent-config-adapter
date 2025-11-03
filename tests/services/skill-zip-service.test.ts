import { describe, it, expect } from 'vitest';
import { SkillZipService } from '../../src/services/skill-zip-service';
import { zipSync, strToU8 } from 'fflate';
import { createMockR2Bucket } from '../test-utils';

describe('SkillZipService', () => {
  let service: SkillZipService;

  beforeEach(() => {
    service = new SkillZipService();
  });

  describe('parseZip', () => {
    it('should parse a valid ZIP with SKILL.md', async () => {
      // Create a test ZIP
      const files = {
        'SKILL.md': strToU8('# Test Skill\n\nThis is a test skill.'),
        'FORMS.md': strToU8('# Forms\n\nForm content here.'),
      };
      const zipData = zipSync(files);

      const result = await service.parseZip(zipData.buffer);

      expect(result.skillContent).toContain('Test Skill');
      expect(result.companionFiles).toHaveLength(1);
      expect(result.companionFiles[0].path).toBe('FORMS.md');
    });

    it('should reject ZIP without SKILL.md', async () => {
      const files = {
        'README.md': strToU8('# No skill file'),
      };
      const zipData = zipSync(files);

      await expect(service.parseZip(zipData.buffer)).rejects.toThrow(
        'SKILL.md not found'
      );
    });
  });

  describe('validateStructure', () => {
    it('should validate structure with content', () => {
      const structure = {
        skillContent: '# Test',
        companionFiles: [],
      };

      expect(service.validateStructure(structure)).toBe(true);
    });

    it('should reject empty skill content', () => {
      const structure = {
        skillContent: '',
        companionFiles: [],
      };

      expect(service.validateStructure(structure)).toBe(false);
    });
  });

  describe('generateZip', () => {
    it('should generate a ZIP with skill and companion files', async () => {
      const mockR2 = createMockR2Bucket();
      const skill = {
        id: 'skill-1',
        name: 'Test Skill',
        type: 'skill' as const,
        original_format: 'claude_code' as const,
        content: '# Test Skill',
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
        files: [
          {
            id: 'file-1',
            skill_id: 'skill-1',
            file_path: 'FORMS.md',
            r2_key: 'skills/skill-1/files/FORMS.md',
            file_size: 100,
            mime_type: 'text/markdown',
            created_at: '2024-01-01',
          },
        ],
      };

      // Mock R2 to return companion file
      await mockR2.put('skills/skill-1/files/FORMS.md', '# Forms');

      const zipData = await service.generateZip(skill, mockR2);

      expect(zipData).toBeInstanceOf(Uint8Array);
      expect(zipData.length).toBeGreaterThan(0);
    });
  });

  describe('validateFileName', () => {
    it('should accept valid file names', () => {
      expect(() => service.validateFileName('file.md')).not.toThrow();
      expect(() => service.validateFileName('utils/helper.js')).not.toThrow();
      expect(() => service.validateFileName('my-file_2.txt')).not.toThrow();
    });

    it('should reject invalid file names', () => {
      expect(() => service.validateFileName('file with spaces.md')).toThrow();
      expect(() => service.validateFileName('../../../etc/passwd')).toThrow();
    });
  });
});
