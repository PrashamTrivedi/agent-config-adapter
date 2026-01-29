# Purpose

Add `sync_local_configs` MCP tool to enable push-only synchronization of local Claude Code configuration files to the Agent Config Adapter service.

## Original Ask

Add a `sync_local_configs` MCP tool to the existing `/mcp/admin` endpoint that enables push-only synchronization of local Claude Code configuration files (skills, commands, agents) to the Agent Config Adapter service. The tool scans specified local directories, compares against remote configs by name+type, and performs create/update operations with batch confirmation for deletions.

**Key requirements:**
- Push-only sync (local → remote)
- File type mapping: `.claude/skills/<name>/SKILL.md` → skill, `.claude/commands/<name>.md` → slash_command, `.claude/agents/<name>.md` → agent_definition
- Match by name+type (not just name)
- Operations: create new, update existing (local wins), collect deletion candidates
- Deletion handling: batch confirmation, never auto-delete
- Use existing MCP admin token authentication
- Associate synced configs with authenticated user's `user_id`
- Skills with companion files: upload all files in skill directory to R2

## Complexity and the reason behind it

**Complexity: 3/5**

- New MCP tool with multi-step logic (scan → diff → sync)
- Needs new service to orchestrate sync operations
- Skills require companion file handling with R2 uploads
- Need to add `findByNameAndType` query to repository
- Need to handle user_id extraction from MCP admin context
- Deletion candidates need special output format

Not higher because:
- Reuses existing `ConfigService`, `SkillsService`, infrastructure
- No new routes needed (extends `/mcp/admin`)
- Authentication already handled
- File content provided as input (no server-side file scanning)

## Architectural changes required

None. This extends existing MCP admin endpoint with a new tool using established patterns.

## Backend changes required

### 1. Add `findByNameAndType` method to ConfigRepository

**File:** `src/infrastructure/database.ts`

```typescript
async findByNameAndType(name: string, type: ConfigType, userId?: string): Promise<Config | null> {
  const query = userId
    ? 'SELECT * FROM configs WHERE name = ? AND type = ? AND user_id = ?'
    : 'SELECT * FROM configs WHERE name = ? AND type = ?';

  const result = userId
    ? await this.db.prepare(query).bind(name, type, userId).first<Config>()
    : await this.db.prepare(query).bind(name, type).first<Config>();

  return result || null;
}
```

### 2. Create SyncService

**File:** `src/services/sync-service.ts`

New service to handle sync logic:

```typescript
interface LocalConfigInput {
  name: string;
  type: ConfigType;
  content: string;
  companionFiles?: Array<{
    path: string;
    content: string;  // Base64 encoded for binary files
    mimeType?: string;
  }>;
}

interface SyncResult {
  created: Array<{ name: string; type: ConfigType; id: string }>;
  updated: Array<{ name: string; type: ConfigType; id: string }>;
  unchanged: Array<{ name: string; type: ConfigType }>;
  deletionCandidates: Array<{ name: string; type: ConfigType; id: string }>;
}

class SyncService {
  constructor(env: SyncServiceEnv) {}

  async syncConfigs(
    localConfigs: LocalConfigInput[],
    userId: string,
    types?: ConfigType[],
    dryRun?: boolean
  ): Promise<SyncResult> {}
}
```

**Key logic:**
1. Get all remote configs for user filtered by types
2. Build lookup map: `${name}:${type}` → remoteConfig
3. For each local config:
   - If no remote match → create (unless dry_run)
   - If remote match → compare content, update if different (unless dry_run)
4. Collect remote configs not in local set as deletion candidates
5. For skills: handle companion files via SkillsService

### 3. Add `sync_local_configs` tool to MCP server

**File:** `src/mcp/server.ts`

Add new tool in the `mode === 'full'` block:

```typescript
server.tool(
  'sync_local_configs',
  'Sync local Claude Code configs to remote. Push-only: creates new, updates existing (local wins). Returns deletion candidates for confirmation.',
  {
    configs: z.array(z.object({
      name: z.string(),
      type: z.enum(['slash_command', 'agent_definition', 'skill']),
      content: z.string(),
      companionFiles: z.array(z.object({
        path: z.string(),
        content: z.string(),  // Base64 for binary
        mimeType: z.string().optional()
      })).optional()
    })),
    types: z.array(z.enum(['slash_command', 'agent_definition', 'skill'])).optional(),
    dry_run: z.boolean().optional()
  },
  async ({ configs, types, dry_run }) => {
    // Extract user_id from admin token context (needs enhancement)
    const userId = 'admin'; // Placeholder - needs proper implementation

    const result = await syncService.syncConfigs(configs, userId, types, dry_run);

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          summary: {
            created: result.created.length,
            updated: result.updated.length,
            unchanged: result.unchanged.length,
            deletionCandidates: result.deletionCandidates.length
          },
          details: result,
          message: dry_run
            ? 'Dry run complete - no changes applied'
            : `Sync complete: ${result.created.length} created, ${result.updated.length} updated`
        }, null, 2)
      }]
    };
  }
);
```

