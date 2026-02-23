# CLI Sync Tool - Walkthrough

## Setup

### Server Side
No additional setup needed. The sync endpoints are added to the existing server.

### CLI Tool
```bash
# From repo root
cd cli
bun install

# Or run directly without install:
bun run cli/src/index.ts --help
```

### Build Binaries (optional)
```bash
cd cli
bun run build.ts
# Binaries output to cli/dist/aca-{platform}
```

## Authentication

### 1. Login
```bash
# Opens browser to server profile page, prompts for API key
bun run cli/src/index.ts login

# With custom server URL
bun run cli/src/index.ts login --server http://localhost:9090
```

### 2. Check Status
```bash
bun run cli/src/index.ts status
```

## Syncing Configs

### Preview (Dry Run)
```bash
# Global configs only
bun run cli/src/index.ts sync --global --dry-run

# Project configs only
bun run cli/src/index.ts sync --project --dry-run

# Both, verbose output
bun run cli/src/index.ts sync --global --project --dry-run --verbose

# Filter by type
bun run cli/src/index.ts sync --global --dry-run --types slash_command,skill
```

### Actual Sync
```bash
# Sync global configs (will preview first, then ask for confirmation)
bun run cli/src/index.ts sync --global

# Sync with deletion of orphaned remote configs
bun run cli/src/index.ts sync --global --delete
```

## API Verification (curl)

### Sync Dry Run
```bash
curl -X POST http://localhost:9090/api/sync \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer aca_YOUR_KEY_HERE" \
  -d '{
    "configs": [
      {
        "name": "test-command",
        "type": "slash_command",
        "content": "# Test Command\nDo something useful"
      }
    ],
    "dry_run": true
  }'
```

Expected response:
```json
{
  "success": true,
  "summary": { "created": 1, "updated": 0, "unchanged": 0, "deletionCandidates": 0 },
  "details": {
    "created": [{ "name": "test-command", "type": "slash_command", "id": "dry-run" }],
    "updated": [], "unchanged": [], "deletionCandidates": []
  }
}
```

### Sync Actual
```bash
curl -X POST http://localhost:9090/api/sync \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer aca_YOUR_KEY_HERE" \
  -d '{
    "configs": [
      {
        "name": "test-command",
        "type": "slash_command",
        "content": "# Test Command\nDo something useful"
      }
    ],
    "dry_run": false
  }'
```

### Batch Delete
```bash
curl -X DELETE http://localhost:9090/api/sync/batch \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer aca_YOUR_KEY_HERE" \
  -d '{ "config_ids": ["config-id-1", "config-id-2"] }'
```

### Auth Failure
```bash
curl -X POST http://localhost:9090/api/sync \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer invalid" \
  -d '{ "configs": [] }'
# → 401 { "error": "Authentication required..." }
```

## Verification Checklist

1. **Auth works**: Unauthorized requests return 401
2. **Dry run**: Returns preview without modifying database
3. **Create**: New configs appear in database after non-dry-run sync
4. **Update**: Changed content overwrites remote (local wins)
5. **Unchanged**: Identical content is skipped
6. **Deletion candidates**: Orphaned remote configs listed but not deleted unless `--delete`
7. **Type filtering**: `--types` flag limits which config types are synced
8. **Scanner**: Nested dirs produce colon-separated names
9. **Scanner**: Skills include SKILL.md + companion files
10. **Scanner**: Symlinks followed one level; chained symlinks warned and skipped
11. **Scanner**: Circular symlinks (via realpath dedup) warned and skipped
