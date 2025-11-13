import type { AgentFormat, ConfigType } from './domain/types'

/**
 * Centralized AI Prompts
 *
 * This file contains all AI prompts used throughout the application.
 * Keeping prompts in one place makes them easier to:
 * - Review and verify
 * - Edit and maintain
 * - Version control
 * - Test independently
 *
 * All prompt functions are pure functions with typed parameters.
 */

// ============================================================================
// FORMAT CONVERSION PROMPTS (OpenAI & Gemini)
// ============================================================================

/**
 * Build the complete prompt for converting config formats
 *
 * Used by: OpenAIProvider, GeminiProvider
 *
 * @param params - Conversion parameters
 * @returns Complete prompt string with system context and user prompt
 */
export function buildFormatConversionPrompt(params: {
  sourceContent: string
  sourceFormat: AgentFormat
  targetFormat: AgentFormat
  configType: ConfigType
}): string {
  const systemContext = `You are a configuration format converter for AI coding agents. Your task is to convert configuration files between different agent formats while preserving semantic meaning and functionality.

IMPORTANT RULES:
1. Preserve the exact semantic meaning of the original configuration
2. Maintain all functionality - do not add or remove features
3. Follow the target format's syntax precisely
4. Output ONLY the converted configuration - no explanations, no markdown code blocks, no preamble
5. If the source has parameters/arguments, preserve them in the target format's convention
6. Follow these convention for memory files, Claude Code has CLAUDE.md, Gemini has GEMINI.md and Codex has AGENTS.md. So when you encounter one in the source file, replace it for Destination.
    - e.g. If you encounter CLAUDE.md and are converting it to Gemini, Replace CLAUDE.md with GEMINI.md

${getFormatSpec(params.sourceFormat, 'SOURCE')}

${getFormatSpec(params.targetFormat, 'TARGET')}`

  const userPrompt = `Convert the following ${params.configType} configuration from ${params.sourceFormat} format to ${params.targetFormat} format:

${params.sourceContent}

Remember: Output ONLY the converted configuration in ${params.targetFormat} format. No explanations.`

  return systemContext + '\n\n' + userPrompt
}

/**
 * Get format specification for a given agent format
 *
 * Used by: buildFormatConversionPrompt
 *
 * @param format - The agent format (claude_code, codex, or gemini)
 * @param label - Label to use in the spec (e.g., "SOURCE" or "TARGET")
 * @returns Format specification string
 */
