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
      const mockInsert = vi.fn().mockResolvedValue({ success: true, meta: { changes: 1 } });

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

    it('should reject skill without name', async () => {
      await expect(
        service.createSkill({
          name: '',
          type: 'skill',
          original_format: 'claude_code',
          content: '# Test',
        })
      ).rejects.toThrow('Missing required fields');
    });

    it('should reject skill without content', async () => {
      await expect(
        service.createSkill({
          name: 'Test Skill',
          type: 'skill',
          original_format: 'claude_code',
          content: '',
        })
      ).rejects.toThrow('Missing required fields');
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
        if (query.includes('FROM configs')) {
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

    it('should return null for non-existent skill', async () => {
      mockDb.prepare = vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(null),
        }),
      });

      const result = await service.getSkillWithFiles('nonexistent');
      expect(result).toBeNull();
    });

    it('should return null for non-skill config type', async () => {
      const mockConfig = {
        id: 'config-1',
        name: 'Test',
        type: 'slash_command',
        original_format: 'claude_code',
        content: 'test',
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      };

      mockDb.prepare = vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(mockConfig),
        }),
      });

      const result = await service.getSkillWithFiles('config-1');
      expect(result).toBeNull();
    });
  });

  describe('updateSkill', () => {
    it('should update skill metadata', async () => {
      const mockUpdatedSkill = {
        id: 'skill-1',
        name: 'Updated Skill',
        type: 'skill',
        original_format: 'claude_code',
        content: '# Test',
        created_at: '2024-01-01',
        updated_at: '2024-01-02',
      };

      mockDb.prepare = vi.fn((query: string) => {
        if (query.includes('UPDATE')) {
          return {
            bind: vi.fn().mockReturnValue({
              run: vi.fn().mockResolvedValue({ success: true, meta: { changes: 1 } }),
            }),
          };
        }
        return {
          bind: vi.fn().mockReturnValue({
            first: vi.fn().mockResolvedValue(mockUpdatedSkill),
          }),
        };
      });

      const result = await service.updateSkill('skill-1', {
        name: 'Updated Skill',
      });

      expect(result).toBeDefined();
      expect(result?.name).toBe('Updated Skill');
    });

    it('should update skill content', async () => {
      const mockUpdatedSkill = {
        id: 'skill-1',
        name: 'Test Skill',
        type: 'skill',
        original_format: 'claude_code',
        content: '# Updated Content',
        created_at: '2024-01-01',
        updated_at: '2024-01-02',
      };

      mockDb.prepare = vi.fn((query: string) => {
        if (query.includes('UPDATE')) {
          return {
            bind: vi.fn().mockReturnValue({
              run: vi.fn().mockResolvedValue({ success: true, meta: { changes: 1 } }),
            }),
          };
        }
        return {
          bind: vi.fn().mockReturnValue({
            first: vi.fn().mockResolvedValue(mockUpdatedSkill),
          }),
        };
      });

      const result = await service.updateSkill('skill-1', {
        content: '# Updated Content',
      });

      expect(result).toBeDefined();
      expect(result?.content).toBe('# Updated Content');
    });

    it('should return null for non-existent skill', async () => {
      mockDb.prepare = vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          run: vi.fn().mockResolvedValue({ success: true, meta: { changes: 1 } }),
          first: vi.fn().mockResolvedValue(null),
        }),
      });

      const result = await service.updateSkill('nonexistent', {
        name: 'Updated',
      });

      expect(result).toBeNull();
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
            run: vi.fn().mockResolvedValue({ success: true, meta: { changes: 1 } }),
          }),
        };
      });

      const success = await service.deleteSkill('skill-1');
      expect(success).toBe(true);
    });

    it('should delete skill without companion files', async () => {
      mockDb.prepare = vi.fn((query: string) => {
        if (query.includes('SELECT * FROM skill_files')) {
          return {
            bind: vi.fn().mockReturnValue({
              all: vi.fn().mockResolvedValue({ results: [] }),
            }),
          };
        }
        return {
          bind: vi.fn().mockReturnValue({
            run: vi.fn().mockResolvedValue({ success: true, meta: { changes: 1 } }),
          }),
        };
      });

      const success = await service.deleteSkill('skill-1');
      expect(success).toBe(true);
    });

    it('should return false for non-existent skill', async () => {
      mockDb.prepare = vi.fn((query: string) => {
        if (query.includes('SELECT * FROM skill_files')) {
          return {
            bind: vi.fn().mockReturnValue({
              all: vi.fn().mockResolvedValue({ results: [] }),
            }),
          };
        }
        return {
          bind: vi.fn().mockReturnValue({
            run: vi.fn().mockResolvedValue({ success: true, meta: { changes: 0 } }),
          }),
        };
      });

      const success = await service.deleteSkill('nonexistent');
      expect(success).toBe(false);
    });

    it('should verify R2 deletion for multiple files', async () => {
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
        {
          id: 'file-2',
          skill_id: 'skill-1',
          file_path: 'STYLES.css',
          r2_key: 'skills/skill-1/files/STYLES.css',
          file_size: 200,
          mime_type: 'text/css',
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
            run: vi.fn().mockResolvedValue({ success: true, meta: { changes: 1 } }),
          }),
        };
      });

      const deleteSpy = vi.spyOn(mockR2, 'delete');

      await service.deleteSkill('skill-1');

      expect(deleteSpy).toHaveBeenCalledTimes(2);
      expect(deleteSpy).toHaveBeenCalledWith('skills/skill-1/files/FORMS.md');
      expect(deleteSpy).toHaveBeenCalledWith('skills/skill-1/files/STYLES.css');
    });
  });

  describe('uploadCompanionFile', () => {
    it('should upload a single companion file', async () => {
      const mockSkill = {
        id: 'skill-1',
        name: 'Test Skill',
        type: 'skill',
        original_format: 'claude_code',
        content: '# Test',
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      };

      const mockFile = {
        id: 'file-1',
        skill_id: 'skill-1',
        file_path: 'FORMS.md',
        r2_key: 'skills/skill-1/files/FORMS.md',
        file_size: 100,
        mime_type: 'text/markdown',
        created_at: '2024-01-01',
      };

      mockDb.prepare = vi.fn((query: string) => {
        if (query.includes('FROM configs')) {
          return {
            bind: vi.fn().mockReturnValue({
              first: vi.fn().mockResolvedValue(mockSkill),
            }),
          };
        }
        if (query.includes('SELECT * FROM skill_files WHERE skill_id')) {
          return {
            bind: vi.fn().mockReturnValue({
              first: vi.fn().mockResolvedValue(null), // No duplicate
            }),
          };
        }
        if (query.includes('INSERT INTO skill_files')) {
          return {
            bind: vi.fn().mockReturnValue({
              run: vi.fn().mockResolvedValue({ success: true, meta: { changes: 1 } }),
            }),
          };
        }
        return {
          bind: vi.fn().mockReturnValue({
            first: vi.fn().mockResolvedValue(mockFile),
          }),
        };
      });

      const fileContent = new TextEncoder().encode('# Test Form');

      const result = await service.uploadCompanionFile('skill-1', {
        skill_id: 'skill-1',
        file_path: 'FORMS.md',
        content: fileContent.buffer,
        mime_type: 'text/markdown',
      });

      expect(result.file_path).toBe('FORMS.md');
      expect(result.skill_id).toBe('skill-1');
    });

    it('should reject upload for non-existent skill', async () => {
      mockDb.prepare = vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(null),
        }),
      });

      const fileContent = new TextEncoder().encode('# Test');

      await expect(
        service.uploadCompanionFile('nonexistent', {
          skill_id: 'nonexistent',
          file_path: 'test.md',
          content: fileContent.buffer,
          mime_type: 'text/markdown',
        })
      ).rejects.toThrow('Skill not found');
    });

    it('should reject duplicate file paths', async () => {
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
        if (query.includes('FROM configs')) {
          return {
            bind: vi.fn().mockReturnValue({
              first: vi.fn().mockResolvedValue(mockSkill),
            }),
          };
        }
        if (query.includes('SELECT * FROM skill_files WHERE skill_id')) {
          return {
            bind: vi.fn().mockReturnValue({
              first: vi.fn().mockResolvedValue({ id: 'existing-file' }), // Duplicate
            }),
          };
        }
        return {
          bind: vi.fn().mockReturnValue({
            first: vi.fn().mockResolvedValue(null),
          }),
        };
      });

      const fileContent = new TextEncoder().encode('# Test');

      await expect(
        service.uploadCompanionFile('skill-1', {
          skill_id: 'skill-1',
          file_path: 'FORMS.md',
          content: fileContent.buffer,
          mime_type: 'text/markdown',
        })
      ).rejects.toThrow('File already exists');
    });

    it('should reject files exceeding size limit', async () => {
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
        if (query.includes('FROM configs')) {
          return {
            bind: vi.fn().mockReturnValue({
              first: vi.fn().mockResolvedValue(mockSkill),
            }),
          };
        }
        if (query.includes('SELECT * FROM skill_files WHERE skill_id')) {
          return {
            bind: vi.fn().mockReturnValue({
              first: vi.fn().mockResolvedValue(null),
            }),
          };
        }
        return {
          bind: vi.fn().mockReturnValue({
            first: vi.fn().mockResolvedValue(null),
          }),
        };
      });

      // Create a file larger than 10MB
      const largeFile = new Uint8Array(11 * 1024 * 1024);

      await expect(
        service.uploadCompanionFile('skill-1', {
          skill_id: 'skill-1',
          file_path: 'large.bin',
          content: largeFile.buffer,
          mime_type: 'application/octet-stream',
        })
      ).rejects.toThrow('exceeds maximum size');
    });
  });

  describe('uploadCompanionFiles', () => {
    it('should upload multiple companion files', async () => {
      const mockSkill = {
        id: 'skill-1',
        name: 'Test Skill',
        type: 'skill',
        original_format: 'claude_code',
        content: '# Test',
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      };

      let fileCounter = 0;
      mockDb.prepare = vi.fn((query: string) => {
        if (query.includes('FROM configs')) {
          return {
            bind: vi.fn().mockReturnValue({
              first: vi.fn().mockResolvedValue(mockSkill),
            }),
          };
        }
        if (query.includes('SELECT * FROM skill_files WHERE skill_id')) {
          return {
            bind: vi.fn().mockReturnValue({
              first: vi.fn().mockResolvedValue(null),
            }),
          };
        }
        if (query.includes('INSERT INTO skill_files')) {
          return {
            bind: vi.fn().mockReturnValue({
              run: vi.fn().mockResolvedValue({ success: true, meta: { changes: 1 } }),
            }),
          };
        }
        return {
          bind: vi.fn().mockReturnValue({
            first: vi.fn().mockResolvedValue({
              id: `file-${++fileCounter}`,
              skill_id: 'skill-1',
              file_path: fileCounter === 1 ? 'FORMS.md' : 'STYLES.css',
              r2_key: `skills/skill-1/files/${fileCounter === 1 ? 'FORMS.md' : 'STYLES.css'}`,
              file_size: 100,
              mime_type: fileCounter === 1 ? 'text/markdown' : 'text/css',
              created_at: '2024-01-01',
            }),
          }),
        };
      });

      const files = [
        {
          skill_id: 'skill-1',
          file_path: 'FORMS.md',
          content: new TextEncoder().encode('# Form').buffer,
          mime_type: 'text/markdown',
        },
        {
          skill_id: 'skill-1',
          file_path: 'STYLES.css',
          content: new TextEncoder().encode('body {}').buffer,
          mime_type: 'text/css',
        },
      ];

      const results = await service.uploadCompanionFiles('skill-1', files);

      expect(results).toHaveLength(2);
    });
  });

  describe('getCompanionFile', () => {
    it('should retrieve companion file from R2', async () => {
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

      const result = await service.getCompanionFile('skill-1', 'file-1');

      expect(result).toBeDefined();
      expect(result?.size).toBe(fileBytes.length);
    });

    it('should return null for non-existent file', async () => {
      mockDb.prepare = vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(null),
        }),
      });

      const result = await service.getCompanionFile('skill-1', 'nonexistent');
      expect(result).toBeNull();
    });

    it('should return null for file belonging to different skill', async () => {
      const mockFile = {
        id: 'file-1',
        skill_id: 'skill-2',
        file_path: 'FORMS.md',
        r2_key: 'skills/skill-2/files/FORMS.md',
        file_size: 100,
        mime_type: 'text/markdown',
        created_at: '2024-01-01',
      };

      mockDb.prepare = vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(mockFile),
        }),
      });

      const result = await service.getCompanionFile('skill-1', 'file-1');
      expect(result).toBeNull();
    });
  });

  describe('deleteCompanionFile', () => {
    it('should delete companion file', async () => {
      const mockFile = {
        id: 'file-1',
        skill_id: 'skill-1',
        file_path: 'FORMS.md',
        r2_key: 'skills/skill-1/files/FORMS.md',
        file_size: 100,
        mime_type: 'text/markdown',
        created_at: '2024-01-01',
      };

      mockDb.prepare = vi.fn((query: string) => {
        if (query.includes('SELECT')) {
          return {
            bind: vi.fn().mockReturnValue({
              first: vi.fn().mockResolvedValue(mockFile),
            }),
          };
        }
        return {
          bind: vi.fn().mockReturnValue({
            run: vi.fn().mockResolvedValue({ success: true, meta: { changes: 1 } }),
          }),
        };
      });

      const deleteSpy = vi.spyOn(mockR2, 'delete');

      const success = await service.deleteCompanionFile('skill-1', 'file-1');

      expect(success).toBe(true);
      expect(deleteSpy).toHaveBeenCalledWith('skills/skill-1/files/FORMS.md');
    });

    it('should return false for non-existent file', async () => {
      mockDb.prepare = vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(null),
        }),
      });

      const success = await service.deleteCompanionFile('skill-1', 'nonexistent');
      expect(success).toBe(false);
    });

    it('should return false for file belonging to different skill', async () => {
      const mockFile = {
        id: 'file-1',
        skill_id: 'skill-2',
        file_path: 'FORMS.md',
        r2_key: 'skills/skill-2/files/FORMS.md',
        file_size: 100,
        mime_type: 'text/markdown',
        created_at: '2024-01-01',
      };

      mockDb.prepare = vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(mockFile),
        }),
      });

      const success = await service.deleteCompanionFile('skill-1', 'file-1');
      expect(success).toBe(false);
    });
  });

  describe('listCompanionFiles', () => {
    it('should list all companion files for a skill', async () => {
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
        {
          id: 'file-2',
          skill_id: 'skill-1',
          file_path: 'STYLES.css',
          r2_key: 'skills/skill-1/files/STYLES.css',
          file_size: 200,
          mime_type: 'text/css',
          created_at: '2024-01-01',
        },
      ];

      mockDb.prepare = vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          all: vi.fn().mockResolvedValue({ results: mockFiles }),
        }),
      });

      const files = await service.listCompanionFiles('skill-1');

      expect(files).toHaveLength(2);
      expect(files[0].file_path).toBe('FORMS.md');
      expect(files[1].file_path).toBe('STYLES.css');
    });

    it('should return empty array for skill with no files', async () => {
      mockDb.prepare = vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          all: vi.fn().mockResolvedValue({ results: [] }),
        }),
      });

      const files = await service.listCompanionFiles('skill-1');
      expect(files).toHaveLength(0);
    });
  });

  describe('listSkills', () => {
    it('should list all skills', async () => {
      const mockSkills = [
        {
          id: 'skill-1',
          name: 'Test Skill 1',
          type: 'skill',
          original_format: 'claude_code',
          content: '# Test 1',
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        },
        {
          id: 'skill-2',
          name: 'Test Skill 2',
          type: 'skill',
          original_format: 'claude_code',
          content: '# Test 2',
          created_at: '2024-01-02',
          updated_at: '2024-01-02',
        },
      ];

      mockDb.prepare = vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          all: vi.fn().mockResolvedValue({ results: mockSkills }),
        }),
      });

      const skills = await service.listSkills();

      expect(skills).toHaveLength(2);
      expect(skills[0].type).toBe('skill');
      expect(skills[1].type).toBe('skill');
    });
  });

  describe('uploadFromZip', () => {
    it('should reject ZIP without SKILL.md', async () => {
      // Minimal invalid ZIP (too small to contain SKILL.md)
      const invalidZip = new Uint8Array([0x50, 0x4b, 0x03, 0x04]);

      await expect(
        service.uploadFromZip(invalidZip.buffer, {
          name: 'Test Skill',
          type: 'skill',
          original_format: 'claude_code',
          content: '',
        })
      ).rejects.toThrow();
    });
  });

  describe('downloadAsZip', () => {
    it('should throw error for non-existent skill', async () => {
      mockDb.prepare = vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(null),
        }),
      });

      await expect(service.downloadAsZip('nonexistent')).rejects.toThrow('Skill not found');
    });
  });
});
