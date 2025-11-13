# Purpose

Upgrade AI models from GPT-5-Mini to GPT-5 and Gemini 2.5 Flash to Gemini 2.5 Pro with low to medium thinking capabilities.

## Original Ask

Move this to Gemini 2.5 Pro and GPT-5

Both must be having low to medium thinking.

## Research Findings (November 2025)

### OpenAI GPT-5
- **Model Identifier:** `gpt-5-2025-08-07` (stable, released August 2025)
- **Pricing:**
  - Input: $1.25/1M tokens
  - Output: $10.00/1M tokens (reasoning included)
  - Cached input: $0.125/1M (90% discount - new capability)
- **Reasoning Parameter:** `reasoning_effort` with values: minimal, low, medium (default), high
- **For "Low to Medium" Thinking:** Use `reasoning_effort: "low"` (already configured correctly)

### Google Gemini 2.5 Pro
- **Model Identifier:** `gemini-2.5-pro` (stable identifier, no version suffix)
- **Pricing (≤200K tokens):**
  - Input: $1.25/1M tokens
  - Output: $10.00/1M tokens (thinking included)
- **Pricing (>200K tokens):**
  - Input: $2.50/1M tokens
  - Output: $15.00/1M tokens (thinking included)
- **Thinking Configuration:** `thinking_budget` or `thinkingBudget` parameter
  - `-1` = Dynamic/auto mode (model auto-adjusts based on task complexity)
  - `0` = Disable thinking
  - `1024` = Low preset (fixed budget for consistent "low to medium" thinking)
  - `1-24576` = Custom token budget cap
- **For "Low to Medium" Thinking:** Use `-1` (dynamic) or `1024` (low preset)

### Implementation Summary
- **Both models cost $1.25/$10 per 1M tokens** (price parity at ≤200K for Gemini)
- **OpenAI:** Already using correct parameter (`reasoning_effort`), just need model identifier update
- **Gemini:** Need to enable thinking budget (currently disabled at `0`)

## Complexity and the reason behind it

**Complexity Score: 2/5**

Reason: This is a straightforward model upgrade task involving:
- Changing model identifiers in two provider classes (exact identifiers confirmed via research)
- Updating pricing calculations for the new models (GPT-5 and Gemini Pro pricing verified)
- Adjusting default thinking/reasoning configurations
- Updating related tests and documentation

The task is well-defined with no architectural changes needed. The existing infrastructure already supports thinking/reasoning modes for both providers.

**Cost Information:**
- Both models: $1.25/$10 per 1M tokens (price parity)
- Previous models (Mini/Flash) were significantly cheaper but provided less reasoning capability
- This upgrade provides maximum reasoning capability for config conversion tasks

## Architectural changes required

None required. The existing multi-provider architecture with AI Gateway integration fully supports these model upgrades.

## Backend changes required

### 1. OpenAI Provider Updates ([src/infrastructure/ai/openai-provider.ts](src/infrastructure/ai/openai-provider.ts))

**Current state:**
- Model: `gpt-5-mini` (incorrect - needs version suffix)
- Default reasoning mode: `low`
- Pricing: $0.25/1M input, $2.00/1M output

**Changes needed:**
- **Update model name from `gpt-5-mini` to `gpt-5-2025-08-07`** (line 51)
  - Official stable identifier as of August 2025
  - Parameter `reasoning_effort` already correctly implemented (lines 92, 138)
- **Update pricing in `calculateCost()` method** (lines 202-208):
  - Input: $0.25/1M → **$1.25/1M** (5x increase)
  - Output: $2.00/1M → **$10.00/1M** (5x increase)
  - Reasoning tokens billed as output tokens (no separate rate)
  - Cached input: $0.125/1M (90% discount - new feature)
- Keep default reasoning mode as `low` (already configured correctly for "low to medium")
- Update documentation comments referencing model and pricing

### 2. Gemini Provider Updates ([src/infrastructure/ai/gemini-provider.ts](src/infrastructure/ai/gemini-provider.ts))

**Current state:**
- Model: `gemini-2.5-flash`
- Default thinking budget: `0` (none)
- Pricing: $0.30/1M input, $2.50/1M output (including thinking)

**Changes needed:**
- **Update model name from `gemini-2.5-flash` to `gemini-2.5-pro`** (lines 106, 172)
  - Stable identifier (no version suffix needed)
- **Update default thinking budget** (line 77):
  - **Recommended:** Change from `THINKING_PRESETS.none` (0) to **`THINKING_PRESETS.low` (1024)**
    - Provides consistent "low to medium" thinking as requested
    - Predictable costs and behavior
  - **Alternative:** Use `-1` (dynamic/auto) if you prefer the model to auto-adjust thinking depth
    - More flexible but less predictable costs
