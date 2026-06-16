# Purpose

Add **Claude Code Workflows** as a new first-class, Claude-Code-only config type (`workflow`) across the entire product — storage, services, REST routes, web views, CLI sync/download, MCP read+sync, and extension/marketplace/plugin bundling — modeled on the existing `slash_command`/`agent_definition` (single-file) and `skill` (parity rules) types.

## Original Ask

See `taskNotes/claude-code-workflows/requirements.md` (full requirements doc). Summary:

- New first-class config type `workflow`, supported everywhere other config types are.
- Direct management (web + REST CRUD), with listings showing name/description/phases/when-to-use (not just filename), searchable/filterable.
- CLI sync tool discovers workflows in `~/.claude/workflows/` and `./.claude/workflows/`, pushes (sync) and pulls (download) to the correct local location.
- MCP: workflows readable via existing read/list, pushable via existing local-sync tool, but **excluded** from generic create/update/convert (skill parity).
- Bundling: workflows included in extensions/marketplaces, delivered into the correct location in a Claude Code bundle, and **omitted entirely** from Gemini/Codex bundles/manifests.
- Workflows exist only in Claude Code format; passthrough delivery; requesting a non-Claude format reports "not available in that format."
- Single file, content stored directly with the config record; companion files out of scope (but leave room).
- Tolerant metadata extraction (name, description, phases, when-to-use); on parse failure, still store and flag as having unreadable metadata.
- Access control identical to other config types (existing email-gate/ownership applies).

## Complexity and the reason behind it

**Score: 4 / 5.**

Not algorithmically hard — almost every change *mirrors* an existing pattern (skills/agent_definition). But it is **broad and cross-cutting**: ~18 files across DB migration, domain types, repository, two services + one new analyzer service, adapter, conversion-service, REST routes, MCP server, CLI (types/scanner/download), bundling (file-generation + manifest), and web views. The verification surface is large (every delivery mechanism must be checked). The one genuinely new piece is **parsing the `export const meta = {…}` JS object literal tolerantly without `eval`** (Workers forbid `eval`/`new Function`).

## Key format discovery (drives the design)

Real Claude Code workflows are **JavaScript files** (`~/.claude/workflows/*.js`), not Markdown/YAML. They begin with a pure object literal:

```js
export const meta = {
  name: 'complete-work',
  description: 'Verified task completion: …',
  whenToUse: 'Finalizing a planned task …',
  phases: [
    { title: 'Confirm', detail: 'diff vs requirements' },
    { title: 'Green', detail: 'build/typecheck/test, fix until green' },
  ],
}
// orchestration logic follows…
```

Metadata extraction therefore parses this `meta` object, **not** frontmatter. Approach: regex-locate `export const meta`, brace-match to extract the object substring, then tolerant field extraction (string regex for `name`/`description`/`whenToUse`; phase `title` regex for `phases`). No AI, no `eval`. Any failure → store content anyway with `metadata_unreadable = 1`.

## Architectural changes required

No new architectural layers. Workflows are **single-file configs stored inline in the `configs` table** (like `slash_command`/`agent_definition`), so they reuse `ConfigService` and the existing `/api/configs` routes. (Skills needed a separate route/service only because of R2 multi-file storage — workflows do not, per "companion files out of scope.") One new small stateless service (`WorkflowAnalyzerService`) for metadata extraction, mirroring `SlashCommandAnalyzerService` but local-only (no AI provider dependency).

## Backend changes required

### 1. Domain types — `src/domain/types.ts`
- Add `'workflow'` to `ConfigType` (line 3).
- Extend `Config` with: `workflow_description?: string | null`, `workflow_phases?: string` (JSON array stored as string), `workflow_when_to_use?: string | null`, `metadata_unreadable?: boolean`. (Reuse top-level `name` as the workflow name — derived from filename, consistent with commands/agents.)
- Add `WorkflowMetadata` interface: `{ description?: string; phases: Array<{title: string; detail?: string}>; whenToUse?: string; metadataUnreadable: boolean }`.
- Add `workflows?: string[]` to `ClaudeCodePluginManifest` (after `skills`). Do **not** add to `GeminiExtensionManifest`.

