# Purpose

Add Gemini format support with UI integration and implement AI-powered format conversion using Cloudflare Workers AI with GPT-5 model.

## Original Ask

Instead of Jules, use Gemini In UI. Also read relevant memory that details how to convert claude code to Gemini and Codex, implement that using Cloudflare AI workers and GPT 5 model.

## Clarifications

1. **Gemini REPLACES Jules** - Not adding alongside, but replacing completely
2. **AI is default** - No toggle/choice for users, all conversions use AI with rule-based fallback
3. **GPT-5 Prompt** - Must design the exact prompt to be passed to GPT-5 for format conversion

## Complexity and the reason behind it

**Complexity Score: 3/5**

**Reasoning:**
- Simplified: No UI toggle needed - AI is always the default
- Complete replacement of Jules with Gemini (not additive)
- Main complexity: Prompt engineering for GPT-5 to handle format conversion accurately
- External service integration (Cloudflare Workers AI) with GPT-5 model
- Format conversion logic requires understanding of Gemini's TOML-based structure
- Testing AI-powered conversion requires careful validation
- Verification is moderately complex - need to test AI conversion accuracy and fallback mechanisms

## Architectural changes required

### 1. Replace Jules with Gemini in Agent Format
- Update `AgentFormat` type in [src/domain/types.ts](src/domain/types.ts) to replace `jules` with `gemini`
- Type becomes: `type AgentFormat = 'claude_code' | 'codex' | 'gemini'`
- This is a type-level change that ripples through the entire system
- Remove all Jules-related code and replace with Gemini

### 2. Introduce AI-Powered Conversion Service (Default)
- Create new infrastructure service: [src/infrastructure/ai-converter.ts](src/infrastructure/ai-converter.ts)
- This service will use Cloudflare Workers AI binding with GPT-5 model
- **Always used by default** - no user choice or toggle
- Implement fallback mechanism: AI conversion first, rule-based adapter if AI fails
- Design comprehensive GPT-5 prompts for format conversion (detailed in implementation section)

### 3. Update Bindings Structure
- Add `AI` binding to `wrangler.jsonc` for Cloudflare Workers AI
- Update TypeScript bindings type in [src/index.ts](src/index.ts) to include `AI: Ai`

### 4. Extend Adapter Factory Pattern
- Current factory in [src/adapters/index.ts](src/adapters/index.ts) returns adapters by ConfigType
- Need to support AI-enhanced conversion as an optional layer
- Design pattern: Decorator pattern to wrap existing adapters with AI capabilities

## Backend changes required

### 1. Domain Layer Updates
**File**: [src/domain/types.ts](src/domain/types.ts)
- **Replace** `'jules'` with `'gemini'` in `AgentFormat` union type
- Change: `type AgentFormat = 'claude_code' | 'codex' | 'jules'`
- To: `type AgentFormat = 'claude_code' | 'codex' | 'gemini'`
- Add `GeminiSlashCommand` interface with structure:
  ```typescript
  {
    description: string;
    prompt: string;
    args?: string[];
  }
  ```

### 2. Create Gemini Slash Command Adapter
**New File**: [src/adapters/gemini-command-adapter.ts](src/adapters/gemini-command-adapter.ts)
- Parse Gemini TOML format (commands stored in `.gemini/commands/*.toml`)
- Convert to/from Claude Code markdown format
- Convert to/from Codex AGENTS.md format
- TOML parsing logic:
  ```toml
  description = "Command description"
  prompt = """
  The actual prompt text
  """
  args = ["optional", "parameters"]  # Optional field
  ```

### 3. Create AI Conversion Service
**New File**: [src/infrastructure/ai-converter.ts](src/infrastructure/ai-converter.ts)

Implementation plan:
- **Input**: Source content, source format, target format, config type
- **Output**: Converted content string
- **Process**:
  1. Construct conversion prompt based on format pair and config type
  2. Call Cloudflare Workers AI with GPT-5 model (`@cf/openai/gpt-5`)
  3. Parse and validate AI response
  4. Return converted content or throw error for fallback
- **Error Handling**: Timeout, rate limiting, malformed responses

#### GPT-5 Conversion Prompt Design

The service will use a carefully crafted prompt that includes:

**System Context (Common for all conversions):**
```
You are a configuration format converter for AI coding agents. Your task is to convert configuration files between different agent formats while preserving semantic meaning and functionality.

IMPORTANT RULES:
1. Preserve the exact semantic meaning of the original configuration
2. Maintain all functionality - do not add or remove features
3. Follow the target format's syntax precisely
4. Output ONLY the converted configuration - no explanations, no markdown code blocks
5. If the source has parameters/arguments, preserve them in the target format's convention
```

