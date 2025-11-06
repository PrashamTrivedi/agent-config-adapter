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
   * Convert slash command using single AI call with tool support
   */
  async convert(
    config: Config,
    input: SlashCommandConversionInput
  ): Promise<SlashCommandConversionResult> {
    // 1. Parse stored analysis metadata
    const analysis = this.parseAnalysis(config)

    // 2. Build context of all available agents/skills
    const availableReferences = await this.buildReferenceContext()

    // 3. Single AI call with tool support
    const convertedContent = await this.convertWithTools(
      config.content,
      input.userArguments,
      analysis,
      availableReferences
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
   * Build context of all available agent/skill names
   * This helps AI avoid false positives
   */
  private async buildReferenceContext(): Promise<{
    agents: string[]
    skills: string[]
  }> {
    const [agentConfigs, skillConfigs] = await Promise.all([
      this.configService.listConfigs({ type: 'agent_definition' }),
      this.configService.listConfigs({ type: 'skill' }),
    ])

    return {
      agents: agentConfigs.map(c => c.name),
      skills: skillConfigs.map(c => c.name),
    }
  }

  /**
   * Convert using single AI call with READ_CONFIGS tool
   */
  private async convertWithTools(
    content: string,
    userArguments: string | undefined,
    analysis: SlashCommandAnalysis,
    availableReferences: { agents: string[]; skills: string[] }
  ): Promise<string> {
    // Build comprehensive system prompt
    const systemPrompt = this.buildSystemPrompt(availableReferences)
    const userPrompt = this.buildUserPrompt(content, userArguments)

    // Define READ_CONFIGS tool
    const tools = [
      {
        type: "function" as const,
        function: {
          name: "read_configs",
          description: "Read agent or skill configuration content from the database. Use this to fetch referenced agents/skills that need to be inlined in the converted command.",
          parameters: {
            type: "object",
            properties: {
              references: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    name: {
                      type: "string",
                      description: "Name of the agent or skill (e.g., 'triage', 'conventional-commit')"
                    },
                    type: {
                      type: "string",
                      enum: ["agent", "skill"],
                      description: "Type of config to fetch"
                    }
                  },
                  required: ["name", "type"]
                },
                description: "Array of agent/skill references to fetch"
              }
            },
            required: ["references"]
          }
        }
      }
    ]

    // Execute AI call with potential tool iterations
    let messages: Array<{
      role: 'system' | 'user' | 'assistant' | 'tool'
      content: string | null
      tool_calls?: Array<{
        id: string
        type: string
        function: { name: string; arguments: string }
      }>
      tool_call_id?: string
    }> = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ]

    let finalContent = ''
    const maxIterations = 3 // Prevent infinite loops
    let iteration = 0

    while (iteration < maxIterations) {
      const response = await this.aiConverter.chatWithTools(messages, tools)

      // Check if AI wants to use tools
      if (response.tool_calls && response.tool_calls.length > 0) {
        // Execute tool calls
        const toolResults = await this.executeToolCalls(response.tool_calls)

        // Add assistant message with tool calls
        messages.push({
          role: "assistant",
          content: response.content || null,
          tool_calls: response.tool_calls.map(tc => ({
            id: tc.id,
            type: "function",
            function: tc.function
          }))
        })

        // Add tool results
        for (const toolResult of toolResults) {
          messages.push({
            role: "tool",
            content: toolResult.content,
            tool_call_id: toolResult.tool_call_id
          })
        }

        iteration++
      } else {
        // AI finished without tools or has final response
        finalContent = response.content || ''
        break
      }
    }

    return finalContent.trim()
  }

  /**
   * Execute READ_CONFIGS tool calls
   */
  private async executeToolCalls(
    toolCalls: Array<{ id: string; function: { name: string; arguments: string } }>
  ): Promise<Array<{ tool_call_id: string; content: string }>> {
    const results = []

    for (const toolCall of toolCalls) {
      if (toolCall.function.name === 'read_configs') {
        const args = JSON.parse(toolCall.function.arguments)
        const content = await this.readConfigs(args.references)

        results.push({
          tool_call_id: toolCall.id,
          content: JSON.stringify(content)
        })
      }
    }

    return results
  }

  /**
   * Read configs from database for tool call
   */
  private async readConfigs(
    references: Array<{ name: string; type: 'agent' | 'skill' }>
  ): Promise<Record<string, { found: boolean; content?: string; error?: string }>> {
    const results: Record<string, { found: boolean; content?: string; error?: string }> = {}

    for (const ref of references) {
      const key = `${ref.type}:${ref.name}`

      try {
        const configType = ref.type === 'agent' ? 'agent_definition' : 'skill'
        const configs = await this.configService.listConfigs({
          type: configType,
          searchName: ref.name
        })

        const config = this.findBestMatch(configs, ref.name)

        if (config) {
          results[key] = {
            found: true,
            content: config.content
          }
        } else {
          results[key] = {
            found: false,
            error: `${ref.type} '${ref.name}' not found in database`
          }
        }
      } catch (error) {
        results[key] = {
          found: false,
          error: `Failed to fetch ${ref.type} '${ref.name}': ${error}`
        }
      }
    }

    return results
  }

  /**
   * Build comprehensive system prompt
   */
  private buildSystemPrompt(
    availableReferences: { agents: string[]; skills: string[] }
  ): string {
    return `You are a slash command converter for AI coding agents.

**Your Task:**
Convert a Claude Code slash command into a standalone, self-contained prompt that can be copied and pasted into other AI agents (like Claude Code Web, Codex, or Gemini) that don't support slash commands.

**Conversion Rules:**
1. **Remove Frontmatter**: Strip all YAML frontmatter (the --- delimited section at the top)
2. **Replace Arguments**: Replace $ARGUMENTS or $ARGUMENT with user-provided values (if given)
3. **Inline Referenced Content**: Use the read_configs tool to fetch agent/skill content when needed
4. **Smart Inlining Strategy**:
   - INLINE if the command logic depends on the agent/skill
   - INLINE if the command explicitly calls or delegates to the agent/skill
   - OMIT if it's just a suggestion or optional reference
   - OMIT if it's not critical to the command's execution
5. **Clean Output**: Remove or rephrase any mentions of agents/skills you choose not to inline

**Sandbox Environment Constraints:**
The converted output will run in a sandboxed environment with:
- Only codebase files available (no external file system)
- Limited network access (external URLs may be blocked or return 404)
- NO access to GitHub data by default
- Can't read from ~/.claude or similar directories
- Must be completely self-contained

**Available References:**
To reduce false positives, here are the actual agents and skills available in the database:

Agents: ${availableReferences.agents.join(', ')}
Skills: ${availableReferences.skills.join(', ')}

**Tool Usage:**
- Use the read_configs tool to fetch content for agents/skills you decide to inline
- The tool returns the actual configuration content from the database
- Omit missing references gracefully (tool will indicate if not found)

**Output Format:**
Return ONLY the converted, standalone prompt. No explanations, no code blocks, no preamble.`
  }

  /**
   * Build user prompt with command content and arguments
   */
  private buildUserPrompt(
    content: string,
    userArguments?: string
  ): string {
    let prompt = `Convert the following Claude Code slash command:\n\n${content}`

    if (userArguments) {
      prompt += `\n\nUser Arguments: ${userArguments}`
      prompt += `\n(Replace $ARGUMENTS or $ARGUMENT with this value)`
    }

    return prompt
  }

  /**
   * Find best matching config (prefer exact match)
   */
  private findBestMatch(configs: Config[], targetName: string): Config | null {
    if (configs.length === 0) return null

    // Prefer exact match (case-insensitive)
    const exactMatch = configs.find(
      c => c.name.toLowerCase() === targetName.toLowerCase()
    )
    if (exactMatch) return exactMatch

    // Fallback to first result from LIKE search
    return configs[0]
  }
}
