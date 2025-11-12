import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FileGenerationService } from '../../src/services/file-generation-service';
import { createMockD1Database, createMockR2Bucket, sampleExtension } from '../test-utils';
import type { ExtensionWithConfigs } from '../../src/domain/types';

describe('FileGenerationService', () => {
  let service: FileGenerationService;
  let mockDb: D1Database;
  let mockR2: R2Bucket;

  beforeEach(() => {
    mockDb = createMockD1Database();
    mockR2 = createMockR2Bucket();
    service = new FileGenerationService({
      DB: mockDb,
      EXTENSION_FILES: mockR2,
    });
  });

  describe('Constructor', () => {
    it('should create service with required dependencies', () => {
      expect(service).toBeDefined();
    });
  });

  describe('generateExtensionFiles', () => {
    it('should generate Claude Code files for extension', async () => {
      const extension: ExtensionWithConfigs = {
        ...sampleExtension,
        configs: [
          {
            id: 'cmd-1',
            name: 'test-command',
            type: 'slash_command',
            original_format: 'claude_code',
            content: '---\nname: test\n---\nTest content',
            created_at: '2024-01-01',
            updated_at: '2024-01-01',
          },
        ],
      };

      // Mock database operations
      mockDb.prepare = vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          run: vi.fn().mockResolvedValue({ success: true }),
        }),
      });

      const fileMap = await service.generateExtensionFiles(extension, 'claude_code');

      expect(fileMap).toBeDefined();
      expect(fileMap.size).toBeGreaterThan(0);
      expect(mockR2.put).toHaveBeenCalled();
    });

    it('should generate Gemini files for extension', async () => {
      const extension: ExtensionWithConfigs = {
        ...sampleExtension,
        configs: [
          {
            id: 'cmd-1',
            name: 'test-command',
            type: 'slash_command',
            original_format: 'gemini',
            content: 'description = "Test"\nprompt = "Test content"',
            created_at: '2024-01-01',
            updated_at: '2024-01-01',
          },
        ],
      };

      mockDb.prepare = vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          run: vi.fn().mockResolvedValue({ success: true }),
        }),
      });

      const fileMap = await service.generateExtensionFiles(extension, 'gemini');

      expect(fileMap).toBeDefined();
      expect(fileMap.size).toBeGreaterThan(0);
      expect(mockR2.put).toHaveBeenCalled();
    });

    it('should generate command files for slash commands', async () => {
      const extension: ExtensionWithConfigs = {
        ...sampleExtension,
        configs: [
          {
            id: 'cmd-1',
            name: 'code-review',
            type: 'slash_command',
            original_format: 'claude_code',
            content: 'Test command',
            created_at: '2024-01-01',
            updated_at: '2024-01-01',
          },
          {
            id: 'cmd-2',
            name: 'run-tests',
            type: 'slash_command',
            original_format: 'claude_code',
            content: 'Another command',
            created_at: '2024-01-01',
            updated_at: '2024-01-01',
          },
        ],
      };

      mockDb.prepare = vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          run: vi.fn().mockResolvedValue({ success: true }),
        }),
      });

      await service.generateExtensionFiles(extension, 'claude_code');

      // Should generate plugin.json and command files
      expect(mockR2.put).toHaveBeenCalled();
      const putCalls = (mockR2.put as any).mock.calls;
      const keys = putCalls.map((call: any) => call[0]);

      // Check for manifest and command files
      expect(keys.some((k: string) => k.includes('.claude-plugin/plugin.json'))).toBe(true);
      expect(keys.some((k: string) => k.includes('commands/'))).toBe(true);
    });

    it('should generate agent files for agent definitions', async () => {
      const extension: ExtensionWithConfigs = {
        ...sampleExtension,
        configs: [
          {
            id: 'agent-1',
            name: 'test-agent',
            type: 'agent_definition',
            original_format: 'claude_code',
            content: 'Agent content',
            created_at: '2024-01-01',
            updated_at: '2024-01-01',
          },
        ],
      };

      mockDb.prepare = vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          run: vi.fn().mockResolvedValue({ success: true }),
        }),
      });

      await service.generateExtensionFiles(extension, 'claude_code');

      const putCalls = (mockR2.put as any).mock.calls;
      const keys = putCalls.map((call: any) => call[0]);

      expect(keys.some((k: string) => k.includes('agents/'))).toBe(true);
    });

    it('should generate MCP config file', async () => {
      const extension: ExtensionWithConfigs = {
        ...sampleExtension,
        configs: [
          {
            id: 'mcp-1',
            name: 'test-mcp',
            type: 'mcp_config',
            original_format: 'claude_code',
            content: JSON.stringify({
              mcpServers: {
                'test-server': {
                  type: 'stdio',
                  command: 'test',
                },
              },
            }),
            created_at: '2024-01-01',
            updated_at: '2024-01-01',
          },
        ],
      };

      mockDb.prepare = vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          run: vi.fn().mockResolvedValue({ success: true }),
        }),
      });

      await service.generateExtensionFiles(extension, 'claude_code');

      const putCalls = (mockR2.put as any).mock.calls;
      const keys = putCalls.map((call: any) => call[0]);

      expect(keys.some((k: string) => k.includes('.mcp.json'))).toBe(true);
    });

    it('should generate skill files with companion files', async () => {
      const extension: ExtensionWithConfigs = {
        ...sampleExtension,
        configs: [
          {
            id: 'skill-1',
            name: 'test-skill',
            type: 'skill',
            original_format: 'claude_code',
            content: 'Skill content',
            created_at: '2024-01-01',
            updated_at: '2024-01-01',
          },
        ],
      };

      // Mock skill files repository
      mockDb.prepare = vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          run: vi.fn().mockResolvedValue({ success: true }),
          all: vi.fn().mockResolvedValue({
            results: [
              {
                id: 'file-1',
                skill_id: 'skill-1',
                file_path: 'helper.py',
                r2_key: 'skills/skill-1/files/helper.py',
                mime_type: 'text/x-python',
                created_at: '2024-01-01',
              },
            ],
            success: true,
          }),
        }),
      });

      // Mock R2 get for companion file
      const mockFileContent = new TextEncoder().encode('print("helper")');
      (mockR2.get as any).mockResolvedValue({
        arrayBuffer: async () => mockFileContent.buffer,
      });

      await service.generateExtensionFiles(extension, 'claude_code');

      const putCalls = (mockR2.put as any).mock.calls;
      const keys = putCalls.map((call: any) => call[0]);

      expect(keys.some((k: string) => k.includes('skills/'))).toBe(true);
    });

    it('should generate GEMINI.md context file for Gemini format', async () => {
      const extension: ExtensionWithConfigs = {
        ...sampleExtension,
        description: 'Test description',
        configs: [
          {
            id: 'cmd-1',
            name: 'test',
            type: 'slash_command',
            original_format: 'gemini',
            content: 'test',
            created_at: '2024-01-01',
            updated_at: '2024-01-01',
          },
        ],
      };

      mockDb.prepare = vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          run: vi.fn().mockResolvedValue({ success: true }),
        }),
      });

      await service.generateExtensionFiles(extension, 'gemini');

      const putCalls = (mockR2.put as any).mock.calls;
      const keys = putCalls.map((call: any) => call[0]);

      expect(keys.some((k: string) => k.includes('GEMINI.md'))).toBe(true);
    });

    it('should sanitize filenames', async () => {
      const extension: ExtensionWithConfigs = {
        ...sampleExtension,
        configs: [
          {
            id: 'cmd-1',
            name: 'Test Command With Spaces!@#',
            type: 'slash_command',
            original_format: 'claude_code',
            content: 'test',
            created_at: '2024-01-01',
            updated_at: '2024-01-01',
          },
        ],
      };

      mockDb.prepare = vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          run: vi.fn().mockResolvedValue({ success: true }),
        }),
      });

      await service.generateExtensionFiles(extension, 'claude_code');

      const putCalls = (mockR2.put as any).mock.calls;
      const keys = putCalls.map((call: any) => call[0]);

      // Should convert to lowercase and replace special chars with dashes
      expect(keys.some((k: string) => k.includes('test-command-with-spaces'))).toBe(true);
    });

    it('should handle upload errors gracefully', async () => {
      const extension: ExtensionWithConfigs = {
        ...sampleExtension,
        configs: [
          {
            id: 'cmd-1',
            name: 'test',
            type: 'slash_command',
            original_format: 'claude_code',
            content: 'test',
            created_at: '2024-01-01',
            updated_at: '2024-01-01',
          },
        ],
      };

      mockDb.prepare = vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          run: vi.fn().mockResolvedValue({ success: true }),
        }),
      });

      // Mock R2 put to fail
      (mockR2.put as any).mockRejectedValue(new Error('Upload failed'));

      await expect(
        service.generateExtensionFiles(extension, 'claude_code')
      ).rejects.toThrow('Upload failed');
    });
  });

  describe('deleteExtensionFiles', () => {
    it('should delete all files for an extension', async () => {
      (mockR2.list as any).mockResolvedValue({
        objects: [
          { key: 'extensions/ext-1/claude_code/file1.md' },
          { key: 'extensions/ext-1/claude_code/file2.md' },
        ],
      });

      mockDb.prepare = vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          all: vi.fn().mockResolvedValue({
            results: [
              { id: '1', file_path: 'claude_code/file1.md' },
              { id: '2', file_path: 'claude_code/file2.md' },
            ],
            success: true,
          }),
          run: vi.fn().mockResolvedValue({ success: true }),
        }),
      });

      await service.deleteExtensionFiles('ext-1');

      expect(mockR2.delete).toHaveBeenCalledTimes(2);
    });

    it('should delete files for specific format', async () => {
      (mockR2.list as any).mockResolvedValue({
        objects: [{ key: 'extensions/ext-1/claude_code/file1.md' }],
      });

      mockDb.prepare = vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          all: vi.fn().mockResolvedValue({
            results: [{ id: '1', file_path: 'claude_code/file1.md' }],
            success: true,
          }),
          run: vi.fn().mockResolvedValue({ success: true }),
        }),
      });

      await service.deleteExtensionFiles('ext-1', 'claude_code');

      expect(mockR2.delete).toHaveBeenCalled();
    });
  });

  describe('hasGeneratedFiles', () => {
    it('should return true when files exist', async () => {
      mockDb.prepare = vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          all: vi.fn().mockResolvedValue({
            results: [{ id: '1', file_path: 'claude_code/test.md' }],
            success: true,
          }),
        }),
      });

      const hasFiles = await service.hasGeneratedFiles('ext-1', 'claude_code');
      expect(hasFiles).toBe(true);
    });

    it('should return false when no files exist', async () => {
      mockDb.prepare = vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          all: vi.fn().mockResolvedValue({
            results: [],
            success: true,
          }),
        }),
      });

      const hasFiles = await service.hasGeneratedFiles('ext-1', 'claude_code');
      expect(hasFiles).toBe(false);
    });

    it('should return false when files exist for different format', async () => {
      mockDb.prepare = vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          all: vi.fn().mockResolvedValue({
            results: [{ id: '1', file_path: 'gemini/test.md' }],
            success: true,
          }),
        }),
      });

      const hasFiles = await service.hasGeneratedFiles('ext-1', 'claude_code');
      expect(hasFiles).toBe(false);
    });
  });

  describe('getGeneratedFiles', () => {
    it('should return all generated files for format', async () => {
      mockDb.prepare = vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          all: vi.fn().mockResolvedValue({
            results: [
              {
                id: '1',
                file_path: 'claude_code/commands/test.md',
                r2_key: 'extensions/ext-1/claude_code/commands/test.md',
                file_size: 1024,
                mime_type: 'text/markdown',
              },
              {
                id: '2',
                file_path: 'claude_code/.claude-plugin/plugin.json',
                r2_key: 'extensions/ext-1/claude_code/.claude-plugin/plugin.json',
                file_size: 512,
                mime_type: 'application/json',
              },
            ],
            success: true,
          }),
        }),
      });

      const files = await service.getGeneratedFiles('ext-1', 'claude_code');

      expect(files).toHaveLength(2);
      expect(files[0].path).toBe('commands/test.md');
      expect(files[0].r2Key).toBe('extensions/ext-1/claude_code/commands/test.md');
      expect(files[0].size).toBe(1024);
      expect(files[0].mimeType).toBe('text/markdown');
    });

    it('should filter by format', async () => {
      mockDb.prepare = vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          all: vi.fn().mockResolvedValue({
            results: [
              {
                id: '1',
                file_path: 'claude_code/test.md',
                r2_key: 'key1',
                file_size: 100,
                mime_type: 'text/markdown',
              },
              {
                id: '2',
                file_path: 'gemini/test.md',
                r2_key: 'key2',
                file_size: 100,
                mime_type: 'text/markdown',
              },
            ],
            success: true,
          }),
        }),
      });

      const files = await service.getGeneratedFiles('ext-1', 'claude_code');

      expect(files).toHaveLength(1);
      expect(files[0].path).toBe('test.md');
    });

    it('should return empty array when no files exist', async () => {
      mockDb.prepare = vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          all: vi.fn().mockResolvedValue({
            results: [],
            success: true,
          }),
        }),
      });

      const files = await service.getGeneratedFiles('ext-1', 'claude_code');
      expect(files).toHaveLength(0);
    });
  });
});
