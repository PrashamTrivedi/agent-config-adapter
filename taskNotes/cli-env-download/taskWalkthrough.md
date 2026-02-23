# Task Walkthrough: CLI Env Var Auth + Extension Download

## Setup

No special setup required — all backend endpoints already exist. Only CLI changes were made.

### Prerequisites
- Bun runtime installed
- Project cloned and dependencies installed (`cd cli && bun install`)

## Feature 1: Environment Variable Authentication

### Verify env var API key

```bash
# Set API key via env var and check status
ACA_API_KEY=aca_your_key_here bun run cli/src/index.ts status
# Expected output:
#   Server:    https://agent-config-adapter.prashamhtrivedi.workers.dev (default)
#   API Key:   aca_****ere (from env)
```

### Verify env var server URL

```bash
ACA_SERVER_URL=http://localhost:8787 bun run cli/src/index.ts status
# Expected output:
#   Server:    http://localhost:8787 (env)
```

### Verify precedence: --server flag > env var > config file

```bash
ACA_SERVER_URL=http://env-server bun run cli/src/index.ts sync --global --server http://flag-server --dry-run
# Should use http://flag-server (flag wins over env var)
```

### Verify env var works for sync

```bash
ACA_API_KEY=aca_your_real_key ACA_SERVER_URL=https://agent-config-adapter.prashamhtrivedi.workers.dev \
  bun run cli/src/index.ts sync --global --dry-run
# Should authenticate and run dry-run sync using env var credentials
```

## Feature 2: Download Command

### Interactive mode (list and select)

```bash
bun run cli/src/index.ts download --project
# Expected: Lists available extensions with numbers, prompts for selection,
# downloads and extracts to ./.claude/
```

### Non-interactive by ID

```bash
bun run cli/src/index.ts download --id <extension-uuid> --path /tmp/test-download --verbose
# Expected: Downloads specific extension, extracts to /tmp/test-download/,
# shows file-by-file details with --verbose
```

### Non-interactive by name

```bash
bun run cli/src/index.ts download --name "my-extension" --global
# Expected: Searches by name (case-insensitive substring match),
# downloads to ~/.claude/ if exactly one match
```

### Verify downloaded file structure

```bash
ls -la /tmp/test-download/commands/    # Slash command .md files
ls -la /tmp/test-download/agents/      # Agent definition .md files
ls -la /tmp/test-download/skills/      # Skill directories with SKILL.md
```

### Verify .claude-plugin is skipped

```bash
ls -la /tmp/test-download/.claude-plugin/
# Expected: No such file or directory (metadata is skipped)
```

### Error cases

```bash
# Extension not found
bun run cli/src/index.ts download --id nonexistent-uuid --path /tmp/test
# Expected: "Extension not found: nonexistent-uuid"

# No name match
bun run cli/src/index.ts download --name "zzz-no-match" --project
# Expected: 'No extensions matching "zzz-no-match"'

# Multiple name matches
bun run cli/src/index.ts download --name "a" --project
# Expected: Lists matches, asks to be more specific
```

## Build Verification

```bash
cd cli && bun run build
# Expected: All 4 binaries built:
#   ./dist/aca-linux-x64
#   ./dist/aca-darwin-arm64
#   ./dist/aca-darwin-x64
#   ./dist/aca-windows-x64.exe

# Verify binary works
./dist/aca-linux-x64 --help
# Expected: Shows help text with download command and env var documentation
```

## Verification Checklist

- [ ] `aca status` shows API key source as `(from env)` when `ACA_API_KEY` is set
- [ ] `aca status` shows server source as `(env)` when `ACA_SERVER_URL` is set
- [ ] `--server` flag overrides `ACA_SERVER_URL` env var
- [ ] `ACA_API_KEY` env var overrides config file key
- [ ] `aca download` lists extensions interactively
- [ ] `aca download --id <uuid>` downloads non-interactively
- [ ] `aca download --name <search>` finds by name
- [ ] `--global` writes to `~/.claude/`
- [ ] `--project` writes to `./.claude/`
- [ ] `--path <dir>` writes to custom directory
- [ ] `.claude-plugin/` directory is skipped during extraction
- [ ] `.mcp.json` conflict shows warning and skips
- [ ] `--verbose` shows per-file write details
- [ ] Help text shows download command and env var docs
- [ ] All 4 platform binaries build successfully
- [ ] All 605 existing tests continue to pass
