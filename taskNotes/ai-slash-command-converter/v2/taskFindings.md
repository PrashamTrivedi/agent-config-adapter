# Purpose

Complete rewrite of AI-powered slash command converter with tool-based reference resolution

## Original Ask

We have executed ai-slash-command converter very wrong. I want a complete re-write of it.

Here is what I found wrong:

1. The prompt `const prompt = 'You are converting a Claude Code sl...'` is a full blown prompt. And we are merging it with another prompt which convert one slash command to another.... We are converting a slash command for a different thing.... We need to pass exactly that prompt and nothing else.

2. The entire AI flow must be this:

**Components:**
- **Prompt**: A detailed prompt (most of it is correct) that focuses on inlining arguments and inlining agents
- **Original Content**: From the selected command
- **Arguments**: From user
- **Additional context**: Names of all agents and skills (to reduce false positive names)
- **Tools**: READ_CONFIGS tool that accepts `{name:type}` JSON Array
  - Prompt will know about the tool, call it, and then inline what's found
  - Sweep under the rug what was not found
- **Output**: Single inlined content

The prompt will have following things to take care of:
- The final output will run in a sandboxed environment which is (mostly) a proper Linux but only codebase as the files and limited network access blocked (or 404ed by sandbox)
- They can't (by default) fetch any GitHub data

## Complexity and the reason behind it

**Complexity Score: 3/5**

**Reasoning:**
- **Complete service layer rewrite** - SlashCommandConverterService needs fundamental restructuring
- **OpenAI Function Calling** - Implement tool/function calling pattern for READ_CONFIGS
- **Single-pass AI conversion** - One comprehensive AI call instead of multiple fragmented calls
- **Prompt engineering** - Craft detailed system prompt with sandbox constraints
- **Context building** - Provide all agent/skill names upfront to reduce false positives
- **Tool result handling** - Process AI's tool calls and feed results back
- **Error handling** - Handle tool call failures gracefully

Not complexity 4+ because:
- No database changes required (reuses existing schema)
- No new routes or endpoints (updates existing conversion endpoint)
- Frontend unchanged (service layer only)
- Reuses existing ConfigService for database queries
- OpenAI SDK already installed and configured
- Pre-computed analysis metadata still works as-is

## Architectural changes required

### High-Level Architecture Change

**Before (Current - WRONG):**
```
1. Parse stored analysis metadata
2. Check if user input needed
3. Resolve references from database
4. AI CALL #1: Determine inlining strategy
5. AI CALL #2: Generate output
6. Return result
```

**After (New - CORRECT):**
```
1. Parse stored analysis metadata
2. Check if user input needed 
3. Build context: all agent/skill names
4. SINGLE AI CALL with:
   - Comprehensive prompt
   - Original slash command content
   - User arguments (if any)
   - Context of available agents/skills
   - READ_CONFIGS tool definition
5. AI calls READ_CONFIGS tool as needed
6. Feed tool results back to AI
7. AI produces final inlined output
8. Return result
```

### OpenAI Function Calling Pattern

**Tool Definition:**
```typescript
{
  type: "function",
  function: {
    name: "read_configs",
    description: "Read agent or skill configuration content from the database. Use this to fetch referenced agents/skills that need to be inlined.",
    parameters: {
      type: "object",
      properties: {
        references: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string", description: "Name of the agent or skill" },
              type: { type: "string", enum: ["agent", "skill"], description: "Type of config to fetch" }
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
```

**Execution Flow:**
1. AI makes initial response with tool calls
2. Service executes READ_CONFIGS for each tool call
3. Service provides tool results back to AI
4. AI continues and produces final output

### No Database Changes

All required metadata already exists:
- `has_arguments` - Check if user input needed
- `argument_hint` - Hint for user arguments
- `agent_references` - JSON array of agent names
- `skill_references` - JSON array of skill names
- `analysis_version` - Cache invalidation

## Backend changes required

### 1. Complete Rewrite of SlashCommandConverterService

**File:** `src/services/slash-command-converter-service.ts`

