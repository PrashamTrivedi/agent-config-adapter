# Purpose

Add MCP tool and prompt for slash command reference fetching and inlining

## Original Ask

We need following flow for slash command converter functionality. We need one prompt and a tool, that tool will get name and type pair (e.g. scaffolder-skill, qa-validator-agent) and will fetch relevant content from name and type from database, and return it. Then the prompt will inline the content of tool response if present. And then it will convert the final prompt for the copying.

## Complexity and the reason behind it

**Complexity Score: 3/5**

**Reasoning:**
- Requires adding new MCP tool and prompt (moderate effort)
- Needs to update existing slash command converter service to fetch from database
- Involves integration of multiple services (ConfigService, SlashCommandConverterService)
- Has both backend implementation (service updates, database queries) and MCP integration
- Requires understanding of existing MCP infrastructure and slash command conversion flow
- Testing requires verifying MCP tool/prompt workflow end-to-end
- Not trivial due to service layer changes, but straightforward implementation
- Already have similar patterns in codebase to follow

## Architectural changes required

None required - using existing architecture:
- MCP server structure already supports adding tools and prompts
- ConfigService and ConfigRepository already have filtering capabilities
- SlashCommandConverterService already has the conversion logic framework

## Backend changes required

### 1. Add New MCP Tool: `fetch_config_by_name_and_type`

**File:** `src/mcp/server.ts`

**Implementation:**
```typescript
server.tool(
  'fetch_config_by_name_and_type',
  'Fetch a config by name and type from the database',
  {
    name: z.string().describe('Config name to search for'),
    type: z.enum(['slash_command', 'agent_definition', 'skill', 'mcp_config']).describe('Config type')
  },
  async ({ name, type }) => {
    // Use ConfigService.listConfigs with filters
    // Return config content if found (exact match or first match)
    // Return error if not found
  }
);
```

**Logic:**
1. Use `ConfigService.listConfigs({ type, searchName: name })`
2. If multiple results, prefer exact name match
3. Return config with ID, name, type, content
4. Return error if not found

### 2. Add New MCP Prompt: `inline_slash_command`

**File:** `src/mcp/server.ts`

**Implementation:**
```typescript
server.prompt(
  'inline_slash_command',
  'Convert slash command with inlined agent/skill references for copying',
  {
    configId: z.string().describe('ID of slash command to convert'),
    userArguments: z.string().optional().describe('User arguments to replace $ARGUMENTS')
  },
  async ({ configId, userArguments }) => {
    // Return workflow message that guides AI to:
    // 1. Get slash command using get_config tool
    // 2. Parse analysis metadata (agent_references, skill_references)
    // 3. For each reference, use fetch_config_by_name_and_type tool
    // 4. Inline fetched content into final output
    // 5. Remove frontmatter
    // 6. Replace $ARGUMENTS with userArguments if provided
    // 7. Return ready-to-copy content
  }
);
```

### 3. Update SlashCommandConverterService

**File:** `src/services/slash-command-converter-service.ts`

**Changes Required:**

#### 3.1 Add ConfigService dependency
```typescript
constructor(
  private aiConverter: AIConverterService,
  private configService: ConfigService  // NEW
) {}
```

#### 3.2 Update `resolveReferences` method (lines 77-101)
**Current behavior:** Returns placeholder text `[Agent: name - content not available]`

**New behavior:**
```typescript
private async resolveReferences(
  agents: string[],
  skills: string[]
): Promise<Map<string, string>> {
  const references = new Map<string, string>();

  // Fetch agents from database
  for (const agentName of agents) {
    try {
      const configs = await this.configService.listConfigs({
        type: 'agent_definition',
        searchName: agentName
      });

      // Prefer exact match, fallback to first result
      const config = this.findBestMatch(configs, agentName);

      if (config) {
        references.set(`agent:${agentName}`, config.content);
      } else {
        references.set(`agent:${agentName}`, `[Agent: ${agentName} - not found]`);
      }
    } catch (error) {
      console.error(`Failed to fetch agent ${agentName}:`, error);
      references.set(`agent:${agentName}`, `[Agent: ${agentName} - fetch error]`);
    }
  }

  // Fetch skills from database
  for (const skillName of skills) {
    try {
      const configs = await this.configService.listConfigs({
        type: 'skill',
        searchName: skillName
      });

      const config = this.findBestMatch(configs, skillName);

      if (config) {
        references.set(`skill:${skillName}`, config.content);
      } else {
        references.set(`skill:${skillName}`, `[Skill: ${skillName} - not found]`);
      }
    } catch (error) {
      console.error(`Failed to fetch skill ${skillName}:`, error);
      references.set(`skill:${skillName}`, `[Skill: ${skillName} - fetch error]`);
    }
  }

  return references;
}
```