- **Update pricing in `calculateCost()` method** (lines 324-333):
  - Input (≤200K tokens): $0.30/1M → **$1.25/1M** (~4x increase)
  - Input (>200K tokens): **$2.50/1M** (new tier)
  - Output (≤200K tokens): $2.50/1M → **$10.00/1M** (4x increase, thinking included)
  - Output (>200K tokens): **$15.00/1M** (new tier)
  - Note: Gemini Pro pricing includes thinking tokens in output billing (no separate rate)
- Update documentation comments referencing model, pricing, and thinking budgets
- Add comment about dynamic thinking mode recommendation

### 3. Provider Factory Updates ([src/infrastructure/ai/provider-factory.ts](src/infrastructure/ai/provider-factory.ts))

**Changes needed:**
- **Update default thinking budget for Gemini** (line 94):
  - Change from `THINKING_PRESETS.none` to `THINKING_PRESETS.low` (1024) for "low to medium" thinking
  - Alternative: Use `-1` (dynamic/auto) for flexible thinking depth
- **Update provider priority comments**:
  - Both GPT-5 and Gemini Pro have same price point ($1.25/$10 per 1M tokens)
  - Auto mode prefers Gemini Pro (same cost, equivalent or better capabilities)

### 4. Configuration Updates

**[wrangler.jsonc](wrangler.jsonc):**
- Update model references in comments: GPT-5-Mini → GPT-5, Gemini Flash → Gemini Pro (line 4)
- Update `OPENAI_REASONING_MODE` comment to mention GPT-5 with reasoning_effort parameter (line 35-36)
- **Update `GEMINI_THINKING_BUDGET` default** (line 39):
  - Change from `"0"` to `"1024"` for "low to medium" thinking (recommended)
  - Alternative: Use `"-1"` for dynamic/auto mode
- Add comment explaining thinking budget options

**[.dev.vars.example](.dev.vars.example):**
- Update project description comments to reflect GPT-5 and Gemini 2.5 Pro (line 4)
- Update OpenAI section:
  - Change "GPT-5-Mini" to "GPT-5" (line 47)
  - Update pricing: "$0.25/$2" → "$1.25/$10 per 1M tokens"
  - Add model identifier: `gpt-5-2025-08-07`
- Update Gemini section:
  - Change "2.5 Flash" to "2.5 Pro" (line 53)
  - Update pricing: "$0.30/$2.50" → "$1.25/$10 per 1M tokens (≤200K)"
  - Add tier info: "$2.50/$15 per 1M tokens (>200K)"
- **Update `GEMINI_THINKING_BUDGET` default** (line 52):
  - Change from `0` to `1024` for "low to medium" thinking
  - Add explanation of thinking budget options
  - Update presets list: "0=none, 512=minimal, 1024=low, 2048=medium, 4096=high, -1=dynamic"

### 5. Documentation Updates

**[CLAUDE.md](CLAUDE.md):**
- Update all references: `gpt-5-mini` → `gpt-5-2025-08-07` (or just "GPT-5" in prose)
- Update all references: `gemini-2.5-flash` → `gemini-2.5-pro`
- Update Multi-Provider AI Architecture section:
  - Supported providers: OpenAI (GPT-5), Google Gemini (2.5 Pro)
  - Update pricing comparison (no longer "15x cheaper" - now same price point)
  - Note: Both models cost $1.25/$10 per 1M tokens
- Update Advanced Features section:
  - OpenAI: reasoning_effort parameter (high/medium/low/minimal) - using "low" for this upgrade
  - Gemini: thinking_budget parameter - using 1024 (low preset) for "low to medium" thinking
- Update pricing to reflect both models at $1.25/$10 per 1M tokens

**[README.md](README.md):**
- Update model references in the Multi-Provider AI section
- Update pricing: Both GPT-5 and Gemini Pro at $1.25/$10 per 1M tokens
- Update comparison: Both models provide advanced reasoning capabilities at price parity

### 6. Test Updates

**[tests/infrastructure/ai/openai-provider.test.ts](tests/infrastructure/ai/openai-provider.test.ts):**
- Update test expectations for model name: `gpt-5-mini` → `gpt-5-2025-08-07`
- Update mock responses to reflect new model identifier
- Update pricing calculation test expectations:
  - Input: $0.25/1M → $1.25/1M
  - Output: $2.00/1M → $10.00/1M
- Add test for cached input pricing ($0.125/1M)
- Verify reasoning_effort parameter is correctly passed