**Current Structure (REMOVE ALL):**
- `determineInliningStrategy()` - DELETE (wrong approach)
- `generateOutput()` - DELETE (replaced by single AI call)
- `resolveReferences()` - DELETE (replaced by tool calling)
- `removeFrontmatter()` - KEEP (still needed for final output)

**New Structure:**

```typescript
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
    // 1. Parse stored analysis
    const analysis = this.parseAnalysis(config);

    // 2. Check if user input needed
    if (analysis.hasArguments && !input.userArguments) {
      return {
        convertedContent: '',
        needsUserInput: true,
        analysis,
      };
    }

    // 3. Build context of all available agents/skills
    const availableReferences = await this.buildReferenceContext();

    // 4. Single AI call with tool support
    const convertedContent = await this.convertWithTools(
      config.content,
      input.userArguments,
      analysis,
      availableReferences
    );

    return {
      convertedContent,
      needsUserInput: false,
      analysis,
    };
  }

  /**
   * Build context of all available agent/skill names
   * This helps AI avoid false positives
   */
  private async buildReferenceContext(): Promise<{
    agents: string[];
    skills: string[];
  }> {
    const [agentConfigs, skillConfigs] = await Promise.all([
      this.configService.listConfigs({ type: 'agent_definition' }),
      this.configService.listConfigs({ type: 'skill' }),
    ]);

    return {
      agents: agentConfigs.map(c => c.name),
      skills: skillConfigs.map(c => c.name),
    };
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
    // Build comprehensive prompt
    const systemPrompt = this.buildSystemPrompt(availableReferences);
    const userPrompt = this.buildUserPrompt(content, userArguments);

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
    ];

    // Call AI with tool support
    let messages = [
      { role: "system" as const, content: systemPrompt },
      { role: "user" as const, content: userPrompt }
    ];

    // Execute AI call with potential tool iterations
    let finalContent = '';
    let maxIterations = 3; // Prevent infinite loops
    let iteration = 0;

    while (iteration < maxIterations) {
      const response = await this.aiConverter.chatWithTools(messages, tools);

      // Check if AI wants to use tools
      if (response.tool_calls && response.tool_calls.length > 0) {
        // Execute tool calls
        const toolResults = await this.executeToolCalls(response.tool_calls);

        // Add assistant message with tool calls
        messages.push({
          role: "assistant" as const,
          content: response.content || null,
          tool_calls: response.tool_calls
        });

        // Add tool results
        for (const toolResult of toolResults) {
          messages.push({
            role: "tool" as const,
            content: toolResult.content,
            tool_call_id: toolResult.tool_call_id
          });
        }

        iteration++;
      } else {
        // AI finished without tools or has final response
        finalContent = response.content || '';
        break;
      }
    }

    return finalContent.trim();
  }

  /**
   * Execute READ_CONFIGS tool calls
   */
  private async executeToolCalls(
    toolCalls: Array<{ id: string; function: { name: string; arguments: string } }>
  ): Promise<Array<{ tool_call_id: string; content: string }>> {
    const results = [];

    for (const toolCall of toolCalls) {
      if (toolCall.function.name === 'read_configs') {
        const args = JSON.parse(toolCall.function.arguments);
        const content = await this.readConfigs(args.references);

        results.push({
          tool_call_id: toolCall.id,
          content: JSON.stringify(content)
        });
      }
    }

    return results;
  }

  /**
   * Read configs from database for tool call
   */
  private async readConfigs(
    references: Array<{ name: string; type: 'agent' | 'skill' }>
  ): Promise<Record<string, { found: boolean; content?: string; error?: string }>> {
    const results: Record<string, { found: boolean; content?: string; error?: string }> = {};

    for (const ref of references) {
      const key = `${ref.type}:${ref.name}`;

      try {
        const configType = ref.type === 'agent' ? 'agent_definition' : 'skill';
        const configs = await this.configService.listConfigs({
          type: configType,
          searchName: ref.name
        });

        const config = this.findBestMatch(configs, ref.name);

        if (config) {
          results[key] = {
            found: true,
            content: config.content
          };
        } else {
          results[key] = {
            found: false,
            error: `${ref.type} '${ref.name}' not found in database`
          };
        }
      } catch (error) {
        results[key] = {
          found: false,
          error: `Failed to fetch ${ref.type} '${ref.name}': ${error}`
        };
      }
    }

    return results;
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
Return ONLY the converted, standalone prompt. No explanations, no code blocks, no preamble.`;
  }

  /**
   * Build user prompt with command content and arguments
   */
  private buildUserPrompt(
    content: string,
    userArguments?: string
  ): string {
    let prompt = `Convert the following Claude Code slash command:\n\n${content}`;

    if (userArguments) {
      prompt += `\n\nUser Arguments: ${userArguments}`;
      prompt += `\n(Replace $ARGUMENTS or $ARGUMENT with this value)`;
    }

    return prompt;
  }

  /**
   * Find best matching config (prefer exact match)
   */
  private findBestMatch(configs: Config[], targetName: string): Config | null {
    if (configs.length === 0) return null;

    // Prefer exact match (case-insensitive)
    const exactMatch = configs.find(
      c => c.name.toLowerCase() === targetName.toLowerCase()
    );
    if (exactMatch) return exactMatch;

    // Fallback to first result from LIKE search
    return configs[0];
  }

  /**
   * Parse analysis metadata from config
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
        : []
    };
  }
}
```

### 2. Update AIConverterService

**File:** `src/infrastructure/ai-converter.ts`

**Add new method for tool-enabled chat:**

```typescript
/**
 * Chat completion with tool/function calling support
 */
