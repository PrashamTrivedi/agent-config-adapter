import { AgentFormat, ConfigType } from '../domain/types';
import { FormatAdapter } from './types';
import { SlashCommandAdapter } from './slash-command-adapter';
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
    // Try AI conversion first
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
export function getAdapter(type: ConfigType, ai?: Ai): FormatAdapter | AIEnhancedAdapter {
  const baseAdapter = getBaseAdapter(type);

  if (ai) {
    const aiService = new AIConverterService(ai);
    return new AIEnhancedAdapter(baseAdapter, aiService);
  }

  return baseAdapter;
}

function getBaseAdapter(type: ConfigType): FormatAdapter {
  switch (type) {
    case 'slash_command':
      return new SlashCommandAdapter();
    case 'agent_definition':
      // For MVP, we'll use a simple passthrough
      return new PassthroughAdapter();
    case 'mcp_config':
      // For MVP, we'll use a simple passthrough
      return new PassthroughAdapter();
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
export { AIConversionResult } from '../infrastructure/ai-converter';
