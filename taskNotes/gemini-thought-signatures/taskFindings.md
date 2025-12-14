# Purpose

Fix Gemini 3 Pro "missing thought_signature" error in multi-turn function calling conversations.

## Original Ask

Read https://ai.google.dev/gemini-api/docs/thought-signatures and update gemini provider to use thought signatures in function calling, fixing the error:

```
Function call is missing a thought_signature in functionCall parts. This is required for tools to work correctly.
```

## Complexity and the reason behind it

**Complexity Score: 2/5**

Reasons:
- Clear root cause from error message and documentation
- Changes contained to 3 files with well-defined boundaries
- No architectural changes required
- Straightforward data passing (add field to existing types, preserve through flow)
- Easy to verify with existing test infrastructure

## Architectural changes required

None. This is a data preservation fix - thought signatures must flow through the existing architecture without modification.

## Backend changes required

### 1. Update `ToolCall` interface ([types.ts:105-111](src/infrastructure/ai/types.ts#L105-L111))

Add optional `thought_signature` field to support Gemini's requirement:

```typescript
export interface ToolCall {
  id: string
  function: {
    name: string
    arguments: string
  }
  /** Gemini thought signature for multi-turn reasoning continuity */
  thought_signature?: string
}
```

### 2. Update `GeminiProvider.extractFunctionCalls` ([gemini-provider.ts:290-306](src/infrastructure/ai/gemini-provider.ts#L290-L306))

Extract `thoughtSignature` along with function call data:

```typescript
private extractFunctionCalls(response: any): any[] {
  const functionCalls: any[] = []
  try {
    const parts = response.candidates?.[0]?.content?.parts || []
    for (const part of parts) {
      if (part.functionCall) {
        functionCalls.push({
          ...part.functionCall,
          thoughtSignature: part.thoughtSignature  // Preserve signature
        })
      }
    }
  } catch (error) {
    console.error('[Gemini] Failed to extract function calls:', error)
  }
  return functionCalls
}
```

### 3. Update `GeminiProvider.chatWithTools` response ([gemini-provider.ts:249-265](src/infrastructure/ai/gemini-provider.ts#L249-L265))

Include thought signature in tool_calls response:

```typescript
return {
  content: textContent || null,
  tool_calls: functionCalls.map((fc: any, idx: number) => ({
    id: `call_${idx}`,
    function: {
      name: fc.name,
      arguments: JSON.stringify(fc.args),
    },
    thought_signature: fc.thoughtSignature,  // Pass through
  })),
  metadata: { ... },
}
```

### 4. Update `SlashCommandConverterService.convertWithTools` ([slash-command-converter-service.ts:163-171](src/services/slash-command-converter-service.ts#L163-L171))

Preserve thought_signature when building assistant message:

```typescript
messages.push({
  role: "assistant",
  content: response.content || null,
  tool_calls: response.tool_calls.map(tc => ({
    id: tc.id,
    type: "function",
    function: tc.function,
    thought_signature: tc.thought_signature,  // Preserve
  }))
})
```

### 5. Update `GeminiProvider.convertMessagesToGeminiFormat` ([gemini-provider.ts:403-430](src/infrastructure/ai/gemini-provider.ts#L403-L430))

Include thought signature in Gemini function call parts:

```typescript
// Handle assistant messages
if (m.role === 'assistant') {
  const parts: any[] = []

  if (m.content) {
    parts.push({text: m.content})
  }

  if (m.tool_calls && m.tool_calls.length > 0) {
    for (const toolCall of m.tool_calls) {
      const part: any = {
        functionCall: {
          name: toolCall.function.name,
          args: JSON.parse(toolCall.function.arguments),
        },
      }
      // Include thought signature if present (Gemini 3 Pro requirement)
      if ((toolCall as any).thought_signature) {
        part.thoughtSignature = (toolCall as any).thought_signature
      }
      parts.push(part)
    }
  }
  // ...
}
```

## Frontend changes required

None.

## Validation

### Unit Tests

1. **Test thought signature extraction** - Verify `extractFunctionCalls` captures `thoughtSignature`
2. **Test signature preservation** - Verify round-trip through `chatWithTools` → message building → `convertMessagesToGeminiFormat`
3. **Test multi-turn conversation** - Verify conversation with function call → response → second call works

### Integration Test

Run the slash command converter with Gemini 3 Pro:

```bash
# Start dev server
npm run dev

# Test conversion endpoint that triggers multi-turn
curl -X POST http://localhost:8787/api/slash-commands/[id]/convert \
  -H "Content-Type: application/json" \
  -d '{"userArguments": "test"}'
```

Expected: No "missing thought_signature" error, successful conversion with tool calls.

### Manual Verification

1. Navigate to slash command converter UI
2. Select a command that references agents/skills (triggers function calling)
3. Click convert
4. Verify successful conversion without 400 errors in console

### Key Test Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| Single function call | Signature extracted and preserved |
| Multiple function calls (parallel) | Only first call has signature (per docs) |
| Multi-turn conversation | Signature included in subsequent requests |
| No function calls | Works normally (no signatures needed) |