async chatWithTools(
  messages: Array<{ role: string; content: string | null; tool_calls?: any }>,
  tools: Array<{ type: string; function: any }>
): Promise<{
  content: string | null;
  tool_calls?: Array<{ id: string; function: { name: string; arguments: string } }>;
}> {
  try {
    const response = await this.openai.chat.completions.create({
      model: 'gpt-5-mini',
      messages: messages as any,
      tools: tools as any,
      tool_choice: 'auto',
    });

    const message = response.choices[0].message;

    return {
      content: message.content,
      tool_calls: message.tool_calls?.map(tc => ({
        id: tc.id,
        function: {
          name: tc.function.name,
          arguments: tc.function.arguments
        }
      }))
    };
  } catch (error) {
    console.error('AI chat with tools failed:', error);
    throw new Error('AI conversion failed');
  }
}
```

### 3. Update Route Layer

**File:** `src/routes/slash-command-converter.ts`

**No changes needed!** The route layer already passes `config` and `input` to `converterService.convert()`. The service layer handles everything internally.

### 4. TypeScript Type Updates

**File:** `src/domain/types.ts`

**Add types for tool calling (if not already present):**

```typescript
// Tool calling types for OpenAI function calling
export interface ToolCall {
  id: string;
  function: {
    name: string;
    arguments: string;
  };
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
}

export interface ReadConfigsInput {
  references: Array<{
    name: string;
    type: 'agent' | 'skill';
  }>;
}

