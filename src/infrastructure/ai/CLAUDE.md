# Multi-Provider AI System

AI-powered format conversion with provider abstraction and auto-fallback.

## Supported Providers

- **OpenAI**: GPT-5-Mini with reasoning modes
- **Gemini**: Gemini 2.5 Flash (15x cheaper)

## Provider Selection

- `auto`: Prefer Gemini (cost), fallback to OpenAI
- `openai`: Force OpenAI
- `gemini`: Force Gemini

## AI Gateway Integration

ALL requests route through Cloudflare AI Gateway for:
- Logging and analytics
- Request/response caching
- Rate limiting
- Cost tracking

## Authentication Modes

### Local Development
- Set `OPENAI_API_KEY` and/or `GEMINI_API_KEY` in `.dev.vars`
- Keys pass through AI Gateway to providers
- Full gateway benefits in local dev

### Production BYOK (Bring Your Own Key)
1. Store provider API keys in Cloudflare Dashboard → AI Gateway → Provider Keys
2. Worker authenticates using `AI_GATEWAY_TOKEN` (cf-aig-authorization header)
3. AI Gateway retrieves provider keys from Cloudflare Secrets Store
4. Billing goes directly to YOUR provider accounts

**Security**: Provider keys NEVER in Worker code

## OpenAI Provider

- Model: `gpt-5-mini`
- Gateway URL: `https://gateway.ai.cloudflare.com/v1/{ACCOUNT_ID}/{GATEWAY_ID}/openai`
- Reasoning modes via `reasoning_effort` parameter:
  - `high`: Maximum reasoning (slowest, most expensive)
  - `medium`: Balanced reasoning
  - `low`: Minimal reasoning
  - `minimal`: Fastest, cheapest
- Set via `OPENAI_REASONING_MODE` env var

## Gemini Provider

- Model: `gemini-2.5-flash`
- Gateway URL: `https://gateway.ai.cloudflare.com/v1/{ACCOUNT_ID}/{GATEWAY_ID}/google-ai-studio`
- **System Messages**: Use `systemInstruction` field (NOT in contents array)
- **Function Responses**: Convert to Gemini's `functionResponse` format
- **Schema Conversion**: OpenAI lowercase → Gemini uppercase types
- **Function Calling**: `toolConfig` with `AUTO` mode
- Thinking budgets (0-24576 tokens) - Reserved for future SDK support

## Conversion Guidelines

- Build detailed prompts with source/target format specs
- Throw error on failure to trigger rule-based fallback
- NEVER add explanations or code blocks to converted output
- Return raw converted content only

## Provider Factory

- Creates provider instances based on config
- Auto-fallback: Gemini → OpenAI on failure
- Logs AI responses with metadata (provider, model, tokens, cost, duration)
