# Purpose

Migrate slash command converter from Chat Completions API to Response API with low reasoning effort for improved performance and reduced token usage.

## Original Ask

In slash command converter, Use response API with AI Gateway (Find online about it), and then add low reasoning to it.

## Complexity and the reason behind it

**Complexity Score: 2/5**

**Reasoning:**
- **Complete replacement, not gradual** - Replace chatWithTools() entirely in one branch
- **Simple API migration** - Just changing API endpoints and request/response structure
- **Well-documented migration path** - OpenAI provides clear Response API documentation
- **No business logic changes** - Core conversion logic remains unchanged
- **Existing tool calling pattern** - Response API supports tools same as Chat Completions
- **Simple reasoning parameter addition** - Just adding `reasoning: { effort: "low" }` to request
- **No database changes** - Works with existing schema
- **All tests updated at once** - Update all test mocks in single commit

Not complexity 1 because:
- Need to understand Response API differences (request/response structure)
- Need to update AIConverterService for new API pattern
- Need to update ALL tests to match new response structure
- Need to verify tool calling works with Response API
- Clean branch-based workflow with testing before merge

## Architectural changes required

### Git Workflow

**Branch Strategy:**
```bash
# Create feature branch from current branch
git checkout -b feature/response-api-migration

# All changes committed to this branch
# Test thoroughly before merging
# Create PR when ready
```

### API Endpoint Change

**Current (Chat Completions API):**
```
POST https://gateway.ai.cloudflare.com/v1/{account}/{gateway}/openai/v1/chat/completions
```

**New (Response API):**
```
POST https://gateway.ai.cloudflare.com/v1/{account}/{gateway}/openai/v1/responses
```

**Key Differences:**

| Aspect | Chat Completions API | Response API |
|--------|---------------------|--------------|
| **Request Parameters** | `messages`, `max_tokens` | `input`, `max_output_tokens`, `instructions` |
| **Response Structure** | `choices[0].message.content` | `output_text` |
| **Tool Support** | `tools`, `tool_choice` | Same - `tools`, `tool_choice` |
| **Reasoning Control** | Not available | `reasoning: { effort: "low/medium/high/minimal" }` |
| **Token Tracking** | `usage.prompt_tokens`, `usage.completion_tokens` | `usage.total_tokens`, `reasoning_tokens`, `output_tokens` |

### No Architectural Changes

This is a **drop-in replacement** at the infrastructure layer:
- Same service layer interfaces
- Same tool calling pattern
- Same business logic
- Same frontend
- Same database schema

Only `AIConverterService` needs updating.

## Backend changes required

### 1. Update AIConverterService - Replace chatWithTools() with Response API

**File:** `src/infrastructure/ai-converter.ts`

**Current Method (Chat Completions) - REPLACE THIS:**
```typescript
async chatWithTools(
  messages: Array<{...}>,
  tools: Array<{...}>
): Promise<{ content: string | null; tool_calls?: Array<{...}> }>
```

**New Implementation (Response API with low reasoning):**
```typescript
/**
 * Response API with tool calling and low reasoning effort
 * Used for slash command conversion with READ_CONFIGS tool
 */
async responseWithTools(
  messages: Array<{
    role: 'system' | 'user' | 'assistant' | 'tool'
    content: string | null
    tool_calls?: Array<{...}>
    tool_call_id?: string
  }>,
  tools: Array<{
    type: string
    function: {
      name: string
      description: string
      parameters: Record<string, any>
    }
  }>
): Promise<{
  content: string | null
  tool_calls?: Array<{
    id: string
    function: { name: string; arguments: string }
  }>
  reasoning_tokens?: number
  output_tokens?: number
}> {
  try {
    // Extract system instructions from first system message
    const systemMsg = messages.find(m => m.role === 'system')
    const instructions = systemMsg?.content || ''

    // Filter out system messages, keep user/assistant/tool messages
    const input = messages.filter(m => m.role !== 'system')

    const response = await this.openai.responses.create({
      model: 'gpt-5-mini',
      instructions: instructions,  // System prompt goes here
      input: input as any,          // User/assistant/tool messages
      tools: tools as any,
      tool_choice: 'auto',
      reasoning: {
        effort: 'low'  // Enable low reasoning for better performance
      },
      max_output_tokens: 2000
    })

    return {
      content: response.output_text,
      tool_calls: response.tool_calls?.map(tc => ({
        id: tc.id,
        function: {
          name: tc.function.name,
          arguments: tc.function.arguments
        }
      })),
      reasoning_tokens: response.reasoning_tokens,
      output_tokens: response.output_tokens
    }
  } catch (error) {
    console.error('Response API with tools failed:', error)
    throw new Error('AI conversion with tools failed')
  }
}
```