export interface ReadConfigsOutput {
  [key: string]: {
    found: boolean;
    content?: string;
    error?: string;
  };
}
```

## Frontend changes required

**None required.**

This is a pure backend service layer rewrite. The existing frontend UI at `/slash-commands/convert` will continue to work exactly as before, but with improved conversion quality.

## Acceptance Criteria

### Service Layer Rewrite

✅ **AC1:** Service uses single AI call instead of multiple fragmented calls
- Given: Slash command with agent/skill references
- When: `convert()` is called
- Then: Only ONE call to `aiConverter.chatWithTools()` (with potential tool iterations)

✅ **AC2:** AI can call READ_CONFIGS tool to fetch references
- Given: Slash command references "triage" agent
- When: AI decides to inline it
- Then: AI calls `read_configs` with `{name: "triage", type: "agent"}`
- And: Service fetches from database and returns content

✅ **AC3:** Service provides all agent/skill names as context
- Given: Database has 10 agents and 5 skills
- When: Conversion starts
- Then: System prompt includes all 15 names to reduce false positives

✅ **AC4:** Service handles tool call iterations correctly
- Given: AI makes 2 tool calls in sequence
- When: Each tool returns results
- Then: Service feeds results back and allows AI to continue
- And: Final output is produced after tool calls complete

✅ **AC5:** Service handles missing references gracefully
- Given: AI requests "nonexistent-agent"
- When: Tool call is executed
- Then: Returns `{found: false, error: "agent 'nonexistent-agent' not found"}`
- And: AI continues with this information

✅ **AC6:** Comprehensive system prompt includes sandbox constraints
- Given: Conversion is initiated
- When: System prompt is built
- Then: Prompt mentions sandboxed environment, no GitHub access, no file system

✅ **AC7:** Arguments are replaced correctly
- Given: Slash command with $ARGUMENTS placeholder
- When: User provides arguments "fix-login-bug"
- Then: Final output has $ARGUMENTS replaced with "fix-login-bug"

✅ **AC8:** Frontmatter is removed from final output
- Given: Slash command with YAML frontmatter
- When: Conversion completes
- Then: Final output has no frontmatter (--- sections removed)

### End-to-End Validation

✅ **AC9:** Complex command with multiple references converts correctly
- Given: Slash command referencing 2 agents and 1 skill
- When: Conversion is executed
- Then: AI calls tool for needed references
- And: Final output is standalone and self-contained

✅ **AC10:** Simple command without references converts quickly
- Given: Slash command with no agent/skill mentions
- When: Conversion is executed
- Then: AI produces output without tool calls
- And: Frontmatter removed, arguments replaced

✅ **AC11:** Existing frontend UI continues to work
- Given: User navigates to /slash-commands/convert
- When: User selects command and converts
- Then: UI works exactly as before with improved output quality

## Validation

### Unit Tests

**File:** `tests/services/slash-command-converter-service.test.ts`

**Test Cases:**

1. **buildReferenceContext() fetches all agent/skill names**
   ```typescript
   test('should fetch all available agent and skill names for context', async () => {
     // Mock ConfigService to return test configs
     // Verify agents and skills arrays are correct
   });
   ```

2. **convertWithTools() builds correct system prompt**
   ```typescript
   test('should include sandbox constraints in system prompt', async () => {
     // Verify prompt mentions sandboxed environment
     // Verify prompt lists all available agents/skills
   });
   ```

3. **convertWithTools() builds correct user prompt**
   ```typescript
   test('should include command content and user arguments in user prompt', async () => {
     // Verify content is included
     // Verify arguments hint is included
   });
   ```

4. **executeToolCalls() fetches configs correctly**
   ```typescript
   test('should fetch agent config when tool calls read_configs', async () => {
     // Mock tool call for agent
     // Verify ConfigService.listConfigs called with correct type
     // Verify content returned
   });
   ```

5. **readConfigs() handles missing references**
   ```typescript
   test('should return found=false for nonexistent references', async () => {
     // Mock ConfigService to return empty array
     // Verify response indicates not found
   });
   ```

6. **convertWithTools() handles tool iteration**
   ```typescript
   test('should iterate when AI makes tool calls', async () => {
     // Mock AI to return tool calls first, then final content
     // Verify multiple AI calls happen
     // Verify tool results fed back correctly
   });
   ```

7. **End-to-end conversion with tool usage**
   ```typescript
   test('should convert slash command with agent reference using tools', async () => {
     // Full integration test
     // Mock AI to call read_configs
     // Verify final output is correct
   });
   ```

8. **End-to-end conversion without tool usage**
   ```typescript
   test('should convert simple slash command without tools', async () => {
     // Mock AI to return direct response
     // Verify no tool calls made
     // Verify final output is correct
   });
   ```

### Integration Tests

**File:** `tests/routes/slash-command-converter.test.ts`

**Test Cases:**

1. **POST /api/slash-commands/:id/convert with real tool calling**
   - Setup test database with agent/skill configs
   - Create slash command referencing them
   - Mock OpenAI to return tool calls
   - Verify response includes inlined content
   - Verify tool was called with correct parameters

2. **POST /api/slash-commands/:id/convert with simple command**
   - Create slash command with no references
   - Verify fast conversion without tools
   - Verify frontmatter removed

3. **POST /api/slash-commands/:id/convert with arguments**
   - Create command with $ARGUMENTS
   - POST with userArguments
   - Verify arguments replaced in output

4. **POST /api/slash-commands/:id/convert with missing references**
   - Create command referencing nonexistent agent
   - Verify tool returns not found
   - Verify AI handles gracefully

### Manual Testing

**1. Setup Test Environment:**
```bash
npm run dev
# Server running at http://localhost:8787
```

**2. Create Test Data:**
```bash
# Create agent config
curl -X POST http://localhost:8787/api/configs \
  -H "Content-Type: application/json" \
  -d '{
    "name": "triage",
    "type": "agent_definition",
    "original_format": "claude_code",
    "content": "You are a bug triage specialist. Analyze code and identify root causes of issues."
  }'

