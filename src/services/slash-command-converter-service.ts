import {
  Config,
  SlashCommandAnalysis,
  SlashCommandConversionInput,
  SlashCommandConversionResult,
} from '../domain/types'
import {AIConverterService} from '../infrastructure/ai-converter'
import {ConfigService} from './config-service'

export class SlashCommandConverterService {
  constructor(
    private aiConverter: AIConverterService,
    private configService: ConfigService
  ) { }

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
      this.configService.listConfigs({type: 'agent_definition'}),
      this.configService.listConfigs({type: 'skill'}),
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
    availableReferences: {agents: string[]; skills: string[]}
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
        function: {name: string; arguments: string}
      }>
      tool_call_id?: string
    }> = [
        {role: "system", content: systemPrompt},
        {role: "user", content: userPrompt}
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
    toolCalls: Array<{id: string; function: {name: string; arguments: string}}>
  ): Promise<Array<{tool_call_id: string; content: string}>> {
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
    references: Array<{name: string; type: 'agent' | 'skill'}>
  ): Promise<Record<string, {found: boolean; content?: string; error?: string}>> {
    const results: Record<string, {found: boolean; content?: string; error?: string}> = {}

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
    availableReferences: {agents: string[]; skills: string[]}
  ): string {
    return `<core_task>
Convert Claude Code slash commands to standalone prompts with SURGICAL changes only:
1. Remove YAML frontmatter
2. Replace $ARGUMENT in execution contexts (NOT in explanatory text)
3. Inline critical dependencies (converted from system → user prompt format)
</core_task>


<sandbox_environment_context>
(This section is context for YOU to understand - do NOT add this to the output)

The converted output will run in sandboxed environments that:
- Only have codebase files available
- Are always git repositories
- Have limited network access
- Cannot access GitHub directly
- Cannot read from ~/.claude or similar directories
- **File Browsing Limitation**: The AI agent can read/browse files, but the USER cannot directly browse the file system
  - Best practice: Agent should commit and push changes to a git branch so users can review via git/GitHub UI
  - If the original command instructs "review file X" or "check the output", consider adding git workflow guidance

Use this context to decide:
- Which references need inlining (external dependencies → inline)
- Which contents to strip down (Think, can we have github content since sandbox can't access github directly)
- Which assumptions are safe (git commands → safe)
- What network-dependent features to avoid
- When to add git commit/push guidance (if original command expects user file review)

**Available References in Database:**

To reduce false positives when detecting references:

Agents: ${availableReferences.agents.join(', ')}
Skills: ${availableReferences.skills.join(', ')}
</sandbox_environment_context>

<frontmatter_removal>
Strip everything between '-- -' markers at the start of the command.
</frontmatter_removal>


<argument_replacement>
<when_to_replace>
✅ REPLACE $ARGUMENT when it appears in EXECUTION instructions:
- "Pass $ARGUMENT to the command"
- "Fetch ticket $ARGUMENT from GitHub"
- "Write output to taskNotes/$ARGUMENT/file.md"

❌ DO NOT REPLACE in EXPLANATORY or META text:
- "If $ARGUMENT is provided..." (explaining the argument)
- "The $ARGUMENT can be..." (describing what it is)
- "$ARGUMENT format: task | ticket-id" (documenting structure)

Decision rule: Does inserting the actual value make grammatical sense?
</when_to_replace>

<multiple_occurrences>
If $ARGUMENT appears multiple times:
- First occurrence in execution: Replace with full value
- Subsequent occurrences: Replace if it adds clarity, use shorthand if repetitive
- Avoid making the prompt unreadable with excessive repetition
</multiple_occurrences>
</argument_replacement>

<agent_skill_inlining>
<decision_criteria>
INLINE if: Command logic depends on it OR explicitly delegates to it
OMIT if: Just a suggestion or optional reference
</decision_criteria>

<system_to_user_conversion>
Agent/skill content is a SYSTEM PROMPT (defines AI behavior).
Slash commands are USER PROMPTS (task instructions).

When inlining, convert appropriately:

✅ STRIP:
- YAML frontmatter (name, description, tools, color)
- "You are..." identity statements
- "You excel at..." capability declarations
- Any personality/expertise descriptions

✅ PRESERVE:
- ALL procedural content (## Process, steps, instructions)
- ALL markdown structure (headers, bold, lists)
- ALL output format specifications
- ALL behavioral guidance ("Be concise", "Focus on...")
- ALL examples and edge cases

✅ ADD (minimal framing):
- Simple transition: "When doing X, follow these instructions:"
- Or integrate naturally into the surrounding text

Example conversion:
---
name: triage
description: Issue analysis specialist
---
You are an Expert Technical Triage Specialist...

## Triage Process
1. Identify issue type
2. Reproduce with minimal steps
...

BECOMES:

## Triage Process
1. Identify issue type
2. Reproduce with minimal steps
...

(Strip frontmatter + identity, keep procedural content)
</system_to_user_conversion>
</agent_skill_inlining>

<preservation_rules>
CRITICAL: Keep original command as much as possible

✅ Preserve exactly:
- Formatting: Bold (**text**), italics, code blocks, XML tags
- Structure: Step numbering, headers, bullet nesting
- Tone: Formal/casual/funny - maintain voice
- Emphasis: IMPORTANT, NEVER, ALWAYS - keep them
- Personality: Jokes, quotes, cultural references
- Details: Examples, edge cases, validation formats

❌ Only modify:
- Frontmatter (remove)
- $ARGUMENT in execution contexts (replace)
- Critical agent/skill references (inline and convert)

Quality check: < 10% of content should change (excluding frontmatter)
</preservation_rules>

<non_inlined_references>
For agent/skill mentions NOT being inlined:
- Remove ONLY the reference mention
- Example: "use **triage** agent" → "perform triage" OR remove phrase
- Keep ALL surrounding text exactly as is
- DO NOT rephrase or restructure
</non_inlined_references>

<output_format>
Return ONLY the converted prompt.
- No explanations
- No code block wrappers
- No preamble
- Just the clean, converted command
</output_format>`
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
