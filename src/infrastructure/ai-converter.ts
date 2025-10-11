import {AgentFormat, ConfigType} from '../domain/types'

export interface AIConversionResult {
  content: string
  usedAI: boolean
  fallbackUsed: boolean
}

export class AIConverterService {
  constructor(private ai: Ai) { }

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
      // Use Meta's Llama model as GPT-5 may not be available yet in Cloudflare Workers AI
      // Using type assertion as the model is valid but may not be in types yet
      const response = await this.ai.run('@cf/meta/llama-3.1-8b-instruct' as any, {
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      })

      // Extract the converted content from the AI response
      const result = this.extractContent(response)
      return result
    } catch (error) {
      console.error('AI conversion failed:', error)
      throw new Error('AI conversion failed')
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

  private extractContent(response: any): string {
    // Handle different possible response structures from Cloudflare AI
    if (typeof response === 'string') {
      return response.trim()
    }

    if (response.response) {
      return response.response.trim()
    }

    if (response.result && response.result.response) {
      return response.result.response.trim()
    }

    if (response.choices && response.choices.length > 0) {
      const choice = response.choices[0]
      if (choice.message && choice.message.content) {
        return choice.message.content.trim()
      }
      if (choice.text) {
        return choice.text.trim()
      }
    }

    // If we can't extract content, throw error for fallback
    throw new Error('Could not extract content from AI response')
  }
}