#### 3.3 Add helper method `findBestMatch`
```typescript
private findBestMatch(configs: Config[], targetName: string): Config | null {
  if (configs.length === 0) return null;

  // 1. Try exact match (case-insensitive)
  const exactMatch = configs.find(
    c => c.name.toLowerCase() === targetName.toLowerCase()
  );
  if (exactMatch) return exactMatch;

  // 2. Fallback to first result from LIKE search
  return configs[0];
}
```

### 4. Update Service Instantiation

**File:** `src/routes/slash-command-converter.ts` (and any other places that use SlashCommandConverterService)

**Change:**
```typescript
// Before:
const converterService = new SlashCommandConverterService(aiConverter);

// After:
const converterService = new SlashCommandConverterService(aiConverter, configService);
```

**Files to update:**
- `src/routes/slash-command-converter.ts` (main usage)
- Check if used anywhere else in the codebase

### 5. Update MCP Types (Optional)

**File:** `src/mcp/types.ts`

Add new tool input type:
```typescript
export interface FetchConfigByNameAndTypeToolInput {
  name: string;
  type: ConfigType;
}
```

Add new prompt args type:
```typescript
export interface InlineSlashCommandPromptArgs {
  configId: string;
  userArguments?: string;
}
```

## Frontend changes required

None required - this is a backend-only MCP feature.

Frontend slash command converter UI already exists and works independently. MCP tool and prompt are for AI agent workflows, not for direct user interaction via web UI.

## Acceptance Criteria

### MCP Tool: `fetch_config_by_name_and_type`

✅ **AC1:** Tool can fetch config by exact name match
- Given: Config exists with name "triage" and type "agent_definition"
- When: Tool is called with `{ name: "triage", type: "agent_definition" }`
- Then: Returns config with full content

✅ **AC2:** Tool returns first result when multiple partial matches exist
- Given: Configs exist with names "triage-agent", "triage-helper"
- When: Tool is called with `{ name: "triage", type: "agent_definition" }`
- Then: Returns one of the matching configs (preferably exact match if exists)

✅ **AC3:** Tool returns error when config not found
- Given: No config exists with name "nonexistent"
- When: Tool is called with `{ name: "nonexistent", type: "skill" }`
- Then: Returns error message indicating not found

✅ **AC4:** Tool filters by type correctly
- Given: Config "test" exists as both agent_definition and skill
- When: Tool is called with `{ name: "test", type: "skill" }`
- Then: Returns only the skill config, not the agent_definition

### MCP Prompt: `inline_slash_command`

✅ **AC5:** Prompt workflow fetches and inlines agent references
- Given: Slash command references "triage" agent
- When: Prompt is executed with the slash command ID
- Then: Workflow uses `fetch_config_by_name_and_type` to get agent content and inlines it

✅ **AC6:** Prompt workflow fetches and inlines skill references
- Given: Slash command references "conventional-commit" skill
- When: Prompt is executed with the slash command ID
- Then: Workflow uses tool to get skill content and inlines it

✅ **AC7:** Prompt workflow replaces $ARGUMENTS placeholder
- Given: Slash command contains `$ARGUMENTS` and user provides "scaffolder-v2"
- When: Prompt is executed with `{ configId: "xxx", userArguments: "scaffolder-v2" }`
- Then: Final output replaces `$ARGUMENTS` with "scaffolder-v2"

✅ **AC8:** Prompt workflow removes frontmatter
- Given: Slash command has YAML frontmatter
- When: Prompt is executed
- Then: Final output excludes frontmatter, only includes body content

### Service Layer: `resolveReferences` Update

✅ **AC9:** Service fetches agent references from database
- Given: Analysis metadata includes `agent_references: ["triage"]`
- When: `resolveReferences` is called
- Then: Fetches "triage" agent_definition from database via ConfigService

✅ **AC10:** Service fetches skill references from database
- Given: Analysis metadata includes `skill_references: ["conventional-commit"]`
- When: `resolveReferences` is called
- Then: Fetches "conventional-commit" skill from database via ConfigService

✅ **AC11:** Service handles missing references gracefully
- Given: Reference "nonexistent-agent" doesn't exist in database
- When: `resolveReferences` is called
- Then: Returns placeholder text `[Agent: nonexistent-agent - not found]` instead of crashing

✅ **AC12:** Service prefers exact name match over partial match
- Given: Database has "triage" and "triage-helper" agents
- When: Reference is "triage"
- Then: Fetches "triage" config (exact match), not "triage-helper"