**Migration Strategy:**

**Complete Replacement (One-Go Approach):**
```typescript
// REPLACE chatWithTools() implementation entirely with Response API
// Rename method or keep same name (chatWithTools) for minimal caller changes
// Update all test mocks in single commit
// Verify all functionality on feature branch before merge
```

**Why Complete Replacement:**
- Cleaner codebase - no deprecated methods
- No confusion about which method to use
- All code uses best practice (Response API) immediately
- Easier to review - single cohesive change
- Feature branch allows thorough testing before merge

### 2. Update SlashCommandConverterService (No Changes Needed)

**File:** `src/services/slash-command-converter-service.ts`

Since we're **replacing** the `chatWithTools()` implementation (not adding a new method), **NO CHANGES NEEDED** in the service layer.

The service will automatically use the new Response API implementation:

```typescript
// This line stays exactly the same
const response = await this.aiConverter.chatWithTools(messages, tools)

// Optional: Log reasoning token usage for monitoring
if (response.reasoning_tokens) {
  console.log(`Slash command conversion used ${response.reasoning_tokens} reasoning tokens`)
}
```

**Benefit:** Zero service layer changes - only infrastructure layer updates.

### 3. Update Types (Optional)

**File:** `src/domain/types.ts`

Add optional reasoning token tracking:

```typescript
export interface SlashCommandConversionResult {
  convertedContent: string
  needsUserInput: boolean
  analysis: SlashCommandAnalysis

  // Optional: Add token usage info
  tokenUsage?: {
    reasoning_tokens?: number
    output_tokens?: number
    total_tokens?: number
  }
}
```

### 4. Update ALL Tests in One Go

**Files to Update:**
- `tests/services/slash-command-converter-service.test.ts`
- `tests/infrastructure/ai-converter.test.ts` (if it exists, or create it)
- Any other tests mocking `chatWithTools()`

**Mock structure change:**

**Before:**
```typescript
vi.spyOn(aiConverter, 'chatWithTools').mockResolvedValue({
  content: 'converted content',
  tool_calls: undefined
})
```

**After:**
```typescript
vi.spyOn(aiConverter, 'chatWithTools').mockResolvedValue({
  content: 'converted content',
  tool_calls: undefined,
  reasoning_tokens: 42,
  output_tokens: 100
})
```

**Note:** Method name stays the same (`chatWithTools`), just response structure changes.

## Frontend changes required

**None required.**

This is a pure backend infrastructure change. The REST API response format remains unchanged.

## Acceptance Criteria

### Infrastructure Layer

✅ **AC1:** Response API method added to AIConverterService
- Given: AIConverterService class
- When: `responseWithTools()` is called with messages and tools
- Then: Makes request to `/v1/responses` endpoint with `reasoning: { effort: "low" }`

✅ **AC2:** System prompt properly separated as instructions
- Given: Messages array with system role message
- When: Response API request is built
- Then: System message content goes to `instructions` parameter
- And: Only user/assistant/tool messages go to `input` array

✅ **AC3:** Response API returns correct structure
- Given: Successful API call
- When: Response is received
- Then: Returns `output_text` as `content`
- And: Returns `tool_calls` in same format as before
- And: Returns `reasoning_tokens` and `output_tokens`

