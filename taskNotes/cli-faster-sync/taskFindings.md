# Purpose

Make the `aca` CLI fast for the common cases: re-running `sync` when little or
nothing changed (skip unchanged configs, instant "up to date"), and downloading
several extensions at once in parallel.

## Original Ask

See `taskNotes/cli-faster-sync/requirements.md` (verbatim source). Summary:

**Part 1 — Faster uploads (`sync`)**
- Per-machine memory of what was last synced; on each `sync`, send only
  new/modified configs with full content. Unchanged configs are not sent.
- "Changed" must include skill **companion files** (incl. binary). Today's
  companion-change detection misses content changes — must be fixed.
- Zero local changes → print "up to date" immediately, **no server round-trip**.
- When there are changes, keep preview → confirm → apply, but only for changed
  configs.
- Server should apply changes scaling with the number of *changed* items, not
  the whole account (today it scans all configs and writes one at a time).
- A **force/full flag** ignores local memory, compares against the server, and
  rebuilds local memory from the result (recovers from drift / other machines).
- Edge cases: first run = full sync then record; memory is per-scope
  (global vs project) and per-server; deletion candidates only need to surface
  on runs that contact the server (changed runs or force runs).
- Out of scope: no multi-step client↔server hash-negotiation handshake. Upload
  stays one request carrying full content for the changed items.

**Part 2 — Faster downloads (`download`)**
- Download multiple extensions at once, in parallel (with a concurrency cap).
- Selection via multiple ids/names in one command AND multi-select in the
  interactive list.
- Per-item success/failure; one failure must not abort the rest; clear summary.
- Target-dir resolution (project/global/explicit) applies to the whole batch.

## Complexity and the reason behind it

**4 / 5.** Touches the full stack on both halves: CLI (sync, download, config,
scanner, api-client, types, index, display) and server (sync-service, sync
route, ConfigRepository, SkillFilesRepository, one additive migration). The
hard parts are (a) a correct content hash that includes binary companion files,
(b) preserving deletion-candidate correctness when only changed configs are
sent, and (c) making force/full reconcile reliably against the server. No new
external deps; verification is moderate (unit-testable hashing/diff + existing
sync-service tests).

## Architectural changes required

1. **Local sync-state store (new).** A new file
   `~/.config/aca/sync-state.json` separate from `config.json`. Structure keyed
   by server + scope + absolute directory so projects/servers never collide:

   ```jsonc
   {
     "version": 1,
     "entries": {
       // key = `${serverUrl}::${scope}::${absDir}`
       "https://…workers.dev::project::/home/me/proj/.claude": {
         "lastSync": "2026-06-16T…Z",
         "configs": {
           "slash_command:deploy": "<sha256>",
           "skill:pdf-tools": "<sha256>"   // hash folds in companion files
         }
       }
     }
   }
   ```

   New module `cli/src/lib/sync-state.ts`: `loadState`, `getEntry(server,
   scope, dir)`, `saveEntry(...)`. Pure JSON read/write, mirrors `config.ts`.

2. **Config fingerprinting (new).** `cli/src/lib/hash.ts`:
   `hashConfig(config: LocalConfigInput): string` = sha256 over a canonical
   serialization of `type`, `name`, normalized `content` (same normalization as
   server: `trim()` + CRLF→LF), and, for skills, each companion file's
   `path` + raw bytes (companion `content` is already base64 for binary, plain
   text otherwise — hash the string as-is, sorted by path). Uses Bun's
   `crypto` (Web Crypto `crypto.subtle` is async; use Node `createHash` via
   `node:crypto`, available in Bun).

3. **Diff step in `sync` (new).** Between scan and upload: compute current
   hashes, load the matching state entry, classify each config as
   changed (new or hash differs) vs unchanged. Drives the new fast path.

4. **Single-request incremental upload.** No new handshake. The existing
   `POST /api/sync` request gains one optional field, `local_keys` — the full
   list of `{name, type}` the client has locally — so the server can still
   compute deletion candidates while `configs` carries only the changed items'
   full content. (Identifiers only, single request — not a fingerprint
   exchange.)

## Backend changes required

**`src/infrastructure/database.ts`**
- Add `findByUserId(userId: string, types?: ConfigType[]): Promise<Config[]>`
  using `WHERE c.user_id = ?` (+ optional `type IN (...)`), replacing the
  `findAll()`-then-JS-filter pattern. This is the primary "scale with changed
  items, not whole account" fix.

**`migrations/0010_add_skill_file_hash.sql` (new, additive + reversible)**
- `ALTER TABLE skill_files ADD COLUMN file_hash TEXT;` (nullable). Existing rows
  get NULL → treated as "changed" once, then self-heal on next sync. Reversible
  (drop column); no data rewrite, safe for production.

**`src/infrastructure/skill-files-repository.ts`**
- `create`/`batchCreate` accept `file_hash`. Add
  `updateHash(id, file_hash)` (or update via existing path) so re-synced files
  store their new hash.

**`src/services/sync-service.ts`**
- `getRemoteConfigs` → use `configRepo.findByUserId(userId, types)`.
- Fix `companionFilesChanged`: compare per-file `file_hash` (server computes
  sha256 of decoded bytes) instead of returning `false` on path match
  (sync-service.ts:283). This makes **force/full** reconcile correctly even
  though the incremental path already detects companion changes client-side.
- `syncCompanionFiles`: compute + store `file_hash`; skip R2 `put` when the
  hash is unchanged (avoids re-uploading unchanged companions on a skill that
  changed only its SKILL.md).
