# Backend Validation — Claude Code Workflows

Branch: `feat/claude-code-workflows` (based on clean `main` @ a29730c)

## What was built

New first-class config type `workflow` (Claude Code only, single-file, passthrough),
mirroring `agent_definition` (Claude-only) + `skill` (MCP/parity) conventions.

| Surface | Change |
|---|---|
| Domain | `ConfigType` += `workflow`; `Config` += workflow metadata fields; `WorkflowMetadata`/`WorkflowPhase`; `ClaudeCodePluginManifest.workflows` |
| DB | Migration `0011` recreates `configs` with `workflow` in CHECK + 4 metadata columns (explicit-column copy) |
| Repository | `create`/`update` persist workflow metadata; reads pass columns through |
| Service | New `WorkflowAnalyzerService` (tolerant `export const meta` parser, no eval/AI); `ConfigService` extracts on create/update |
| Conversion | Workflow → non-Claude target throws "only available in Claude Code format"; claude_code = passthrough |
| MCP | `sync_local_configs` accepts `workflow`; create/update/convert exclude it (skill parity); `sync_from_local` prompt mentions `workflows/` |
| Bundling | Claude Code bundle emits `workflows/<name>.js` + `plugin.json.workflows`; Gemini/Codex omit entirely |
| CLI | `ConfigType` += `workflow`; scanner discovers `.claude/workflows/*.js`; download writes back to `workflows/<name>.js` |
| Web | Config list shows workflow description/phases/when-to-use (+ "unreadable" badge); detail section; type filter/create/edit/extension dropdowns |

## Validation performed

- **Typecheck** (`tsc --noEmit`): no new errors. (5 pre-existing baseline errors in
  `adapters/index.ts` AIEnhancedAdapter, `auth/d1-adapter.ts`, `index.ts` — present on
  clean `main`, unrelated.)
- **Full test suite** (`vitest run`): **31 files, 622 tests, all passing**.
  - New: `workflow-analyzer-service.test.ts` (9 tests incl. malformed/unterminated/sparse/quote-variants).
  - Added workflow cases to `conversion-service`, `manifest-service`, `file-generation-service`, `config-service` tests.
- **Migration replay** (sqlite): applied `0011` over a post-0009 schema with a seeded row →
  migration OK, existing row preserved (type/has_arguments/analysis_version intact, new
  `metadata_unreadable` defaulted to 0), `workflow` type INSERT accepted, all indexes recreated.
- **CLI build** (`bun run build`): native linux target built successfully (darwin/windows
  cross-targets fail only because bun can't fetch cross runtimes in the sandbox — environmental).

## Not run (environmental)

- `npm run lint` / eslint: project has no `eslint.config.js` (ESLint v9) — broken project-wide on
  `main`, not a regression.
- Live `wrangler d1 migrations apply` / `npm run dev` REST smoke: requires local D1/wrangler setup.

## Acceptance criteria status

1. Web create + metadata listing — implemented (views) ✓
2. REST CRUD/filter/search/email-gate — type-agnostic, works for `workflow` ✓
3. Conversion rejection / claude_code passthrough — implemented + tested ✓
4. CLI scan (`.claude/workflows/*.js`) push + download — implemented ✓
5. MCP read/list + sync inclusion, create/update/convert exclusion — implemented ✓
6. Bundle: included in Claude Code, omitted from Gemini — implemented + tested ✓
7. Tolerant metadata (store + flag unreadable) — implemented + tested ✓
