import { ConfigRepository } from '../infrastructure/database';
import { CacheService } from '../infrastructure/cache';
import { Config, CreateConfigInput, UpdateConfigInput } from '../domain/types';

export interface ConfigServiceEnv {
  DB: D1Database;
  CONFIG_CACHE: KVNamespace;
}

/**
 * ConfigService - Provides business logic for config CRUD operations
 * Used by both REST API routes and MCP tools
 */
export class ConfigService {
  private repo: ConfigRepository;
  private cache: CacheService;

  constructor(env: ConfigServiceEnv) {
    this.repo = new ConfigRepository(env.DB);
    this.cache = new CacheService(env.CONFIG_CACHE);
  }

  /**
   * Get all configs from database with optional filters
   */
  async listConfigs(filters?: {
    type?: string;
    originalFormat?: string;
    searchName?: string;
  }): Promise<Config[]> {
    return await this.repo.findAll(filters);
  }

  /**
   * Get single config by ID
   */
  async getConfig(id: string): Promise<Config | null> {
    return await this.repo.findById(id);
  }

  /**
   * Create new config
   */
  async createConfig(input: CreateConfigInput): Promise<Config> {
    // Validate input
    if (!input.name || !input.type || !input.original_format || !input.content) {
      throw new Error('Missing required fields: name, type, original_format, content');
    }

    return await this.repo.create(input);
  }

  /**
   * Update existing config
   */
  async updateConfig(id: string, input: UpdateConfigInput): Promise<Config | null> {
    const updated = await this.repo.update(id, input);

    if (updated) {
      // Invalidate cache when config is updated
      await this.cache.invalidate(id);
    }

    return updated;
  }

  /**
   * Delete config
   */
  async deleteConfig(id: string): Promise<boolean> {
    const success = await this.repo.delete(id);

    if (success) {
      // Invalidate cache when config is deleted
      await this.cache.invalidate(id);
    }

    return success;
  }

  /**
   * Invalidate all cached conversions for a config
   */
  async invalidateCache(id: string): Promise<void> {
    await this.cache.invalidate(id);
  }

  /**
   * Get cached conversion (returns null if not cached)
   * This is a pure read operation with no processing
   */
  async getCachedConversion(id: string, format: string): Promise<string | null> {
    return await this.cache.get(id, format);
  }
}