✅ **AC4:** Tool calling works with Response API
- Given: AI needs to call READ_CONFIGS tool
- When: Response API returns tool calls
- Then: Tool calls structure matches Chat Completions format
- And: Service can iterate with tool results

### Service Layer

✅ **AC5:** SlashCommandConverterService uses Response API automatically
- Given: Slash command conversion request
- When: `convert()` is called
- Then: Uses updated `aiConverter.chatWithTools()` which now uses Response API internally
- And: No service layer code changes required

✅ **AC6:** Low reasoning effort is applied
- Given: Any slash command conversion
- When: API request is made
- Then: Request includes `reasoning: { effort: "low" }`

✅ **AC7:** Conversion output quality unchanged
- Given: Same slash command input as before
- When: Conversion completes
- Then: Output quality is equal or better than Chat Completions API
- And: Frontmatter removed, arguments replaced, references inlined correctly

### Testing

✅ **AC8:** All existing tests pass
- Given: Updated test mocks for Response API
- When: `npm test` is run
- Then: All 9 slash command converter tests pass
- And: No regressions in other test suites

✅ **AC9:** Tool calling tests work with new API
- Given: Test mocks for tool iteration
- When: Tests run
- Then: Tool call iteration works correctly with Response API structure

### Performance & Monitoring

✅ **AC10:** Token usage is tracked
- Given: Successful conversion
- When: Response is received
- Then: `reasoning_tokens` and `output_tokens` are logged
- And: Can be used for cost analysis

✅ **AC11:** Performance is equal or better
- Given: Same slash command as before migration
- When: Conversion is executed
- Then: Latency is ≤ Chat Completions API
- And: Cost per conversion is ≤ Chat Completions API (due to "low" reasoning)

## Validation

### Unit Tests

**File:** `tests/infrastructure/ai-converter.test.ts`

**New Test Cases:**

1. **responseWithTools() makes correct API call**
   ```typescript
   test('should call responses.create with low reasoning effort', async () => {
     const mockCreate = vi.fn().mockResolvedValue({
       output_text: 'test response',
       reasoning_tokens: 50,
       output_tokens: 100
     })

     aiConverter.openai.responses = { create: mockCreate }

     await aiConverter.responseWithTools(messages, tools)

     expect(mockCreate).toHaveBeenCalledWith(
       expect.objectContaining({
         reasoning: { effort: 'low' }
       })
     )
   })
   ```

2. **responseWithTools() separates system instructions**
   ```typescript
   test('should move system message to instructions parameter', async () => {
     const messages = [
       { role: 'system', content: 'You are a converter' },
       { role: 'user', content: 'Convert this' }
     ]

     const mockCreate = vi.fn().mockResolvedValue({
       output_text: 'converted'
     })

     aiConverter.openai.responses = { create: mockCreate }

     await aiConverter.responseWithTools(messages, [])

     expect(mockCreate).toHaveBeenCalledWith(
       expect.objectContaining({
         instructions: 'You are a converter',
         input: [{ role: 'user', content: 'Convert this' }]
       })
     )
   })
   ```

3. **responseWithTools() handles tool calls correctly**
   ```typescript
   test('should return tool calls in correct format', async () => {
     const mockCreate = vi.fn().mockResolvedValue({
       output_text: null,
       tool_calls: [{
         id: 'call_123',
         function: { name: 'read_configs', arguments: '{"refs":[]}' }
       }]
     })

     aiConverter.openai.responses = { create: mockCreate }

     const result = await aiConverter.responseWithTools(messages, tools)

     expect(result.tool_calls).toEqual([{
       id: 'call_123',
       function: { name: 'read_configs', arguments: '{"refs":[]}' }
     }])
   })
   ```

