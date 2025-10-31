# Claude Code Web Configuration Sync Hook

## Purpose

Implement a SessionStart hook that automatically downloads and syncs Claude Code configurations from a ZIP file when running in Claude Code Web environment.

## Original Ask

Find online about claude code hooks and claude code web. (Prefer official Anthropic Sources)

And plan for following.

We need to have a claude startSession hook that does following.

If running from claude code web. It should download the zip from localtion mentioned in .claude/additionalSettings.json, key ConfigZipLocation and another key is rootPath. Extracts it and copies the children of rootPath to ~/.claude

If there is no configZipLocation, stop right there and notify user but don't block them.

If there is no rootPath, extract entire zip.

Once the extraction is done, return successfully.

None of the operations should be blocking, but any errors must be reported properly

## Complexity and the reason behind it

**Complexity Score: 2/5**

**Reasoning:**
- **Straightforward bash scripting** - The core logic is simple: detect environment, read JSON, download, extract, copy
- **Well-documented API** - Official Anthropic documentation provides comprehensive guidance on hook implementation
- **Clear requirements** - All edge cases are well-defined in the requirements
- **Non-blocking by design** - SessionStart hooks cannot block by nature, simplifying error handling
- **No infrastructure changes** - Pure configuration and scripting, no code changes required
- **Testable locally** - Can easily test with mock environments and files

**What keeps it from being a 1:**
- JSON parsing in bash (requires jq)
- Multiple error paths to handle gracefully
- HTTP download handling with proper error checking
- File system operations across different directories

## Architectural changes required

**None required.** This is purely a configuration addition that lives outside the application codebase.

**Location of changes:**
- `.claude/hooks/session-start.sh` - New bash script for the hook logic
- `.claude/settings.json` - Hook configuration (project-level)
- `.claude/additionalSettings.json` - Configuration file format (documentation)

## Backend changes required

**None required.** This feature operates entirely at the Claude Code configuration layer and does not interact with the agent-config-adapter application backend.

## Frontend changes required

**None required.** No UI changes needed.

## Implementation Plan

### 1. Research Documentation (Completed)

From official Anthropic sources (docs.anthropic.com), key findings:

**SessionStart Hook Behavior:**
- Runs when Claude Code starts, resumes, or after `/clear` or compact operations
- **Cannot block** - Exit code 2 has no effect
- Exit code 0: Success, stdout added to Claude's context
- Exit code 1 (or any non-0, non-2): Non-blocking error, stderr shown to user
- Access to `CLAUDE_PROJECT_DIR` and `CLAUDE_ENV_FILE` environment variables

**Environment Detection:**
- `CLAUDE_CODE_REMOTE="true"` - Running in Claude Code Web
- `CLAUDE_CODE_REMOTE` empty/unset - Running in Claude Code Desktop

**Best Practices:**
- Always quote variables: `"$VAR"` not `$VAR`
- Use absolute paths
- Set `-euo pipefail` for safety
- Keep execution fast (60s default timeout)
- Validate and sanitize inputs

### 2. Configuration Structure

**File: `.claude/additionalSettings.json`** (User-created, optional)
```json
{
  "ConfigZipLocation": "https://example.com/configs.zip",
  "rootPath": "configs/.claude"
}
```

**Fields:**
- `ConfigZipLocation` (optional): URL to download ZIP file containing Claude Code configurations
- `rootPath` (optional): Path within ZIP to extract (defaults to entire ZIP if omitted)

### 3. Hook Script Implementation

**File: `.claude/hooks/session-start.sh`**

**Logic Flow:**
1. **Environment Check**: Exit early if not running in Claude Code Web (`CLAUDE_CODE_REMOTE != "true"`)
2. **Settings File Check**: Check if `.claude/additionalSettings.json` exists
   - If not: Exit 0 silently (no error, just skip)
3. **Parse Configuration**: Use `jq` to extract `ConfigZipLocation` and `rootPath`
   - If `ConfigZipLocation` is empty/null: Report to user via stdout, exit 0 (non-blocking)
4. **Download ZIP**: Use `curl` to download from `ConfigZipLocation`
   - On failure: Report error to stderr, exit 1 (non-blocking error)
5. **Extract ZIP**: Extract to temporary directory
   - If `rootPath` specified: Extract only that subdirectory
   - If `rootPath` not specified: Extract entire ZIP
   - On failure: Report error to stderr, exit 1
