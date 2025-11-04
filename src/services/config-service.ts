import { ConfigRepository } from '../infrastructure/database';
import { CacheService } from '../infrastructure/cache';
import { Config, CreateConfigInput, UpdateConfigInput } from '../domain/types';
import { SlashCommandAnalyzerService } from './slash-command-analyzer-service';

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
  private analyzer?: SlashCommandAnalyzerService;

  constructor(env: ConfigServiceEnv, analyzer?: SlashCommandAnalyzerService) {
    this.repo = new ConfigRepository(env.DB);
    this.cache = new CacheService(env.CONFIG_CACHE);
    this.analyzer = analyzer;
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
   * Automatically analyzes slash commands if analyzer is available
   */
  async createConfig(input: CreateConfigInput): Promise<Config> {
    // Validate input
    if (!input.name || !input.type || !input.original_format || !input.content) {
      throw new Error('Missing required fields: name, type, original_format, content');
    }

    // Analyze if it's a slash command and analyzer is available
    let analysis = undefined;
    if (input.type === 'slash_command' && this.analyzer) {
      try {
        analysis = await this.analyzer.analyze(input.content);
      } catch (error) {
        console.error('Analysis failed during config creation:', error);
        // Continue without analysis (non-blocking)
      }
    }

    return await this.repo.create(input, analysis);
  }

  /**
   * Update existing config
   * Re-analyzes slash commands if content changed and analyzer is available
   */
  async updateConfig(id: string, input: UpdateConfigInput): Promise<Config | null> {
    // Get existing config to check type
    const existing = await this.repo.findById(id);
    if (!existing) return null;

    // Re-analyze if content changed and it's a slash command
    let analysis = undefined;
    if (
      input.content &&
      existing.type === 'slash_command' &&
      this.analyzer
    ) {
      try {
        analysis = await this.analyzer.analyze(input.content);
      } catch (error) {
        console.error('Analysis failed during config update:', error);
        // Continue without analysis (non-blocking)
      }
    }

    const updated = await this.repo.update(id, input, analysis);

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
