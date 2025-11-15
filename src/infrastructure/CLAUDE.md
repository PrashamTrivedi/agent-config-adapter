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

## R2 File Storage

- **Bucket**: `EXTENSION_FILES` binding
- **Paths**:
  - Skills: `skills/{skill_id}/files/{file_path}`
  - Plugin files: `plugins/{extension_id}/{format}/...`
- Binary file handling with proper content types
- Used by FileStorageRepository

## Repositories

### ConfigRepository (database.ts)
- D1 SQLite operations for configs
- `nanoid()` ID generation
- Parameterized queries with `.bind()`

### ExtensionRepository
- Extension CRUD and config associations
- Junction table for many-to-many relationships

### MarketplaceRepository
- Marketplace CRUD and extension associations
- Junction table management

### SkillFilesRepository
- Companion file metadata in D1
- Links to R2 file paths
- Foreign key cascade deletes

### FileStorageRepository
- R2 upload/download operations
- Binary file handling

## Multi-Provider AI System

See `src/infrastructure/ai/` directory for details on:
- OpenAI and Gemini provider implementations
- AI Gateway integration
- Authentication modes
- Provider selection and fallback