## Validation

### Backend Testing

#### Unit Tests
**File:** `src/services/slash-command-converter-service.test.ts`

**Test Cases:**
1. `resolveReferences` fetches agents from database
2. `resolveReferences` fetches skills from database
3. `resolveReferences` handles missing references with placeholder
4. `findBestMatch` prefers exact match
5. `findBestMatch` returns first result when no exact match
6. `resolveReferences` handles database errors gracefully

**File:** `src/mcp/server.test.ts` (new or extend existing)

**Test Cases:**
1. `fetch_config_by_name_and_type` tool returns config on exact match
2. `fetch_config_by_name_and_type` tool returns first result on partial match
3. `fetch_config_by_name_and_type` tool returns error when not found
4. `fetch_config_by_name_and_type` tool filters by type correctly
5. `inline_slash_command` prompt returns workflow message with correct steps

#### Integration Tests
**File:** `src/routes/slash-command-converter.test.ts` (extend existing)

**Test Cases:**
1. End-to-end conversion with database-fetched agent reference
2. End-to-end conversion with database-fetched skill reference
3. Conversion with both agent and skill references
4. Conversion with missing references (fallback to placeholder)

### MCP Testing

**Manual Testing Steps:**

1. **Setup MCP Client:**
   ```bash
   npm run dev
   # Verify server running at http://localhost:8787
   ```

2. **Test Tool: fetch_config_by_name_and_type**
   ```bash
   # Create test configs first
   curl -X POST http://localhost:8787/api/configs \
     -H "Content-Type: application/json" \
     -d '{"name":"triage","type":"agent_definition","original_format":"claude_code","content":"Test agent content"}'

   # Test MCP tool via /mcp endpoint
   curl -X POST http://localhost:8787/mcp \
     -H "Content-Type: application/json" \
     -d '{
       "jsonrpc": "2.0",
       "method": "tools/call",
       "params": {
         "name": "fetch_config_by_name_and_type",
         "arguments": {
           "name": "triage",
           "type": "agent_definition"
         }
       },
       "id": 1
     }'

   # Expected: Returns config with content
   ```

3. **Test Prompt: inline_slash_command**
   ```bash
   # Create test slash command with references
   curl -X POST http://localhost:8787/api/configs \
     -H "Content-Type: application/json" \
     -d '{
       "name": "test-inlining",
       "type": "slash_command",
       "original_format": "claude_code",
       "content": "---\nargument-hint: scaffolder name\n---\n\nRun **triage** agent on the code.\n\nUse **conventional-commit** skill for commits.\n\nReplace: $ARGUMENTS"
     }'

   # Get config ID from response, then test prompt
   curl -X POST http://localhost:8787/mcp \
     -H "Content-Type: application/json" \
     -d '{
       "jsonrpc": "2.0",
       "method": "prompts/get",
       "params": {
         "name": "inline_slash_command",
         "arguments": {
           "configId": "<CONFIG_ID>",
           "userArguments": "scaffolder-v2"
         }
       },
       "id": 2
     }'

   # Expected: Returns workflow message with tool usage steps
   ```

4. **Verify MCP Info Page:**
   ```bash
   curl http://localhost:8787/mcp/info
   # Expected: Shows 6 tools (including new fetch_config_by_name_and_type)
   # Expected: Shows 4 prompts (including new inline_slash_command)
   ```

### API Testing

**Test REST API still works after service changes:**

```bash
# Test slash command converter API (should use updated resolveReferences)
POST /api/slash-commands/:id/convert
Body: { "userArguments": "test-args" }

# Expected: Inlines agent/skill content from database (not placeholders)
```

### Verification Commands

**Run all tests:**
```bash
npm test
```

**Run tests with coverage:**
```bash
npm test -- --run --coverage
```

**Build check:**
```bash
npm run build
# Expected: No TypeScript errors
```

**Lint check:**
```bash
npm run lint
# Expected: No linting errors
```

### End-to-End Workflow Test

**Scenario: Convert a slash command with agent and skill references**

1. Create agent config in database
2. Create skill config in database
3. Create slash command that references both
4. Use MCP prompt `inline_slash_command` via AI workflow
5. Verify:
   - Tool fetches agent content
   - Tool fetches skill content
   - Prompt inlines both
   - Frontmatter is removed
   - $ARGUMENTS is replaced
   - Final output is ready to copy

**Success Criteria:**
- All tests pass
- MCP info page shows new tool and prompt
- End-to-end workflow produces correct inlined output
- No regressions in existing functionality