**[tests/infrastructure/ai/gemini-provider.test.ts](tests/infrastructure/ai/gemini-provider.test.ts):**
- Update test expectations for model name: `gemini-2.5-flash` → `gemini-2.5-pro`
- Update default thinking budget tests:
  - Change from `THINKING_PRESETS.none` (0) to `THINKING_PRESETS.low` (1024)
- Update mock responses to reflect new model identifier
- Update pricing calculation test expectations:
  - Input: $0.30/1M → $1.25/1M (≤200K)
  - Output: $2.50/1M → $10.00/1M (≤200K)
  - Add tests for >200K token tier pricing
- Verify thinking budget parameter is correctly configured

**[tests/infrastructure/ai/provider-factory.test.ts](tests/infrastructure/ai/provider-factory.test.ts):**
- Update test expectations for new default thinking budget (1024)
- Update comments to reflect GPT-5 and Gemini Pro models
- Verify auto mode behavior with pricing parity

## Frontend changes required

None required. This is purely a backend model configuration change.

## Acceptance Criteria

- ✅ OpenAI provider uses `gpt-5-2025-08-07` model with correct pricing ($1.25/$10 per 1M)
- ✅ Gemini provider uses `gemini-2.5-pro` model with correct pricing ($1.25/$10 per 1M for ≤200K)
- ✅ OpenAI default reasoning mode remains `low` (low to medium thinking)
- ✅ Gemini default thinking budget changed to `1024` (low preset for "low to medium" thinking)
- ✅ All tests pass with updated model identifiers and pricing expectations
- ✅ Documentation updated to reflect GPT-5 and Gemini Pro models
- ✅ Configuration files (.dev.vars.example, wrangler.jsonc) updated with new defaults
- ✅ Pricing calculations accurate for both models including new tiers
- ✅ Pricing verified for both models ($1.25/$10 per 1M tokens)

## Validation

### Backend Validation

#### 1. Unit Tests
```bash
npm test tests/infrastructure/ai/
```
Expected: All tests pass with new model names and configurations.

#### 2. Model Configuration Verification
Start dev server and make a test conversion request:
```bash
npm run dev
```

Test OpenAI conversion:
```bash
curl -X GET "http://localhost:9090/api/configs/[test-config-id]/format/gemini"
```

Check logs for:
- Model: `gpt-5-2025-08-07` (not `gpt-5-mini`)
- Reasoning effort: `low`
- Correct pricing: ~$1.25/1M input, ~$10.00/1M output

Test Gemini conversion:
```bash
curl -X GET "http://localhost:9090/api/configs/[test-config-id]/format/claude_code"
```

Check logs for:
- Model: `gemini-2.5-pro` (not `gemini-2.5-flash`)
- Thinking budget: `1024` (low preset)
- Correct pricing: ~$1.25/1M input, ~$10.00/1M output (for ≤200K prompts)

#### 3. Provider Factory Auto Mode
Verify auto mode prefers Gemini Pro:
```bash
# Check logs for provider selection when AI_PROVIDER=auto
```

#### 4. Pricing Validation
- Create test conversions and verify cost calculations in logs
- Confirm both models have same pricing ($1.25/$10 per 1M tokens for ≤200K)
- Validate thinking/reasoning token costs are included in output billing
- Verify Gemini Pro >200K tier pricing if applicable ($2.50/$15 per 1M)

### Configuration Validation

#### 1. Environment Variables
```bash
# Verify .dev.vars.example has correct defaults
cat .dev.vars.example | grep -A2 "GEMINI_THINKING_BUDGET\|OPENAI_REASONING_MODE"
```

#### 2. Wrangler Configuration
```bash
# Verify wrangler.jsonc has correct defaults
cat wrangler.jsonc | grep -A2 "GEMINI_THINKING_BUDGET\|OPENAI_REASONING_MODE"
```

### Documentation Validation

#### 1. Grep for Old Model References
```bash
# Should return no results in code/docs (may exist in coverage, dist, etc.)
grep -r "gpt-5-mini[^-]" --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=taskNotes --exclude-dir=coverage --exclude-dir=dist .
grep -r "gemini-2\.5-flash" --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=taskNotes --exclude-dir=coverage --exclude-dir=dist .
```

#### 2. Verify New Model References
```bash
# Should find references in documentation and code
grep -r "gpt-5-2025-08-07\|GPT-5 " --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=taskNotes --exclude-dir=coverage .
grep -r "gemini-2\.5-pro" --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=taskNotes --exclude-dir=coverage .
```

### Integration Test

Create a full end-to-end test:
1. Create a new slash command config
2. Convert to all formats (Claude Code → Gemini, Gemini → Codex, etc.)
3. Verify logs show correct models and thinking/reasoning modes
4. Verify conversion quality and metadata accuracy