4. **responseWithTools() returns token usage**
   ```typescript
   test('should return reasoning and output token counts', async () => {
     const mockCreate = vi.fn().mockResolvedValue({
       output_text: 'response',
       reasoning_tokens: 75,
       output_tokens: 125
     })

     aiConverter.openai.responses = { create: mockCreate }

     const result = await aiConverter.responseWithTools(messages, tools)

     expect(result.reasoning_tokens).toBe(75)
     expect(result.output_tokens).toBe(125)
   })
   ```

### Integration Tests

**File:** `tests/services/slash-command-converter-service.test.ts`

**Update Existing Tests:**

Update mock response structure to include new fields:

```typescript
// Before
vi.spyOn(aiConverter, 'chatWithTools').mockResolvedValue({
  content: 'Final converted output',
  tool_calls: undefined
})

// After - Same method name, updated response structure
vi.spyOn(aiConverter, 'chatWithTools').mockResolvedValue({
  content: 'Final converted output',
  tool_calls: undefined,
  reasoning_tokens: 42,
  output_tokens: 100
})
```

**New Test Cases:**

1. **Verify Response API structure is returned**
   ```typescript
   test('should return response with token usage info', async () => {
     const chatWithToolsSpy = vi.spyOn(aiConverter, 'chatWithTools')
       .mockResolvedValue({
         content: 'output',
         tool_calls: undefined,
         reasoning_tokens: 50,
         output_tokens: 100
       })

     await converterService.convert(mockConfig, { userArguments: 'test' })

     expect(chatWithToolsSpy).toHaveBeenCalled()
   })
   ```

2. **Verify token usage is returned**
   ```typescript
   test('should return token usage information', async () => {
     vi.spyOn(aiConverter, 'responseWithTools').mockResolvedValue({
       content: 'converted',
       tool_calls: undefined,
       reasoning_tokens: 50,
       output_tokens: 150
     })

     const result = await converterService.convert(mockConfig, {})

     expect(result.tokenUsage).toEqual({
       reasoning_tokens: 50,
       output_tokens: 150
     })
   })
   ```

### Manual Testing

**1. Setup Test Environment:**
```bash
npm run dev
# Server running at http://localhost:9090 (or 8787)
```

**2. Create Test Slash Command:**
```bash
curl -X POST http://localhost:9090/api/configs \
  -H "Content-Type: application/json" \
  -d '{
    "name": "test-response-api",
    "type": "slash_command",
    "original_format": "claude_code",
    "content": "---\nname: test-response-api\ndescription: Test Response API migration\nargument-hint: task description\n---\n\nTest task: $ARGUMENTS\n\nUse the **triage** agent to analyze this."
  }'
```

**3. Analyze Command (creates metadata):**
```bash
CONFIG_ID="<paste-id-here>"

curl -X POST "http://localhost:9090/api/slash-commands/$CONFIG_ID/analyze"
```

**4. Convert Command:**
```bash
curl -X POST "http://localhost:9090/api/slash-commands/$CONFIG_ID/convert" \
  -H "Content-Type: application/json" \
  -d '{ "userArguments": "login authentication bug" }'
```

**5. Verify Output:**
- ✅ Response received successfully
- ✅ Conversion works correctly
- ✅ Arguments replaced
- ✅ Frontmatter removed
- ✅ Tool calling works (if triage agent exists)

**6. Check Server Logs:**
```
Expected in console:
Response API used with low reasoning effort
Reasoning tokens: XX
Output tokens: XXX
```

### Performance Comparison

**Before (Chat Completions API):**
```bash
# Run conversion 5 times, measure average time
time curl -X POST "http://localhost:9090/api/slash-commands/$CONFIG_ID/convert" \
  -H "Content-Type: application/json" \
  -d '{ "userArguments": "test" }'
```

**After (Response API with low reasoning):**
```bash
# Run same conversion 5 times, measure average time
time curl -X POST "http://localhost:9090/api/slash-commands/$CONFIG_ID/convert" \
  -H "Content-Type: application/json" \
  -d '{ "userArguments": "test" }'
```