export function getFormatSpec(format: AgentFormat, label: string): string {
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

// ============================================================================
// SLASH COMMAND CONVERSION PROMPTS
// ============================================================================

/**
 * Build the comprehensive system prompt for slash command conversion
 *
 * This is the main prompt that instructs the AI on how to convert Claude Code
 * slash commands into standalone prompts by:
 * - Removing YAML frontmatter
 * - Replacing $ARGUMENT placeholders
 * - Extracting/inlining agent and skill references
 *
 * Used by: SlashCommandConverterService
 *
 * @param params - Available agents and skills for reference detection
 * @returns Comprehensive system prompt string
 */
export function buildSlashCommandSystemPrompt(params: {
  availableAgents: string[]
  availableSkills: string[]
}): string {
  return `<tool_usage_instructions>
IMPORTANT: You have access to a read_configs function tool. When you need agent or skill content:
1. Call the read_configs function with proper JSON parameters
2. DO NOT generate code examples or Python syntax
3. DO NOT use print() or any programming language syntax
4. Use the standard function calling API to request the content

Example of what the function expects:
{
  "references": [
    {"name": "triage", "type": "agent"},
    {"name": "conventional-commit", "type": "skill"}
  ]
}
</tool_usage_instructions>

<core_task>
Convert Claude Code slash commands to standalone prompts with SURGICAL changes only:
1. Remove YAML frontmatter
2. Replace $ARGUMENT in execution contexts (NOT in explanatory text)
3. Extract critical dependencies to external XML sections (preserve references in main prompt)

Output Format:
- Main prompt (with references to skills/agents preserved)
- Followed by XML sections for each extracted dependency
</core_task>


<sandbox_environment_context>
(This section is context for YOU to understand - do NOT add this to the output)

The converted output will run in sandboxed environments that:
- Only have codebase files available
- Are ALWAYS git repositories (checked out in clean state)
- Have limited network access
- Have NO GitHub access (use git commands only)
- Cannot read from ~/.claude or similar external directories
- AI agent can read/browse files, but USER cannot directly browse filesystem unless pushed in the specific branch

Use this context to decide:
- Which references need extracting to XML sections
- Which git/GitHub checks to REMOVE (repo existence is guaranteed)
- What network-dependent features to avoid
- When to suggest git commit/push workflows (always safe)

**Available References in Database:**

To reduce false positives when detecting references:

Agents: ${params.availableAgents.join(', ')}
Skills: ${params.availableSkills.join(', ')}
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

<agent_skill_extraction>
<decision_criteria>
EXTRACT if: Command logic depends on it OR explicitly delegates to it
OMIT if: Just a suggestion or optional reference
</decision_criteria>

<xml_output_format>
When you decide to extract agent/skill content:

1. **Keep reference in main prompt:**
   - Original: "Use **conventional-commit** skill for commits"
   - Main prompt: "Use **conventional-commit** skill for commits" (unchanged)
   - Do NOT inline content into main prompt body

2. **Add XML section AFTER main prompt:**
   Format: \`<Skill-Conventional-Commit>content</Skill-Conventional-Commit>\`

   Naming convention:
   - Skills: \`<Skill-Name>\` (capitalize each word, use hyphens)
   - Agents: \`<Agent-Name>\` (capitalize each word, use hyphens)

   Examples:
   - "conventional-commit" skill → \`<Skill-Conventional-Commit>\`
   - "web-search-specialist" agent → \`<Agent-Web-Search-Specialist>\`
   - "triage" agent → \`<Agent-Triage>\`
   - "qa-validator" agent → \`<Agent-Qa-Validator>\`

3. **Convert system prompt to user prompt in XML section:**
   ✅ STRIP from XML content:
   - YAML frontmatter (name, description, tools, color)
   - "You are..." identity statements
   - "You excel at..." capability declarations
   - Any personality/expertise descriptions

   ✅ PRESERVE in XML content:
   - ALL procedural content (## Process, steps, instructions)
   - ALL markdown structure (headers, bold, lists)
   - ALL output format specifications
   - ALL behavioral guidance ("Be concise", "Focus on...")
   - ALL examples and edge cases

   ✅ TRIM from XML content:
   - Code examples (remove or simplify to 1-2 lines)
   - Keep command references and command syntax
   - Example: Remove full code blocks, keep "Run \`npm test\`" or "Use \`git status\`"
</xml_output_format>

<complete_example>
INPUT (slash command):
\`\`\`
---
description: Fix bugs in component
argument-hint: component name
---

Analyze the $ARGUMENT component.

Use **triage** agent to identify issues.
Use **conventional-commit** skill for commits.

Test thoroughly before committing.
\`\`\`

TRIAGE AGENT CONTENT (system prompt):
\`\`\`
---
name: triage
description: Issue analysis specialist
tools: [Bash, Read, Grep]
---

You are an Expert Technical Triage Specialist with deep expertise...

## Triage Process
1. Identify issue type from error/symptoms
2. Reproduce with minimal steps
3. Find root cause (check logs, inspect browser console)

Example reproduction:
\\\`\\\`\\\`typescript
// Reproduce the bug
const result = brokenFunction();
console.log(result); // Expected: X, Actual: Y
\\\`\\\`\\\`

## Output Format
**ISSUE**: [One line]
**CAUSE**: [Root cause]
**FIX**: [Solution]

Be extremely concise.
\`\`\`

CONVENTIONAL-COMMIT SKILL CONTENT:
\`\`\`
---
name: conventional-commit
description: Commit message formatter
---

You are a commit message expert...

## Commit Format
type(scope): message

Types: feat, fix, docs, refactor

Example:
\\\`\\\`\\\`bash
git commit -m "feat(auth): add OAuth2 support"
git commit -m "fix(ui): resolve button alignment"
\\\`\\\`\\\`
\`\`\`

OUTPUT (with XML extraction):
\`\`\`
Analyze the authentication component.

Use **triage** agent to identify issues.
Use **conventional-commit** skill for commits.

Test thoroughly before committing.

<Agent-Triage>
## Triage Process
1. Identify issue type from error/symptoms
2. Reproduce with minimal steps
3. Find root cause (check logs, inspect browser console)

## Output Format
**ISSUE**: [One line]
**CAUSE**: [Root cause]
**FIX**: [Solution]

Be extremely concise.
</Agent-Triage>

<Skill-Conventional-Commit>
## Commit Format
type(scope): message

Types: feat, fix, docs, refactor

Commands: \`git commit -m "type(scope): message"\`
</Skill-Conventional-Commit>
\`\`\`

Notice what changed:
- ✓ Frontmatter removed
- ✓ $ARGUMENT → "authentication"
- ✓ Main prompt keeps agent/skill references (NOT inlined)
- ✓ XML sections added AFTER main prompt
- ✓ XML naming: \`<Agent-Triage>\`, \`<Skill-Conventional-Commit>\`
- ✓ System prompt identity removed from XML content
- ✓ Procedural content preserved in XML
- ✓ Code examples trimmed (kept command syntax only)
</complete_example>
</agent_skill_extraction>

<preservation_rules>
CRITICAL: Keep original command as much as possible

✅ Preserve exactly in MAIN PROMPT:
- Formatting: Bold (**text**), italics, code blocks, XML tags
- Structure: Step numbering, headers, bullet nesting
- Tone: Formal/casual/funny - maintain voice
- Emphasis: IMPORTANT, NEVER, ALWAYS - keep them
- Personality: Jokes, quotes, cultural references
- Details: Examples, edge cases, validation formats
- Agent/skill references: Keep "use **agent-name** agent" as is

❌ Only modify in MAIN PROMPT:
- Frontmatter (remove)
- $ARGUMENT in execution contexts (replace smartly in context)
- Nothing else in main prompt

✅ In XML SECTIONS (extracted agent/skill content):
- Strip system prompt identity ("You are...")
- Preserve all procedural content and structure
- Trim code examples to command syntax only
- Keep all behavioral guidance and output formats

Quality check: < 5% of main prompt content should change (excluding frontmatter)
</preservation_rules>

<output_format>
Return the converted output in this exact format:

1. Main prompt (with frontmatter removed, $ARGUMENT replaced, references preserved)
2. Blank line
3. XML sections (one per extracted agent/skill)

Structure:
\`\`\`
[Main prompt content]

<Agent-Name>
[Agent content - system identity removed, procedural content preserved, code examples trimmed]
</Agent-Name>

<Skill-Name>
[Skill content - system identity removed, procedural content preserved, code examples trimmed]
</Skill-Name>
\`\`\`

- No explanations before or after
- No code block wrappers around the entire output
- No preamble or commentary
- Just: main prompt + XML sections
</output_format>`
}

/**
 * Build the user prompt for slash command conversion
 *
 * Used by: SlashCommandConverterService
 *
 * @param params - Command content and optional user arguments
 * @returns User prompt string
 */
export function buildSlashCommandUserPrompt(params: {
  content: string
  userArguments?: string
}): string {
  let prompt = `Convert the following Claude Code slash command:\n\n${params.content}`

  if (params.userArguments) {
    prompt += `\n\nUser Arguments: ${params.userArguments}`
    prompt += `\n(Replace $ARGUMENTS or $ARGUMENT with this value)`
  }

  return prompt
}

// ============================================================================
// SLASH COMMAND ANALYSIS PROMPTS
// ============================================================================

/**
 * Build the prompt for detecting agent and skill references
 *
 * This prompt instructs the AI to analyze a slash command and identify
 * references to agents and skills, returning structured JSON.
 *
 * Used by: SlashCommandAnalyzerService
 *
 * @param content - The slash command content to analyze
 * @returns Analysis prompt string
 */
export function buildReferenceDetectionPrompt(content: string): string {
  return `Analyze this Claude Code slash command and detect references to agents and skills.

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
}
