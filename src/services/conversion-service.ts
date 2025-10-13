import { CacheService } from '../infrastructure/cache';
import { ConfigRepository } from '../infrastructure/database';
import { getAdapter } from '../adapters';
import { AgentFormat, ConfigType } from '../domain/types';

export interface ConversionServiceEnv {
  DB: D1Database;
  CONFIG_CACHE: KVNamespace;
  OPENAI_API_KEY?: string;
  ACCOUNT_ID: string;
  GATEWAY_ID: string;
  AI_GATEWAY_TOKEN?: string;
}

export interface ConversionResult {
  content: string;
  cached: boolean;
  usedAI: boolean;
  fallbackUsed: boolean;
}

/**
 * ConversionService - Handles format conversion operations
 * Used by both REST API routes and MCP tools
 */
export class ConversionService {
  private repo: ConfigRepository;
  private cache: CacheService;
  private env: ConversionServiceEnv;

  constructor(env: ConversionServiceEnv) {
    this.repo = new ConfigRepository(env.DB);
    this.cache = new CacheService(env.CONFIG_CACHE);
    this.env = env;
  }

  /**
   * Convert config to target format with full metadata
   * This method:
   * 1. Checks cache first
   * 2. If not cached, performs conversion (AI or rule-based)
   * 3. Caches the result
   * 4. Returns content with metadata
   */
  async convertWithMetadata(
    configId: string,
    targetFormat: AgentFormat
  ): Promise<ConversionResult> {
    // Try cache first
    const cached = await this.cache.get(configId, targetFormat);
    if (cached) {
      return {
        content: cached,
        cached: true,
        usedAI: true, // We assume cached conversions may have used AI
        fallbackUsed: false
      };
    }

    // Get config from database
    const config = await this.repo.findById(configId);
    if (!config) {
      throw new Error(`Config not found: ${configId}`);
    }

    // If source and target format are the same, return original content
    if (config.original_format === targetFormat) {
      return {
        content: config.content,
        cached: false,
        usedAI: false,
        fallbackUsed: false
      };
    }

    // Get adapter with AI capabilities
    const adapter = getAdapter(config.type, {
      OPENAI_API_KEY: this.env.OPENAI_API_KEY,
      ACCOUNT_ID: this.env.ACCOUNT_ID,
      GATEWAY_ID: this.env.GATEWAY_ID,
      AI_GATEWAY_TOKEN: this.env.AI_GATEWAY_TOKEN
    });

    let result: ConversionResult;

    // Check if adapter supports AI conversion
    if ('convertWithMetadata' in adapter) {
      const conversionResult = await adapter.convertWithMetadata(
        config.content,
        config.original_format,
        targetFormat,
        config.type
      );

      result = {
        content: conversionResult.content,
        cached: false,
        usedAI: conversionResult.usedAI,
        fallbackUsed: conversionResult.fallbackUsed
      };
    } else {
      // Fallback to regular conversion (used when OpenAI API key is not configured)
      const converted = adapter.convert(
        config.content,
        config.original_format,
        targetFormat,
        config.type
      );

      result = {
        content: converted,
        cached: false,
        usedAI: false,
        fallbackUsed: false
      };
    }

    // Cache the result
    await this.cache.set(configId, result.content, targetFormat);

    return result;
  }

  /**
   * Simple conversion without metadata (for backward compatibility)
   */
  async convert(configId: string, targetFormat: AgentFormat): Promise<string> {
    const result = await this.convertWithMetadata(configId, targetFormat);
    return result.content;
  }
}
