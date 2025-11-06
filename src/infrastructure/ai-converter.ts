import OpenAI from 'openai'
import {AgentFormat, ConfigType} from '../domain/types'

export interface AIConversionResult {
  content: string
  usedAI: boolean
  fallbackUsed: boolean
}

export class AIConverterService {
  private openai: OpenAI

  constructor(apiKey: string, accountId: string, gatewayId: string, gatewayToken?: string) {
    const config: any = {
      apiKey: apiKey || 'dummy-key-byok-configured',
      baseURL: `https://gateway.ai.cloudflare.com/v1/${accountId}/${gatewayId}/openai`
    }

    if (gatewayToken) {
      config.defaultHeaders = {
        'cf-aig-authorization': `Bearer ${gatewayToken}`
      }
    }

    this.openai = new OpenAI(config)
  }

  async convert(
    sourceContent: string,
    sourceFormat: AgentFormat,
    targetFormat: AgentFormat,
    configType: ConfigType
  ): Promise<string> {
    const prompt = this.buildConversionPrompt(
      sourceContent,
      sourceFormat,
      targetFormat,
      configType
    )

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-5-2025-08-07',
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      })

      const result = response.choices[0].message.content || ''
      return result.trim()
    } catch (error) {
      console.error('AI conversion failed:', error)
      throw new Error('AI conversion failed')
    }
  }

  /**
   * Response API with tool calling and low reasoning effort
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
    reasoning_tokens?: number
    output_tokens?: number
  }> {
    try {
      // Extract system instructions from first system message
      const systemMsg = messages.find(m => m.role === 'system')
      const instructions = systemMsg?.content || ''

      // Filter out system messages, keep user/assistant/tool messages
      const input = messages.filter(m => m.role !== 'system')

      const response = await this.openai.responses.create({
        model: 'gpt-5-mini',
        instructions: instructions,  // System prompt goes here
        input: input as any,          // User/assistant/tool messages
        tools: tools as any,
        tool_choice: 'auto',
        reasoning: {
          effort: 'low'  // Enable low reasoning for better performance
        },
        max_output_tokens: 2000
      }) as any // Type cast needed until OpenAI SDK types are updated

      return {
        content: response.output_text,
        tool_calls: response.tool_calls?.map((tc: any) => ({
          id: tc.id,
          function: {
            name: tc.function.name,
            arguments: tc.function.arguments
          }
        })),
        reasoning_tokens: response.reasoning_tokens,
        output_tokens: response.output_tokens
      }
    } catch (error) {
      console.error('Response API with tools failed:', error)
      throw new Error('AI conversion with tools failed')
    }
  }

  private buildConversionPrompt(
    sourceContent: string,
    sourceFormat: AgentFormat,
    targetFormat: AgentFormat,
    configType: ConfigType
  ): string {
    const systemContext = `You are a configuration format converter for AI coding agents. Your task is to convert configuration files between different agent formats while preserving semantic meaning and functionality.

IMPORTANT RULES:
1. Preserve the exact semantic meaning of the original configuration
2. Maintain all functionality - do not add or remove features
3. Follow the target format's syntax precisely
4. Output ONLY the converted configuration - no explanations, no markdown code blocks, no preamble
5. If the source has parameters/arguments, preserve them in the target format's convention
6. Follow these convention for memory files, Claude Code has CLAUDE.md, Gemini  has GEMINI.md and Codex has AGENTS.md. So when you encounter one in the source file, replace it for Destination. 
    - e.g. If you encounter CLAUDE.md and are converting it to Gemini, Replace CLAUDE.md with GEMINI.md

${this.getFormatSpec(sourceFormat, 'SOURCE')}

${this.getFormatSpec(targetFormat, 'TARGET')}`

    const userPrompt = `Convert the following ${configType} configuration from ${sourceFormat} format to ${targetFormat} format:

${sourceContent}

Remember: Output ONLY the converted configuration in ${targetFormat} format. No explanations.`

    return systemContext + '\n\n' + userPrompt
  }

  private getFormatSpec(format: AgentFormat, label: string): string {
    switch (format) {
      case 'claude_code':
        return `${label} FORMAT: Claude Code
Claude Code slash commands use Markdown with YAML frontmatter:
---
name: command-name
description: Brief description of what the command does
allowed-tools: List of allowed tools
---

The actual prompt content goes here.
It can be multiple lines.

Parameters can be referenced as $ARGUMENTS in the prompt.`

      case 'codex':
        return `${label} FORMAT: Codex
Codex uses AGENTS.md style with markdown sections:
# command-name

Brief description of what the command does

## Prompt

The actual prompt content goes here.
It can be multiple lines.

Parameters are referenced as {{args}} in the prompt.`

      case 'gemini':
        return `${label} FORMAT: Gemini
Gemini uses TOML files (.toml) with this structure:
Parameters are referenced as {{args}} in the prompt.
description = "Brief description of what the command does"
prompt = """
The actual prompt content goes here.
It can be multiple lines.
"""

Note: Use triple-quoted strings for multi-line prompts.
If there are no parameters, omit the args field entirely.`

      default:
        return ''
    }
  }

}
