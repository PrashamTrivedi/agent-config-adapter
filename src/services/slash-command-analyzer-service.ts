import { SlashCommandAnalysis } from '../domain/types'
import type { AIProvider } from '../infrastructure/ai/types'

export class SlashCommandAnalyzerService {
  constructor(private aiConverter: AIProvider) {}

  /**
   * Analyze a slash command to detect arguments, agent references, and skill references.
   * This is called proactively when a config is created or updated.
   */
  async analyze(content: string): Promise<SlashCommandAnalysis> {
    try {
      // 1. Parse frontmatter to detect argument-hint
      const hasArguments = this.detectArgumentsFromContent(content)
      const argumentHint = this.extractArgumentHint(content)

      // 2. Use AI to detect agent/skill references
      const references = await this.detectReferences(content)

      return {
        hasArguments,
        argumentHint,
        agentReferences: references.agents,
        skillReferences: references.skills,
      }
    } catch (error) {
      console.error('Analysis failed:', error)
      // Return empty analysis on failure (non-blocking)
      return {
        hasArguments: false,
        agentReferences: [],
        skillReferences: [],
      }
    }
  }

  /**
   * Detect if command requires arguments from frontmatter or content
   */
  private detectArgumentsFromContent(content: string): boolean {
    // Check for argument-hint in frontmatter
    if (content.includes('argument-hint:')) {
      return true
    }

    // Check for $ARGUMENTS or $ARGUMENT placeholders in content
    if (content.includes('$ARGUMENTS') || content.includes('$ARGUMENT')) {
      return true
    }

    return false
  }

  /**
   * Extract argument hint from frontmatter
   */
  private extractArgumentHint(content: string): string | undefined {
    const lines = content.trim().split('\n')
    let inFrontMatter = false

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]

      if (line === '---' && i === 0) {
        inFrontMatter = true
        continue
      }

      if (line === '---' && inFrontMatter) {
        break
      }

      if (inFrontMatter && line.startsWith('argument-hint:')) {
        return line.substring('argument-hint:'.length).trim()
      }
    }

    return undefined
  }

  /**
   * Use AI to detect agent and skill references in the content
   */
  private async detectReferences(
    content: string
  ): Promise<{ agents: string[]; skills: string[] }> {
    const prompt = `Analyze this Claude Code slash command and detect references to agents and skills.

Slash command content:
${content}

Look for:
1. Agent references (usually mentioned as **agent-name** or explicitly like "use the triage agent")
2. Skill references (usually mentioned as **skill-name** or explicitly like "use the conventional-commit skill")

Respond ONLY with valid JSON in this exact format (no markdown, no code blocks):
{
  "agents": ["agent-name-1", "agent-name-2"],
  "skills": ["skill-name-1"]
}

If no agents or skills are found, use empty arrays. Example:
{
  "agents": [],
  "skills": []
}

IMPORTANT: Output only the JSON object, nothing else.`

    try {
      const response = await this.aiConverter.convert(
        prompt,
        'claude_code',
        'claude_code',
        'slash_command'
      )

      // Parse the AI response
      const cleaned = response.content.trim()
      const parsed = JSON.parse(cleaned)

      return {
        agents: Array.isArray(parsed.agents) ? parsed.agents : [],
        skills: Array.isArray(parsed.skills) ? parsed.skills : [],
      }
    } catch (error) {
      console.error('AI reference detection failed:', error)
      // Return empty arrays on failure
      return {
        agents: [],
        skills: [],
      }
    }
  }
}
