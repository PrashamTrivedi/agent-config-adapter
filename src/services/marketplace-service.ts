import { MarketplaceRepository } from '../infrastructure/marketplace-repository';
import { CacheService } from '../infrastructure/cache';
import {
  Marketplace,
  MarketplaceWithExtensions,
  CreateMarketplaceInput,
  UpdateMarketplaceInput,
} from '../domain/types';

export interface MarketplaceServiceEnv {
  DB: D1Database;
  CONFIG_CACHE: KVNamespace;
}

/**
 * MarketplaceService - Provides business logic for marketplace CRUD operations
 * Marketplaces are collections of extensions
 * Used by both REST API routes and MCP tools
 */
export class MarketplaceService {
  private repo: MarketplaceRepository;
  private cache: CacheService;

  constructor(env: MarketplaceServiceEnv) {
    this.repo = new MarketplaceRepository(env.DB);
    this.cache = new CacheService(env.CONFIG_CACHE);
  }

  /**
   * Get all marketplaces from database
   */
  async listMarketplaces(): Promise<Marketplace[]> {
    return await this.repo.findAll();
  }

  /**
   * Get all marketplaces with their extensions and configs
   */
  async listMarketplacesWithExtensions(): Promise<MarketplaceWithExtensions[]> {
    const marketplaces = await this.repo.findAll();
    const marketplacesWithExtensions: MarketplaceWithExtensions[] = [];

    for (const mkt of marketplaces) {
      const marketplace = await this.repo.findByIdWithExtensions(mkt.id);
      if (marketplace) {
        marketplacesWithExtensions.push(marketplace);
      }
    }

    return marketplacesWithExtensions;
  }

  /**
   * Get single marketplace by ID
   */
  async getMarketplace(id: string): Promise<Marketplace | null> {
    return await this.repo.findById(id);
  }

  /**
   * Get marketplace with all its extensions and configs
   */
  async getMarketplaceWithExtensions(id: string): Promise<MarketplaceWithExtensions | null> {
    // Try cache first
    const cached = await this.cache.get(`mkt:${id}`, 'full');
    if (cached) {
      return JSON.parse(cached);
    }

    // Fetch from database
    const marketplace = await this.repo.findByIdWithExtensions(id);
    if (marketplace) {
      // Cache the result (no expiration for marketplaces)
      await this.cache.set(`mkt:${id}`, JSON.stringify(marketplace), 'full');
    }

    return marketplace;
  }

  /**
   * Create new marketplace
   */
  async createMarketplace(input: CreateMarketplaceInput): Promise<Marketplace> {
    // Validate input
    if (!input.name || !input.owner_name || !input.version) {
      throw new Error('Missing required fields: name, owner_name, version');
    }

    return await this.repo.create(input);
  }

  /**
   * Update existing marketplace
   */
  async updateMarketplace(id: string, input: UpdateMarketplaceInput): Promise<Marketplace | null> {
    const updated = await this.repo.update(id, input);

    if (updated) {
      // Invalidate cache when marketplace is updated
      await this.invalidateMarketplaceCache(id);
    }

    return updated;
  }

  /**
   * Delete marketplace
   */
  async deleteMarketplace(id: string): Promise<boolean> {
    const success = await this.repo.delete(id);

    if (success) {
      // Invalidate cache when marketplace is deleted
      await this.invalidateMarketplaceCache(id);
    }

    return success;
  }

  /**
   * Add extensions to a marketplace
   */
  async addExtensionsToMarketplace(marketplaceId: string, extensionIds: string[]): Promise<void> {
    await this.repo.addExtensions(marketplaceId, extensionIds);
    await this.invalidateMarketplaceCache(marketplaceId);
  }

  /**
   * Remove an extension from a marketplace
   */
  async removeExtensionFromMarketplace(
    marketplaceId: string,
    extensionId: string
  ): Promise<boolean> {
    const success = await this.repo.removeExtension(marketplaceId, extensionId);

    if (success) {
      await this.invalidateMarketplaceCache(marketplaceId);
    }

    return success;
  }

  /**
   * Invalidate all cached data for a marketplace
   */
  async invalidateMarketplaceCache(id: string): Promise<void> {
    // Invalidate marketplace cache
    await this.cache.invalidate(`mkt:${id}`);

    // Also invalidate manifest cache
    await this.cache.delete(`mkt:${id}:manifest`);
  }
}
