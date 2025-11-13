import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConfigRepository } from '../../src/infrastructure/database';
import { createMockD1Database } from '../test-utils';
import type { CreateConfigInput, SlashCommandAnalysis } from '../../src/domain/types';

describe('ConfigRepository - Edge Cases', () => {
  let mockDb: D1Database;
  let repo: ConfigRepository;

  beforeEach(() => {
    mockDb = createMockD1Database();
    repo = new ConfigRepository(mockDb);
  });

  describe('create with analysis', () => {
    it('should create config with slash command analysis', async () => {
      const input: CreateConfigInput = {
        name: 'analyze-command',
        type: 'slash_command',
        original_format: 'claude_code',
        content: '---\nname: test\n---\nTest $ARGUMENTS',
      };

      const analysis: SlashCommandAnalysis = {
        hasArguments: true,
        argumentHint: 'Optional description',
        agentReferences: ['agent1', 'agent2'],
        skillReferences: ['skill1'],
      };

      mockDb.prepare = vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          run: vi.fn().mockResolvedValue({ success: true }),
        }),
      });

      const config = await repo.create(input, analysis);

      expect(config.id).toBeDefined();
      expect(config.has_arguments).toBe(true);
      expect(config.argument_hint).toBe('Optional description');
      expect(config.agent_references).toBe(JSON.stringify(['agent1', 'agent2']));
      expect(config.skill_references).toBe(JSON.stringify(['skill1']));
      expect(config.analysis_version).toBe('1.0');

      // Verify correct SQL was called
      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining('has_arguments')
      );
    });

    it('should handle analysis with no references', async () => {
      const input: CreateConfigInput = {
        name: 'simple-command',
        type: 'slash_command',
        original_format: 'claude_code',
        content: 'Simple command',
      };

      const analysis: SlashCommandAnalysis = {
        hasArguments: false,
        argumentHint: null,
        agentReferences: [],
        skillReferences: [],
      };

      mockDb.prepare = vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          run: vi.fn().mockResolvedValue({ success: true }),
        }),
      });

      const config = await repo.create(input, analysis);

      expect(config.has_arguments).toBe(false);
      expect(config.argument_hint).toBeNull();
      expect(config.agent_references).toBeUndefined();
      expect(config.skill_references).toBeUndefined();
    });

    it('should handle analysis with only agent references', async () => {
      const input: CreateConfigInput = {
        name: 'test-command',
        type: 'slash_command',
        original_format: 'claude_code',
        content: 'Test content',
      };

      const analysis: SlashCommandAnalysis = {
        hasArguments: false,
        argumentHint: null,
        agentReferences: ['code-reviewer'],
        skillReferences: [],
      };

      mockDb.prepare = vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          run: vi.fn().mockResolvedValue({ success: true }),
        }),
      });

      const config = await repo.create(input, analysis);

      expect(config.agent_references).toBe(JSON.stringify(['code-reviewer']));
      expect(config.skill_references).toBeUndefined();
    });

    it('should handle analysis with only skill references', async () => {
      const input: CreateConfigInput = {
        name: 'test-command',
        type: 'slash_command',
        original_format: 'claude_code',
        content: 'Test content',
      };

      const analysis: SlashCommandAnalysis = {
        hasArguments: false,
        argumentHint: null,
        agentReferences: [],
        skillReferences: ['skill-name'],
      };

      mockDb.prepare = vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          run: vi.fn().mockResolvedValue({ success: true }),
        }),
      });

      const config = await repo.create(input, analysis);

      expect(config.agent_references).toBeUndefined();
      expect(config.skill_references).toBe(JSON.stringify(['skill-name']));
    });
  });

  describe('findAll with filters', () => {
    it('should filter by type', async () => {
      const mockConfigs = [
        {
          id: '1',
          name: 'cmd1',
          type: 'slash_command',
          original_format: 'claude_code',
          content: 'content1',
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        },
      ];

      mockDb.prepare = vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          all: vi.fn().mockResolvedValue({ results: mockConfigs, success: true }),
        }),
      });

      const configs = await repo.findAll({ type: 'slash_command' });

      expect(configs).toEqual(mockConfigs);
      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining('WHERE type = ?')
      );
    });

    it('should filter by original format', async () => {
      const mockConfigs = [
        {
          id: '1',
          name: 'cmd1',
          type: 'slash_command',
          original_format: 'gemini',
          content: 'content1',
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        },
      ];

      mockDb.prepare = vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          all: vi.fn().mockResolvedValue({ results: mockConfigs, success: true }),
        }),
      });

      const configs = await repo.findAll({ originalFormat: 'gemini' });

      expect(configs).toEqual(mockConfigs);
      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining('WHERE original_format = ?')
      );
    });

    it('should filter by search name', async () => {
      const mockConfigs = [
        {
          id: '1',
          name: 'test-command',
          type: 'slash_command',
          original_format: 'claude_code',
          content: 'content1',
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        },
      ];

      mockDb.prepare = vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          all: vi.fn().mockResolvedValue({ results: mockConfigs, success: true }),
        }),
      });

      const configs = await repo.findAll({ searchName: 'test' });

      expect(configs).toEqual(mockConfigs);
      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining('name LIKE ?')
      );
    });

    it('should combine multiple filters', async () => {
      const mockConfigs = [
        {
          id: '1',
          name: 'test-command',
          type: 'slash_command',
          original_format: 'claude_code',
          content: 'content1',
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        },
      ];

      mockDb.prepare = vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          all: vi.fn().mockResolvedValue({ results: mockConfigs, success: true }),
        }),
      });

      const configs = await repo.findAll({
        type: 'slash_command',
        originalFormat: 'claude_code',
        searchName: 'test',
      });

      expect(configs).toEqual(mockConfigs);
      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining('WHERE')
      );
      const call = (mockDb.prepare as any).mock.calls[0][0];
      expect(call).toContain('type = ?');
      expect(call).toContain('original_format = ?');
      expect(call).toContain('name LIKE ?');
    });
  });

  describe('update edge cases', () => {
    it('should update only provided fields', async () => {
      const mockConfig = {
        id: 'test-id',
        name: 'updated-name',
        type: 'slash_command',
        original_format: 'claude_code',
        content: 'original content',
        created_at: '2024-01-01',
        updated_at: '2024-01-02',
      };

      mockDb.prepare = vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          run: vi.fn().mockResolvedValue({ success: true, meta: { changes: 1 } }),
          first: vi.fn().mockResolvedValue(mockConfig),
        }),
      });

      const updated = await repo.update('test-id', { name: 'updated-name' });

      expect(updated).toEqual(mockConfig);
    });

    it('should handle update with all fields', async () => {
      const mockConfig = {
        id: 'test-id',
        name: 'new-name',
        type: 'mcp_config',
        original_format: 'gemini',
        content: 'new content',
        created_at: '2024-01-01',
        updated_at: '2024-01-03',
      };

      mockDb.prepare = vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          run: vi.fn().mockResolvedValue({ success: true, meta: { changes: 1 } }),
          first: vi.fn().mockResolvedValue(mockConfig),
        }),
      });

      const updated = await repo.update('test-id', {
        name: 'new-name',
        type: 'mcp_config',
        original_format: 'gemini',
        content: 'new content',
      });

      expect(updated?.name).toBe('new-name');
      expect(updated?.type).toBe('mcp_config');
    });

    it('should return null when updating non-existent config', async () => {
      mockDb.prepare = vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          run: vi.fn().mockResolvedValue({ success: true, meta: { changes: 0 } }),
          first: vi.fn().mockResolvedValue(null),
        }),
      });

      const updated = await repo.update('nonexistent', { name: 'test' });

      expect(updated).toBeNull();
    });
  });

  describe('delete edge cases', () => {
    it('should return true when deleting existing config', async () => {
      mockDb.prepare = vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          run: vi.fn().mockResolvedValue({ success: true, meta: { changes: 1 } }),
        }),
      });

      const result = await repo.delete('existing-id');

      expect(result).toBe(true);
      expect(mockDb.prepare).toHaveBeenCalledWith('DELETE FROM configs WHERE id = ?');
    });

    it('should return false when deleting non-existent config', async () => {
      mockDb.prepare = vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          run: vi.fn().mockResolvedValue({ success: true, meta: { changes: 0 } }),
        }),
      });

      const result = await repo.delete('nonexistent-id');

      expect(result).toBe(false);
    });
  });

  describe('error handling', () => {
    it('should handle database errors during create', async () => {
      mockDb.prepare = vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          run: vi.fn().mockRejectedValue(new Error('Database error')),
        }),
      });

      await expect(
        repo.create({
          name: 'test',
          type: 'slash_command',
          original_format: 'claude_code',
          content: 'test',
        })
      ).rejects.toThrow('Database error');
    });

    it('should handle database errors during findById', async () => {
      mockDb.prepare = vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockRejectedValue(new Error('Database error')),
        }),
      });

      await expect(repo.findById('test-id')).rejects.toThrow('Database error');
    });

    it('should handle database errors during findAll', async () => {
      mockDb.prepare = vi.fn().mockReturnValue({
        all: vi.fn().mockRejectedValue(new Error('Database error')),
      });

      await expect(repo.findAll()).rejects.toThrow('Database error');
    });

    it('should handle database errors during update', async () => {
      mockDb.prepare = vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          run: vi.fn().mockRejectedValue(new Error('Database error')),
          first: vi.fn().mockRejectedValue(new Error('Database error')),
        }),
      });

      await expect(repo.update('test-id', { name: 'test' })).rejects.toThrow();
    });

    it('should handle database errors during delete', async () => {
      mockDb.prepare = vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          run: vi.fn().mockRejectedValue(new Error('Database error')),
        }),
      });

      await expect(repo.delete('test-id')).rejects.toThrow('Database error');
    });
  });
});
