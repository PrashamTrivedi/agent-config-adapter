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

## AI Converter

- **Model**: OpenAI GPT-5-mini via Cloudflare AI Gateway
- **Authentication**: Requires OpenAI API key (BYOK - Bring Your Own Key)
- Build detailed prompts with source and target format specs
- Uses OpenAI SDK with `chat.completions.create()` method
- Gateway URL: `https://gateway.ai.cloudflare.com/v1/{ACCOUNT_ID}/{GATEWAY_ID}/openai`
- Optional AI Gateway token authentication via `cf-aig-authorization` header
- Throw error if conversion fails to trigger fallback
- Never add explanations or code blocks to converted output