- `syncConfigs`: accept optional `localKeys?: Array<{name; type}>`. When
  provided, compute `deletionCandidates` against `localKeys` (full local set)
  instead of against the `configs` array (which now holds only changed items).
  When absent (force/full sends everything), behavior is unchanged.
- Batch the D1 writes with `db.batch()` where practical (creates/updates) so a
  batch of N changes is a small number of round-trips, not N×.

**`src/routes/sync.ts`**
- Parse optional `local_keys` from the body and pass to
  `syncService.syncConfigs(...)`. Backward compatible (absent = today).

## Frontend changes required

(CLI is the "frontend" here.)

**`cli/src/lib/types.ts`**
- `SyncFlags`: add `force: boolean`.
- `DownloadFlags`: change `id?/name?` handling to support lists; add
  `ids?: string[]` / `names?: string[]` (keep single forms working).
- Add `SyncStateFile` / `SyncStateEntry` types.

**`cli/src/lib/config.ts`**
- Leave `last_sync` as-is; sync-state lives in the new `sync-state.ts`.

**New `cli/src/lib/sync-state.ts` and `cli/src/lib/hash.ts`** (per Architecture).

**`cli/src/lib/api-client.ts`**
- `sync(...)` gains an optional `localKeys` param → serialized as `local_keys`.

**`cli/src/commands/sync.ts`** (core rewrite of the flow)
- After scanning, compute hashes and load state entry for each scope/dir.
  (Scopes are scanned separately so each maps to its own state entry; today
  both scopes are merged into one `allConfigs` — split per scope so memory keys
  are correct.)
- **Fast path:** if not `--force`, a state entry exists, and zero configs
  changed → print "Everything is up to date!" and return with **no** network
  call.
- **Incremental path:** if changes exist → send only changed `configs` plus
  `local_keys` (all local identities) as the dry-run; preview → confirm → apply
  (same, changed-only). On success, rebuild the state entry from the full
  current local hash set (changed + unchanged) and write it.
- **Force path (`--force`/`--full`):** ignore state; send **all** configs (full
  content, no `local_keys`); preview → confirm → apply exactly like today; then
  rebuild the state entry from the full current hash set.
- First run (no entry) behaves like force (full sync) then records state.
- Deletion candidates surface on incremental (via `local_keys`) and force runs,
  never on the instant up-to-date path — matches requirements.

**`cli/src/commands/download.ts`** (parallel bulk)
- Resolve a *list* of extensions from `--id a,b`, `--name x,y`, and/or
  interactive multi-select.
- Extract `downloadOne(client, extension, targetDir, verbose)` returning a
  per-item `{ name, ok, written?, error? }`.
- Run with a concurrency pool (limit ~4) so failures are isolated; print a
  per-item summary at the end (installed vs failed).
- Target dir resolved once, applied to all items.

**`cli/src/lib/display.ts`**
- Add `promptMultiSelect(...)` (accepts comma/space-separated indices and
  ranges like `1,3,5` or `1-3`) and a `displayBatchSummary(...)` for the
  per-item results.

**`cli/src/index.ts`**
- `parseArgs`: support comma-separated values already works for a single flag
  value; split `--id`/`--name` on commas in the `download` case. Add `--force`
  (and `--full` alias) to the `sync` case and to help text. Document new flags.

## Acceptance Criteria

1. Re-running `sync` with no local changes prints "up to date" with **zero**
   network requests (verifiable: works offline / no server hit).
2. Editing one config and re-running `sync` sends only that config (and, for a
   skill, its files) — preview lists exactly the changed item(s).
3. Editing only a companion file (text **or** binary) inside a skill marks that
   skill changed and re-syncs it.
4. `sync --force` reconciles against the server even when local memory is stale
   or wrong, and rebuilds local memory afterward.
5. Memory is isolated per scope (global vs project) and per server URL — a
   global sync does not suppress a project sync and vice-versa.
6. Deletion candidates still surface on incremental and force runs.
7. `download --id a,b,c` (and multi-select interactive) installs all requested
   extensions in parallel; one failure doesn't abort others; summary shows each
   item's result.
8. Downloading N extensions takes ≈ the slowest single download, not the sum.
9. Server applies a batch of K changes without scanning the whole account
   (`findByUserId`, not `findAll`).
10. All existing tests pass; new unit tests for hashing/diff and bulk download.

## Validation

**Unit (CLI, Bun test in `cli/`):**
- `hash.ts`: identical configs → identical hash; content/companion change →
  different hash; binary companion change detected; path-only reorder stable.
- `sync-state.ts`: round-trip; key isolation across scope/server/dir.
- `sync` diff classification: new/modified/unchanged buckets correct.
- `download` bulk: parse `--id a,b,c`; concurrency pool isolates a failing item;
  summary reflects per-item results.

**Unit (server, Vitest in `tests/services/sync-service.test.ts`):**
- `companionFilesChanged` now true when a companion's content/hash differs.
- `syncConfigs` with `localKeys`: deletion candidates computed against full
  local set while `configs` carries only changed items.
- `findByUserId` returns only the user's configs (and respects `types`).

**Manual / API flow:**
```bash
# CLI
cd cli && bun install && bun test
bun run dev -- sync --project            # first run: full sync, records state
bun run dev -- sync --project            # second run: instant "up to date", no server hit
# edit one command, re-run → only that config in preview
bun run dev -- sync --project --force    # full reconcile, rebuilds state
bun run dev -- download --id <id1>,<id2> # parallel, per-item summary

# Server
npm test                                 # full Vitest suite green
npm run dev                              # POST /api/sync with/without local_keys
```
Migration applied locally:
```bash
npx wrangler d1 execute agent-config-adapter --local \
  --file=./migrations/0010_add_skill_file_hash.sql
```
