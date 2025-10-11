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

- **Model**: Llama 3.1 8B Instruct (`@cf/meta/llama-3.1-8b-instruct`)
- Build detailed prompts with source and target format specs
- Extract content from various response structures (handle different AI response formats)
- Throw error if extraction fails to trigger fallback
- Never add explanations or code blocks to converted output
