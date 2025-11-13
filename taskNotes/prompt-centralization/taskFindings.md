# Purpose

Centralize all AI prompts into one manageable code file for easier verification and editing.

## Original Ask

I want all the prompts to be in one place. Be it string or functions, all the prompts must be managable from one code file which I can verify and edit.

## Complexity and the reason behind it

**Complexity: 2/5**

Reasoning:
- This is a refactoring task, not a new feature
- No new functionality being added
- Clear locations of all prompts (already identified)
- Straightforward extraction and consolidation
- Tests exist and should continue to pass
- Main challenge is ensuring backward compatibility

## Current State Analysis

### Prompts Currently Scattered Across 4 Files:

#### 1. SlashCommandConverterService (src/services/slash-command-converter-service.ts)
- **buildSystemPrompt()** - Lines 254-548 (295 lines!)
  - Massive prompt for converting slash commands
  - Contains tool usage instructions, core task, argument replacement rules, agent/skill extraction logic
  - Most complex and important prompt in the codebase
- **buildUserPrompt()** - Lines 553-565
  - Simple user prompt builder

#### 2. SlashCommandAnalyzerService (src/services/slash-command-analyzer-service.ts)
- **detectReferences() prompt** - Lines 87-108
  - AI prompt to detect agent and skill references in slash commands
  - Returns JSON with agents[] and skills[]

#### 3. OpenAIProvider (src/infrastructure/ai/openai-provider.ts)
- **buildConversionPrompt()** - Lines 213-241
  - System context + user prompt for format conversion
  - Includes rules for preserving semantic meaning
- **getFormatSpec()** - Lines 246-292
  - Format specifications for claude_code, codex, and gemini

#### 4. GeminiProvider (src/infrastructure/ai/gemini-provider.ts)
- **buildConversionPrompt()** - Lines 493-521
  - IDENTICAL to OpenAI version (code duplication!)
- **getFormatSpec()** - Lines 526-572
  - IDENTICAL to OpenAI version (code duplication!)

### Problems with Current State:

1. **Scattered prompts**: Hard to review all prompts in one place
2. **Code duplication**: OpenAI and Gemini have identical conversion prompts
3. **Buried in code**: Large prompts mixed with business logic
4. **Hard to edit**: Must navigate multiple files to update prompts
5. **Hard to version**: Can't easily track prompt changes separately from code changes
6. **No single source of truth**: Same prompt logic duplicated in multiple places

## Architectural changes required

### New File Structure:

```
src/prompts/
├── index.ts                          # Main exports
├── format-conversion.ts              # Format conversion prompts (OpenAI/Gemini)
├── slash-command-conversion.ts       # Slash command converter prompts
└── slash-command-analysis.ts         # Slash command analyzer prompts
```

Or simpler (recommended for this codebase size):

```
src/prompts.ts                        # Single centralized prompts file
```

### Design Principles:

1. **Pure functions**: Prompts as functions that take parameters and return strings
2. **No side effects**: Prompt functions don't call APIs or modify state
3. **Typed parameters**: Use TypeScript interfaces for prompt parameters
4. **Documentation**: JSDoc comments explaining each prompt's purpose
5. **Easy to test**: Prompt functions can be unit tested independently

## Backend changes required

### Step 1: Create Centralized Prompts File

Create `src/prompts.ts` with:

```typescript
// Format conversion prompts (used by OpenAI and Gemini providers)
export function buildFormatConversionPrompt(params: {
  sourceContent: string
  sourceFormat: AgentFormat
  targetFormat: AgentFormat
  configType: ConfigType
}): string

export function getFormatSpec(format: AgentFormat, label: string): string

// Slash command conversion prompts
export function buildSlashCommandSystemPrompt(params: {
  availableAgents: string[]
  availableSkills: string[]
}): string

export function buildSlashCommandUserPrompt(params: {
  content: string
  userArguments?: string
}): string

// Slash command analysis prompts
export function buildReferenceDetectionPrompt(content: string): string
```

