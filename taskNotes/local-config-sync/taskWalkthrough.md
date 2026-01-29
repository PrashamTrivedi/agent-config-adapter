# Task Walkthrough: Local Config Sync

## Overview

This feature adds the ability to synchronize local Claude Code configuration files (skills, commands, agents) to the Agent Config Adapter service via MCP tools.

## Verification Steps for Product Owners

### Step 1: Verify MCP Tools Are Available

1. Access the MCP admin endpoint info (authenticated):
   ```
   GET /mcp/info
   ```

2. Confirm the following tools are listed:
   - `sync_local_configs`
   - `delete_configs_batch`

### Step 2: Test Dry Run Sync

1. Make an MCP call to `/mcp/admin` with authentication:
   ```json
   {
     "jsonrpc": "2.0",
     "method": "tools/call",
     "params": {
       "name": "sync_local_configs",
       "arguments": {
         "configs": [
           {
             "name": "test-command",
             "type": "slash_command",
             "content": "# Test Command\n\nThis is a test."
           }
         ],
         "dry_run": true
       }
     },
     "id": 1
   }
   ```

2. Verify the response shows:
   - `"success": true`
   - Summary with counts
   - `created[0].id === "dry-run"` (indicating no actual changes)

### Step 3: Test Actual Sync

1. Run the same call without `dry_run`:
   ```json
   {
     "jsonrpc": "2.0",
     "method": "tools/call",
     "params": {
       "name": "sync_local_configs",
       "arguments": {
         "configs": [
           {
             "name": "test-command",
             "type": "slash_command",
             "content": "# Test Command\n\nThis is a test."
           }
         ]
       }
     },
     "id": 2
   }
   ```

2. Verify:
   - Response shows `created: 1`
   - The config ID is a real nanoid (not "dry-run")

3. Confirm the config exists by calling `get_config` with the returned ID.

### Step 4: Test Update Behavior

1. Run sync again with modified content:
   ```json
   {
     "configs": [
       {
         "name": "test-command",
         "type": "slash_command",
         "content": "# Test Command v2\n\nUpdated content."
       }
     ]
   }
   ```

2. Verify:
   - Response shows `updated: 1` (not created)
   - Same ID is retained

### Step 5: Test Deletion Candidates

1. Create a config via the web UI or `create_config` tool.

2. Run sync with an empty configs array:
   ```json
   {
     "configs": []
   }
   ```

3. Verify:
   - The manually created config appears in `deletionCandidates`
   - It was NOT actually deleted (never auto-delete)

### Step 6: Test Batch Delete

1. Copy the ID from deletion candidates.

2. Call `delete_configs_batch`:
   ```json
   {
     "jsonrpc": "2.0",
     "method": "tools/call",
     "params": {
       "name": "delete_configs_batch",
       "arguments": {
         "configIds": ["<paste-id-here>"],
         "confirm": true
       }
     },
     "id": 3
   }
   ```

3. Verify:
   - Response shows `deleted: ["<id>"]`
   - Config no longer exists

### Step 7: Test Skill with Companion Files

1. Sync a skill with companion files:
   ```json
   {
     "configs": [
       {
         "name": "my-skill",
         "type": "skill",
         "content": "# My Skill\n\nSkill instructions.",
         "companionFiles": [
           {
             "path": "FORMS.md",
             "content": "# Forms\n\nForm definitions.",
             "mimeType": "text/markdown"
           }
         ]
       }
     ]
   }
   ```

2. Verify:
   - Skill is created
   - Companion file is stored in R2

## Edge Cases Verified

- ✅ Empty configs array returns empty result
- ✅ Same name, different types are treated independently
- ✅ Content whitespace normalization (trailing spaces ignored)
- ✅ Binary files can be base64 encoded for companion files
- ✅ `confirm: false` on delete returns cancellation message

## Authentication Notes

The tool requires authentication via one of:
- Session cookie (browser)
- JWT access token
- API key (`aca_` prefix)
- Admin token (legacy)

Only configs owned by the authenticated user are affected.
