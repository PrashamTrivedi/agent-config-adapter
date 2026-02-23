# Purpose

Add environment variable authentication and extension download command to the ACA CLI for CI/agent usage and local plugin installation.

## Original Ask

CLI needs two features: (1) ACA_API_KEY env variable support for CI/web agents, (2) download command to list extensions and download them as Claude Code slash commands/agents/skills into ~/.claude/ or ./.claude/ or custom path. Interactive and non-interactive modes.

## Complexity and the reason behind it

**Complexity: 3/5**

- Feature 1 (env var) is trivial — two 3-line changes in `config.ts`
- Feature 2 (download) is moderate — new command, new API client methods, ZIP extraction, file writing. But it follows established CLI patterns exactly (same arg parsing, display helpers, API client pattern)
- No backend changes needed — all required API endpoints already exist
- No architectural changes — additive only, new file + small edits to existing files
- ZIP handling adds one dependency (`fflate`) but it's proven in the codebase

## Architectural changes required

None. This is purely additive to the existing CLI. The backend already exposes all necessary endpoints:
- `GET /api/extensions` (JSON listing)
- `GET /plugins/:extensionId/claude_code/download` (ZIP download)

## Backend changes required

None. All required API endpoints are already implemented.

## Frontend changes required

None. This is CLI-only work.

## CLI Changes Required

### Feature 1: Environment Variable Support

**File: `cli/src/lib/config.ts`** (lines 47-49)

Modify `getApiKey()` to check `ACA_API_KEY` env var first:

```typescript
export function getApiKey(): string | null {
  const envKey = process.env.ACA_API_KEY;
  if (envKey) return envKey;
  const config = loadConfig();
  return config?.api_key || null;
}
```

Modify `getServerUrl()` (lines 41-45) to check `ACA_SERVER_URL` env var:

```typescript
export function getServerUrl(override?: string): string {
  if (override) return override;
  const envUrl = process.env.ACA_SERVER_URL;
  if (envUrl) return envUrl;
  const config = loadConfig();
  return config?.server_url || DEFAULT_SERVER_URL;
}
```

### Feature 2: Download Command

#### 2a. New Types — `cli/src/lib/types.ts`

Add:

```typescript
export interface Extension {
  id: string;
  name: string;
  description: string | null;
  author: string | null;
  version: string;
  configs?: Array<{ id: string; name: string; type: ConfigType }>;
}

export interface DownloadFlags {
  id?: string;
  name?: string;
  global: boolean;
  project: boolean;
  path?: string;
  server?: string;
  verbose: boolean;
}
```

#### 2b. API Client Methods — `cli/src/lib/api-client.ts`

Add two methods to `ApiClient`:

```typescript
async listExtensions(): Promise<{ extensions: Extension[] }> {
  // GET /api/extensions with Accept: application/json
  // No auth required for public browse
}

async downloadPluginZip(extensionId: string): Promise<ArrayBuffer> {
  // GET /plugins/:extensionId/claude_code/download
  // Returns raw ZIP bytes
}
```

Note: `listExtensions` uses a separate fetch without auth headers since the extensions endpoint is public. `downloadPluginZip` also doesn't need auth.

#### 2c. Display Helpers — `cli/src/lib/display.ts`

Add:

- `displayExtensionList(extensions: Extension[])` — numbered list with name, description, author, version, config count
- `promptNumber(message: string, min: number, max: number): Promise<number>` — validated numeric input

#### 2d. New Command — `cli/src/commands/download.ts`

**Interactive flow** (`aca download [--global|--project|--path <dir>]`):
1. Resolve server URL via `getServerUrl(flags.server)`
2. Create ApiClient (API key not required for browsing, but use if available)
3. Fetch extension list from `GET /api/extensions`
4. Display numbered list via `displayExtensionList()`
5. Prompt user to select by number via `promptNumber()`
6. Resolve target directory:
   - `--global` → `~/.claude/`
   - `--project` → `./.claude/`
   - `--path <dir>` → custom dir
   - Default: `--project` (./.claude/)
7. Download ZIP from `/plugins/:id/claude_code/download`
8. Extract ZIP using `fflate.unzipSync()`
9. Write files to target directory, skipping `.claude-plugin/plugin.json` (metadata only)
10. Report what was written

**Non-interactive flow** (`aca download --id <id>` or `--name <search>`):
1. If `--id`: fetch directly, skip list/prompt
2. If `--name`: fetch list, filter by name (case-insensitive substring match), error if 0 or >1 match
3. Same download/extract/write steps as interactive

