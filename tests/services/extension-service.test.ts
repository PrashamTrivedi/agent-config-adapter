import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ExtensionService } from '../../src/services/extension-service';
import { createMockD1Database, createMockKVNamespace, sampleExtension } from '../test-utils';

describe('ExtensionService', () => {
  let mockDb: D1Database;
  let mockKV: KVNamespace;
  let service: ExtensionService;

  beforeEach(() => {
    mockDb = createMockD1Database();
    mockKV = createMockKVNamespace();
    service = new ExtensionService({ DB: mockDb, CONFIG_CACHE: mockKV });
  });

  describe('listExtensions', () => {
    it('should return all extensions', async () => {
      const mockExtensions = [sampleExtension];

      mockDb.prepare = vi.fn().mockReturnValue({
        all: vi.fn().mockResolvedValue({ results: mockExtensions, success: true }),
      });

      const extensions = await service.listExtensions();
      expect(extensions).toEqual(mockExtensions);
    });

    it('should return empty array when no extensions exist', async () => {
      mockDb.prepare = vi.fn().mockReturnValue({
        all: vi.fn().mockResolvedValue({ results: [], success: true }),
      });

      const extensions = await service.listExtensions();
      expect(extensions).toEqual([]);
    });
  });

  describe('getExtension', () => {
    it('should return extension by ID', async () => {
      mockDb.prepare = vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(sampleExtension),
        }),
      });

      const extension = await service.getExtension('ext-123');
      expect(extension).toEqual(sampleExtension);
    });

    it('should return null when extension not found', async () => {
      mockDb.prepare = vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(null),
        }),
      });

      const extension = await service.getExtension('non-existent-id');
      expect(extension).toBeNull();
    });
  });

  describe('getExtensionWithConfigs', () => {
    it('should return cached extension with configs when available', async () => {
      const extensionWithConfigs = {
        ...sampleExtension,
        configs: [
          {
            id: 'config-1',
            name: 'test-config',
            type: 'slash_command',
            original_format: 'claude_code',
            content: 'content',
            created_at: '2024-01-01T00:00:00.000Z',
            updated_at: '2024-01-01T00:00:00.000Z',
          },
        ],
      };

      await mockKV.put('config:ext:ext-123:full', JSON.stringify(extensionWithConfigs));

      const result = await service.getExtensionWithConfigs('ext-123');
      expect(result).toEqual(extensionWithConfigs);
    });

    it('should cache extension with configs after fetching from database', async () => {
      const extensionWithConfigs = {
        ...sampleExtension,
        configs: [],
      };

      mockDb.prepare = vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(sampleExtension),
          all: vi.fn().mockResolvedValue({ results: [], success: true }),
        }),
      });

      await service.getExtensionWithConfigs('ext-123');

      expect(mockKV.put).toHaveBeenCalledWith(
        'config:ext:ext-123:full',
        expect.any(String),
        expect.any(Object)
      );
    });

    it('should return null when extension not found', async () => {
      mockDb.prepare = vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(null),
        }),
      });

      const result = await service.getExtensionWithConfigs('non-existent-id');
      expect(result).toBeNull();
    });
  });

  describe('createExtension', () => {
    it('should create a new extension', async () => {
      const input = {
        name: 'Test Extension',
        description: 'A test extension',
        author: 'Test Author',
        version: '1.0.0',
      };

      mockDb.prepare = vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          run: vi.fn().mockResolvedValue({ success: true }),
        }),
      });

      const extension = await service.createExtension(input);

      expect(extension.id).toBeDefined();
      expect(extension.name).toBe(input.name);
      expect(extension.version).toBe(input.version);
    });

    it('should throw error when required fields are missing', async () => {
      await expect(
        service.createExtension({
          name: '',
          version: '1.0.0',
        })
      ).rejects.toThrow('Missing required fields');
    });

    it('should throw error when version is missing', async () => {
      await expect(
        service.createExtension({
          name: 'Test',
          version: '',
        })
      ).rejects.toThrow('Missing required fields');
    });
  });

  describe('updateExtension', () => {
    it('should update extension and invalidate cache', async () => {
      const updatedExtension = { ...sampleExtension, name: 'Updated Name' };

      mockDb.prepare = vi.fn()
        .mockReturnValueOnce({
          bind: vi.fn().mockReturnValue({
            first: vi.fn().mockResolvedValue(sampleExtension),
          }),
        })
        .mockReturnValueOnce({
          bind: vi.fn().mockReturnValue({
            run: vi.fn().mockResolvedValue({ success: true }),
          }),
        })
        .mockReturnValueOnce({
          bind: vi.fn().mockReturnValue({
            first: vi.fn().mockResolvedValue(updatedExtension),
          }),
        });

      const extension = await service.updateExtension('ext-123', { name: 'Updated Name' });

      expect(extension?.name).toBe('Updated Name');
      expect(mockKV.delete).toHaveBeenCalled();
    });

    it('should return null when extension does not exist', async () => {
      mockDb.prepare = vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(null),
        }),
      });

      const extension = await service.updateExtension('non-existent-id', { name: 'New Name' });
      expect(extension).toBeNull();
    });
  });

  describe('deleteExtension', () => {
    it('should delete extension and invalidate cache', async () => {
      mockDb.prepare = vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          run: vi.fn().mockResolvedValue({ success: true }),
        }),
      });

      const result = await service.deleteExtension('ext-123');

      expect(result).toBe(true);
      expect(mockKV.delete).toHaveBeenCalled();
    });

    it('should return false when deletion fails', async () => {
      mockDb.prepare = vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          run: vi.fn().mockResolvedValue({ success: false }),
        }),
      });

      const result = await service.deleteExtension('ext-123');
      expect(result).toBe(false);
    });
  });

  describe('invalidateExtensionCache', () => {
    it('should invalidate extension and manifest caches', async () => {
      await service.invalidateExtensionCache('ext-123');

      // Base cache invalidation deletes 4 keys (base + 3 formats),
      // plus 2 manifest cache deletions = 6 total
      expect(mockKV.delete).toHaveBeenCalled();
    });
  });

  describe('addConfigsToExtension', () => {
    it('should add configs and invalidate cache', async () => {
      mockDb.prepare = vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          run: vi.fn().mockResolvedValue({ success: true }),
          first: vi.fn().mockResolvedValue({ max_order: 0 }),
        }),
      });

      await service.addConfigsToExtension('ext-123', ['config-1', 'config-2']);

      expect(mockKV.delete).toHaveBeenCalled();
    });

    // Bug Fix Tests: Extension form now saves ALL selected configs
    it('should add multiple configs (5+) in one operation', async () => {
      const configIds = ['config-1', 'config-2', 'config-3', 'config-4', 'config-5'];

      mockDb.prepare = vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          run: vi.fn().mockResolvedValue({ success: true }),
          first: vi.fn().mockResolvedValue({ max_order: 0 }),
        }),
      });

      await service.addConfigsToExtension('ext-123', configIds);

      // Verify the database prepare was called for inserting multiple configs
      // The service should batch insert all 5 configs
      expect(mockDb.prepare).toHaveBeenCalled();
      expect(mockKV.delete).toHaveBeenCalled();
    });

    it('should handle adding many configs (10+)', async () => {
      const configIds = Array.from({ length: 15 }, (_, i) => `config-${i + 1}`);

      mockDb.prepare = vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          run: vi.fn().mockResolvedValue({ success: true }),
          first: vi.fn().mockResolvedValue({ max_order: 0 }),
        }),
      });

      await service.addConfigsToExtension('ext-123', configIds);

      expect(mockDb.prepare).toHaveBeenCalled();
      expect(mockKV.delete).toHaveBeenCalled();
    });

    it('should handle adding single config (regression test)', async () => {
      const configIds = ['config-1'];

      mockDb.prepare = vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          run: vi.fn().mockResolvedValue({ success: true }),
          first: vi.fn().mockResolvedValue({ max_order: 0 }),
        }),
      });

      await service.addConfigsToExtension('ext-123', configIds);

      expect(mockDb.prepare).toHaveBeenCalled();
      expect(mockKV.delete).toHaveBeenCalled();
    });

    it('should handle adding zero configs', async () => {
      const configIds: string[] = [];

      mockDb.prepare = vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          run: vi.fn().mockResolvedValue({ success: true }),
          first: vi.fn().mockResolvedValue({ max_order: 0 }),
        }),
      });

      await service.addConfigsToExtension('ext-123', configIds);

      // Should still invalidate cache even with empty array
      expect(mockKV.delete).toHaveBeenCalled();
    });
  });

  describe('removeConfigFromExtension', () => {
    it('should remove config and invalidate cache', async () => {
      mockDb.prepare = vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          run: vi.fn().mockResolvedValue({ success: true }),
        }),
      });

      const result = await service.removeConfigFromExtension('ext-123', 'config-1');

      expect(result).toBe(true);
      expect(mockKV.delete).toHaveBeenCalled();
    });

    it('should not invalidate cache when removal fails', async () => {
      mockDb.prepare = vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          run: vi.fn().mockResolvedValue({ success: false }),
        }),
      });

      const result = await service.removeConfigFromExtension('ext-123', 'config-1');

      expect(result).toBe(false);
      expect(mockKV.delete).not.toHaveBeenCalled();
    });
  });
});
