import { CacheService } from '../infrastructure/cache';
import { ConfigRepository } from '../infrastructure/database';
import { getAdapter } from '../adapters';
import { AgentFormat, ConfigType } from '../domain/types';
import { ProviderFactory, type ProviderType } from '../infrastructure/ai/provider-factory';
import type { OpenAIReasoningMode } from '../infrastructure/ai/openai-provider';
import type { GeminiThinkingBudget } from '../infrastructure/ai/gemini-provider';
import type { AIConversionMetadata } from '../infrastructure/ai/types';

export interface ConversionServiceEnv {
  DB: D1Database;
  CONFIG_CACHE: KVNamespace;

  // TRUE BYOK: NO provider API keys in env
  // Provider keys configured in Cloudflare Dashboard (AI Gateway → Provider Keys)
  ACCOUNT_ID: string;
  GATEWAY_ID: string;
  AI_GATEWAY_TOKEN?: string; // cf-aig-authorization token for BYOK

  // Provider configuration
  AI_PROVIDER?: ProviderType;
  OPENAI_REASONING_MODE?: OpenAIReasoningMode;
  GEMINI_THINKING_BUDGET?: string; // String because env vars are strings

  // Direct API keys for local development (still routes through AI Gateway)
  OPENAI_API_KEY?: string; // For local dev
  GEMINI_API_KEY?: string; // For local dev
}

export interface ConversionResult {
  content: string;
  cached: boolean;
  usedAI: boolean;
  fallbackUsed: boolean;
  metadata?: AIConversionMetadata; // AI conversion metadata (provider, model, tokens, cost, etc.)
}

/**
 * ConversionService - Handles format conversion operations
 * Used by both REST API routes and MCP tools
 *
 * TRUE BYOK Architecture:
 * - Provider API keys stored in Cloudflare Dashboard (NOT in Worker code/secrets)
 * - Worker authenticates to AI Gateway using AI_GATEWAY_TOKEN
 * - AI Gateway retrieves provider keys from Secrets Store at runtime
 * - Supports multi-provider (OpenAI, Gemini) with automatic fallback
 */
export class ConversionService {
  private repo: ConfigRepository;
  private cache: CacheService;
  private env: ConversionServiceEnv;
  private providerFactory: ProviderFactory | null;

  constructor(env: ConversionServiceEnv) {
    this.repo = new ConfigRepository(env.DB);
    this.cache = new CacheService(env.CONFIG_CACHE);
    this.env = env;

    // Initialize provider factory if BYOK is configured
    const gatewayToken = env.AI_GATEWAY_TOKEN;
    if (gatewayToken) {
      this.providerFactory = new ProviderFactory({
        ACCOUNT_ID: env.ACCOUNT_ID,
        GATEWAY_ID: env.GATEWAY_ID,
        GATEWAY_TOKEN: gatewayToken,
        AI_PROVIDER: env.AI_PROVIDER as ProviderType | undefined,
        OPENAI_REASONING_MODE: env.OPENAI_REASONING_MODE,
        GEMINI_THINKING_BUDGET: env.GEMINI_THINKING_BUDGET
          ? parseInt(env.GEMINI_THINKING_BUDGET)
          : undefined,
        OPENAI_API_KEY: env.OPENAI_API_KEY, // For local dev
        GEMINI_API_KEY: env.GEMINI_API_KEY, // For local dev
      });
    } else {
      this.providerFactory = null;
      console.warn(
        '[ConversionService] No AI_GATEWAY_TOKEN configured - AI conversion disabled, using rule-based conversion only'
      );
    }
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
        fallbackUsed: false,
      };
    }

    // Get config from database
    const config = await this.repo.findById(configId);
    if (!config) {
      throw new Error(`Config not found: ${configId}`);
    }

    // Skills cannot be converted between formats
    if (config.type === 'skill') {
      throw new Error(
        'Skills cannot be converted between formats. Skills are format-specific and must be used in their original format.'
      );
    }

    // If source and target format are the same, return original content
    if (config.original_format === targetFormat) {
      return {
        content: config.content,
        cached: false,
        usedAI: false,
        fallbackUsed: false,
      };
    }

    // Try AI conversion with new provider architecture
    if (this.providerFactory) {
      try {
        const provider = this.providerFactory.createProvider();
        const aiResult = await provider.convert(
          config.content,
          config.original_format,
          targetFormat,
          config.type
        );

        // Cache the result
        await this.cache.set(configId, aiResult.content, targetFormat);

        return {
          content: aiResult.content,
          cached: false,
          usedAI: aiResult.usedAI,
          fallbackUsed: aiResult.fallbackUsed,
          metadata: aiResult.metadata,
        };
      } catch (error) {
        console.error('[ConversionService] AI conversion failed, falling back to rule-based', error);
        // Fall through to rule-based conversion
      }
    }

    // Fallback to rule-based adapter conversion
    const adapter = getAdapter(config.type, {});
    const converted = adapter.convert(
      config.content,
      config.original_format,
      targetFormat,
      config.type
    );

    const result: ConversionResult = {
      content: converted,
      cached: false,
      usedAI: false,
      fallbackUsed: true, // Mark as fallback since AI was unavailable or failed
    };

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