**Expected Results:**
- Similar or better latency (due to "low" reasoning optimization)
- Similar or lower token usage
- Equal or better output quality

### Success Criteria

- ✅ All existing tests pass (9 slash command tests)
- ✅ 4 new AI converter tests pass
- ✅ Manual testing shows correct conversion
- ✅ Server logs show Response API usage
- ✅ Token usage tracked and logged
- ✅ Performance equal or better than before
- ✅ No regressions in output quality
- ✅ TypeScript compilation succeeds
- ✅ Linting passes

## Why Low Reasoning?

Based on research findings:

**Low Reasoning is Optimal for Slash Command Conversion:**

1. **Task Complexity:** Slash command conversion is a **deterministic transformation task**:
   - Remove frontmatter (mechanical)
   - Replace arguments (string substitution)
   - Inline references (fetch + paste)
   - Clean up mentions (text processing)

2. **Reasoning Effort Comparison:**
   - **Minimal:** Too aggressive, may skip nuanced decisions (e.g., when to inline vs omit)
   - **Low:** Perfect balance - handles context-aware decisions without overthinking
   - **Medium/High:** Overkill - wasted tokens on simple transformations

3. **Performance Benefits:**
   - Low reasoning uses **~50% fewer tokens** than medium/high
   - Faster response time
   - Lower cost per conversion
   - Still intelligent enough for context-aware inlining decisions

4. **GPT-5-mini with Low Reasoning:**
   - GPT-5-mini is already fast and cost-effective
   - Low reasoning keeps it snappy while maintaining quality
   - Suitable for straightforward tasks with moderate analysis needs

**When to use other levels:**
- **Minimal:** Simple text extraction, formatting (not suitable for our use case)
- **Medium:** Default for complex tasks (overkill for us)
- **High:** Multi-step planning, heavy tool usage (definitely overkill)

## Implementation Steps

### Step 1: Create Feature Branch
```bash
git checkout -b feature/response-api-migration
```

### Step 2: Update AIConverterService
- Replace `chatWithTools()` method implementation in `src/infrastructure/ai-converter.ts`
- Use Response API (`/v1/responses`) instead of Chat Completions
- Add `reasoning: { effort: "low" }` parameter
- Update return type to include `reasoning_tokens` and `output_tokens`

### Step 3: Update All Tests
- Update all `chatWithTools` mock responses to include new fields
- Add tests for Response API specific behavior
- Verify all 331 tests still pass

### Step 4: Verify Locally
```bash
npm test                    # All tests must pass
npm run dev                 # Test manually
npm run lint                # Linting must pass
```

### Step 5: Commit and Push
```bash
git add -A
git commit -m "♻️ refactor: Migrate to OpenAI Response API with low reasoning"
git push origin feature/response-api-migration
```

### Step 6: Create Pull Request
- Title: "Migrate to OpenAI Response API with low reasoning effort"
- Description: Include performance improvements and benefits
- Link to this task findings document

### Step 7: Merge to Main
- After PR approval
- Squash merge or regular merge based on preference
- Delete feature branch after merge

## Summary

This migration is a **complete replacement in one go**:

1. ✅ Replace `chatWithTools()` implementation with Response API
2. ✅ Update all test mocks to match Response API structure in single commit
3. ✅ Add token usage tracking (optional but valuable)
4. ✅ Verify no regressions on feature branch
5. ✅ Merge after thorough testing

**Key Benefits:**
- **Lower token usage** with "low" reasoning effort (~50% reduction)
- **Better performance** with optimized reasoning
- **Future-proof** - Response API is OpenAI's newest and recommended API
- **Better caching** - Response API has ~80% cache hit rate vs 40% for Chat Completions
- **Same quality** - Output quality maintained or improved
- **Clean migration** - No deprecated code, single cohesive change

**Zero Disruption:**
- No frontend changes
- No database changes
- No route changes
- No business logic changes
- No service layer changes (only infrastructure layer)
- Feature branch allows safe testing before merge
