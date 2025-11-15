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
  return `
# Purpose

Convert Claude Code slash commands to standalone prompts with SURGICAL changes only

## Inputs

You will be provided following inputs

- The Claude Code Slash Command definition
- Optional: User request 



### Tools

You have access to \`read_configs\` tool which accepts a JSON in following shape

[{name:configName, type: one of agent or skill}]

The tool will fetch the config of given type and return with exact content. If it doesn't it will return blank, indicating the absense of the config

## Environment

The converted prompt will run in a coding agent in a sandboxed environment. 

This is how sandbox works:

## Environment

The converted prompt will run in a coding agent in a sandboxed environment.

This is how sandbox works:
- Sandbox is a linux virtual machine or container with many development tools installed.
- The coding agent has all the permissions to run the tool it has access to.
- Sandbox works in a Checked out git repository, with a non-main branch and is always clean state.
- Sandbox always in the codebase directory.
- It works with terminal agent in Command line, and there is a chat intface to interact with the agent.
- It does not have Github access or wider internet access. **Therefore, any tool, agent, skill, or command that requires network access (e.g., \`gh\`, \`curl\`, web search) is invalid and must be completely removed from the workflow.** The logic must be adapted to work with only the information provided by the user and the local file system.
-  **Crucially, when a file is created for user review, the workflow must be: 1. Write the file. 2. commit, and push the file. 3. Announce that the file is ready for review in the branch.The prompt must NOT instruct the agent to display the file's contents in the chat.**

## Workflow

    - Read given slash command content
      - Check out $ARGUMENTS, replace smartly with user provided arguments
        - Rewrite or remove any references which are invalid with the sandbox
          - Call the tool and add the content of Agents or skill in their respective XML section after converted prompt. 
    - Strip out frontmater from the agent and skill definition.
    - For XML tags, follow this format < Agent / Skill - Kebab - Case - Name - Of - Agent >
    - Strip out frontmatter from the prompt

## Conversion rules

    - Preserve formatting, structure, tone, personality, emphasis and details from slash command.
- Preserve workflows, structure, procedural content
    - When injecting Agent or Skill content, you ** MUST ** remove persona - defining phrases like "You are...", "Your role is...", "Act as...".The content should state the purpose directly, not assign a persona.

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
