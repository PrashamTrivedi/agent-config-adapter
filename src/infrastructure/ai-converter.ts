import OpenAI from 'openai'
import {AgentFormat, ConfigType} from '../domain/types'
import { OpenAIProvider } from './ai/openai-provider'
import type { AIProvider } from './ai/types'

export interface AIConversionResult {
  content: string
  usedAI: boolean
  fallbackUsed: boolean
}

/**
 * @deprecated Use ProviderFactory and AIProvider interface instead
 *
 * This class is kept for backward compatibility but delegates to the new provider architecture.
 * Migration path:
 * ```typescript
 * // Old way:
 * const converter = new AIConverterService(apiKey, accountId, gatewayId, gatewayToken)
 *
 * // New way:
 * const factory = new ProviderFactory({
 *   ACCOUNT_ID: accountId,
 *   GATEWAY_ID: gatewayId,
 *   GATEWAY_TOKEN: gatewayToken,
 *   AI_PROVIDER: 'openai' // or 'gemini' or 'auto'
 * })
 * const provider = factory.createProvider()
 * ```
 */
export class AIConverterService {
  private provider: AIProvider

  constructor(apiKey: string, accountId: string, gatewayId: string, gatewayToken?: string) {
    console.warn('[DEPRECATED] AIConverterService is deprecated. Use ProviderFactory instead.')

    // Delegate to new OpenAI provider for backward compatibility
    // Support both legacy apiKey and new BYOK gatewayToken
    const effectiveToken = gatewayToken || apiKey || 'dummy-key-byok-configured'

    this.provider = new OpenAIProvider({
      accountId,
      gatewayId,
      gatewayToken: effectiveToken,
      reasoningMode: 'low' // Keep backward compatibility with existing behavior
    })
  }

  async convert(
    sourceContent: string,
    sourceFormat: AgentFormat,
    targetFormat: AgentFormat,
    configType: ConfigType
  ): Promise<string> {
    const result = await this.provider.convert(
      sourceContent,
      sourceFormat,
      targetFormat,
      configType
    )
    return result.content
  }

  /**
   * Chat completion with tool/function calling support
   * Used for slash command conversion with READ_CONFIGS tool
   */
  async chatWithTools(
    messages: Array<{
      role: 'system' | 'user' | 'assistant' | 'tool'
      content: string | null
      tool_calls?: Array<{
        id: string
        type: string
        function: {name: string; arguments: string}
      }>
      tool_call_id?: string
    }>,
    tools: Array<{
      type: string
      function: {
        name: string
        description: string
        parameters: Record<string, any>
      }
    }>
  ): Promise<{
    content: string | null
    tool_calls?: Array<{
      id: string
      function: {name: string; arguments: string}
    }>
  }> {
    const response = await this.provider.chatWithTools(messages, tools)
    return {
      content: response.content,
      tool_calls: response.tool_calls
    }
  }

}
