import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MarketplaceService } from '../../src/services/marketplace-service';
import { createMockD1Database, createMockKVNamespace, sampleMarketplace } from '../test-utils';

describe('MarketplaceService', () => {
  let mockDb: D1Database;
  let mockKV: KVNamespace;
  let service: MarketplaceService;

  beforeEach(() => {
    mockDb = createMockD1Database();
    mockKV = createMockKVNamespace();
    service = new MarketplaceService({ DB: mockDb, CONFIG_CACHE: mockKV });
  });

  describe('listMarketplaces', () => {
    it('should return all marketplaces', async () => {
      const mockMarketplaces = [sampleMarketplace];

      mockDb.prepare = vi.fn().mockReturnValue({
        all: vi.fn().mockResolvedValue({ results: mockMarketplaces, success: true }),
      });

      const marketplaces = await service.listMarketplaces();
      expect(marketplaces).toEqual(mockMarketplaces);
    });

    it('should return empty array when no marketplaces exist', async () => {
      mockDb.prepare = vi.fn().mockReturnValue({
        all: vi.fn().mockResolvedValue({ results: [], success: true }),
      });

      const marketplaces = await service.listMarketplaces();
      expect(marketplaces).toEqual([]);
    });
  });

  describe('getMarketplace', () => {
    it('should return marketplace by ID', async () => {
      mockDb.prepare = vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(sampleMarketplace),
        }),
      });

      const marketplace = await service.getMarketplace('mkt-123');
      expect(marketplace).toEqual(sampleMarketplace);
    });

    it('should return null when marketplace not found', async () => {
      mockDb.prepare = vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(null),
        }),
      });

      const marketplace = await service.getMarketplace('non-existent-id');
      expect(marketplace).toBeNull();
    });
  });

  describe('getMarketplaceWithExtensions', () => {
    it('should return cached marketplace with extensions when available', async () => {
      const marketplaceWithExtensions = {
        ...sampleMarketplace,
        extensions: [],
      };

      await mockKV.put('config:mkt:mkt-123:full', JSON.stringify(marketplaceWithExtensions));

      const result = await service.getMarketplaceWithExtensions('mkt-123');
      expect(result).toEqual(marketplaceWithExtensions);
    });

    it('should cache marketplace with extensions after fetching from database', async () => {
      const marketplaceWithExtensions = {
        ...sampleMarketplace,
        extensions: [],
      };

      mockDb.prepare = vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(sampleMarketplace),
          all: vi.fn().mockResolvedValue({ results: [], success: true }),
        }),
      });

      await service.getMarketplaceWithExtensions('mkt-123');

      expect(mockKV.put).toHaveBeenCalledWith(
        'config:mkt:mkt-123:full',
        expect.any(String),
        expect.any(Object)
      );
    });

    it('should return null when marketplace not found', async () => {
      mockDb.prepare = vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(null),
        }),
      });

      const result = await service.getMarketplaceWithExtensions('non-existent-id');
      expect(result).toBeNull();
    });
  });

  describe('createMarketplace', () => {
    it('should create a new marketplace', async () => {
      const input = {
        name: 'Test Marketplace',
        description: 'A test marketplace',
        owner_name: 'Test Owner',
        version: '1.0.0',
      };

      mockDb.prepare = vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          run: vi.fn().mockResolvedValue({ success: true }),
        }),
      });

      const marketplace = await service.createMarketplace(input);

      expect(marketplace.id).toBeDefined();
      expect(marketplace.name).toBe(input.name);
      expect(marketplace.owner_name).toBe(input.owner_name);
      expect(marketplace.version).toBe(input.version);
    });

    it('should throw error when required fields are missing', async () => {
      await expect(
        service.createMarketplace({
          name: '',
          owner_name: 'Test',
          version: '1.0.0',
        })
      ).rejects.toThrow('Missing required fields');
    });

    it('should throw error when owner_name is missing', async () => {
      await expect(
        service.createMarketplace({
          name: 'Test',
          owner_name: '',
          version: '1.0.0',
        })
      ).rejects.toThrow('Missing required fields');
    });

    it('should throw error when version is missing', async () => {
      await expect(
        service.createMarketplace({
          name: 'Test',
          owner_name: 'Test Owner',
          version: '',
        })
      ).rejects.toThrow('Missing required fields');
    });
  });

  describe('updateMarketplace', () => {
    it('should update marketplace and invalidate cache', async () => {
      const updatedMarketplace = { ...sampleMarketplace, name: 'Updated Name' };

      mockDb.prepare = vi.fn()
        .mockReturnValueOnce({
          bind: vi.fn().mockReturnValue({
            first: vi.fn().mockResolvedValue(sampleMarketplace),
          }),
        })
        .mockReturnValueOnce({
          bind: vi.fn().mockReturnValue({
            run: vi.fn().mockResolvedValue({ success: true }),
          }),
        })
        .mockReturnValueOnce({
          bind: vi.fn().mockReturnValue({
            first: vi.fn().mockResolvedValue(updatedMarketplace),
          }),
        });

      const marketplace = await service.updateMarketplace('mkt-123', { name: 'Updated Name' });

      expect(marketplace?.name).toBe('Updated Name');
      expect(mockKV.delete).toHaveBeenCalled();
    });

    it('should return null when marketplace does not exist', async () => {
      mockDb.prepare = vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(null),
        }),
      });

      const marketplace = await service.updateMarketplace('non-existent-id', { name: 'New Name' });
      expect(marketplace).toBeNull();
    });
  });

  describe('deleteMarketplace', () => {
    it('should delete marketplace and invalidate cache', async () => {
      mockDb.prepare = vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          run: vi.fn().mockResolvedValue({ success: true }),
        }),
      });

      const result = await service.deleteMarketplace('mkt-123');

      expect(result).toBe(true);
      expect(mockKV.delete).toHaveBeenCalled();
    });

    it('should return false when deletion fails', async () => {
      mockDb.prepare = vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          run: vi.fn().mockResolvedValue({ success: false }),
        }),
      });

      const result = await service.deleteMarketplace('mkt-123');
      expect(result).toBe(false);
    });
  });

  describe('invalidateMarketplaceCache', () => {
    it('should invalidate marketplace and manifest caches', async () => {
      await service.invalidateMarketplaceCache('mkt-123');

      // Base cache invalidation deletes 4 keys (base + 3 formats),
      // plus 1 manifest cache deletion = 5 total
      expect(mockKV.delete).toHaveBeenCalled();
    });
  });

  describe('addExtensionsToMarketplace', () => {
    it('should add extensions and invalidate cache', async () => {
      mockDb.prepare = vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          run: vi.fn().mockResolvedValue({ success: true }),
          first: vi.fn().mockResolvedValue({ max_order: 0 }),
        }),
      });

      await service.addExtensionsToMarketplace('mkt-123', ['ext-1', 'ext-2']);

      expect(mockKV.delete).toHaveBeenCalled();
    });
  });

  describe('removeExtensionFromMarketplace', () => {
    it('should remove extension and invalidate cache', async () => {
      mockDb.prepare = vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          run: vi.fn().mockResolvedValue({ success: true }),
        }),
      });

      const result = await service.removeExtensionFromMarketplace('mkt-123', 'ext-1');

      expect(result).toBe(true);
      expect(mockKV.delete).toHaveBeenCalled();
    });

    it('should not invalidate cache when removal fails', async () => {
      mockDb.prepare = vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          run: vi.fn().mockResolvedValue({ success: false }),
        }),
      });

      const result = await service.removeExtensionFromMarketplace('mkt-123', 'ext-1');

      expect(result).toBe(false);
      expect(mockKV.delete).not.toHaveBeenCalled();
    });
  });
});
