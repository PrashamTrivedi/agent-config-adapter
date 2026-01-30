# Purpose

Create a new MCP prompt that enables Claude Code to scan and sync local configurations (slash commands, agents, skills) to the Agent Config Adapter server.

## Original Ask

I need a prompt from MCP: runs on current directory, reads the path where pwd can be `~/.claude` or can have `.claude` directory.

If that is not the case. Gracefully exits

If that is the case, uses `sync_local_configs` MCP tool to sync the local configs (slash commands-in commands directory, agents and skills) to the MCP server.

If it's in a project directory, add the relevant tag or identifier while uploading.

Do not overwrite any configs, if config with same name exists, skip and log it so that it can be presented to user later.

User should decide any deletion.

For any confusions, it should use AskUserQuestion tool.

## Complexity and the reason behind it

**Complexity: 2/5**

This is a backend-only change that adds a new MCP prompt to the existing server. The complexity is low because:
- The `sync_local_configs` tool already exists and handles all the heavy lifting
- MCP prompts are simple workflow instructions (no code execution)
- The prompt describes a workflow that Claude Code executes using existing tools
- No new services, routes, or infrastructure needed

Not higher because:
- Just adding a new prompt to existing MCP server
- Reuses existing `sync_local_configs` tool completely
- No schema changes or new API endpoints

## Architectural changes required

None. This extends the existing MCP server with a new prompt using established patterns.

## Backend changes required

### 1. Add `sync_from_local` prompt to MCP server

**File:** `src/mcp/server.ts`

Add new prompt in the `mode === 'full'` block (after existing prompts):

```typescript
// Prompt: sync_from_local
server.prompt(
  'sync_from_local',
  'Sync local Claude Code configurations to the remote server. Scans commands, agents, and skills directories.',
  {
    workingDirectory: z.string().optional().describe('Current working directory (defaults to pwd)')
  },
  async ({ workingDirectory }) => {
    const cwd = workingDirectory || 'current directory';

    return {
      messages: [{
        role: 'user',
        content: {
          type: 'text',
          text: `# Local Config Sync Workflow

I need to sync local Claude Code configurations to the remote server.

**Working Directory**: ${cwd}

## Step 1: Detect Configuration Directory

First, determine if we're in a valid Claude Code config context:

1. Check if current directory is \`~/.claude\` (global configs)
2. OR check if current directory contains a \`.claude\` subdirectory (project configs)

If NEITHER condition is met:
- Report: "No Claude Code configuration directory found. Expected ~/.claude or ./.claude directory."
- Exit gracefully - do not proceed.

## Step 2: Identify Config Source Type

Based on the directory detection:
- **Global (~/.claude)**: These are user's personal configs
- **Project (./.claude)**: These are project-specific configs
  - Extract project name from the parent directory name
  - This will be used as a tag/identifier when uploading

## Step 3: Scan Local Configurations

Scan the following directories for configs:

### Slash Commands
- Path: \`{config_dir}/commands/*.md\`
- Type: \`slash_command\`
- Each \`.md\` file is one command
- File name (without .md) becomes the config name

### Agent Definitions
- Path: \`{config_dir}/agents/*.md\`
- Type: \`agent_definition\`
- Each \`.md\` file is one agent
- File name (without .md) becomes the config name

### Skills
- Path: \`{config_dir}/skills/{skill-name}/SKILL.md\`
- Type: \`skill\`
- Directory name becomes the skill name
- SKILL.md is the main content
- All other files in the directory are companion files

For each file found, read its content.

## Step 4: Preview and Confirm

Before syncing, show the user what will be synced:

\`\`\`
Found configurations to sync:
- Slash Commands: [list names]
- Agent Definitions: [list names]
- Skills: [list names with companion file counts]
\`\`\`

Use AskUserQuestion to confirm:
- "Proceed with sync?"
- Options: "Yes, sync all" / "No, cancel"

## Step 5: Execute Sync (Dry Run First)

Call the \`sync_local_configs\` tool with \`dry_run: true\` first:

\`\`\`json
{
  "configs": [
    // Array of configs from Step 3
  ],
  "dry_run": true
}
\`\`\`

Review the dry run results:
- **Would create**: New configs not on server
- **Would update**: Configs that differ from server
- **Unchanged**: Configs already in sync
- **Deletion candidates**: Configs on server but not locally

## Step 6: Handle Existing Configs (Skip, Don't Overwrite)

IMPORTANT: The user requested NO OVERWRITES for existing configs.

From the dry run results:
- **Would create**: These will be synced
- **Would update**: SKIP these and log them
- **Unchanged**: Already in sync, no action needed
- **Deletion candidates**: Present to user (Step 7)

If there are configs that would be updated, inform the user:
\`\`\`
Skipped (already exists on server):
- [config name] (type)
- [config name] (type)
\`\`\`

## Step 7: Handle Deletion Candidates

If there are remote-only configs (deletion candidates):

Use AskUserQuestion:
- "Found {N} configs on server that don't exist locally. What would you like to do?"
- Options:
  - "Keep all (don't delete)"
  - "Review list and decide"

If user chooses "Review list":
- Show each deletion candidate
- Ask "Delete this config?" for each
- Collect user decisions

NEVER auto-delete. User must explicitly confirm each deletion.

## Step 8: Execute Final Sync

Call \`sync_local_configs\` without dry_run, but ONLY for configs that should be created (not updated):

Filter the configs array to only include those that:
1. Don't exist on server (from dry run "would create" list)

\`\`\`json
{
  "configs": [
    // Only NEW configs, not updates
  ],
  "dry_run": false
}
\`\`\`

## Step 9: Execute Deletions (if confirmed)

If user confirmed any deletions in Step 7, call \`delete_configs_batch\`:

\`\`\`json
{
  "configIds": ["id1", "id2"],
  "confirm": true
}
\`\`\`

## Step 10: Summary Report

Provide a final summary:

\`\`\`
Sync Complete!

Created: {N} configs
Skipped (already exists): {N} configs
  - [list skipped config names]
Unchanged: {N} configs
Deleted: {N} configs (or "None - user chose to keep all")

Source: {global or project: project-name}
\`\`\`

## Error Handling

If any step fails:
- Report the specific error
- Use AskUserQuestion to ask if user wants to:
  - "Retry the failed operation"
  - "Skip and continue"
  - "Abort sync"
`
        }
      }]
    };
  }
);
```

### 2. Update CLAUDE.md for MCP

**File:** `src/mcp/CLAUDE.md`

Add documentation for the new prompt under Admin Endpoint section:

```markdown
### Prompts

- `migrate_config_format`: Migrate a config to a different agent format
- `batch_convert`: Bulk convert configs to a specific format
- `sync_config_versions`: Regenerate cached conversions
- `sync_from_local`: **NEW** - Scan and sync local Claude Code configs to server
```

## Frontend changes required

None. This is a backend MCP prompt only.

## Validation

### Test Workflow

1. **Start local dev server**
   ```bash
   npm run dev
   ```

2. **Configure Claude Code MCP**
   Add to `.claude/settings.json`:
   ```json
   {
     "mcpServers": {
       "agent-config-adapter-admin": {
         "type": "http",
         "url": "http://localhost:8787/mcp/admin",
         "headers": {
           "Authorization": "Bearer YOUR_ADMIN_TOKEN"
         }
       }
     }
   }
   ```

3. **Test the prompt via MCP**
   ```bash
   # MCP call to invoke the prompt
   {
     "jsonrpc": "2.0",
     "method": "prompts/get",
     "params": {
       "name": "sync_from_local",
       "arguments": {
         "workingDirectory": "/home/user/.claude"
       }
     },
     "id": 1
   }
   ```

4. **Expected behavior**
   - Prompt returns workflow instructions
   - Claude Code executes the workflow
   - Scans local directories
   - Calls `sync_local_configs` tool
   - Reports skipped configs (no overwrites)
   - Asks user about deletions

### Edge Cases to Verify

1. **No config directory** → Graceful exit with message
2. **Empty directories** → Reports "No configs found"
3. **All configs already exist** → All skipped, nothing created
4. **Mixed scenario** → Some created, some skipped
5. **Deletion candidates** → User prompted for each
6. **Skill with companions** → Companion files included in sync
