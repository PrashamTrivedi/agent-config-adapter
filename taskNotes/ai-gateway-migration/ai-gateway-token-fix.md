# AI Gateway Token Authentication Fix

## Issue
After the initial AI Gateway migration, we encountered a 401 Unauthorized error when making requests through Cloudflare AI Gateway:

```
✘ [ERROR] AI conversion failed: AuthenticationError: 401 [{"code":2009,"message":"Unauthorized"}]
```

## Root Cause
The issue had two parts:

1. **Missing OpenAI API Key**: Initially using a dummy key (`dummy-key-not-used`)
2. **Missing AI Gateway Token**: The `cf-aig-authorization` header was not being passed to authenticate with the AI Gateway itself

## Cloudflare AI Gateway Authentication Model

Cloudflare AI Gateway uses a **two-layer authentication** model:

```
┌─────────────────────────────────────────────────────────────┐
│                    Your Application                         │
│                                                               │
│  Headers sent to AI Gateway:                                 │
│  ✓ cf-aig-authorization: Bearer {AI_GATEWAY_TOKEN}          │
│  ✓ Authorization: Bearer {OPENAI_API_KEY}                   │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│            Cloudflare AI Gateway                             │
│                                                               │
│  1. Validates cf-aig-authorization (your gateway token)      │
│  2. Proxies request to OpenAI with Authorization header      │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│                    OpenAI API                                │
│                                                               │
│  Validates Authorization header (OpenAI API key)             │
└─────────────────────────────────────────────────────────────┘
```

### Two Required Credentials

1. **AI Gateway Token** (`AI_GATEWAY_TOKEN`)
   - Authenticates your application with Cloudflare AI Gateway
   - Created in: Cloudflare Dashboard > AI Gateway > [Your Gateway] > Authentication
   - Header: `cf-aig-authorization: Bearer {token}`
   - Optional if gateway is not in "Authenticated" mode

2. **OpenAI API Key** (`OPENAI_API_KEY`)
   - Authenticates with OpenAI's API
   - AI Gateway proxies this to OpenAI
   - Get from: https://platform.openai.com/api-keys
   - Header: `Authorization: Bearer {key}` (handled by OpenAI SDK)

## Solution Implemented

### Code Changes

**1. Updated AIConverterService** ([src/infrastructure/ai-converter.ts](../../src/infrastructure/ai-converter.ts))

```typescript
constructor(apiKey: string, accountId: string, gatewayId: string, gatewayToken?: string) {
  const config: any = {
    apiKey: apiKey || 'dummy-key-byok-configured',
    baseURL: `https://gateway.ai.cloudflare.com/v1/${accountId}/${gatewayId}/openai`
  }

  // Add AI Gateway token if provided (for authenticated gateways)
  if (gatewayToken) {
    config.defaultHeaders = {
      'cf-aig-authorization': `Bearer ${gatewayToken}`
    }
  }

  this.openai = new OpenAI(config)
}
```

**2. Updated Type Definitions**
- Added `AI_GATEWAY_TOKEN?: string` to `Bindings` type in:
  - [src/index.ts](../../src/index.ts)
  - [src/routes/configs.ts](../../src/routes/configs.ts)

**3. Updated Adapter Factory** ([src/adapters/index.ts](../../src/adapters/index.ts))

```typescript
export function getAdapter(
  type: ConfigType,
  env?: {
    OPENAI_API_KEY?: string;
    ACCOUNT_ID?: string;
    GATEWAY_ID?: string;
    AI_GATEWAY_TOKEN?: string  // Added
  }
): FormatAdapter | AIEnhancedAdapter {
  // ...
  const aiService = new AIConverterService(
    env.OPENAI_API_KEY || '',
    env.ACCOUNT_ID,
    env.GATEWAY_ID,
    env.AI_GATEWAY_TOKEN  // Passed to service
  );
  // ...
}
```

**4. Updated Route Handler** ([src/routes/configs.ts](../../src/routes/configs.ts))

```typescript
const adapter = getAdapter(config.type, {
  OPENAI_API_KEY: c.env.OPENAI_API_KEY,
  ACCOUNT_ID: c.env.ACCOUNT_ID,
  GATEWAY_ID: c.env.GATEWAY_ID,
  AI_GATEWAY_TOKEN: c.env.AI_GATEWAY_TOKEN  // Added
});
```

**5. Updated Environment Configuration** ([.dev.vars.example](../../.dev.vars.example))

```bash
# AI Gateway Authentication Token - OPTIONAL for authenticated gateways
# Create token in: Cloudflare Dashboard > AI Gateway > [Your Gateway] > Authentication
# This is required if you enabled "Authenticated Gateway" in the AI Gateway settings
# Leave empty if using an unauthenticated gateway
# Format: token value (without "Bearer " prefix - added automatically)
AI_GATEWAY_TOKEN=
```

### Commits

```bash
commit 9de8186c9de8186c9de8186c9de8186c9de8186c
Author: root <root@Nurvi-Home>
Date:   Mon Oct 13 12:30:56 2025 +0530

    ✨ feat: Add AI Gateway token authentication support