# Create skill config
curl -X POST http://localhost:8787/api/configs \
  -H "Content-Type: application/json" \
  -d '{
    "name": "conventional-commit",
    "type": "skill",
    "original_format": "claude_code",
    "content": "Use conventional commit format:\ntype(scope): message\n\nExample: feat(auth): add login flow"
  }'

# Create slash command with references
curl -X POST http://localhost:8787/api/configs \
  -H "Content-Type: application/json" \
  -d '{
    "name": "debug-task",
    "type": "slash_command",
    "original_format": "claude_code",
    "content": "---\nargument-hint: file path or component name\n---\n\nDebug the $ARGUMENTS.\n\nFirst, use the **triage** agent to analyze the issue and identify root causes.\n\nThen fix the bugs you find.\n\nWhen done, use the **conventional-commit** skill to create a proper commit message."
  }'
```

**3. Test Conversion:**
```bash
# Get the config ID from previous response
CONFIG_ID="<paste-id-here>"

# Test conversion with arguments
curl -X POST "http://localhost:8787/api/slash-commands/$CONFIG_ID/convert" \
  -H "Content-Type: application/json" \
  -d '{ "userArguments": "authentication module" }'
```

**4. Verify Output:**
- ✅ No YAML frontmatter in output
- ✅ `$ARGUMENTS` replaced with "authentication module"
- ✅ Triage agent content inlined (if AI decided to inline it)
- ✅ Conventional-commit skill content inlined (if AI decided to inline it)
- ✅ Output is standalone and self-contained
- ✅ No mentions of file system paths or external resources

**5. Check Tool Calling (Console Logs):**
```
# Expected in console:
AI called read_configs with: {references: [{name: "triage", type: "agent"}, {name: "conventional-commit", type: "skill"}]}
Tool returned: {agent:triage: {found: true, content: "..."}, skill:conventional-commit: {found: true, content: "..."}}
```

### Performance Validation

**Measure improvement from multi-call to single-call:**

```bash
# Before (2 AI calls): ~4-6 seconds
# After (1 AI call with tools): ~3-4 seconds

time curl -X POST "http://localhost:8787/api/slash-commands/$CONFIG_ID/convert" \
  -H "Content-Type: application/json" \
  -d '{ "userArguments": "test" }'
```

### Success Criteria

- All unit tests pass (minimum 8 new tests)
- All integration tests pass (minimum 4 tests)
- Manual testing shows correct tool calling behavior
- Console logs confirm tool calls are executed
- Output quality improves (more intelligent inlining decisions)
- Performance is equal or better than before
- No regressions in existing functionality
- TypeScript compilation succeeds
- Linting passes

## Summary

This rewrite simplifies the architecture from a fragmented multi-call approach to a clean single-call approach with tool support. The AI now has full context and autonomy to decide what to inline and what to omit, resulting in better conversion quality and simpler code maintenance.

**Key Improvements:**
1. ✅ Single comprehensive AI call instead of 2+ calls
2. ✅ Tool-based reference resolution (cleaner pattern)
3. ✅ Better context (all agent/skill names provided upfront)
4. ✅ Sandbox constraints clearly communicated to AI
5. ✅ Simpler service code (less fragmentation)
6. ✅ Better error handling for missing references
7. ✅ More intelligent inlining decisions by AI