### 2. Migration — `migrations/0011_add_workflow_config_type.sql`
- Mirror `0005_add_skill_config_type.sql` table-recreation pattern (SQLite can't alter CHECK): rebuild `configs` with `type IN ('slash_command','agent_definition','mcp_config','skill','workflow')`, **including the slash-command metadata columns added in 0007 and `user_id` from 0009** in the recreated table, copy data, recreate all existing indexes.
- Add columns: `workflow_description TEXT`, `workflow_phases TEXT` (JSON), `workflow_when_to_use TEXT`, `metadata_unreadable INTEGER DEFAULT 0`.
- ⚠️ Validation note: confirm exact current column set of `configs` before writing the `INSERT … SELECT` so the copy stays positional-safe (list columns explicitly).

### 3. Repository — `src/infrastructure/database.ts`
- Extend `create()` and `update()` to accept optional `workflowMetadata` and write the four new columns (mirror the `analysis` conditional-insert/update pattern). Store `phases` as `JSON.stringify(phases)`.
- Ensure `findById`/`findAll`/`findByNameAndType` SELECT the new columns and map `metadata_unreadable` (0/1) → boolean.
- `findAll` already supports `type`/`format`/`searchName` filters — `type=workflow` works automatically.

### 4. New service — `src/services/workflow-analyzer-service.ts`
- `analyze(content: string): WorkflowMetadata` — pure, synchronous, local. Extract the `meta` object literal via brace matching; tolerant regex for `description`, `whenToUse`, and `phases[].title`. On any failure return `{ phases: [], metadataUnreadable: true }`. Never throws.

### 5. `src/services/config-service.ts`
- On `create`: if `type === 'workflow'`, run analyzer and pass metadata to `repo.create` (non-blocking — failure still stores).
- On `update`: if `type === 'workflow'` and content changed, re-run analyzer and pass to `repo.update`; invalidate cache + extension files as existing code does.
- Optional lazy backfill on read (mirror slash_command lazy-analysis) — **defer**; not required since extraction runs on every create/update. Skip to reduce surface.

### 6. `src/services/conversion-service.ts` + `src/adapters/index.ts`
- In conversion-service, after the `skill` rejection: if `type === 'workflow'` and `targetFormat !== 'claude_code'`, throw the same style of error ("Workflows are only available in Claude Code format and cannot be converted."). For `claude_code` target, return content as-is (passthrough).
- In `src/adapters/index.ts` `getBaseAdapter`, add `case 'workflow': return new PassthroughAdapter();` so any claude_code→claude_code path is a no-op.

### 7. REST routes — `src/routes/configs.ts`
- No new endpoints. CRUD, listing, search, filter, ownership/email-gate all already type-agnostic. Verify the conversion endpoint surfaces the workflow rejection error cleanly (mirror skill error handling at the existing catch).

### 8. Server sync — `src/services/sync-service.ts` / `src/routes/sync.ts`
- No per-type change needed: workflows are single-file, so the standard create/update/unchanged/delete-candidate flow (content comparison) applies. Confirm the companion-files branch is correctly skipped for `workflow` (only `skill` enters it).

### 9. MCP — `src/mcp/server.ts`
- `get_config` + `config://list`: already generic → workflows readable. No change.
- `sync_local_configs` tool: add `'workflow'` to the `type` enum.
- `create_config` / `update_config` / `convert_config`: **leave workflows out** of the enums (skill parity). No change (skills already absent).
- `delete_config` / `delete_configs_batch`: generic → no change.
- `sync_from_local` prompt text: mention `~/.claude/workflows/` and `./.claude/workflows/` scanning.

### 10. Bundling — `src/services/file-generation-service.ts` + `src/services/manifest-service.ts`
- file-generation `generateClaudeCodeFiles()`: after skills, emit `workflows/${sanitizeFileName(name)}.js` with `config.content` (mime `text/javascript`). Include all `type==='workflow'` configs.
- file-generation `generateGeminiFiles()` (and any Codex path): **do not** emit workflow files.
- manifest-service `ClaudeCodePluginManifest`: add `workflows = configs.filter(type==='workflow').map(c => './workflows/'+sanitize(c.name)+'.js')`.
- manifest-service Gemini manifest: **no** workflow handling.
- Plugin file-serving/zip/browse routes (`src/routes/plugins.ts`) are wildcard/R2-driven → workflows served automatically, no change.

## Frontend changes required

### `src/views/icons.ts`
- Add a `workflow` icon (e.g. connected-nodes / pipeline glyph).

### `src/views/configs.ts`
- Add `<option value="workflow">Workflow</option>` to the type filter dropdown.
- In the list/detail rendering for `type==='workflow'`, surface `workflow_description`, parsed `workflow_phases` (render phase titles as chips/inline list), and `workflow_when_to_use` instead of just the name. If `metadata_unreadable` is true, show a small "metadata unreadable" badge and fall back to the filename/name.

### `src/views/extensions.ts`
- Add `<option value="workflow">Workflow</option>` to the config-selector type filter so workflows can be added to extensions.

### `src/views/marketplaces.ts`
- Verify workflows-in-extensions surface correctly (extensions already carry arbitrary configs; likely no change beyond what extensions.ts gives).

## CLI changes required

### `cli/src/lib/types.ts`
- Add `'workflow'` to `ConfigType`.

### `cli/src/lib/scanner.ts`
- Generalize `scanConfigDir` to accept a file-extension param (default `.md`); call it for `workflows/` with `.js` (and also accept `.mjs`/`.ts`? keep to `.js` + `.mjs` to match Claude Code). Name derived from basename without extension, consistent with commands. Add the call in `scanDirectory()` after skills.
- (Workflows are normally flat; recursion is harmless and matches commands behavior.)

### `cli/src/commands/download.ts`
- Ensure downloaded workflow files land in `<target>/.claude/workflows/<name>.js`. This is driven by the bundle's `workflows/` path from file-generation, so it should already extract correctly — verify `extractAndWrite` preserves the `workflows/` directory.

### `cli/src/commands/sync.ts` / `cli/src/lib/api-client.ts`
- No change — generic over config types.

## Acceptance Criteria

1. **Web create + list:** Creating a workflow via the web UI stores it and the listing shows its name, description, phase titles, and when-to-use (not just filename). A workflow with a malformed `meta` block is still stored and flagged "metadata unreadable."
2. **REST:** `POST/GET/PUT/DELETE /api/configs` work for `type=workflow`; `GET /api/configs?type=workflow` filters; `?search=` matches. Email-gate/ownership enforced identically to other types.
3. **Conversion:** Requesting a workflow as `codex`/`gemini` returns a clear "only available in Claude Code format" error; `claude_code` returns content unchanged.
4. **CLI:** `aca sync --global` and `--project` discover `~/.claude/workflows/*.js` and `./.claude/workflows/*.js`, push them; `aca download` writes them back to `.claude/workflows/<name>.js` ready to run.
5. **MCP:** `config://list` / `get_config` expose workflows; `sync_local_configs` accepts `workflow`; `create_config`/`update_config`/`convert_config` do **not** list `workflow`.
6. **Bundling:** A workflow added to an extension appears in a generated **Claude Code** bundle at `workflows/<name>.js` and is referenced in `plugin.json.workflows`; it is **absent** from any Gemini/Codex bundle/manifest.
7. All existing tests pass; new tests cover the analyzer (incl. malformed input), conversion rejection, bundling inclusion/omission, and scanner discovery.

## Validation

**Backend / API flows**
- `npm test` (Vitest) — add/adjust tests for: `workflow-analyzer-service` (valid meta, missing fields, malformed → `metadataUnreadable`), conversion-service workflow rejection, file-generation includes workflow in claude_code & omits in gemini, manifest `workflows[]`, sync-service single-file path.
- Manual REST (against `npm run dev`):
  - `POST /api/configs` `{type:'workflow', original_format:'claude_code', content:'export const meta={name:"x",description:"d",whenToUse:"w",phases:[{title:"A"}]}…'}` → 200, returns extracted metadata.
  - `POST` with broken `meta` → 200, `metadata_unreadable=true`.
  - `GET /api/configs?type=workflow` → lists it with metadata.
  - `GET /api/configs/:id/convert/gemini` → error "only available in Claude Code format".
  - `GET /api/configs/:id/convert/claude_code` → original content.

**CLI**
- `cd cli && bun run dev -- sync --project --dry-run` in a repo containing `.claude/workflows/foo.js` → shows `foo` as `workflow` to be created.
- Real sync, then `bun run dev -- download …` into a temp dir → file reappears at `.claude/workflows/foo.js` byte-identical.

**Bundling**
- Create extension with a workflow, generate claude_code bundle → assert `workflows/foo.js` present and `plugin.json.workflows` lists it. Generate gemini bundle → assert no `workflows/` entries and manifest has no workflows.

**MCP**
- `list_tools` shows `sync_local_configs` accepting `workflow`; `create_config` enum excludes it. `config://list` includes a stored workflow.

**Web**
- `npm run dev`, open configs list, filter by Workflow, confirm metadata (description, phases, when-to-use) renders; malformed one shows the "unreadable" badge.

**Lint/build:** `npm run lint` and the CLI build (`cd cli && bun run build`) pass.