**Format-Specific Specifications (Dynamic based on conversion pair):**

For each format, include specification:

**Claude Code Format:**
```
Claude Code slash commands use Markdown with YAML frontmatter:
---
name: command-name
description: Brief description of what the command does
allowed-tools: List of allowed tools 
---

The actual prompt content goes here.
It can be multiple lines.

Parameters can be referenced as $ARGUMENTS in the prompt.
```

**Codex Format (AGENTS.md):**
```
Codex uses AGENTS.md style with markdown sections:
# command-name

Brief description of what the command does

## Prompt

The actual prompt content goes here.
It can be multiple lines.

Parameters are referenced as {{args}} in the prompt.
```

**Gemini Format:**
```
Gemini uses TOML files (.toml) with this structure:
description = "Brief description of what the command does"
prompt = """
The actual prompt content goes here.
It can be multiple lines.
"""
args = ["param1", "param2"]  # Optional array of parameter names

Note: Use triple-quoted strings for multi-line prompts.
If there are no parameters, omit the args field entirely.
```

**Complete Prompt Template:**
```typescript
const buildConversionPrompt = (
  sourceContent: string,
  sourceFormat: AgentFormat,
  targetFormat: AgentFormat,
  configType: ConfigType
): string => {
  const systemContext = `You are a configuration format converter for AI coding agents. Your task is to convert configuration files between different agent formats while preserving semantic meaning and functionality.

IMPORTANT RULES:
1. Preserve the exact semantic meaning of the original configuration
2. Maintain all functionality - do not add or remove features
3. Follow the target format's syntax precisely
4. Output ONLY the converted configuration - no explanations, no markdown code blocks, no preamble
5. If the source has parameters/arguments, preserve them in the target format's convention

${getFormatSpec(sourceFormat, 'SOURCE')}

${getFormatSpec(targetFormat, 'TARGET')}`;

  const userPrompt = `Convert the following ${configType} configuration from ${sourceFormat} format to ${targetFormat} format:

${sourceContent}

Remember: Output ONLY the converted configuration in ${targetFormat} format. No explanations.`;

  return systemContext + '\n\n' + userPrompt;
};
```

**Example Prompt for Claude Code → Gemini conversion:**
```
You are a configuration format converter for AI coding agents. Your task is to convert configuration files between different agent formats while preserving semantic meaning and functionality.

IMPORTANT RULES:
1. Preserve the exact semantic meaning of the original configuration
2. Maintain all functionality - do not add or remove features
3. Follow the target format's syntax precisely
4. Output ONLY the converted configuration - no explanations, no markdown code blocks, no preamble
5. If the source has parameters/arguments, preserve them in the target format's convention

SOURCE FORMAT: Claude Code
Claude Code slash commands use Markdown with YAML frontmatter:
---
name: command-name
description: Brief description of what the command does
---

The actual prompt content goes here.
It can be multiple lines.

Parameters can be referenced as {{args}} in the prompt.

TARGET FORMAT: Gemini
Gemini uses TOML files (.toml) with this structure:
description = "Brief description of what the command does"
prompt = """
The actual prompt content goes here.
It can be multiple lines.
"""
args = ["param1", "param2"]  # Optional array of parameter names

Note: Use triple-quoted strings for multi-line prompts.
If there are no parameters, omit the args field entirely.

Convert the following slash_command configuration from claude_code format to gemini format:

---
name: code-review
description: Review code for quality issues
---

Review the provided code and give feedback on:
- Code quality
- Best practices
- Potential bugs

Remember: Output ONLY the converted configuration in gemini format. No explanations.
```

**Expected AI Response:**
```toml
description = "Review code for quality issues"
prompt = """
Review the provided code and give feedback on:
- Code quality
- Best practices
- Potential bugs
"""
```

### 4. Update Adapter Factory
**File**: [src/adapters/index.ts](src/adapters/index.ts)
- Modify existing `getAdapter()` to **always** use AI-enhanced conversion
- Remove old `getAdapter()`, replace with `getAIEnhancedAdapter()` and rename it to `getAdapter()`
- No separate factory method needed - AI is the only path
- AI service tries conversion first, falls back to rule-based on failure (transparent to caller)

### 5. Update Slash Command Adapter
**File**: [src/adapters/slash-command-adapter.ts](src/adapters/slash-command-adapter.ts)
- **Replace** all Jules references with Gemini
- Add Gemini support in `convert()` method (replace Jules cases)
- Add `parseGemini()` method to parse TOML format
- Add `toGemini()` method to generate TOML format
- Update validation logic to handle TOML
- Remove `parseJules()` and `toJules()` methods if they exist

