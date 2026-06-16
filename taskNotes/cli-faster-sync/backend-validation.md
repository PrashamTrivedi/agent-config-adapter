# Backend Validation — cli-faster-sync

## Changes
- `migrations/0010_add_skill_file_hash.sql` — additive nullable `file_hash` column on `skill_files`.
- `src/domain/types.ts` — `SkillFile.file_hash` + `CreateSkillFileInput.file_hash`.
- `src/infrastructure/skill-files-repository.ts` — persist/return `file_hash`; new `updateHash()`.
- `src/infrastructure/database.ts` — new `findByUserId(userId, types?)` (queries `WHERE c.user_id = ?`, optional `type IN (...)`).
- `src/services/sync-service.ts`:
  - `getRemoteConfigs` now uses `findByUserId` (no full-table scan).
  - `companionFilesChanged` compares SHA-256 content hashes (was path-only → missed content changes).
  - `syncCompanionFiles` parallelized; skips R2 + DB writes for unchanged files; stores/updates hash.
  - per-config writes parallelized via `applyLocalConfig`.
  - `syncConfigs` accepts optional `localKeys` → deletion candidates computed against full local identity set (incremental sync sends only changed configs).
- `src/routes/sync.ts` — parses optional `local_keys` from body (backward compatible).

## API contract (POST /api/sync)
Request body (additions, all optional, backward compatible):
```jsonc
{
  "configs": [ /* full content for changed items only */ ],
  "types": ["slash_command"],
  "dry_run": false,
  "local_keys": [ { "name": "cmd-a", "type": "slash_command" } ] // full local identity set
}
```
Response shape unchanged (`summary` + `details` with created/updated/unchanged/deletionCandidates).

## Verification
- `vitest run` for sync-service, database, skill-files-repository, routes/sync: **66 passed** (was 58; +8 new).
- New tests cover: hash-based companion change detection (changed / unchanged / legacy-null-hash), `localKeys` deletion-candidate semantics, and `findByUserId` query/binding.

## Migration safety
Additive nullable column; reversible (drop column); existing rows get NULL `file_hash` → treated as "changed" once, then self-heal on next sync.