### 4. Add `delete_configs_batch` tool for deletion confirmation

**File:** `src/mcp/server.ts`

```typescript
server.tool(
  'delete_configs_batch',
  'Delete multiple configs by ID. Use after reviewing deletion candidates from sync_local_configs.',
  {
    configIds: z.array(z.string()),
    confirm: z.boolean().describe('Must be true to execute deletion')
  },
  async ({ configIds, confirm }) => {
    if (!confirm) {
      return { content: [{ type: 'text', text: 'Deletion cancelled - confirm must be true' }] };
    }

    const results = await Promise.all(configIds.map(async (id) => {
      const success = await configService.deleteConfig(id);
      return { id, success };
    }));

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          deleted: results.filter(r => r.success).map(r => r.id),
          failed: results.filter(r => !r.success).map(r => r.id)
        }, null, 2)
      }]
    };
  }
);
```

### 5. Update MCPContext and createMCPServer for user context

**File:** `src/mcp/types.ts`
- Add `userId?: string` to MCPContext (passed through after token validation)

**File:** `src/mcp/server.ts`
- Pass userId to services that need ownership tracking

### 6. Add service export

**File:** `src/services/index.ts`
- Export `SyncService`

## Frontend changes required

None. This is a backend MCP tool only.

## Acceptance Criteria

1. ✅ `sync_local_configs` tool available on `/mcp/admin` endpoint
2. ✅ Tool accepts array of configs with name, type, content, and optional companion files
3. ✅ Creates new configs when no remote match exists
4. ✅ Updates remote configs when local content differs (local wins)
5. ✅ Returns list of deletion candidates (remote-only configs)
6. ✅ Supports `dry_run` mode to preview changes
7. ✅ Supports `types` filter to limit sync scope
8. ✅ Skills with companion files upload all files to R2
9. ✅ `delete_configs_batch` tool allows confirmed batch deletion
10. ✅ All synced configs associated with user_id

## Validation

### Test Commands

```bash
# Run unit tests
npm test -- src/services/sync-service.test.ts
npm test -- tests/mcp/server.test.ts

# Run all tests
npm test
```

### API Flow Tests

**1. Dry run sync (preview changes)**
```bash
# MCP call to /mcp/admin with Bearer token
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "sync_local_configs",
    "arguments": {
      "configs": [
        { "name": "test-command", "type": "slash_command", "content": "# Test\nTest content" }
      ],
      "dry_run": true
    }
  },
  "id": 1
}

# Expected: Summary with created/updated/deletion candidates, no actual changes
```

**2. Actual sync**
```bash
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "sync_local_configs",
    "arguments": {
      "configs": [
        { "name": "test-command", "type": "slash_command", "content": "# Test\nTest content" }
      ]
    }
  },
  "id": 2
}

# Expected: Config created/updated, verify in database
```

**3. Sync skill with companion files**
```bash
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "sync_local_configs",
    "arguments": {
      "configs": [
        {
          "name": "my-skill",
          "type": "skill",
          "content": "# My Skill\n\nSkill content...",
          "companionFiles": [
            { "path": "FORMS.md", "content": "# Forms\n...", "mimeType": "text/markdown" }
          ]
        }
      ]
    }
  },
  "id": 3
}

# Expected: Skill created with companion files in R2
```

**4. Delete candidates after sync**
```bash
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "delete_configs_batch",
    "arguments": {
      "configIds": ["id1", "id2"],
      "confirm": true
    }
  },
  "id": 4
}

# Expected: Configs deleted, confirmation returned
```

### Edge Cases to Test

1. Empty configs array → returns empty result
2. Duplicate names with different types → both synced independently
3. Skill missing SKILL.md content → error
4. Binary companion file (base64) → correctly stored in R2
5. `dry_run: true` → no database/R2 changes
6. No deletion candidates → empty array returned
7. Partial delete failure → returns failed IDs