### 6. Update Routes to Use AI Conversion
**File**: [src/routes/configs.ts](src/routes/configs.ts)
- Modify `/configs/:id/format/:format` endpoint (line 53-84)
- **Remove** any query parameter handling for AI (AI is always used)
- Always use AI-enhanced adapter from factory
- Handle AI failures gracefully with automatic fallback
- Include metadata in response: `{ content, cached, usedAI: boolean, fallbackUsed: boolean }`
- `usedAI: true, fallbackUsed: false` = AI succeeded
- `usedAI: true, fallbackUsed: true` = AI failed, rule-based fallback succeeded

### 7. Update Bindings
**File**: [src/index.ts](src/index.ts)
- Add `AI: Ai` to `Bindings` type
- Pass AI binding through to routes that need it

**File**: [wrangler.jsonc](wrangler.jsonc)
- Add AI binding configuration:
  ```json
  "ai": {
    "binding": "AI"
  }
  ```

## Frontend changes required

### 1. Update Config Form View
**File**: [src/views/configs.ts](src/views/configs.ts) - `configCreateView()` function (line 83-135)
- **Replace** "Jules" option with "Gemini" in "Original Format" dropdown (line 106)
- Change from: `<option value="jules">Jules</option>`
- To: `<option value="gemini">Gemini</option>`

### 2. Update Config Detail View
**File**: [src/views/configs.ts](src/views/configs.ts) - `configDetailView()` function (line 28-81)
- **Replace** "Jules" button with "Gemini" button (line 47)
- Change from: `hx-get="/api/configs/${config.id}/format/jules"`
- To: `hx-get="/api/configs/${config.id}/format/gemini"`
- Change button text from "Jules" to "Gemini"
- **Do NOT add AI toggle** - AI is always used
- Update JavaScript to display AI metadata in converted content:
  - Show if AI was used successfully
  - Show if fallback was triggered
  - Example: "✓ AI-powered conversion" or "⚠ Fallback conversion used"

### 3. Update Config List View
**File**: [src/views/configs.ts](src/views/configs.ts) - `configListView()` function (line 4-26)
- Display `gemini` badge correctly (already handled dynamically at line 16)
- No changes needed - already renders format dynamically

## Acceptance Criteria

1. **Jules Completely Replaced by Gemini**
   - No references to "Jules" anywhere in codebase (code, UI, docs)
   - `AgentFormat` type only has: `'claude_code' | 'codex' | 'gemini'`
   - All UI dropdowns show "Gemini" instead of "Jules"

2. **Gemini Format Support**
   - User can create config with `gemini` as original format
   - User can convert Claude Code configs to Gemini TOML format
   - User can convert Gemini configs to Claude Code/Codex formats
   - Converted Gemini TOML is valid and parseable

3. **AI-Powered Conversion (Default)**
   - AI conversion is **always used** for all conversions (no toggle)
   - Falls back gracefully to rule-based conversion on AI failure
   - UI shows clear indication: "✓ AI-powered conversion" or "⚠ Fallback conversion used"
   - AI conversion respects config type (slash_command, agent_definition, mcp_config)
   - GPT-5 prompt produces accurate conversions preserving semantic meaning

4. **UI Integration**
   - Gemini appears in all format dropdowns (replacing Jules)
   - No AI toggle/checkbox in UI (AI is always on)
   - Converted content shows AI metadata (success or fallback indicator)

5. **Performance & Caching**
   - AI-converted content is cached in KV (same as rule-based)
   - Cache key does not include AI flag (since AI is always used)
   - Response time acceptable (< 5s for AI, < 100ms for cached)

6. **Error Handling**
   - AI service failures don't break the application
   - Automatic fallback to rule-based conversion on AI failure
   - Fallback is logged but transparent to user (they still get valid output)

## Validation

### Unit Tests (Vitest)

**Test File**: [src/adapters/gemini-command-adapter.test.ts](src/adapters/gemini-command-adapter.test.ts)
```bash
npm test src/adapters/gemini-command-adapter.test.ts
```
- Test parsing valid Gemini TOML
- Test converting Claude Code → Gemini
- Test converting Codex → Gemini
- Test converting Gemini → Claude Code
- Test converting Gemini → Codex
- Test validation with invalid TOML

**Test File**: [src/infrastructure/ai-converter.test.ts](src/infrastructure/ai-converter.test.ts)
```bash
npm test src/infrastructure/ai-converter.test.ts
```
- Mock Cloudflare AI binding
- Test successful AI conversion
- Test AI failure and error handling
- Test prompt construction for different format pairs
- Test response parsing and validation

