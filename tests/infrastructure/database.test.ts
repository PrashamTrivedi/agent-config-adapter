import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConfigRepository } from '../../src/infrastructure/database';
import { createMockD1Database, sampleConfigs } from '../test-utils';

describe('ConfigRepository', () => {
  let mockDb: D1Database;
  let repo: ConfigRepository;

  beforeEach(() => {
    mockDb = createMockD1Database();
    repo = new ConfigRepository(mockDb);
  });

  describe('create', () => {
    it('should create a new config with generated ID', async () => {
      const input = sampleConfigs.claudeCodeSlashCommand;
      const config = await repo.create(input);

      expect(config.id).toBeDefined();
      expect(config.name).toBe(input.name);
      expect(config.type).toBe(input.type);
      expect(config.original_format).toBe(input.original_format);
      expect(config.content).toBe(input.content);
      expect(config.created_at).toBeDefined();
      expect(config.updated_at).toBeDefined();
    });

    it('should call database prepare with correct INSERT statement', async () => {
      const input = sampleConfigs.claudeCodeSlashCommand;
      await repo.create(input);

      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO configs')
      );
    });

    it('should generate unique IDs for different configs', async () => {
      const config1 = await repo.create(sampleConfigs.claudeCodeSlashCommand);
      const config2 = await repo.create(sampleConfigs.codexSlashCommand);

      expect(config1.id).toBeDefined();
      expect(config2.id).toBeDefined();
      expect(config1.id).not.toBe(config2.id);
    });
  });

  describe('findById', () => {
    it('should return null when config not found', async () => {
      const config = await repo.findById('non-existent-id');
      expect(config).toBeNull();
    });

    it('should call database with correct SELECT statement', async () => {
      await repo.findById('test-id');

      expect(mockDb.prepare).toHaveBeenCalledWith(
        'SELECT * FROM configs WHERE id = ?'
      );
    });

    it('should return config when found', async () => {
      const mockConfig = {
        id: 'test-id',
        name: 'test',
        type: 'slash_command',
        original_format: 'claude_code',
        content: 'test content',
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
      };

      // Mock the database response
      mockDb.prepare = vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(mockConfig),
        }),
      });

      const config = await repo.findById('test-id');
      expect(config).toEqual(mockConfig);
    });
  });

  describe('findAll', () => {
    it('should return all configs when no filters provided', async () => {
      const mockConfigs = [
        { id: '1', name: 'config1', type: 'slash_command' },
        { id: '2', name: 'config2', type: 'mcp_config' },
      ];

      mockDb.prepare = vi.fn().mockReturnValue({
        all: vi.fn().mockResolvedValue({ results: mockConfigs, success: true }),
      });

      const configs = await repo.findAll();
      expect(configs).toEqual(mockConfigs);
      expect(mockDb.prepare).toHaveBeenCalledWith(
        'SELECT * FROM configs ORDER BY created_at DESC'
      );
    });

    it('should filter by type', async () => {
      const mockConfigs = [{ id: '1', name: 'config1', type: 'slash_command' }];

      mockDb.prepare = vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          all: vi.fn().mockResolvedValue({ results: mockConfigs, success: true }),
        }),
      });

      await repo.findAll({ type: 'slash_command' });

      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining('WHERE type = ?')
      );
    });

    it('should filter by original_format', async () => {
      const mockConfigs = [{ id: '1', name: 'config1', original_format: 'claude_code' }];

      mockDb.prepare = vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          all: vi.fn().mockResolvedValue({ results: mockConfigs, success: true }),
        }),
      });

      await repo.findAll({ originalFormat: 'claude_code' });

      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining('WHERE original_format = ?')
      );
    });

    it('should filter by name search', async () => {
      mockDb.prepare = vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          all: vi.fn().mockResolvedValue({ results: [], success: true }),
        }),
      });

      await repo.findAll({ searchName: 'test' });

      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining('WHERE name LIKE ?')
      );
    });

    it('should combine multiple filters with AND', async () => {
      mockDb.prepare = vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          all: vi.fn().mockResolvedValue({ results: [], success: true }),
        }),
      });

      await repo.findAll({
        type: 'slash_command',
        originalFormat: 'claude_code',
        searchName: 'test',
      });

      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringMatching(/WHERE.*AND.*AND/)
      );
    });

    it('should return empty array when no results', async () => {
      mockDb.prepare = vi.fn().mockReturnValue({
        all: vi.fn().mockResolvedValue({ results: [], success: true }),
      });

      const configs = await repo.findAll();
      expect(configs).toEqual([]);
    });
  });

  describe('update', () => {
    it('should return null when config does not exist', async () => {
      const updated = await repo.update('non-existent-id', { name: 'new name' });
      expect(updated).toBeNull();
    });

    it('should update name field', async () => {
      const existingConfig = {
        id: 'test-id',
        name: 'old name',
        type: 'slash_command',
        original_format: 'claude_code',
        content: 'content',
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
      };

      mockDb.prepare = vi.fn()
        .mockReturnValueOnce({
          bind: vi.fn().mockReturnValue({
            first: vi.fn().mockResolvedValue(existingConfig),
          }),
        })
        .mockReturnValueOnce({
          bind: vi.fn().mockReturnValue({
            run: vi.fn().mockResolvedValue({ success: true, meta: { changes: 1 } }),
          }),
        })
        .mockReturnValueOnce({
          bind: vi.fn().mockReturnValue({
            first: vi.fn().mockResolvedValue({ ...existingConfig, name: 'new name' }),
          }),
        });

      const updated = await repo.update('test-id', { name: 'new name' });

      expect(updated).toBeDefined();
      expect(updated?.name).toBe('new name');
    });

    it('should update multiple fields', async () => {
      const existingConfig = {
        id: 'test-id',
        name: 'old name',
        type: 'slash_command',
        original_format: 'claude_code',
        content: 'old content',
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
      };

      mockDb.prepare = vi.fn()
        .mockReturnValueOnce({
          bind: vi.fn().mockReturnValue({
            first: vi.fn().mockResolvedValue(existingConfig),
          }),
        })
        .mockReturnValueOnce({
          bind: vi.fn().mockReturnValue({
            run: vi.fn().mockResolvedValue({ success: true, meta: { changes: 1 } }),
          }),
        })
        .mockReturnValueOnce({
          bind: vi.fn().mockReturnValue({
            first: vi.fn().mockResolvedValue({
              ...existingConfig,
              name: 'new name',
              content: 'new content',
            }),
          }),
        });

      const updated = await repo.update('test-id', {
        name: 'new name',
        content: 'new content',
      });

      expect(updated?.name).toBe('new name');
      expect(updated?.content).toBe('new content');
    });

    it('should return existing config when no updates provided', async () => {
      const existingConfig = {
        id: 'test-id',
        name: 'name',
        type: 'slash_command',
        original_format: 'claude_code',
        content: 'content',
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
      };

      mockDb.prepare = vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(existingConfig),
        }),
      });

      const updated = await repo.update('test-id', {});
      expect(updated).toEqual(existingConfig);
    });

    it('should call UPDATE with correct fields', async () => {
      const existingConfig = {
        id: 'test-id',
        name: 'old name',
        type: 'slash_command',
        original_format: 'claude_code',
        content: 'content',
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
      };

      mockDb.prepare = vi.fn()
        .mockReturnValueOnce({
          bind: vi.fn().mockReturnValue({
            first: vi.fn().mockResolvedValue(existingConfig),
          }),
        })
        .mockReturnValueOnce({
          bind: vi.fn().mockReturnValue({
            run: vi.fn().mockResolvedValue({ success: true, meta: { changes: 1 } }),
          }),
        })
        .mockReturnValueOnce({
          bind: vi.fn().mockReturnValue({
            first: vi.fn().mockResolvedValue(existingConfig),
          }),
        });

      await repo.update('test-id', { name: 'new name' });

      const updateCall = (mockDb.prepare as any).mock.calls.find((call: any) =>
        call[0].includes('UPDATE configs SET')
      );
      expect(updateCall).toBeDefined();
      expect(updateCall[0]).toContain('name = ?');
      expect(updateCall[0]).toContain('updated_at = ?');
    });
  });

  describe('delete', () => {
    it('should call DELETE with correct statement', async () => {
      await repo.delete('test-id');

      expect(mockDb.prepare).toHaveBeenCalledWith(
        'DELETE FROM configs WHERE id = ?'
      );
    });

    it('should return success status', async () => {
      mockDb.prepare = vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          run: vi.fn().mockResolvedValue({ success: true, meta: { changes: 1 } }),
        }),
      });

      const result = await repo.delete('test-id');
      expect(result).toBe(true);
    });

    it('should return false when deletion fails', async () => {
      mockDb.prepare = vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          run: vi.fn().mockResolvedValue({ success: false }),
        }),
      });

      const result = await repo.delete('test-id');
      expect(result).toBe(false);
    });
  });
});
