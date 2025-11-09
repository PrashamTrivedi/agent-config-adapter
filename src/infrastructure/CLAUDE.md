# Infrastructure

Database, caching, and external service integrations.

## Database (D1)

- **Repository pattern**: `ConfigRepository` class
- Use parameterized queries with `.bind()` for all inputs
- `nanoid()` for ID generation
- Always update `updated_at` timestamp on modifications

## Cache (KV)

- **Key pattern**: `config:{id}:{format}` for converted configs
- **TTL**: 1 hour (3600s) default
- Invalidate all format variations on update/delete
- Supported formats: `claude_code`, `codex`, `gemini`

## Multi-Provider AI System

- **Providers**: OpenAI GPT-5-Mini, Google Gemini 2.5 Flash (see `src/infrastructure/ai/`)
- **Architecture**: Provider abstraction with factory pattern and auto-fallback
- **Provider Selection**: Auto mode (prefer Gemini for cost), or explicit provider choice
- **Authentication**:
  - Local dev: Direct API keys (OPENAI_API_KEY, GEMINI_API_KEY) passed through AI Gateway
  - Production BYOK: AI_GATEWAY_TOKEN for Worker → Gateway, provider keys stored in Cloudflare Dashboard
- **AI Gateway Integration**: ALL requests route through AI Gateway for logging, analytics, caching
- **OpenAI Features**:
  - Model: `gpt-5-mini` with `reasoning_effort` parameter (high/medium/low/minimal)
  - Gateway URL: `https://gateway.ai.cloudflare.com/v1/{ACCOUNT_ID}/{GATEWAY_ID}/openai`
- **Gemini Features**:
  - Model: `gemini-2.5-flash` with thinking budgets (reserved for future SDK support)
  - Gateway URL: `https://gateway.ai.cloudflare.com/v1/{ACCOUNT_ID}/{GATEWAY_ID}/google-ai-studio`
- **Conversion Rules**:
  - Build detailed prompts with source and target format specs
  - Throw error if conversion fails to trigger rule-based fallback
  - Never add explanations or code blocks to converted output
