# Purpose

Fix slash command converter to fetch and inline agent/skill references from database

## Original Ask

We need following flow for slash command converter functionality. We need one prompt and a tool, that tool will get name and type pair (e.g. scaffolder-skill, qa-validator-agent) and will fetch relevant content from name and type from database, and return it. Then the prompt will inline the content of tool response if present. And then it will convert the final prompt for the copying.

**Clarification:** This is NOT about MCP integration. It's just updating the slash command conversion service to properly fetch and inline agent/skill references from the database during conversion.

## Complexity and the reason behind it

**Complexity Score: 2/5**

**Reasoning:**
- Update existing SlashCommandConverterService.resolveReferences() to fetch from database
- Add ConfigService dependency to the service
- Add helper method for best-match selection (exact vs partial name match)
- Update service instantiation in routes
- Simple, focused change with clear requirements
- No new features or APIs - just fixing existing functionality
- Testing is straightforward - verify references are fetched and inlined
- Already have all the infrastructure (ConfigService, database queries)

## Architectural changes required

None required - using existing architecture:
- ConfigService and ConfigRepository already have filtering capabilities (`listConfigs` with type and searchName filters)
- SlashCommandConverterService already has the conversion logic framework with `resolveReferences()` and `generateOutput()`
- Just need to connect them properly

## Backend changes required

### 1. Update SlashCommandConverterService

**File:** `src/services/slash-command-converter-service.ts`

**Changes Required:**

#### 1.1 Add ConfigService dependency
```typescript
constructor(
  private aiConverter: AIConverterService,
  private configService: ConfigService  // NEW
) {}
```

#### 1.2 Update `resolveReferences` method (lines 77-101)
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

#### 1.3 Add helper method `findBestMatch`
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

### 2. Update Service Instantiation

**File:** `src/routes/slash-command-converter.ts`

**Change:**
```typescript
// Before:
const converterService = new SlashCommandConverterService(aiConverter);

// After:
const converterService = new SlashCommandConverterService(aiConverter, configService);
```

**Note:** This is the only place where SlashCommandConverterService is instantiated in the routes layer.

## Frontend changes required

None required - this is a backend service layer change only.

The existing frontend slash command converter UI will automatically benefit from the improved reference resolution once the service is updated.

## Acceptance Criteria

### Service Layer: `resolveReferences` Update

✅ **AC1:** Service fetches agent references from database
- Given: Analysis metadata includes `agent_references: ["triage"]`
- When: `resolveReferences` is called
- Then: Fetches "triage" agent_definition from database via ConfigService

✅ **AC2:** Service fetches skill references from database
- Given: Analysis metadata includes `skill_references: ["conventional-commit"]`
- When: `resolveReferences` is called
- Then: Fetches "conventional-commit" skill from database via ConfigService

✅ **AC3:** Service handles missing references gracefully
- Given: Reference "nonexistent-agent" doesn't exist in database
- When: `resolveReferences` is called
- Then: Returns placeholder text `[Agent: nonexistent-agent - not found]` instead of crashing

✅ **AC4:** Service prefers exact name match over partial match
- Given: Database has "triage" and "triage-helper" agents
- When: Reference is "triage"
- Then: Fetches "triage" config (exact match), not "triage-helper"

### End-to-End Conversion

✅ **AC5:** Slash command conversion inlines fetched agent content
- Given: Slash command references "triage" agent which exists in database
- When: Conversion is executed via POST /api/slash-commands/:id/convert
- Then: Final output includes inlined agent content, not placeholder

✅ **AC6:** Slash command conversion inlines fetched skill content
- Given: Slash command references "conventional-commit" skill which exists in database
- When: Conversion is executed via POST /api/slash-commands/:id/convert
- Then: Final output includes inlined skill content, not placeholder

✅ **AC7:** Slash command conversion with both agent and skill references
- Given: Slash command references both "triage" agent and "conventional-commit" skill
- When: Conversion is executed
- Then: Final output includes both inlined contents correctly

✅ **AC8:** Slash command conversion with user arguments
- Given: Slash command has `$ARGUMENTS` placeholder
- When: Conversion is executed with `{ "userArguments": "scaffolder-v2" }`
- Then: Final output replaces `$ARGUMENTS` with "scaffolder-v2" AND inlines references

