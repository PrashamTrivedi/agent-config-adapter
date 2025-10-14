import { ExtensionRepository } from '../infrastructure/extension-repository';
import { CacheService } from '../infrastructure/cache';
import {
  Extension,
  ExtensionWithConfigs,
  CreateExtensionInput,
  UpdateExtensionInput,
  Config,
} from '../domain/types';

export interface ExtensionServiceEnv {
  DB: D1Database;
  CONFIG_CACHE: KVNamespace;
}

/**
 * ExtensionService - Provides business logic for extension CRUD operations
 * Extensions are bundles of configs (slash commands, agents, MCP servers)
 * Used by both REST API routes and MCP tools
 */
export class ExtensionService {
  private repo: ExtensionRepository;
  private cache: CacheService;

  constructor(env: ExtensionServiceEnv) {
    this.repo = new ExtensionRepository(env.DB);
    this.cache = new CacheService(env.CONFIG_CACHE);
  }

  /**
   * Get all extensions from database
   */
  async listExtensions(): Promise<Extension[]> {
    return await this.repo.findAll();
  }

  /**
   * Get single extension by ID
   */
  async getExtension(id: string): Promise<Extension | null> {
    return await this.repo.findById(id);
  }

  /**
   * Get extension with all its configs
   */
  async getExtensionWithConfigs(id: string): Promise<ExtensionWithConfigs | null> {
    // Try cache first
    const cacheKey = `extension:${id}:with-configs`;
    const cached = await this.cache.get(id, 'with-configs');
    if (cached) {
      return JSON.parse(cached);
    }

    // Fetch from database
    const extension = await this.repo.findByIdWithConfigs(id);
    if (extension) {
      // Cache the result (no expiration for extensions)
      await this.cache.set(id, 'with-configs', JSON.stringify(extension));
    }

    return extension;
  }

  /**
   * Create new extension
   */
  async createExtension(input: CreateExtensionInput): Promise<Extension> {
    // Validate input
    if (!input.name || !input.version) {
      throw new Error('Missing required fields: name, version');
    }

    return await this.repo.create(input);
  }

  /**
   * Update existing extension
   */
  async updateExtension(id: string, input: UpdateExtensionInput): Promise<Extension | null> {
    const updated = await this.repo.update(id, input);

    if (updated) {
      // Invalidate cache when extension is updated
      await this.invalidateExtensionCache(id);
    }

    return updated;
  }

  /**
   * Delete extension
   */
  async deleteExtension(id: string): Promise<boolean> {
    const success = await this.repo.delete(id);

    if (success) {
      // Invalidate cache when extension is deleted
      await this.invalidateExtensionCache(id);
    }

    return success;
  }

  /**
   * Get configs associated with an extension
   */
  async getExtensionConfigs(extensionId: string): Promise<Config[]> {
    return await this.repo.getExtensionConfigs(extensionId);
  }

  /**
   * Add configs to an extension
   */
  async addConfigsToExtension(extensionId: string, configIds: string[]): Promise<void> {
    await this.repo.addConfigs(extensionId, configIds);
    await this.invalidateExtensionCache(extensionId);
  }

  /**
   * Remove a config from an extension
   */
  async removeConfigFromExtension(extensionId: string, configId: string): Promise<boolean> {
    const success = await this.repo.removeConfig(extensionId, configId);

    if (success) {
      await this.invalidateExtensionCache(extensionId);
    }

    return success;
  }

  /**
   * Invalidate all cached data for an extension
   */
  async invalidateExtensionCache(id: string): Promise<void> {
    // Invalidate extension cache
    await this.cache.invalidate(id);

    // Also invalidate manifest caches
    await this.cache.delete(`manifest:${id}:gemini`);
    await this.cache.delete(`manifest:${id}:claude_code`);
  }
}