6. **Copy Files**: Copy extracted files to `~/.claude/`
   - Use `cp -r` to copy children of extracted directory
   - Preserve existing files (don't overwrite by default, or use `-n` flag)
   - On failure: Report error to stderr, exit 1
7. **Cleanup**: Remove temporary files
8. **Success**: Report success to stdout (added to Claude's context), exit 0

**Error Handling Strategy:**
- All errors use exit code 1 (non-blocking)
- Error messages written to stderr (shown to user)
- Success messages written to stdout (added to context)
- Never exit with code 2 (would be ignored anyway for SessionStart)

**Dependencies:**
- `jq` - JSON parsing
- `curl` - HTTP downloads
- `unzip` - ZIP extraction
- Standard Unix utilities: `mkdir`, `cp`, `rm`, `mktemp`

### 4. Hook Configuration

**File: `.claude/settings.json`**
```json
{
  "hooks": {
    "SessionStart": [
      {
        "matcher": "startup",
        "hooks": [
          {
            "type": "command",
            "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/session-start.sh",
            "timeout": 120
          }
        ]
      }
    ]
  }
}
```

**Configuration Notes:**
- Matches only `startup` source (not `resume`, `clear`, or `compact`)
- 120-second timeout (allows time for download + extraction)
- Uses absolute path via `$CLAUDE_PROJECT_DIR`

### 5. Script Safety Features

**Bash Safety:**
```bash
#!/bin/bash
set -euo pipefail  # Exit on error, undefined vars, pipe failures
```

**Input Validation:**
- Check if URL is well-formed (basic validation)
- Sanitize `rootPath` to prevent path traversal (`..` checks)
- Validate ZIP file integrity before extraction

**Secure Operations:**
- Download to temporary directory with restricted permissions
- Use `mktemp -d` for secure temp directory creation
- Clean up temp files on exit (trap EXIT)

### 6. User Experience

**Silent Success:**
When configuration sync completes successfully, minimal output:
```
Configuration sync complete: Downloaded and extracted configs from ConfigZipLocation
```

**Graceful Degradation:**
When additionalSettings.json doesn't exist or has no ConfigZipLocation:
```
Skipping configuration sync (no ConfigZipLocation configured)
```

**Clear Errors:**
When errors occur:
```
Error: Failed to download configuration ZIP from https://example.com/configs.zip
Error: Failed to extract ZIP file (invalid or corrupted)
Error: Failed to copy configurations to ~/.claude/ (permission denied)
```

### 7. Documentation

Create documentation explaining:
- How to set up additionalSettings.json
- Expected ZIP file structure
- How rootPath works
- Testing the hook locally
- Troubleshooting common issues

## Validation

### Testing Strategy

**1. Local Testing (Desktop Environment)**

Test that hook exits early when not in Web environment:

```bash
# Set up test environment
export CLAUDE_CODE_REMOTE=""
export CLAUDE_PROJECT_DIR="$(pwd)"

# Run hook directly
./.claude/hooks/session-start.sh

# Expected: Script exits silently (exit code 0)
# Expected output: Nothing (early exit)
```

**2. Web Environment Simulation**

Test full flow with simulated Web environment:

```bash
# Simulate Claude Code Web
export CLAUDE_CODE_REMOTE="true"
export CLAUDE_PROJECT_DIR="$(pwd)"

# Create test additionalSettings.json
cat > .claude/additionalSettings.json << 'EOF'
{
  "ConfigZipLocation": "https://example.com/test-configs.zip",
  "rootPath": "configs/.claude"
}
EOF

# Run hook
./.claude/hooks/session-start.sh

# Expected: Download attempt, extraction, copy to ~/.claude
# Check exit code: echo $?  (should be 0 or 1)
```

**3. Edge Case Testing**

Test each edge case:

a) **No additionalSettings.json:**
```bash
rm .claude/additionalSettings.json
# Expected: Silent exit (exit 0), no error
```

b) **Empty ConfigZipLocation:**
```bash
cat > .claude/additionalSettings.json << 'EOF'
{
  "ConfigZipLocation": "",
  "rootPath": ""
}
EOF
# Expected: "Skipping configuration sync" message, exit 0
```

c) **No rootPath (extract entire ZIP):**
```bash
cat > .claude/additionalSettings.json << 'EOF'
{
  "ConfigZipLocation": "https://example.com/test-configs.zip"
}
EOF
# Expected: Entire ZIP extracted and copied
```

d) **Invalid URL:**
```bash
cat > .claude/additionalSettings.json << 'EOF'
{
  "ConfigZipLocation": "https://invalid-domain-that-does-not-exist.com/file.zip"
}
EOF
# Expected: Error message on stderr, exit 1, session continues
```

e) **Corrupted ZIP:**
```bash
# Create a fake ZIP file
echo "not a zip" > /tmp/fake.zip
# Expected: Error message about invalid ZIP, exit 1
```

**4. Integration Testing**

Test in actual Claude Code environments:

**Claude Code Desktop:**
1. Add hook configuration to `.claude/settings.json`
2. Start new session: `claude --project .`
3. Verify hook doesn't run (not in Web environment)
4. Check no errors in output

**Claude Code Web:**
1. Commit hook to repository
2. Open project in claude.ai/code
3. Start new session
4. Verify configuration downloads and extracts
5. Check Claude's context contains success message
6. Verify files appear in `~/.claude/`

**5. Verification Commands**

After hook runs, verify:

```bash
# Check if files were copied
ls -la ~/.claude/

# Check hook execution in debug mode
claude --debug --project .

# Verify hook configuration
# (In Claude Code session, run: /hooks)
```

### Success Criteria

