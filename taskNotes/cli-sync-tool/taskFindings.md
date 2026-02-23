# Purpose

Build a standalone CLI tool (`aca`) that syncs local Claude Code configurations to the server, plus the server-side batch sync endpoints it calls.

## Original Ask

Implement the CLI Sync Tool (`aca`) as described in taskNotes/cli-sync-tool/requirements.md. This involves:

**Server-side changes:**
1. Add `POST /api/sync` batch sync endpoint that reuses existing SyncService, requires API key auth via `Authorization: Bearer aca_...` header
2. Add `DELETE /api/sync/batch` endpoint for confirmed deletions
3. Wire these into the Hono router

**CLI tool (in `cli/` directory):**
1. Create the full CLI structure under `cli/` with TypeScript
2. Implement filesystem scanner for commands/**/*.md, agents/**/*.md, skills/{name}/SKILL.md
3. Handle nested directory colon-separated naming (e.g., `commands/git/blame.md` -> `git:blame`)
4. Follow symlinks during scanning
5. Handle skill companion files (base64 for binary, plain text for text files)
6. Implement `aca sync --global --project --dry-run --types --server --verbose` command
7. Implement `aca login` (open browser, prompt for API key, validate, store)
8. Implement `aca status` (show auth, server URL, last sync)
9. Store config in `~/.config/aca/config.json`
10. Always dry-run first, show summary, ask confirmation before actual sync
11. Report deletion candidates but never auto-delete without `--delete` flag
12. Build script for `bun build --compile` targeting linux-x64, darwin-arm64, darwin-x64
13. Import domain types from `../src/domain/types.ts` at build time

## Complexity and the reason behind it

**4/5** — This is a substantial full-stack feature spanning two concerns:

1. **Server-side** is straightforward (2 new Hono routes wrapping existing SyncService with API key auth middleware already proven in `/mcp/admin`). Low complexity.
2. **CLI tool** is a greenfield TypeScript application with recursive filesystem scanning, symlink handling, interactive prompts, HTTP client, config management, and multi-platform Bun compilation. The CLI is the bulk of the work.

The complexity comes from the CLI's breadth (6 source files, multiple commands, filesystem scanning edge cases) rather than algorithmic difficulty.

## Architectural changes required

None. The server-side changes add two REST endpoints following existing patterns. The CLI is a standalone tool in `cli/` that communicates over HTTP.

## Backend changes required

### 1. New sync route file: `src/routes/sync.ts`

Create a new Hono router with API key authentication middleware. Two endpoints:

**`POST /api/sync`** — Batch sync
- Extract API key from `Authorization: Bearer aca_...` header
- Validate via `ApiKeyService.validate()` (already exists)
- Parse request body: `{ configs: LocalConfigInput[], types?: ConfigType[], dry_run?: boolean }`
- Call `SyncService.syncConfigs(configs, userId, types, dryRun)`
- Return `SyncResult` wrapped in `{ success: true, summary: {...}, details: {...} }`

**`DELETE /api/sync/batch`** — Batch delete
- Same API key auth
- Parse body: `{ config_ids: string[] }`
- Call `SyncService.deleteConfigs(configIds)`
- Return `{ success: true, deleted: [...], failed: [...] }`

Auth pattern: Reuse the same API key validation from `/mcp/admin` (line 382-388 of `src/index.ts`), extracted into a reusable middleware.

### 2. Wire into `src/index.ts`

Add `app.route('/api/sync', syncRouter)` alongside existing route mounts.

### 3. API key auth middleware: `src/middleware/api-key-auth.ts`

Extract the API key validation logic from `/mcp/admin` into a reusable Hono middleware:
- Check `Authorization: Bearer aca_...` header
- Validate with `ApiKeyService.validate()`
- Set `userId` on context
- Return 401 JSON if invalid

### 4. Tests: `tests/routes/sync.test.ts`

Test both endpoints with mocked SyncService and ApiKeyService.

## Frontend changes required

None. This is a CLI tool + backend endpoints.

## CLI Implementation Plan

### Directory Structure

```
cli/
  src/
    index.ts          # Entry point, CLI argument parsing
    commands/
      sync.ts         # Sync command implementation
      login.ts        # Login command
      status.ts       # Status command
    lib/
      scanner.ts      # Filesystem scanner
      api-client.ts   # HTTP client for server API
      config.ts       # Config file management
      display.ts      # Terminal output formatting
      types.ts        # CLI-specific types (imports from domain)
  package.json
  tsconfig.json
  build.ts
```

### File-by-file plan

#### `cli/src/index.ts` — Entry point
- Parse `process.argv` manually (no deps — Bun handles this well)
- Route to: `sync`, `login`, `status`, `--help`, `--version`
- Parse global flags: `--server`, `--verbose`

#### `cli/src/lib/config.ts` — Config management
- Read/write `~/.config/aca/config.json`
- Store: `server_url`, `api_key`, `last_sync`
- Use `Bun.file()` for I/O
- Create directory if not exists

#### `cli/src/lib/scanner.ts` — Filesystem scanner
- `scanDirectory(basePath: string): Promise<LocalConfigInput[]>`
- Scan patterns:
  - `{dir}/commands/**/*.md` → type `slash_command`
  - `{dir}/agents/**/*.md` → type `agent_definition`
  - `{dir}/skills/{name}/SKILL.md` → type `skill` (with companion files)
- Nested naming: path segments between `commands/` and the `.md` file become colon-separated name
  - `commands/git/blame.md` → `git:blame`
  - `commands/brainstorm.md` → `brainstorm`
- Follow symlinks: use `fs.lstat` to detect symlinks, then `fs.readlink` + `fs.lstat` on target
  - If target is a regular file/directory → follow it (one level only)
  - If target is another symlink (two-level chain) → skip with error/warning, do not follow
