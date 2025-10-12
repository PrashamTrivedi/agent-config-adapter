# Purpose

Migrate from Cloudflare Workers AI (Llama 3.1) to Cloudflare AI Gateway with OpenAI GPT-5 model for better conversion quality.

## Original Ask

Find online, we should be using GPT-5 model without thinking mode on Cloudflare AI Gateway not workers AI, AI Gateway uses OpenAI's response API. Find from cloudflare's AI Gateway documentation and change the code accordingly

## Complexity and the reason behind it

**Complexity Score: 2/5**

**Reasoning:**
- Straightforward API migration with clear documentation
- Well-defined changes: update endpoint, authentication, and response handling
- No database schema changes
- No architectural changes
- Configuration changes are simple (secrets vs bindings)
- Similar request/response patterns between Workers AI and OpenAI API
- Testing can be done with existing test cases
- Main complexity: Ensuring backward compatibility and proper error handling

## Architectural changes required

**No architectural changes required.** The system maintains the same adapter pattern with AI-enhanced conversion. The only change is replacing the AI provider from Cloudflare Workers AI to OpenAI via AI Gateway.

**Current Architecture (Remains Unchanged):**
```
Routes → Adapters (AI-Enhanced) → AI Converter Service
                                       ↓
                               AI Provider (CHANGE HERE)
```

**Provider Change:**
- FROM: Cloudflare Workers AI (Llama 3.1 via `c.env.AI` binding)
- TO: OpenAI GPT-5-mini via Cloudflare AI Gateway (HTTP requests)

## Backend changes required

### 1. Environment Configuration Changes

**File: `wrangler.jsonc`**
- REMOVE: `ai` binding (no longer needed)
- ADD: Environment variables for AI Gateway:
  ```jsonc
  "vars": {
    "ACCOUNT_ID": "your-account-id",
    "GATEWAY_ID": "your-gateway-id"
  }
  ```

**Secrets Management:**
```bash
# Add OpenAI API key as secret
npx wrangler secret put OPENAI_API_KEY
```

**Local Development (`.dev.vars`):**
```bash
OPENAI_API_KEY="sk-..."
ACCOUNT_ID="your-account-id"
GATEWAY_ID="your-gateway-id"
```

### 2. Type Definition Updates

**File: `src/index.ts` and `src/routes/configs.ts`**

Update `Bindings` type:
```typescript
// BEFORE
type Bindings = {
  DB: D1Database;
  CONFIG_CACHE: KVNamespace;
  AI: Ai;
};

// AFTER
type Bindings = {
  DB: D1Database;
  CONFIG_CACHE: KVNamespace;
  OPENAI_API_KEY: string;
  ACCOUNT_ID: string;
  GATEWAY_ID: string;
};
```

### 3. AI Converter Service Refactor

**File: `src/infrastructure/ai-converter.ts`**

**Changes:**
1. Replace `Ai` binding with OpenAI SDK
2. Update constructor to accept environment variables
3. Change model from `@cf/meta/llama-3.1-8b-instruct` to `gpt-5-mini`
4. Update API call to use OpenAI SDK with AI Gateway base URL
5. Simplify response extraction (OpenAI returns standard format)

**Implementation:**
```typescript
import OpenAI from 'openai';
import { AgentFormat, ConfigType } from '../domain/types';

export interface AIConversionResult {
  content: string;
  usedAI: boolean;
  fallbackUsed: boolean;
}

export class AIConverterService {
  private openai: OpenAI;

  constructor(apiKey: string, accountId: string, gatewayId: string) {
    this.openai = new OpenAI({
      apiKey,
      baseURL: `https://gateway.ai.cloudflare.com/v1/${accountId}/${gatewayId}/openai`
    });
  }

  async convert(
    sourceContent: string,
    sourceFormat: AgentFormat,
    targetFormat: AgentFormat,
    configType: ConfigType
  ): Promise<string> {
    const prompt = this.buildConversionPrompt(
      sourceContent,
      sourceFormat,
      targetFormat,
      configType
    );

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-5-mini',
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: 2000, // Reasonable limit for config conversions
      });

      const result = response.choices[0].message.content || '';
      return result.trim();
    } catch (error) {
      console.error('AI conversion failed:', error);
      throw new Error('AI conversion failed');
    }
  }

  // Keep existing buildConversionPrompt and getFormatSpec methods unchanged
  private buildConversionPrompt(...) { /* same as before */ }
  private getFormatSpec(...) { /* same as before */ }
}
```

### 4. Adapter Factory Updates

**File: `src/adapters/index.ts`**

Update `getAdapter` function signature and AIConverterService instantiation:

```typescript
// BEFORE
export function getAdapter(type: ConfigType, ai?: Ai): FormatAdapter | AIEnhancedAdapter {
  const baseAdapter = getBaseAdapter(type);

  if (ai) {
    const aiService = new AIConverterService(ai);
    return new AIEnhancedAdapter(baseAdapter, aiService);
  }

  return baseAdapter;
}

// AFTER
export function getAdapter(
  type: ConfigType,
  env?: { OPENAI_API_KEY?: string; ACCOUNT_ID?: string; GATEWAY_ID?: string }
): FormatAdapter | AIEnhancedAdapter {
  const baseAdapter = getBaseAdapter(type);

  if (env?.OPENAI_API_KEY && env?.ACCOUNT_ID && env?.GATEWAY_ID) {
    const aiService = new AIConverterService(
      env.OPENAI_API_KEY,
      env.ACCOUNT_ID,
      env.GATEWAY_ID
    );
    return new AIEnhancedAdapter(baseAdapter, aiService);
  }

  return baseAdapter;
}
```

### 5. Route Handler Updates

**File: `src/routes/configs.ts`**

Update adapter initialization:
```typescript
// BEFORE (line 87)
const adapter = getAdapter(config.type, c.env.AI);

