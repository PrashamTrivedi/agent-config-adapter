import { AgentFormat, ConfigType } from '../domain/types';
import { FormatAdapter } from './types';
import { SlashCommandAdapter } from './slash-command-adapter';
import { MCPConfigAdapter } from './mcp-config-adapter';
import { ProviderFactory, type ProviderType } from '../infrastructure/ai/provider-factory';
import type { AIProvider, AIConversionResult } from '../infrastructure/ai/types';
import type { OpenAIReasoningMode } from '../infrastructure/ai/openai-provider';
import type { GeminiThinkingBudget } from '../infrastructure/ai/gemini-provider';

// AI-enhanced adapter that wraps rule-based adapters with AI conversion
class AIEnhancedAdapter implements FormatAdapter {
  constructor(
    private baseAdapter: FormatAdapter,
    private aiProvider: AIProvider
  ) {}

  async convertWithMetadata(
    content: string,
    sourceFormat: AgentFormat,
    targetFormat: AgentFormat,
    type: ConfigType
  ): Promise<AIConversionResult> {
    // For mcp_config, skip AI and use rule-based directly
    // MCP configs are structured data (JSON/TOML) that doesn't benefit from AI
    if (type === 'mcp_config') {
      const result = this.baseAdapter.convert(
        content,
        sourceFormat,
        targetFormat,
        type
      );
      return {
        content: result,
        usedAI: false,
        fallbackUsed: false,
      };
    }

    // Try AI conversion first for other types (slash_command, agent_definition)
    try {
      const aiResult = await this.aiProvider.convert(
        content,
        sourceFormat,
        targetFormat,
        type
      );
      return {
        content: aiResult.content,
        usedAI: aiResult.usedAI,
        fallbackUsed: aiResult.fallbackUsed,
      };
    } catch (error) {
      console.warn('AI conversion failed, using rule-based fallback:', error);
      // Fall back to rule-based conversion
      const fallbackResult = this.baseAdapter.convert(
        content,
        sourceFormat,
        targetFormat,
        type
      );
      return {
        content: fallbackResult,
        usedAI: false,
        fallbackUsed: true,
      };
    }
  }

  convert(
    content: string,
    sourceFormat: AgentFormat,
    targetFormat: AgentFormat,
    type: ConfigType
  ): string {
    // Synchronous convert just uses rule-based (for backward compatibility)
    return this.baseAdapter.convert(content, sourceFormat, targetFormat, type);
  }

  validate(content: string, format: AgentFormat, type: ConfigType): boolean {
    return this.baseAdapter.validate(content, format, type);
  }
}

// Factory to get appropriate adapter based on config type
export function getAdapter(
  type: ConfigType,
  env?: {
    ACCOUNT_ID?: string;
    GATEWAY_ID?: string;
    AI_GATEWAY_TOKEN?: string;
    AI_PROVIDER?: ProviderType;
    OPENAI_REASONING_MODE?: OpenAIReasoningMode;
    GEMINI_THINKING_BUDGET?: GeminiThinkingBudget;
    OPENAI_API_KEY?: string;
    GEMINI_API_KEY?: string;
  }
): FormatAdapter | AIEnhancedAdapter {
  const baseAdapter = getBaseAdapter(type);

  // Initialize provider factory if credentials are available
  if (env?.ACCOUNT_ID && env?.GATEWAY_ID && env?.AI_GATEWAY_TOKEN) {
    const factory = new ProviderFactory({
      ACCOUNT_ID: env.ACCOUNT_ID,
      GATEWAY_ID: env.GATEWAY_ID,
      GATEWAY_TOKEN: env.AI_GATEWAY_TOKEN,
      AI_PROVIDER: env.AI_PROVIDER,
      OPENAI_REASONING_MODE: env.OPENAI_REASONING_MODE,
      GEMINI_THINKING_BUDGET: env.GEMINI_THINKING_BUDGET,
      OPENAI_API_KEY: env.OPENAI_API_KEY,
      GEMINI_API_KEY: env.GEMINI_API_KEY,
    });
    const provider = factory.createProvider();
    return new AIEnhancedAdapter(baseAdapter, provider);
  }

  return baseAdapter;
}

function getBaseAdapter(type: ConfigType): FormatAdapter {
  // Skills are not convertible between formats
  if (type === 'skill') {
    throw new Error('Skills are not convertible between formats. Skills are format-specific and must be used in their original format.');
  }

  switch (type) {
    case 'slash_command':
      return new SlashCommandAdapter();
    case 'agent_definition':
      // For MVP, we'll use a simple passthrough
      return new PassthroughAdapter();
    case 'mcp_config':
      return new MCPConfigAdapter();
    default:
      throw new Error(`Unsupported config type: ${type}`);
  }
}

// Simple passthrough adapter for types not yet implemented
class PassthroughAdapter implements FormatAdapter {
  convert(content: string, _sourceFormat: AgentFormat, _targetFormat: AgentFormat): string {
    return content;
  }

  validate(_content: string, _format: AgentFormat): boolean {
    return true;
  }
}

export { FormatAdapter } from './types';
export { SlashCommandAdapter } from './slash-command-adapter';
export { MCPConfigAdapter } from './mcp-config-adapter';
export type { AIConversionResult } from '../infrastructure/ai/types';
