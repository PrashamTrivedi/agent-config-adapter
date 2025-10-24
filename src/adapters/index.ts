import { AgentFormat, ConfigType } from '../domain/types';
import { FormatAdapter } from './types';
import { SlashCommandAdapter } from './slash-command-adapter';
import { MCPConfigAdapter } from './mcp-config-adapter';
import { AIConverterService, AIConversionResult } from '../infrastructure/ai-converter';

// AI-enhanced adapter that wraps rule-based adapters with AI conversion
class AIEnhancedAdapter implements FormatAdapter {
  constructor(
    private baseAdapter: FormatAdapter,
    private aiService: AIConverterService
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
      const aiResult = await this.aiService.convert(
        content,
        sourceFormat,
        targetFormat,
        type
      );
      return {
        content: aiResult,
        usedAI: true,
        fallbackUsed: false,
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
        usedAI: true,
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
  env?: { OPENAI_API_KEY?: string; ACCOUNT_ID?: string; GATEWAY_ID?: string; AI_GATEWAY_TOKEN?: string }
): FormatAdapter | AIEnhancedAdapter {
  const baseAdapter = getBaseAdapter(type);

  if (env?.ACCOUNT_ID && env?.GATEWAY_ID) {
    const aiService = new AIConverterService(
      env.OPENAI_API_KEY || '',
      env.ACCOUNT_ID,
      env.GATEWAY_ID,
      env.AI_GATEWAY_TOKEN
    );
    return new AIEnhancedAdapter(baseAdapter, aiService);
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
export { AIConversionResult } from '../infrastructure/ai-converter';