- ✅ Hook runs only in Claude Code Web environment
- ✅ Hook exits silently when no additionalSettings.json exists
- ✅ Hook notifies user (non-blocking) when ConfigZipLocation is empty
- ✅ Hook successfully downloads ZIP from valid URL
- ✅ Hook extracts entire ZIP when no rootPath specified
- ✅ Hook extracts only rootPath subdirectory when specified
- ✅ Hook copies files to ~/.claude/ successfully
- ✅ Hook reports all errors to stderr with clear messages
- ✅ Hook never blocks session startup (all errors are non-blocking)
- ✅ Hook cleans up temporary files
- ✅ Success message is added to Claude's context
- ✅ Works in actual Claude Code Web environment
- ✅ Doesn't interfere with Claude Code Desktop environment

## Implementation Files

### Files to Create:

1. **`.claude/hooks/session-start.sh`** (executable)
   - Main hook script with all logic
   - ~150-200 lines of bash

2. **`.claude/settings.json`** or **`.claude/settings.local.json`** (optional)
   - Hook configuration
   - ~15 lines JSON

3. **`.claude/additionalSettings.example.json`**
   - Example configuration file
   - ~10 lines JSON with comments

4. **`.claude/hooks/README.md`**
   - Documentation for the hook
   - Usage instructions, troubleshooting, examples
   - ~100-150 lines markdown

### Files to Update:

1. **Main `README.md`** or **`CLAUDE.md`**
   - Add section about Claude Code Web configuration sync
   - Link to hooks README

## Timeline Estimate

- Script implementation: 1-2 hours
- Testing (local): 30 minutes
- Testing (Claude Code Web): 30 minutes
- Documentation: 30 minutes
- **Total: 2-3 hours**

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| ZIP download fails (network) | Medium | Low | Non-blocking error, clear message to user |
| Invalid ZIP file | Low | Low | Validate ZIP before extraction, error message |
| Permission denied (~/.claude) | Low | Medium | Check permissions, suggest `mkdir -p ~/.claude` |
| jq not installed | Medium | Medium | Check for jq at start, provide installation instructions |
| Slow download (timeout) | Medium | Low | 120s timeout, show progress message |
| rootPath doesn't exist in ZIP | Low | Low | Check path exists before extraction, error message |
| Malicious ZIP (zip bomb) | Low | High | Use `unzip -q` with size limits, validate before extraction |

## Security Considerations

1. **Path Traversal**: Validate `rootPath` doesn't contain `..` to prevent escaping directories
2. **URL Validation**: Basic validation of `ConfigZipLocation` (https only recommended)
3. **ZIP Validation**: Check ZIP integrity before extraction
4. **Temp Directory Security**: Use `mktemp -d` with restricted permissions (700)
5. **No Credential Exposure**: Never log URLs with credentials, sanitize output
6. **File Overwrites**: Use `cp -n` to avoid overwriting existing configs (or prompt user in docs)

## Future Enhancements (Out of Scope)

- Support for authentication headers in download (API tokens)
- Support for multiple ZIP sources
- Automatic version checking (skip download if already synced)
- Support for git repositories in addition to ZIP files
- Encrypted ZIP support with password from environment
- Incremental sync (only changed files)
- Bidirectional sync (upload local changes back)

## Notes

- This feature is specifically for **Claude Code Web** - Desktop users typically have direct file system access and don't need this
- Hook is designed to be **non-intrusive** - If configuration doesn't exist or fails, session continues normally
- The `rootPath` feature allows users to organize their configs in a monorepo structure (e.g., `team-configs/claude/.claude/`)
- Success messages are added to Claude's context, helping Claude understand the available configurations

## Dependencies

**System Requirements:**
- `bash` 4.0+
- `jq` (JSON parsing)
- `curl` (HTTP downloads)
- `unzip` (ZIP extraction)
- Standard Unix utilities: `mkdir`, `cp`, `rm`, `mktemp`, `cat`

**Installation Check:**
```bash
# Check dependencies
command -v jq >/dev/null 2>&1 || echo "jq not found"
command -v curl >/dev/null 2>&1 || echo "curl not found"
command -v unzip >/dev/null 2>&1 || echo "unzip not found"
```

## References

**Official Documentation:**
- [Claude Code Hooks Reference](https://docs.anthropic.com/en/docs/claude-code/hooks)
- [Claude Code Hooks Guide](https://docs.anthropic.com/en/docs/claude-code/hooks-guide)
- [Claude Code on the Web](https://docs.anthropic.com/en/docs/claude-code/claude-code-on-the-web)
- [Claude Code Web Announcement](https://www.anthropic.com/news/claude-code-on-the-web)

**Key Insights from Research:**
- SessionStart hooks cannot block (exit code 2 ignored)
- stdout from SessionStart is added to Claude's context
- `CLAUDE_CODE_REMOTE="true"` detects Web environment
- `CLAUDE_PROJECT_DIR` provides project root path
- Default timeout is 60s, configurable up to 600s
- All hooks run in parallel (deduplication applied)
