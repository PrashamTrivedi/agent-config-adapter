import {
  Config,
  SlashCommandAnalysis,
  SlashCommandConversionInput,
  SlashCommandConversionResult,
} from '../domain/types'
import { AIConverterService } from '../infrastructure/ai-converter'
import { ConfigService } from './config-service'

export class SlashCommandConverterService {
  constructor(
    private aiConverter: AIConverterService,
    private configService: ConfigService
  ) {}

  /**
   * Convert a slash command using pre-computed metadata.
   * This is the main conversion method used by the API.
   */
  async convert(
    config: Config,
    input: SlashCommandConversionInput
  ): Promise<SlashCommandConversionResult> {
    // 1. Parse stored analysis from config metadata
    const analysis = this.parseAnalysis(config)

    // 2. Check if user input is required but not provided
    if (analysis.hasArguments && !input.userArguments) {
      return {
        convertedContent: '',
        needsUserInput: true,
        analysis,
      }
    }

    // 3. Resolve agent/skill files from file system
    const references = await this.resolveReferences(
      analysis.agentReferences,
      analysis.skillReferences
    )

    // 4. Use AI to determine inlining strategy
    const toInline = await this.determineInliningStrategy(config.content, references)

    // 5. Generate final output
    const convertedContent = await this.generateOutput(
      config.content,
      references,
      toInline,
      input.userArguments
    )

    return {
      convertedContent,
      needsUserInput: false,
      analysis,
    }
  }

  /**
   * Parse analysis metadata from config database fields
   */
  private parseAnalysis(config: Config): SlashCommandAnalysis {
    return {
      hasArguments: config.has_arguments || false,
      argumentHint: config.argument_hint || undefined,
      agentReferences: config.agent_references
        ? JSON.parse(config.agent_references)
        : [],
      skillReferences: config.skill_references
        ? JSON.parse(config.skill_references)
        : [],
    }
  }

  /**
   * Resolve agent/skill references from database
   * Fetches actual content for agent_definition and skill configs
   */
  private async resolveReferences(
    agents: string[],
    skills: string[]
  ): Promise<Map<string, string>> {
    const references = new Map<string, string>()

    // Fetch agents from database
    for (const agentName of agents) {
      try {
        const configs = await this.configService.listConfigs({
          type: 'agent_definition',
          searchName: agentName,
        })

        // Prefer exact match, fallback to first result
        const config = this.findBestMatch(configs, agentName)

        if (config) {
          references.set(`agent:${agentName}`, config.content)
        } else {
          references.set(`agent:${agentName}`, `[Agent: ${agentName} - not found]`)
        }
      } catch (error) {
        console.error(`Failed to fetch agent ${agentName}:`, error)
        references.set(`agent:${agentName}`, `[Agent: ${agentName} - fetch error]`)
      }
    }

    // Fetch skills from database
    for (const skillName of skills) {
      try {
        const configs = await this.configService.listConfigs({
          type: 'skill',
          searchName: skillName,
        })

        const config = this.findBestMatch(configs, skillName)

        if (config) {
          references.set(`skill:${skillName}`, config.content)
        } else {
          references.set(`skill:${skillName}`, `[Skill: ${skillName} - not found]`)
        }
      } catch (error) {
        console.error(`Failed to fetch skill ${skillName}:`, error)
        references.set(`skill:${skillName}`, `[Skill: ${skillName} - fetch error]`)
      }
    }

    return references
  }

  /**
   * Find the best matching config from search results
   * Prefers exact name match, falls back to first result
   */
  private findBestMatch(configs: Config[], targetName: string): Config | null {
    if (configs.length === 0) return null

    // 1. Try exact match (case-insensitive)
    const exactMatch = configs.find(
      (c) => c.name.toLowerCase() === targetName.toLowerCase()
    )
    if (exactMatch) return exactMatch

    // 2. Fallback to first result from LIKE search
    return configs[0]
  }

  /**
   * Use AI to determine which references should be inlined vs omitted
   */
  private async determineInliningStrategy(
    content: string,
    references: Map<string, string>
  ): Promise<string[]> {
    if (references.size === 0) {
      return []
    }

    const refKeys = Array.from(references.keys())
    const prompt = `You are converting a Claude Code slash command for use in a different AI agent (Claude Code Web, Codex, or Gemini).

Original command:
${content}

Available references:
${refKeys.join(', ')}

Determine which references should be:
1. INLINED (include full content in output) - if the command logic depends on them
2. OMITTED (remove mention entirely) - if they're optional or not critical

Consider:
- If the command explicitly calls an agent/skill, inline it
- If it's just a suggestion ("you can use X"), omit it
- If the logic flow depends on it, inline it


Respond ONLY with valid JSON in this exact format (no markdown, no code blocks):
{
  "inline": ["agent:triage", "skill:conventional-commit"],
  "omit": ["agent:web-search-specialist"]
}

IMPORTANT: Output only the JSON object, nothing else.`

    try {
      const response = await this.aiConverter.convert(
        prompt,
        'claude_code',
        'claude_code',
        'slash_command'
      )

      const cleaned = response.trim()
      const parsed = JSON.parse(cleaned)

      return Array.isArray(parsed.inline) ? parsed.inline : []
    } catch (error) {
      console.error('AI inlining strategy failed:', error)
      // Fallback: inline all references
      return refKeys
    }
  }

  /**
   * Generate final converted output
   */
  private async generateOutput(
    content: string,
    references: Map<string, string>,
    toInline: string[],
    userArguments?: string
  ): Promise<string> {
    // 1. Remove frontmatter
    let result = this.removeFrontmatter(content)

    // 2. Replace $ARGUMENTS with user input
    if (userArguments) {
      result = result.replace(/\$ARGUMENTS?/g, userArguments)
    }

    // 3. Inline selected references
    if (toInline.length > 0) {
      const inlinedRefs = toInline
        .filter((key) => references.has(key))
        .map((key) => {
          const refContent = references.get(key) || ''
          return `\n\n---\n### ${key}\n${refContent}\n---`
        })
        .join('\n')

      result = result + inlinedRefs
    }

    // 4. Clean up any remaining agent/skill mentions
    // Remove markdown bold patterns like **agent-name** if they're being omitted
    const omittedRefs = Array.from(references.keys()).filter(
      (key) => !toInline.includes(key)
    )
    for (const key of omittedRefs) {
      const name = key.split(':')[1]
      // Remove bold mentions
      result = result.replace(new RegExp(`\\*\\*${name}\\*\\*`, 'g'), '')
    }

    return result.trim()
  }

  /**
   * Remove YAML frontmatter from content
   * Reused from slash-command-adapter.ts
   */
  private removeFrontmatter(content: string): string {
    const lines = content.trim().split('\n')
    let inFrontMatter = false
    let frontMatterDone = false
    const resultLines: string[] = []

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]

      if (line === '---' && i === 0) {
        inFrontMatter = true
        continue
      }

      if (line === '---' && inFrontMatter) {
        inFrontMatter = false
        frontMatterDone = true
        continue
      }

      if (!inFrontMatter && frontMatterDone) {
        resultLines.push(line)
      }
    }

    return resultLines.join('\n').trim()
  }
}