**ZIP extraction logic**:
- Use `fflate.unzipSync()` to decompress
- Iterate entries, decode UTF-8 content
- Write each file to `<target>/<path>`, creating directories as needed
- Skip `.claude-plugin/` directory (plugin metadata, not needed locally)
- For `.mcp.json`: warn user about manual merge if target already has one
- Binary files (images in skills): write as-is using `Buffer`

#### 2e. Entry Point — `cli/src/index.ts`

- Add `download` to command switch-case
- Parse download flags: `--id`, `--name`, `--global`, `--project`, `--path`, `--server`, `--verbose`
- Add download to help text
- Document `ACA_API_KEY` and `ACA_SERVER_URL` env vars in help

#### 2f. Dependency — `cli/package.json`

Add `fflate` as a runtime dependency:
```json
"dependencies": {
  "fflate": "^0.8.2"
}
```

This is the same version used by the server-side `zip-generation-service.ts`. Bun will bundle it into the compiled binary.

## Files to Modify

| File | Change |
|------|--------|
| `cli/src/lib/config.ts` | Add env var fallback for API key and server URL |
| `cli/src/lib/types.ts` | Add `Extension`, `DownloadFlags` types |
| `cli/src/lib/api-client.ts` | Add `listExtensions()`, `downloadPluginZip()` |
| `cli/src/lib/display.ts` | Add `displayExtensionList()`, `promptNumber()` |
| `cli/src/commands/download.ts` | **New** — download command implementation |
| `cli/src/index.ts` | Add download command routing + help text |
| `cli/package.json` | Add `fflate` dependency |

## Existing Code to Reuse

| Utility | File | Usage |
|---------|------|-------|
| `getApiKey()` | `cli/src/lib/config.ts:47` | Auth check (modified for env var) |
| `getServerUrl()` | `cli/src/lib/config.ts:41` | Server resolution (modified for env var) |
| `ApiClient` class | `cli/src/lib/api-client.ts:8` | Extended with new methods |
| `success/error/warn/info/header` | `cli/src/lib/display.ts` | Terminal output |
| `confirm()` | `cli/src/lib/display.ts:129` | Y/N confirmation |
| `prompt()` | `cli/src/lib/display.ts:150` | Text input |
| `parseArgs()` | `cli/src/index.ts:41` | Argument parsing |
| `ApiError` class | `cli/src/lib/api-client.ts:90` | Error handling pattern |

## Acceptance Criteria

1. `ACA_API_KEY=aca_xxx aca status` reads API key from env var
2. `ACA_SERVER_URL=http://localhost:8787 aca status` reads server from env var
3. `--server` flag still overrides env var; env var overrides config file
4. `aca download` (no flags) lists extensions, prompts for selection, downloads to `./.claude/`
5. `aca download --global` downloads to `~/.claude/`
6. `aca download --path /tmp/test` downloads to custom path
7. `aca download --id <uuid> --project` downloads specific extension non-interactively
8. `aca download --name "my-ext" --global` searches and downloads by name
9. Downloaded files are placed as `commands/*.md`, `agents/*.md`, `skills/*/SKILL.md` in target directory
10. `.claude-plugin/plugin.json` is NOT written to target (skipped)
11. CLI help shows download command and env var documentation
12. `cd cli && bun run build` produces working binaries

## Validation

### Environment Variable Testing

```bash
# Test API key from env
ACA_API_KEY=aca_test123 bun run cli/src/index.ts status
# Should show: API Key: aca_****123 (from env)

# Test server URL from env
ACA_SERVER_URL=http://localhost:8787 bun run cli/src/index.ts status
# Should show: Server: http://localhost:8787

# Test precedence: --server flag > env var > config file
ACA_SERVER_URL=http://wrong bun run cli/src/index.ts sync --global --server http://localhost:8787 --dry-run
# Should use http://localhost:8787 (flag wins)
```

### Download Command Testing

```bash
# Interactive mode - list and select
bun run cli/src/index.ts download --project

# Non-interactive by ID
bun run cli/src/index.ts download --id <extension-uuid> --path /tmp/test-download

# Non-interactive by name
bun run cli/src/index.ts download --name "some-extension" --global

# Verify file structure after download
ls -la /tmp/test-download/commands/
ls -la /tmp/test-download/agents/
ls -la /tmp/test-download/skills/

# Build test
cd cli && bun run build && ./dist/aca-linux-x64 download --help
```

### API Flow Cases

1. **List extensions** → `GET /api/extensions` with `Accept: application/json` → JSON `{ extensions: [...] }`
2. **Download ZIP** → `GET /plugins/:id/claude_code/download` → Binary ZIP response
3. **Extension not found** → 404 → Show error "Extension not found"
4. **Name search no match** → Empty filtered list → Show "No extensions matching..."
5. **Name search multiple matches** → Show matches and ask to be more specific
6. **Network error** → Show connection error with server URL
