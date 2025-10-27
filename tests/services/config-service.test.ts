import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConfigService } from '../../src/services/config-service';
import { createMockD1Database, createMockKVNamespace, sampleConfigs } from '../test-utils';

describe('ConfigService', () => {
  let mockDb: D1Database;
  let mockKV: KVNamespace;
  let service: ConfigService;

  beforeEach(() => {
    mockDb = createMockD1Database();
    mockKV = createMockKVNamespace();
    service = new ConfigService({ DB: mockDb, CONFIG_CACHE: mockKV });
  });

  describe('listConfigs', () => {
    it('should return all configs', async () => {
      const mockConfigs = [
        {
          id: '1',
          name: 'config1',
          type: 'slash_command',
          original_format: 'claude_code',
          content: 'content1',
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-01-01T00:00:00.000Z',
        },
        {
          id: '2',
          name: 'config2',
          type: 'mcp_config',
          original_format: 'gemini',
          content: 'content2',
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-01-01T00:00:00.000Z',
        },
      ];

      mockDb.prepare = vi.fn().mockReturnValue({
        all: vi.fn().mockResolvedValue({ results: mockConfigs, success: true }),
      });

      const configs = await service.listConfigs();
      expect(configs).toEqual(mockConfigs);
      expect(configs).toHaveLength(2);
    });

    it('should filter configs by type', async () => {
      const mockConfigs = [
        {
          id: '1',
          name: 'slash-cmd',
          type: 'slash_command',
          original_format: 'claude_code',
          content: 'content',
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-01-01T00:00:00.000Z',
        },
      ];

      mockDb.prepare = vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          all: vi.fn().mockResolvedValue({ results: mockConfigs, success: true }),
        }),
      });

      const configs = await service.listConfigs({ type: 'slash_command' });
      expect(configs).toHaveLength(1);
      expect(configs[0].type).toBe('slash_command');
    });

    it('should filter configs by original format', async () => {
      mockDb.prepare = vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          all: vi.fn().mockResolvedValue({ results: [], success: true }),
        }),
      });

      await service.listConfigs({ originalFormat: 'claude_code' });

      expect(mockDb.prepare).toHaveBeenCalled();
    });

    it('should filter configs by name search', async () => {
      mockDb.prepare = vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          all: vi.fn().mockResolvedValue({ results: [], success: true }),
        }),
      });

      await service.listConfigs({ searchName: 'test' });

      expect(mockDb.prepare).toHaveBeenCalled();
    });

    it('should return empty array when no configs exist', async () => {
      mockDb.prepare = vi.fn().mockReturnValue({
        all: vi.fn().mockResolvedValue({ results: [], success: true }),
      });

      const configs = await service.listConfigs();
      expect(configs).toEqual([]);
    });
  });

  describe('getConfig', () => {
    it('should return config by ID', async () => {
      const mockConfig = {
        id: 'test-id',
        name: 'test-config',
        type: 'slash_command',
        original_format: 'claude_code',
        content: 'test content',
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
      };

      mockDb.prepare = vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(mockConfig),
        }),
      });

      const config = await service.getConfig('test-id');
      expect(config).toEqual(mockConfig);
    });

    it('should return null when config not found', async () => {
      mockDb.prepare = vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(null),
        }),
      });

      const config = await service.getConfig('non-existent-id');
      expect(config).toBeNull();
    });
  });

  describe('createConfig', () => {
    it('should create a new config', async () => {
      const input = sampleConfigs.claudeCodeSlashCommand;
      const createdConfig = {
        id: 'new-id',
        ...input,
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
      };

      mockDb.prepare = vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          run: vi.fn().mockResolvedValue({ success: true }),
        }),
      });

      const config = await service.createConfig(input);

      expect(config.id).toBeDefined();
      expect(config.name).toBe(input.name);
      expect(config.type).toBe(input.type);
      expect(config.original_format).toBe(input.original_format);
      expect(config.content).toBe(input.content);
    });

    it('should throw error when required fields are missing', async () => {
      await expect(
        service.createConfig({
          name: '',
          type: 'slash_command',
          original_format: 'claude_code',
          content: '',
        })
      ).rejects.toThrow('Missing required fields');
    });

    it('should throw error when name is missing', async () => {
      await expect(
        service.createConfig({
          name: '',
          type: 'slash_command',
          original_format: 'claude_code',
          content: 'content',
        })
      ).rejects.toThrow();
    });

    it('should throw error when type is missing', async () => {
      await expect(
        service.createConfig({
          name: 'test',
          type: '' as any,
          original_format: 'claude_code',
          content: 'content',
        })
      ).rejects.toThrow();
    });
  });

  describe('updateConfig', () => {
    it('should update config and invalidate cache', async () => {
      const existingConfig = {
        id: 'test-id',
        name: 'old-name',
        type: 'slash_command',
        original_format: 'claude_code',
        content: 'old content',
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
      };

      const updatedConfig = { ...existingConfig, name: 'new-name' };

      mockDb.prepare = vi.fn()
        .mockReturnValueOnce({
          bind: vi.fn().mockReturnValue({
            first: vi.fn().mockResolvedValue(existingConfig),
          }),
        })
        .mockReturnValueOnce({
          bind: vi.fn().mockReturnValue({
            run: vi.fn().mockResolvedValue({ success: true }),
          }),
        })
        .mockReturnValueOnce({
          bind: vi.fn().mockReturnValue({
            first: vi.fn().mockResolvedValue(updatedConfig),
          }),
        });

      const config = await service.updateConfig('test-id', { name: 'new-name' });

      expect(config?.name).toBe('new-name');
      expect(mockKV.delete).toHaveBeenCalled();
    });

    it('should return null when config does not exist', async () => {
      mockDb.prepare = vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(null),
        }),
      });

      const config = await service.updateConfig('non-existent-id', { name: 'new-name' });
      expect(config).toBeNull();
    });

    it('should not invalidate cache when update fails', async () => {
      mockDb.prepare = vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(null),
        }),
      });

      await service.updateConfig('test-id', { name: 'new-name' });

      // Cache invalidation should not be called
      expect(mockKV.delete).not.toHaveBeenCalled();
    });
  });

  describe('deleteConfig', () => {
    it('should delete config and invalidate cache', async () => {
      mockDb.prepare = vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          run: vi.fn().mockResolvedValue({ success: true }),
        }),
      });

      const result = await service.deleteConfig('test-id');

      expect(result).toBe(true);
      expect(mockKV.delete).toHaveBeenCalled();
    });

    it('should return false when deletion fails', async () => {
      mockDb.prepare = vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          run: vi.fn().mockResolvedValue({ success: false }),
        }),
      });

      const result = await service.deleteConfig('test-id');
      expect(result).toBe(false);
    });

    it('should not invalidate cache when deletion fails', async () => {
      mockDb.prepare = vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          run: vi.fn().mockResolvedValue({ success: false }),
        }),
      });

      await service.deleteConfig('test-id');

      // Cache should not be invalidated
      expect(mockKV.delete).not.toHaveBeenCalled();
    });
  });

  describe('invalidateCache', () => {
    it('should invalidate all cached conversions', async () => {
      await service.invalidateCache('test-id');

      expect(mockKV.delete).toHaveBeenCalled();
    });

    it('should not throw error for non-existent config', async () => {
      await expect(service.invalidateCache('non-existent-id')).resolves.not.toThrow();
    });
  });

  describe('getCachedConversion', () => {
    it('should return cached conversion when available', async () => {
      await mockKV.put('config:test-id:codex', 'cached content');

      const cached = await service.getCachedConversion('test-id', 'codex');
      expect(cached).toBe('cached content');
    });

    it('should return null when no cache exists', async () => {
      const cached = await service.getCachedConversion('test-id', 'codex');
      expect(cached).toBeNull();
    });

    it('should distinguish between different formats', async () => {
      await mockKV.put('config:test-id:claude_code', 'claude content');
      await mockKV.put('config:test-id:codex', 'codex content');

      const claudeCached = await service.getCachedConversion('test-id', 'claude_code');
      const codexCached = await service.getCachedConversion('test-id', 'codex');

      expect(claudeCached).toBe('claude content');
      expect(codexCached).toBe('codex content');
    });
  });
});