commit dfc74569af4c1e8f0d3e68c1e3fb6e577a3c3c2c
Author: root <root@Nurvi-Home>
Date:   Mon Oct 13 12:20:56 2025 +0530

    📝 docs: Add OpenAI API key requirements and troubleshooting guide
```

## Configuration Required

### Local Development (`.dev.vars`)

```bash
# Required: Your OpenAI API key
OPENAI_API_KEY=sk-proj-your-key-here

# Required: Your Cloudflare account ID
ACCOUNT_ID=your-account-id

# Required: Your AI Gateway ID
GATEWAY_ID=your-gateway-id

# Optional: AI Gateway token (only if using authenticated gateway)
AI_GATEWAY_TOKEN=your-gateway-token-here
```

### Production Deployment

```bash
# Set OpenAI API key as secret
npx wrangler secret put OPENAI_API_KEY

# Set AI Gateway token as secret (if using authenticated gateway)
npx wrangler secret put AI_GATEWAY_TOKEN

# Update wrangler.jsonc vars section
{
  "vars": {
    "ACCOUNT_ID": "your-account-id",
    "GATEWAY_ID": "your-gateway-id"
  }
}
```

## When to Use AI Gateway Token

### Use AI Gateway Token When:
- ✅ You enabled "Authenticated Gateway" in Cloudflare Dashboard
- ✅ You want to restrict access to your AI Gateway
- ✅ You need request-level authentication and authorization
- ✅ You want to track which applications/users are accessing the gateway

### Skip AI Gateway Token When:
- ⭕ Using an unauthenticated gateway (public/internal use)
- ⭕ Gateway is behind a firewall or restricted network
- ⭕ All requests come from trusted Cloudflare Workers (binding handles auth)

**Note**: When accessing AI Gateway from a Cloudflare Worker using a binding, the `cf-aig-authorization` header is not needed as authentication is handled automatically by the platform.

## Testing

### Verification Steps

1. **Verify Environment Variables**
   ```bash
   # Check that all variables are set (values will be masked)
   grep -E "^(OPENAI_API_KEY|AI_GATEWAY_TOKEN|ACCOUNT_ID|GATEWAY_ID)=" .dev.vars
   ```

2. **Start Development Server**
   ```bash
   npm run dev
   ```

3. **Test AI Conversion**
   ```bash
   # Create a test config
   CONFIG_RESPONSE=$(curl -s -X POST http://localhost:8787/api/configs \
     -H "Content-Type: application/json" \
     -d '{
       "name": "Test Command",
       "type": "slash_command",
       "original_format": "claude_code",
       "content": "---\nname: test\ndescription: Test\n---\n\nTest content"
     }')

   CONFIG_ID=$(echo $CONFIG_RESPONSE | jq -r '.id')

   # Convert to Gemini format (should use AI)
   curl http://localhost:8787/api/configs/$CONFIG_ID/format/gemini | jq .
   ```

4. **Expected Response**
   ```json
   {
     "content": "description = \"Test\"\nprompt = \"Test content\"",
     "cached": false,
     "usedAI": true,
     "fallbackUsed": false  // Should be false if everything works!
   }
   ```

### Success Indicators

- ✅ No 401 Unauthorized errors in console
- ✅ `"fallbackUsed": false` in conversion responses
- ✅ Conversion happens in 1-3 seconds (AI processing time)
- ✅ Second request returns `"cached": true` (KV cache hit)

### Troubleshooting

If still getting 401 errors:

1. **Check OpenAI API Key**
   - Valid format: `sk-proj-...` or `sk-...`
   - Has sufficient credits
   - Not expired

2. **Check AI Gateway Token** (if using authenticated gateway)
   - Token is valid and not expired
   - Token was created for the correct gateway
   - Token has necessary permissions

3. **Check Gateway Configuration**
   - Gateway ID is correct
   - Gateway is in "Authenticated" mode (if using token)
   - Gateway has OpenAI provider enabled

4. **Check Network**
   - Can reach `gateway.ai.cloudflare.com`
   - No firewall blocking requests
   - Correct account ID

## Benefits of This Implementation

1. **Flexible Authentication**: Supports both authenticated and unauthenticated gateways
2. **Backward Compatible**: Token is optional, won't break existing setups
3. **Secure**: Token handled as environment variable/secret
4. **Standard Compliant**: Uses standard `cf-aig-authorization` header format
5. **Graceful Fallback**: Falls back to rule-based conversion if AI fails

## Next Steps

1. ✅ Configuration updated with AI Gateway token support
2. ⏳ **User Action**: Test conversion with current setup
3. ⏳ Verify `fallbackUsed: false` in responses
4. ⏳ Optional: Deploy to production with secrets

## References

- [Cloudflare AI Gateway Authentication](https://developers.cloudflare.com/ai-gateway/configuration/authentication/)
- [OpenAI SDK Custom Headers](https://github.com/openai/openai-node#custom-headers)
- [Task Findings](./taskFindings.md)
- [Resolution Summary](./resolution-summary.md)
- [Troubleshooting Guide](./troubleshooting.md)
