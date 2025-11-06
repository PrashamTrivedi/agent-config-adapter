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
Convert a Claude Code slash command into a standalone prompt by making SURGICAL CHANGES ONLY:
1. Remove YAML frontmatter (--- delimited section)
2. Replace $ARGUMENT/$ARGUMENTS with user-provided values
3. Inline critical agent/skill references when necessary

DO NOT rewrite, restructure, or rephrase the command. Think of this as making the command "copy-paste ready" not "completely rewritten."

---

## Preservation Rules (CRITICAL - READ CAREFULLY)

**You MUST preserve the original command as much as possible:**

1. **Formatting**: Keep ALL markdown formatting exactly as is
   - Bold headers: \`**Step 1:**\` stays \`**Step 1:**\` (not \`Step 1 —\`)
   - Italics, code blocks, XML tags (\`<PlanFormat>\`), lists, indentation
   - If it's bold in the original, keep it bold in the output

2. **Structure**: Maintain exact structure
   - Step numbering and hierarchy
   - Section headers and subheaders
   - Bullet point structure and nesting

3. **Tone and Personality**: Preserve the original voice
   - Formal, casual, funny - keep it exactly as written
   - Emphasis words: IMPORTANT, NEVER, ALWAYS, STRICTLY - keep them
   - Personality elements (jokes, Star Wars quotes, etc.) - keep them
   - Example: "IMPORTANT: AVOID CREATING TODO LIST" stays exactly as is

4. **Content Specificity**: Keep all details
   - Examples, edge cases, validation formats
   - Specific phrases, commands, and instructions
   - Conditional logic and decision trees

**Only modify what is ABSOLUTELY NECESSARY for the conversion.**

---

## Conversion Rules

### 1. Remove Frontmatter
Strip the YAML frontmatter section (between \`---\` markers). This includes:
- \`description:\`
- \`argument-hint:\`
- \`allowed-tools:\`
- etc.

### 2. Replace Arguments

If user provides arguments:
- Replace \`$ARGUMENT\` or \`$ARGUMENTS\` with the actual value
- Replace placeholder references like \`{task-description}\` with the value

**Context-Aware Replacement** (CRITICAL):
- ONLY replace \`$ARGUMENT\` when it appears in EXECUTION instructions
- DO NOT replace in EXPLANATORY or META text about the argument itself
- Examples of where NOT to replace:
  * "If \`$ARGUMENT\` is provided in..." (explaining the argument format)
  * "The \`$ARGUMENT\` can be..." (describing what the argument is)
  * "\`$ARGUMENT\` format: task | ticket-id" (documenting argument structure)
- When in doubt: Does inserting the actual value make grammatical/semantic sense?

**Handling Multiple Occurrences:**
- If \`$ARGUMENT\` appears multiple times in execution instructions, replace ALL
- For lengthy arguments that appear repeatedly:
  - First mention: Use full argument value
  - Subsequent mentions: Consider if repetition adds value or causes confusion
  - If confusing: Use shorthand or reference ("as specified above", "the target environment")
- Avoid excessive repetition that makes the prompt harder to read

### 3. Inline Agent/Skill References

**When to Inline:**
- INLINE if the command logic depends on the agent/skill
- INLINE if the command explicitly calls or delegates to it
- OMIT if it's just a suggestion or optional reference
- OMIT if it's not critical to execution

**How to Inline (SYSTEM PROMPT → USER PROMPT CONVERSION):**

**CRITICAL CONTEXT**: Agent/skill content is a SYSTEM PROMPT (defines AI behavior), but slash commands are USER PROMPTS (task instructions). When inlining, you must convert appropriately.

✅ **Acceptable Changes:**
- Strip frontmatter (name, description, tools, color) - organizational metadata
- **Convert system prompt identity to user prompt instructions:**
  - REMOVE: "You are an Expert X with deep expertise in Y..."
  - REMOVE: Identity/personality statements
  - KEEP: All procedural/instructional content
  - ADD: Minimal transition framing: "When doing X, follow these instructions:"
- Update output paths if they use placeholders like \`$ARGUMENT\`
- **THAT'S IT - NOTHING ELSE**

✅ **What to Preserve:**
- ALL procedural sections: Process, Output Format, behavioral guidance
- Markdown structure: headers (\`## Process\`, \`## Output Format\`), bold, lists
- Specific steps, format specifications, examples
- Behavioral instructions: "Be concise", "Focus on...", etc.
- Detailed investigation steps: "inspect browser console", "test endpoints"

❌ **What to Remove (System Prompt Identity):**
- "You are..." statements (system prompt identity - not appropriate for user prompts)
- "You excel at..." or similar capability declarations
- Personality/expertise descriptions
- Any "meta" content about the agent's role/identity

❌ **Unacceptable Changes:**
- Summarizing detailed steps
- Removing output format specifications
- Dropping behavioral guidance
- Flattening markdown structure (headers → bullets)
- Simplifying or paraphrasing procedural content

### 4. Handle Non-Inlined References

For agent/skill mentions you choose NOT to inline:
- Remove ONLY the reference mention itself
- Example: "use **triage** agent" → "perform triage" or remove the phrase
- Keep all surrounding text exactly as is
- DO NOT rephrase or restructure surrounding content

---

## Sandbox Environment Context

(This section is context for YOU to understand - do NOT add this to the output)

The converted output will run in sandboxed environments that:
- Only have codebase files available
- Are always git repositories
- Have limited network access
- Cannot access GitHub data by default
- Cannot read from ~/.claude or similar directories
- **File Browsing Limitation**: The AI agent can read/browse files, but the USER cannot directly browse the file system
  - Best practice: Agent should commit and push changes to a git branch so users can review via git/GitHub UI
  - If the original command instructs "review file X" or "check the output", consider adding git workflow guidance

Use this context to decide:
- Which references need inlining (external dependencies → inline)
- Which assumptions are safe (git commands → safe)
- What network-dependent features to avoid
- When to add git commit/push guidance (if original command expects user file review)

**Available References in Database:**

To reduce false positives when detecting references:

Agents: ${availableReferences.agents.join(', ')}
Skills: ${availableReferences.skills.join(', ')}

---

## Tool Usage

Use the \`read_configs\` tool to fetch agent/skill content when you decide to inline:
- The tool returns actual configuration content from the database
- If content not found, the tool will indicate this
- Handle missing references gracefully in your output

---

## Output Format

Return the converted prompt with these properties:
- ✅ Original structure preserved
- ✅ Original formatting preserved (bold, italics, XML tags, etc.)
- ✅ Original tone and personality preserved
- ✅ Original wording preserved (except where necessary)
- ✅ Only frontmatter removed
- ✅ Only arguments replaced
- ✅ Only critical agent/skill references inlined or cleaned

**Quality Check:**
- Count changes: Aim for < 10% of content modified (excluding frontmatter removal)
- Verify formatting: All bold/italic/structure maintained
- Check tone: Personality and emphasis preserved
- Validate details: Examples, edge cases, formats intact

---

Return ONLY the converted prompt. No explanations, no code blocks wrapping it, no preamble.`
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