### Step 2: Update OpenAIProvider

- Import prompts from `src/prompts.ts`
- Replace `buildConversionPrompt()` with call to shared function
- Replace `getFormatSpec()` with call to shared function
- Remove duplicate code

### Step 3: Update GeminiProvider

- Import prompts from `src/prompts.ts`
- Replace `buildConversionPrompt()` with call to shared function
- Replace `getFormatSpec()` with call to shared function
- Remove duplicate code

### Step 4: Update SlashCommandConverterService

- Import prompts from `src/prompts.ts`
- Replace `buildSystemPrompt()` with call to shared function
- Replace `buildUserPrompt()` with call to shared function

### Step 5: Update SlashCommandAnalyzerService

- Import prompts from `src/prompts.ts`
- Replace inline prompt with call to shared function

## Frontend changes required

None required - this is a backend refactoring only.

## Acceptance Criteria

N/A (complexity < 3)

## Validation

### Testing Strategy:

1. **Existing tests must pass**:
   - Run `npm test` - all 331 tests should pass
   - No behavioral changes, only refactoring

2. **Manual verification**:
   - Test slash command conversion via UI at `/slash-command-converter`
   - Test config format conversion via API: `GET /api/configs/:id/format/:format`
   - Verify both OpenAI and Gemini providers work correctly
   - Check console logs for AI provider responses

3. **Code review verification**:
   - Verify prompts are identical before and after (character-by-character)
   - Check that no prompt logic was lost in refactoring
   - Ensure proper TypeScript types for prompt parameters

### Commands to Run:

```bash
# Run all tests
npm test

# Run tests with coverage
npm test -- --run --coverage

# Test specific services
npm test slash-command-converter-service
npm test slash-command-analyzer-service
npm test openai-provider
npm test gemini-provider

# Start dev server for manual testing
npm run dev
```

### API Testing:

```bash
# Test format conversion (OpenAI)
curl http://localhost:8787/api/configs/{id}/format/gemini

# Test format conversion (Gemini)
# (Set AI_PROVIDER=gemini in .dev.vars first)
curl http://localhost:8787/api/configs/{id}/format/codex

# Test slash command conversion
curl -X POST http://localhost:8787/api/slash-commands/{id}/convert \
  -H "Content-Type: application/json" \
  -d '{"userArguments": "test task"}'
```

### UI Testing:

1. Open http://localhost:8787/slash-command-converter
2. Select a slash command from dropdown
3. Enter user arguments if needed
4. Click "Convert"
5. Verify output is correct and same as before refactoring

### Success Criteria:

✅ All tests pass without modification
✅ Prompts produce identical output before and after refactoring
✅ Code duplication eliminated (OpenAI/Gemini share same prompts)
✅ Single file contains all prompts
✅ Easy to review and edit prompts
✅ Proper TypeScript types and JSDoc comments

## Implementation Notes

### Files to Modify:

1. **NEW**: `src/prompts.ts` (create)
2. **MODIFY**: `src/infrastructure/ai/openai-provider.ts`
3. **MODIFY**: `src/infrastructure/ai/gemini-provider.ts`
4. **MODIFY**: `src/services/slash-command-converter-service.ts`
5. **MODIFY**: `src/services/slash-command-analyzer-service.ts`

### Key Considerations:

- **Preserve exact prompt text**: Character-by-character identical to ensure no behavior changes
- **Template literal formatting**: Maintain proper indentation and whitespace
- **Parameter types**: Use proper TypeScript interfaces for type safety
- **Documentation**: Add JSDoc comments explaining each prompt's purpose and usage
- **Git diff**: Changes should be clean refactoring (no mixed concerns)

### Prompt Organization:

Group prompts by purpose:
1. **Format Conversion** (OpenAI/Gemini shared)
2. **Slash Command Conversion** (converter service)
3. **Slash Command Analysis** (analyzer service)

Each group should have:
- Clear function names
- Parameter interfaces
- JSDoc documentation
- Examples in comments
