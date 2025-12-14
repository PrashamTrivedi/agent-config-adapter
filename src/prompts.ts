import type {AgentFormat, ConfigType} from './domain/types'

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
  const systemContext = `You are a configuration format converter for AI coding agents. 
  Your task is to convert configuration files between different agent formats while preserving tone, meaning and functionality.

IMPORTANT RULES:
1. Preserve the exact semantic meaning of the original configuration
2. Preserve Formatting, Tone and functionality of prompt
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

Parameters can be referenced as $ARGUMENTS in the prompt.
<ClaudeCodeMetaData>
- Can run shell commands by directly using !\`Command\` way
- Can run inject file contents by directly using  @\`FilePath\` way
</ClaudeCodeMetaData>
`

    case 'codex':
      return `${label} FORMAT: Codex
Codex Slash Comands are Markdown with YAML Frontmatter:
---
description: Prep a branch, commit, and open a draft PR
argument-hint: [FILES=<paths>] [PR_TITLE="<title>"]
---

Create a branch named \`dev / <feature_name>\` for this work.
If files are specified, stage them first: $FILES.
Commit the staged changes with a clear message.
Open a draft PR on the same branch. Use $PR_TITLE when supplied; otherwise write a concise summary yourself.

<CodexPromptMetadata>
Codex reads prompt metadata and placeholders the next time the session starts.

Description — Shown under the command name in the popup. Set it in YAML frontmatter as description:.
Argument hint — Document expected parameters with argument-hint: KEY=<value>.
Positional placeholders — $1-$9 expand from space-separated arguments you provide after the command. $ARGUMENTS includes them all.
Named placeholders — Use uppercase names like $FILE or $TICKET_ID and supply values as KEY=value. Quote values with spaces (for example, FOCUS="loading state").
Literal dollar signs — Write $$ to emit a single $ in the expanded prompt.
</CodexPromptMetadata>

`
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
If there are no parameters, omit the args field entirely.
<GeminiMetadata>
- Can run shell commands using !{command} way
- Can inject file content using @{filePath} way
</GeminiMetadata>
`

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
  const agentsList = params.availableAgents.length > 0
    ? `Agents: ${params.availableAgents.join(', ')}`
    : 'Agents: (none available)'

  const skillsList = params.availableSkills.length > 0
    ? `Skills: ${params.availableSkills.join(', ')}`
    : 'Skills: (none available)'

  return `

# Purpose

Convert Claude Code Slash Commands to Standalone Prompts

## Inputs
- Claude Code slash command definition
- Optional: User request with arguments

## Available References
${agentsList}
${skillsList}

## MUST REMOVE (sandbox guarantees these)
- ❌ "Is this a git repo?" checks — **always yes**
- ❌ "Is working directory clean?" checks — **always yes**
- ❌ Stash/uncommitted change handling — **never needed**
- ✅ Latest contents from main branch — **always checked out**
- ✅ In a different branch — **almost always available, and you can verify it by running proper git command**


## Workflow
1. Parse slash command, strip frontmatter
2. Replace \`$ARGUMENTS\` with user-provided values
3. Remove/rewrite sandbox-incompatible operations (network calls, interactive user prompts, git status checks) and present that form to user before calling any tool.

## Conversion Rules
- Preserve: formatting, structure, tone, emphasis, workflows, procedural content
- Strip persona phrases ("You are...", "Act as...") from injected agent/skill content — state purpose directly

`
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
  let prompt = `Convert the following Claude Code slash command
  <ExistingSlashCommand>
  ${params.content}
  </ExistingSlashCommand>`

  if (params.userArguments) {
    prompt += `<UserArguments> ${params.userArguments}</UserArguments>`
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