## Validation

### Unit Tests

**File:** `src/services/slash-command-converter-service.test.ts` (new or extend existing)

**Test Cases:**
1. `resolveReferences` fetches agents from database
   - Mock ConfigService.listConfigs to return agent config
   - Verify correct type filter ('agent_definition')
   - Verify returned content is stored in references map

2. `resolveReferences` fetches skills from database
   - Mock ConfigService.listConfigs to return skill config
   - Verify correct type filter ('skill')
   - Verify returned content is stored in references map

3. `resolveReferences` handles missing references with placeholder
   - Mock ConfigService.listConfigs to return empty array
   - Verify placeholder text `[Agent: name - not found]` is returned

4. `findBestMatch` prefers exact match
   - Provide array with "triage" and "triage-helper"
   - Search for "triage"
   - Verify exact match "triage" is returned

5. `findBestMatch` returns first result when no exact match
   - Provide array with "triage-agent" and "triage-helper"
   - Search for "triage"
   - Verify first result is returned

6. `resolveReferences` handles database errors gracefully
   - Mock ConfigService.listConfigs to throw error
   - Verify error placeholder `[Agent: name - fetch error]` is returned

### Integration Tests

**File:** `src/routes/slash-command-converter.test.ts` (extend existing)

**Test Cases:**
1. End-to-end conversion with database-fetched agent reference
   - Create agent config in test database
   - Create slash command with agent reference
   - POST /api/slash-commands/:id/convert
   - Verify response includes inlined agent content

2. End-to-end conversion with database-fetched skill reference
   - Create skill config in test database
   - Create slash command with skill reference
   - POST /api/slash-commands/:id/convert
   - Verify response includes inlined skill content

3. Conversion with both agent and skill references
   - Create both agent and skill configs
   - Create slash command referencing both
   - Verify both are inlined in final output

4. Conversion with missing references (fallback to placeholder)
   - Create slash command referencing non-existent agent
   - Verify output includes placeholder, not crash

5. Conversion with user arguments and references
   - Create slash command with $ARGUMENTS and references
   - POST with userArguments
   - Verify both replacement and inlining work correctly

### Manual Testing

**Test REST API with real database:**

1. **Setup local development environment:**
   ```bash
   npm run dev
   # Verify server running at http://localhost:8787
   ```

2. **Create test agent config:**
   ```bash
   curl -X POST http://localhost:8787/api/configs \
     -H "Content-Type: application/json" \
     -d '{
       "name": "triage",
       "type": "agent_definition",
       "original_format": "claude_code",
       "content": "You are a bug triage specialist. Analyze the code and identify issues."
     }'
   ```

3. **Create test skill config:**
   ```bash
   curl -X POST http://localhost:8787/api/configs \
     -H "Content-Type: application/json" \
     -d '{
       "name": "conventional-commit",
       "type": "skill",
       "original_format": "claude_code",
       "content": "Use conventional commit format: type(scope): message"
     }'
   ```

4. **Create test slash command with references:**
   ```bash
   curl -X POST http://localhost:8787/api/configs \
     -H "Content-Type: application/json" \
     -d '{
       "name": "test-inlining",
       "type": "slash_command",
       "original_format": "claude_code",
       "content": "---\nargument-hint: component name\n---\n\nAnalyze the $ARGUMENTS component.\n\nUse **triage** agent to identify issues.\n\nUse **conventional-commit** skill for commits."
     }'
   ```

5. **Test conversion (get config ID from step 4):**
   ```bash
   curl -X POST http://localhost:8787/api/slash-commands/<CONFIG_ID>/convert \
     -H "Content-Type: application/json" \
     -d '{ "userArguments": "authentication" }'
   ```

6. **Verify output:**
   - Check response JSON has `convertedContent` field
   - Verify `$ARGUMENTS` is replaced with "authentication"
   - Verify frontmatter is removed
   - Verify agent content is inlined (not placeholder)
   - Verify skill content is inlined (not placeholder)
   - Verify `needsUserInput: false`

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

### Success Criteria

- All unit tests pass
- All integration tests pass
- Manual testing shows agent/skill content is inlined (not placeholders)
- No regressions in existing slash command converter functionality
- TypeScript compilation succeeds with no errors
- Linting passes with no errors
- Code coverage remains at or above current levels