- Realpath deduplication: before entering any directory, resolve its realpath and check against a `Set<string>` of already-visited directories. Skip with warning if already visited. This prevents circular symlinks like `commands/commands -> /root/.claude/commands` from causing infinite recursion or duplicate entries.
- Permission errors → skip the file/dir with a warning, continue scanning
- Empty directories → skip with a warning, continue scanning
- For skills: read all sibling files as companion files
  - Text files (md, txt, json, yaml, ts, js, py, sh) → plain text content
  - Other files → base64-encoded content
  - Include relative path within the skill directory

#### `cli/src/lib/api-client.ts` — HTTP client
- `ApiClient` class with `serverUrl` and `apiKey`
- `sync(configs, types?, dryRun?)` → POST /api/sync
- `deleteBatch(configIds)` → DELETE /api/sync/batch
- `validateKey()` → GET /api/profile/keys (to test auth)
- Use native `fetch()` (available in Bun)
- Handle errors, timeouts, non-200 responses

#### `cli/src/lib/display.ts` — Terminal formatting
- `displaySyncSummary(result)` — formatted sync result table
- `displayDeletionCandidates(items)` — list deletion candidates
- `confirm(message)` → prompt user yes/no
- ANSI color helpers for terminal output
- Verbose logging helper

#### `cli/src/commands/sync.ts` — Sync command
- Parse sync-specific flags: `--global`, `--project`, `--dry-run`, `--types`, `--delete`, `--verbose`
- Validate: at least one of `--global` or `--project` must be set
- Scan appropriate directories:
  - `--global` → `~/.claude/`
  - `--project` → `./.claude/`
  - Both → scan both, merge results
- Step 1: Always run dry-run first, display summary
- Step 2: If `--dry-run` flag, stop here
- Step 3: Ask for user confirmation
- Step 4: Execute actual sync
- Step 5: Display final results
- Step 6: If deletion candidates exist and `--delete` flag, ask confirmation and delete

#### `cli/src/commands/login.ts` — Login command
- Read current config (may have server_url already)
- Prompt for server URL if not set (default to production URL)
- Open browser to `{server_url}/profile` using `Bun.spawn(['open', url])` / `xdg-open`
- Prompt: "Paste your API key:"
- Read API key from stdin
- Validate key by calling `GET /api/profile/keys` with the key
- Save to config file
- Display success message

#### `cli/src/commands/status.ts` — Status command
- Read config file
- Display: server URL, API key prefix, last sync time
- If API key exists, validate it's still active
- Display auth status (authenticated/not configured)

#### `cli/package.json` — Dependencies
- No runtime dependencies (Bun built-ins handle everything)
- Dev dependencies: `typescript`, `@types/bun`
- Scripts: `build`, `dev`

#### `cli/build.ts` — Build script
- Compile with `bun build --compile` for three targets:
  - `--target=bun-linux-x64`
  - `--target=bun-darwin-arm64`
  - `--target=bun-darwin-x64`
- Output to `cli/dist/aca-{platform}`

#### `cli/tsconfig.json`
- Target: ESNext, Module: ESNext
- Paths: `../src/domain/types` accessible at build time

## Acceptance Criteria

1. `POST /api/sync` endpoint accepts batch configs with API key auth, returns structured sync results
2. `DELETE /api/sync/batch` endpoint deletes confirmed configs with API key auth
3. CLI `aca sync --global` scans `~/.claude/` and syncs commands, agents, skills
4. CLI `aca sync --project` scans `./.claude/` in CWD
5. Nested directories produce colon-separated names (e.g., `git:blame`)
6. Single-level symlinks are followed; chained symlinks (symlink→symlink) produce a warning and are skipped
7. Permission errors and empty dirs are skipped with warnings
7. Skills include SKILL.md as main content and companion files
8. `--dry-run` shows preview without making changes
9. `--types` filters to specific config types
10. CLI always shows dry-run summary first and asks for confirmation
11. Deletion candidates are reported but not auto-deleted without `--delete`
12. `aca login` stores API key in `~/.config/aca/config.json`
13. `aca status` shows auth and sync status
14. `bun build --compile` produces working binaries

## Validation

### Backend API flows

1. **Sync with dry run**:
   ```
   POST /api/sync
   Authorization: Bearer aca_...
   Body: { "configs": [...], "dry_run": true }
   → 200 { success: true, summary: { created: N, updated: N, unchanged: N, deletionCandidates: N }, details: {...} }
   ```

2. **Sync actual**:
   ```
   POST /api/sync
   Authorization: Bearer aca_...
   Body: { "configs": [...], "dry_run": false }
   → 200 { success: true, summary: {...}, details: {...} }
   ```

3. **Batch delete**:
   ```
   DELETE /api/sync/batch
   Authorization: Bearer aca_...
   Body: { "config_ids": ["id1", "id2"] }
   → 200 { success: true, deleted: [...], failed: [...] }
   ```

4. **Unauthorized**: No/invalid API key → 401

### CLI verification

1. Run `bun run cli/src/index.ts sync --global --dry-run` against local dev server
2. Verify scanner finds all commands in `~/.claude/commands/` including `git/` and `legacy/` subdirs
3. Verify colon-separated naming: `git:blame`, `legacy:codePrimer`
4. Verify skills with companion files are scanned correctly
5. Verify `--types slash_command` filters properly
6. Run `bun run cli/src/index.ts login` and test API key flow
7. Run `bun run cli/src/index.ts status` to verify auth display

### Tests to run

```bash
npm test                              # All existing tests still pass
npm test -- tests/routes/sync.test.ts # New sync route tests
bun test cli/                         # CLI-specific tests (if added)
```