### Integration Tests

**Test File**: [src/routes/configs.integration.test.ts](src/routes/configs.integration.test.ts)
```bash
npm test src/routes/configs.integration.test.ts
```
- Test `/api/configs/:id/format/gemini` endpoint
- Test `?useAI=true` parameter behavior
- Test fallback from AI to rule-based
- Test caching with AI conversions

### Manual Testing Steps

1. **Setup Local Environment**
   ```bash
   npm install
   npm run dev
   ```
   Navigate to http://localhost:8787

2. **Test Gemini Format Creation**
   - Click "Add New Config"
   - Select "Gemini" as Original Format
   - Paste valid Gemini TOML content:
     ```toml
     description = "Review code for quality"
     prompt = """
     Review the provided code and give feedback on:
     - Code quality
     - Best practices
     - Potential bugs
     """
     ```
   - Submit and verify creation

3. **Test AI-Powered Conversion (Always On)**
   - Open a Claude Code config
   - Click "Gemini" button (no toggle needed)
   - Verify:
     - "✓ AI-powered conversion" indicator appears
     - Converted content is valid TOML
     - Content makes semantic sense (not just syntactic)
   - Repeat for complex configs with multiple sections

4. **Test AI Fallback Mechanism**
   - Simulate AI failure (can temporarily modify AI service to throw error)
   - Attempt conversion
   - Verify:
     - Conversion still succeeds
     - "⚠ Fallback conversion used" indicator appears
     - Content is still valid

5. **Verify Jules is Completely Removed**
   - Search codebase for "jules" (case-insensitive)
   - Verify no references in:
     - UI (views, forms, buttons)
     - Types (domain/types.ts)
     - Adapters
     - Routes
     - Documentation
   - Only "Gemini" should appear in its place

6. **Test All Format Pairs (AI Default)**
   | Source Format | Target Format | Expected |
   |--------------|---------------|----------|
   | Claude Code | Gemini | Valid TOML, AI indicator shown |
   | Codex | Gemini | Valid TOML, AI indicator shown |
   | Gemini | Claude Code | Valid MD with frontmatter, AI indicator shown |
   | Gemini | Codex | Valid AGENTS.md format, AI indicator shown |
   | Claude Code | Codex | Valid AGENTS.md format, AI indicator shown |
   | Codex | Claude Code | Valid MD with frontmatter, AI indicator shown |

7. **Test UI Changes**
   - Verify "Jules" is completely removed from UI
   - Verify "Gemini" appears in all dropdowns
   - Verify NO AI toggle/checkbox exists
   - Verify AI metadata is displayed clearly (✓ or ⚠ indicators)

8. **Performance Testing**
   - Test AI conversion: Measure response time (should be < 5s)
   - Test fallback conversion: Measure response time if AI fails
   - Verify caching works: Second request should be instant (from cache)
   - Test with 10 configs: Ensure no performance degradation

### API Testing (curl/httpie)

```bash
# Create Gemini config
curl -X POST http://localhost:8787/api/configs \
  -H "Content-Type: application/json" \
  -d '{
    "name": "test-gemini-command",
    "type": "slash_command",
    "original_format": "gemini",
    "content": "description = \"Test command\"\nprompt = \"\"\"Test prompt\"\"\""
  }'

# Convert to Claude Code (AI is default)
curl http://localhost:8787/api/configs/{id}/format/claude_code

# Convert Claude to Gemini (AI is default)
curl http://localhost:8787/api/configs/{claude-id}/format/gemini

# Response includes AI metadata
# Expected: { "content": "...", "cached": false, "usedAI": true, "fallbackUsed": false }
```

### Deployment Validation

After deploying to production:
```bash
npm run deploy
```

1. Visit production URL
2. Test all format conversions with real GPT-5 model
3. Monitor Cloudflare Workers AI dashboard for:
   - Request counts
   - Error rates
   - Latency metrics
4. Check D1 database has correct schema
5. Verify KV cache is working (check Cloudflare dashboard)

### Success Metrics

- ✅ All unit tests pass (100% coverage for new code)
- ✅ All integration tests pass
- ✅ Manual testing checklist completed
- ✅ AI conversion success rate > 95%
- ✅ Fallback mechanism tested and working
- ✅ **ZERO** references to "Jules" in entire codebase
- ✅ Gemini replaces Jules in all locations (code, UI, docs)
- ✅ Response time < 5s for AI conversions
- ✅ Response time < 100ms for cached results
- ✅ GPT-5 prompt produces accurate, semantic-preserving conversions
- ✅ Production deployment successful with zero downtime
