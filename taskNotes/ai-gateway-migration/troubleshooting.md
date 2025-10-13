# Troubleshooting Guide - AI Gateway Migration

## 401 Unauthorized Error

### Symptom
```
✘ [ERROR] AI conversion failed: AuthenticationError: 401 [{"code":2009,"message":"Unauthorized"}]
```

### Root Cause
Cloudflare AI Gateway **does NOT store** provider API keys. You must provide your own OpenAI API key with every request. The system was using a dummy key (`dummy-key-not-used`), causing authentication failures.

### Solution

**Option 1: Use Valid OpenAI API Key (Recommended)**

1. Get an API key from [OpenAI Platform](https://platform.openai.com/api-keys)
2. Update `.dev.vars`:
   ```bash
   OPENAI_API_KEY=sk-proj-your-actual-key-here
   ACCOUNT_ID=b286748abb233ddf7bf942f876f11eac
   GATEWAY_ID=ai-agent-adapter
   ```
3. Restart the dev server:
   ```bash
   npm run dev
   ```

**Option 2: Use Rule-Based Conversion Only**

If you don't want to use AI conversion, the system automatically falls back to rule-based conversion when AI fails. However, conversion quality will be lower than with GPT-5.

### Verification

Test that AI conversion works:

```bash
# Create a test config
CONFIG_RESPONSE=$(curl -s -X POST http://localhost:8787/api/configs \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Command",
    "type": "slash_command",
    "original_format": "claude_code",
    "content": "---\nname: test\ndescription: Test command\n---\n\nTest prompt content"
  }')

CONFIG_ID=$(echo $CONFIG_RESPONSE | jq -r '.id')

# Convert to Gemini format (should use AI)
curl http://localhost:8787/api/configs/$CONFIG_ID/format/gemini | jq .
```

**Expected Response (with valid API key):**
```json
{
  "content": "description = \"Test command\"\nprompt = \"Test prompt content\"",
  "cached": false,
  "usedAI": true,
  "fallbackUsed": false
}
```

**Response without valid API key:**
```json
{
  "content": "...",
  "cached": false,
  "usedAI": true,
  "fallbackUsed": true
}
```

## Key Points

- **AI Gateway is a proxy**, not a key storage service
- The OpenAI API key is **required** for AI-powered conversions
- **Fallback conversion works** even without a valid key (rule-based)
- The system is **designed to handle** API key failures gracefully

## Performance Expectations

With a valid API key:
- **First conversion**: 1-3 seconds (AI conversion via Gateway)
- **Cached conversion**: <100ms (from KV)
- **Fallback conversion**: <500ms (rule-based)

## Cost Considerations

Using OpenAI GPT-5-mini through AI Gateway:
- **Pricing**: Pay for OpenAI API usage (not Cloudflare)
- **Gateway benefit**: Caching, rate limiting, analytics
- **Optimization**: KV caching reduces redundant API calls

## Migration Status

✅ Code migration completed
✅ Documentation updated
✅ Error handling improved
⚠️ Requires user action: Add valid OpenAI API key

## References

- [OpenAI API Keys](https://platform.openai.com/api-keys)
- [Cloudflare AI Gateway Authentication](https://developers.cloudflare.com/ai-gateway/configuration/authentication/)
- [Task Findings](./taskFindings.md)
- [Implementation Summary](./implementation-summary.md)