// AFTER
const adapter = getAdapter(config.type, {
  OPENAI_API_KEY: c.env.OPENAI_API_KEY,
  ACCOUNT_ID: c.env.ACCOUNT_ID,
  GATEWAY_ID: c.env.GATEWAY_ID
});
```

### 6. Package Dependencies

**File: `package.json`**

Add OpenAI SDK:
```bash
npm install openai
```

### 7. Documentation Updates

**Files to Update:**
- `CLAUDE.md` - Update tech stack and architecture section
- `README.md` - Update setup instructions with new secrets
- `taskNotes/ai-gateway-migration/implementation-summary.md` - Create new summary

## Frontend changes required

**None required.** This is a backend-only change. The API responses remain the same structure:
```json
{
  "content": "...",
  "cached": false,
  "usedAI": true,
  "fallbackUsed": false
}
```

## Validation

### Setup Validation
1. **Environment Configuration**
   - Create AI Gateway in Cloudflare dashboard
   - Get Account ID and Gateway ID
   - Set OpenAI API key secret
   - Verify `.dev.vars` has all three values

2. **Dependency Installation**
   ```bash
   npm install
   ```

3. **Local Development Server**
   ```bash
   npm run dev
   ```

### API Testing

**Test 1: Create a Claude Code slash command**
```bash
curl -X POST http://localhost:8787/api/configs \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Deploy Command",
    "type": "slash_command",
    "original_format": "claude_code",
    "content": "---\nname: deploy\ndescription: Deploy to production\n---\n\nDeploy the application to $ARGUMENTS environment"
  }'
```

**Test 2: Convert to Gemini format (should use GPT-5-mini)**
```bash
CONFIG_ID="<id-from-test-1>"
curl http://localhost:8787/api/configs/$CONFIG_ID/format/gemini | jq .
```

**Expected Response:**
```json
{
  "content": "description = \"Deploy to production\"\nprompt = \"Deploy the application to {{args}} environment\"",
  "cached": false,
  "usedAI": true,
  "fallbackUsed": false
}
```

**Test 3: Verify second request is cached**
```bash
curl http://localhost:8787/api/configs/$CONFIG_ID/format/gemini | jq .
```

**Expected Response:**
```json
{
  "content": "...",
  "cached": true,
  "usedAI": true,
  "fallbackUsed": false
}
```

**Test 4: MCP Config conversion (should skip AI)**
```bash
curl -X POST http://localhost:8787/api/configs \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test MCP",
    "type": "mcp_config",
    "original_format": "claude_code",
    "content": "{\"mcpServers\":{\"sqlite\":{\"command\":\"uvx\",\"args\":[\"mcp-server-sqlite\"],\"env\":{\"DB_PATH\":\"/data/test.db\"}}}}"
  }'

curl http://localhost:8787/api/configs/<new-id>/format/gemini | jq .
```

**Expected:** `usedAI: false` (MCP configs use rule-based conversion)

### Conversion Quality Testing

Compare conversion quality between old (Llama 3.1) and new (GPT-5-mini):

**Test Commands:**
1. Complex slash command with parameters
2. Multi-line prompts with special characters
3. Commands referencing CLAUDE.md → GEMINI.md (file name replacement)

**Quality Metrics:**
- ✅ Correct format syntax
- ✅ Semantic meaning preserved
- ✅ Parameter format correctly converted ($ARGUMENTS → {{args}})
- ✅ File references converted (CLAUDE.md → GEMINI.md)
- ✅ No extra markdown code blocks or explanations

### Performance Testing

**Measure conversion time:**
```bash
# First request (AI conversion)
time curl http://localhost:8787/api/configs/$CONFIG_ID/format/gemini

# Second request (cached)
time curl http://localhost:8787/api/configs/$CONFIG_ID/format/gemini
```

**Expected:**
- First request: 1-3 seconds (AI conversion via Gateway)
- Second request: <100ms (cached in KV)

### Error Handling Testing

**Test 1: Missing API Key**
- Comment out OPENAI_API_KEY in `.dev.vars`
- Should fall back to rule-based conversion
- Response: `usedAI: true, fallbackUsed: true`

**Test 2: Invalid Gateway ID**
- Use wrong Gateway ID
- Should gracefully fail and use fallback
- Response: `usedAI: true, fallbackUsed: true`

**Test 3: OpenAI API Error**
- Use invalid API key
- Should handle error and use fallback

### Deployment Testing

```bash
# Deploy to production
npm run deploy

# Run production tests
BASE_URL="https://agent-config-adapter.your-account.workers.dev"
# Repeat API tests with production URL
```

### Monitoring

After deployment, check:
1. **AI Gateway Dashboard**: Request count, cache hit rate, errors
2. **Workers Analytics**: Response times, error rates
3. **Costs**: Compare GPT-5-mini costs with previous Workers AI usage

## Success Criteria

- ✅ All environment variables configured correctly
- ✅ OpenAI SDK integrated and working
- ✅ AI conversions use GPT-5-mini via AI Gateway
- ✅ MCP configs still use rule-based conversion (no AI)
- ✅ Fallback to rule-based works when AI fails
- ✅ Response format remains unchanged (backward compatible)
- ✅ Existing tests pass (may need minor adjustments)
- ✅ New tests added for OpenAI integration
- ✅ Documentation updated
- ✅ Conversion quality improved compared to Llama 3.1
- ✅ No regressions in functionality
