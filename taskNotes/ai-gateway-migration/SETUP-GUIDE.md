# AI Gateway Setup Guide

This guide will help you complete the setup for the AI Gateway migration.

## Prerequisites

✅ Already configured:
- Account ID: `b286748abb233ddf7bf942f876f11eac` (set in wrangler.jsonc)
- Gateway ID: `agent-config-adapter` (set in wrangler.jsonc)
- Wrangler authenticated and ready

## Step 1: Create AI Gateway in Cloudflare Dashboard

Since AI Gateway doesn't have CLI support yet, you need to create it via the dashboard:

1. **Open the AI Gateway dashboard**:
   ```
   https://dash.cloudflare.com/b286748abb233ddf7bf942f876f11eac/ai/ai-gateway
   ```

2. **Create a new gateway**:
   - Click "Create Gateway" button
   - **Name**: `agent-config-adapter`
   - Click "Create"

3. **Verify the Gateway ID**:
   - After creation, you should see the gateway listed
   - The Gateway ID should be displayed (it will be `agent-config-adapter` based on the name)
   - If the auto-generated ID is different, update `GATEWAY_ID` in [wrangler.jsonc](../../wrangler.jsonc)

## Step 2: Get OpenAI API Key

You need an OpenAI API key to use GPT-5-mini:

1. **Go to OpenAI Platform**:
   ```
   https://platform.openai.com/api-keys
   ```

2. **Create a new API key**:
   - Click "Create new secret key"
   - Name it: `agent-config-adapter-cloudflare`
   - Copy the key (starts with `sk-...`)
   - **⚠️ IMPORTANT**: Save it immediately - you won't be able to see it again!

3. **Set up billing** (if not already done):
   - Go to: https://platform.openai.com/settings/organization/billing/overview
   - Add payment method
   - Set usage limits if desired

## Step 3: Configure Secrets

### For Production

Set the OpenAI API key as a Cloudflare Worker secret:

```bash
npx wrangler secret put OPENAI_API_KEY
```

When prompted, paste your OpenAI API key.

### For Local Development

Create a `.dev.vars` file (this file is gitignored for security):

```bash
cp .dev.vars.example .dev.vars
```

Edit `.dev.vars` and add your OpenAI API key:

```bash
# .dev.vars
OPENAI_API_KEY=sk-your-actual-api-key-here
ACCOUNT_ID=b286748abb233ddf7bf942f876f11eac
GATEWAY_ID=agent-config-adapter
```

**⚠️ SECURITY NOTE**: Never commit `.dev.vars` to git! It's already in `.gitignore`.

## Step 4: Test Locally

Start the development server:

```bash
npm run dev
```

Test the API:

```bash
# Create a test slash command
curl -X POST http://localhost:8787/api/configs \
  -H "Content-Type: application/json" \
  -d '{
    "name": "test-command",
    "type": "slash_command",
    "original_format": "claude_code",
    "content": "---\nname: test\ndescription: Test command\n---\n\nTest prompt content"
  }'

# Get the config ID from the response, then test conversion
CONFIG_ID="<paste-id-here>"
curl http://localhost:8787/api/configs/$CONFIG_ID/format/gemini
```

**Expected Response**:
```json
{
  "content": "description = \"Test command\"\nprompt = \"Test prompt content\"",
  "cached": false,
  "usedAI": true,
  "fallbackUsed": false
}
```

If `usedAI: true` and `fallbackUsed: false`, the GPT-5-mini conversion is working! 🎉

## Step 5: Deploy to Production

Once local testing passes:

```bash
npm run deploy
```

Test the production deployment:

```bash
PROD_URL="https://agent-config-adapter.your-subdomain.workers.dev"

# Test conversion
curl $PROD_URL/api/configs/$CONFIG_ID/format/gemini
```

## Step 6: Monitor AI Gateway

After deployment, monitor your AI Gateway:

1. **Go to AI Gateway dashboard**:
   ```
   https://dash.cloudflare.com/b286748abb233ddf7bf942f876f11eac/ai/ai-gateway
   ```

2. **Click on your gateway** (`agent-config-adapter`)

3. **Review metrics**:
   - Request count
   - Cache hit rate
   - Error rate
   - Latency
   - Cost tracking

## Troubleshooting

### Error: "AI conversion failed"

**Possible causes**:
1. OpenAI API key not set or invalid
2. OpenAI account has insufficient credits
3. Gateway ID mismatch

**Solutions**:
- Check secret is set: `npx wrangler secret list` (should show `OPENAI_API_KEY`)
- Verify OpenAI account has credits
- Check wrangler.jsonc has correct ACCOUNT_ID and GATEWAY_ID

### Fallback to rule-based conversion

If you see `usedAI: true, fallbackUsed: true`, the AI conversion failed and fell back to rule-based.

**Check**:
- AI Gateway dashboard for error logs
- OpenAI platform for API usage/errors
- Worker logs: `npx wrangler tail`

### "Not connected" for browser automation

Browser MCP tools aren't available in this environment. All setup must be done via:
- Cloudflare Dashboard (for AI Gateway)
- Wrangler CLI (for secrets)
- OpenAI Platform (for API keys)

## Cost Estimates

**GPT-5-mini pricing** (as of Oct 2025):
- Input: $0.25 per 1M tokens
- Output: Variable

**Typical conversion costs**:
- Average slash command: ~500 input tokens, ~200 output tokens
- Cost per conversion: ~$0.0001 - $0.0002
- 1000 conversions: ~$0.10 - $0.20

**Caching helps**:
- First conversion: Uses AI (costs apply)
- Subsequent requests: Cached in KV (free, instant)
- Invalidate cache only when config changes

## Next Steps

After completing this setup:

1. ✅ Test locally with real conversions
2. ✅ Deploy to production
3. ✅ Monitor AI Gateway metrics
4. ✅ Check conversion quality improvement
5. 📊 Set up usage alerts in OpenAI dashboard
6. 📊 Monitor costs via AI Gateway

## Resources

- [Cloudflare AI Gateway Docs](https://developers.cloudflare.com/ai-gateway/)
- [OpenAI API Docs](https://platform.openai.com/docs/api-reference)
- [GPT-5 Model Documentation](https://platform.openai.com/docs/models/gpt-5)
- [Wrangler Secrets Documentation](https://developers.cloudflare.com/workers/configuration/secrets/)
