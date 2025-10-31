# Claude Code Web Configuration Sync

Automatically sync Claude Code configurations from a remote ZIP file when using Claude Code Web.

## What This Does

When you start a Claude Code session in **Claude Code Web** (claude.ai/code), this hook will:

1. ✅ Check if you're running in the Web environment (skips on Desktop)
2. ✅ Download a ZIP file from a configured URL
3. ✅ Extract configurations and copy them to `~/.claude/`
4. ✅ Report success or errors without blocking your session

**Important:** This hook only runs in **Claude Code Web**, not in Claude Code Desktop.

## Quick Start

### Step 1: Create Configuration File

Create `.claude/additionalSettings.json` in your project:

```json
{
  "ConfigZipLocation": "https://your-domain.com/path/to/configs.zip",
  "rootPath": "configs/.claude"
}
```

**Fields:**
- `ConfigZipLocation` (required): URL to download the ZIP file
- `rootPath` (optional): Specific directory within ZIP to extract (omit to extract entire ZIP)

### Step 2: Prepare Your Configuration ZIP

Your ZIP file should contain Claude Code configuration files like:

```
configs.zip
├── commands/
│   ├── review.md
│   └── deploy.md
├── agents/
│   └── code-reviewer.md
└── settings.json
```

If you specify `rootPath: "configs/.claude"`, the structure would be:

```
configs.zip
└── configs/
    └── .claude/
        ├── commands/
        ├── agents/
        └── settings.json
```

### Step 3: Test It

The hook is already configured in `.claude/settings.json`. Just:

1. Commit and push your project to GitHub
2. Open it in Claude Code Web (claude.ai/code)
3. Start a new session
4. Check for the success message in the output

## Configuration Options

### ConfigZipLocation

**Required:** URL to download the configuration ZIP file.

**Supported protocols:**
- `https://` (recommended for security)
- `http://` (use only for testing)

**Examples:**
```json
{
  "ConfigZipLocation": "https://github.com/org/repo/releases/download/v1.0.0/configs.zip"
}
```

```json
{
  "ConfigZipLocation": "https://storage.example.com/team-configs/claude-configs.zip"
}
```

### rootPath

**Optional:** Path within the ZIP file to extract.

**When to use:**
- Your ZIP contains multiple projects/configs
- You want to organize configs in a subdirectory structure
- You're sharing a monorepo of configurations

**When to omit:**
- ZIP file root contains the configs directly
- Simpler structure

**Examples:**

Extract entire ZIP:
```json
{
  "ConfigZipLocation": "https://example.com/configs.zip"
}
```

Extract only a specific subdirectory:
```json
{
  "ConfigZipLocation": "https://example.com/all-configs.zip",
  "rootPath": "team-a/claude"
}
```

## Behavior

### What Happens on Success

```
Configuration sync complete: 12 file(s) synced from https://example.com/configs.zip
  Source path in ZIP: configs/.claude
  Target directory: /home/user/.claude
```

Files are copied to `~/.claude/`. Existing files are NOT overwritten (your local changes are preserved).

### What Happens on Error

Errors are reported but **do not block** your session:

```
ERROR: Failed to download configuration ZIP from: https://invalid-url.com/configs.zip
ERROR: Please check the URL and your network connection
```

Your session continues normally, just without the synced configurations.

### When Hook Doesn't Run

The hook silently skips in these cases:
- ✅ Running in Claude Code Desktop (not Web)
- ✅ No `.claude/additionalSettings.json` file exists
- ✅ `ConfigZipLocation` is empty or not configured

## Testing

### Test Locally (Desktop Environment)

The hook should exit immediately without doing anything:

```bash
# Set up test environment
export CLAUDE_CODE_REMOTE=""  # Desktop environment
export CLAUDE_PROJECT_DIR="$(pwd)"

# Run the hook
./.claude/hooks/session-start.sh

# Expected: Script exits silently with code 0
echo $?  # Should print: 0
```

### Test with Simulated Web Environment

```bash
# Simulate Claude Code Web
export CLAUDE_CODE_REMOTE="true"
export CLAUDE_PROJECT_DIR="$(pwd)"

# Create test configuration
cat > .claude/additionalSettings.json << 'EOF'
{
  "ConfigZipLocation": "https://github.com/user/repo/releases/download/v1.0/configs.zip",
  "rootPath": "configs/.claude"
}
EOF

# Run the hook
./.claude/hooks/session-start.sh

# Check the exit code
echo $?  # 0 = success, 1 = error (but non-blocking)

# Check what was downloaded
ls -la ~/.claude/
```

### Test Edge Cases

**No configuration file:**
```bash
rm .claude/additionalSettings.json
export CLAUDE_CODE_REMOTE="true"
./.claude/hooks/session-start.sh
# Expected: Silent exit, no error
```

**Empty ConfigZipLocation:**
```bash
cat > .claude/additionalSettings.json << 'EOF'
{
  "ConfigZipLocation": ""
}
EOF
export CLAUDE_CODE_REMOTE="true"
./.claude/hooks/session-start.sh
# Expected: "Skipping configuration sync" message
```

**Invalid URL:**
```bash
cat > .claude/additionalSettings.json << 'EOF'
{
  "ConfigZipLocation": "https://invalid-domain-xyz.com/file.zip"
}
EOF
export CLAUDE_CODE_REMOTE="true"
./.claude/hooks/session-start.sh
# Expected: Error message, exit code 1, but non-blocking
```

## Troubleshooting

### "Missing required dependencies: jq curl unzip"

**Solution:** Install the missing tools:

```bash
# Ubuntu/Debian
apt-get install jq curl unzip

# macOS
brew install jq curl unzip

# Alpine Linux
apk add jq curl unzip
```

These dependencies are pre-installed in Claude Code Web, so this error typically only occurs during local testing.

### "Failed to download configuration ZIP"

**Possible causes:**
1. Invalid or inaccessible URL
2. Network connectivity issues
3. Authentication required (not currently supported)

**Solutions:**
- Verify the URL is publicly accessible
- Test the URL in a browser: `curl -I <URL>`
- Check your network connection
- Ensure the ZIP file is publicly readable (no auth required)

### "Downloaded file is not a valid ZIP archive"

**Possible causes:**
1. URL points to an HTML page (404/error page)
2. File is corrupted
3. Wrong file type

**Solutions:**
- Download the file manually to verify it's a valid ZIP: `curl -o test.zip <URL> && unzip -t test.zip`
- Check the URL doesn't redirect to an error page
- Verify the file is actually a ZIP archive

### "Specified rootPath not found in ZIP file"

**Possible causes:**
1. Typo in rootPath
2. Path doesn't exist in ZIP
3. Case sensitivity mismatch

**Solutions:**
- Download and inspect the ZIP manually
- Check available paths: `unzip -l configs.zip`
- Verify the exact path including case

### "Failed to copy configurations"

**Possible causes:**
1. Permission issues with `~/.claude/` directory
2. Disk space issues

**Solutions:**
- Ensure `~/.claude/` is writable: `mkdir -p ~/.claude && ls -la ~/.claude/`
- Check disk space: `df -h ~`

### Hook doesn't run at all

**Checklist:**
1. ✅ Are you in Claude Code Web? (Check for "Claude Code Web" in the UI)
2. ✅ Is `.claude/settings.json` present with the hook configuration?
3. ✅ Is `.claude/hooks/session-start.sh` executable? (`chmod +x .claude/hooks/session-start.sh`)
4. ✅ Are you starting a new session (not resuming)?

## Security Considerations

### Path Traversal Protection

The hook validates `rootPath` to prevent malicious paths:

```json
{
  "rootPath": "../etc/passwd"  // ❌ REJECTED - contains ".."
}
```

```json
{
  "rootPath": "/etc/passwd"  // ❌ REJECTED - absolute path
}
```

### HTTPS Recommended

Always use HTTPS URLs for `ConfigZipLocation`:

```json
{
  "ConfigZipLocation": "https://example.com/configs.zip"  // ✅ Secure
}
```

```json
{
  "ConfigZipLocation": "http://example.com/configs.zip"  // ⚠️ Insecure, only for testing
}
```

### File Overwrites

The hook uses `cp -n` flag, which:
- ✅ Does NOT overwrite existing files
- ✅ Preserves your local modifications
- ✅ Only copies new files

If you want to force-update, manually delete files from `~/.claude/` first.

## Advanced Usage

### Using GitHub Releases

Host your configuration ZIP on GitHub Releases:

```json
{
  "ConfigZipLocation": "https://github.com/your-org/claude-configs/releases/download/v1.2.0/configs.zip"
}
```

**Benefits:**
- Versioned configurations
- Easy rollback to previous versions
- Automatic changelog via GitHub

### Monorepo Structure

Share configurations for multiple teams:

```
all-configs.zip
├── team-frontend/
│   └── .claude/
│       └── commands/
├── team-backend/
│   └── .claude/
│       └── commands/
└── team-devops/
    └── .claude/
        └── commands/
```

Each team's project uses a different `rootPath`:

**Frontend team:**
```json
{
  "ConfigZipLocation": "https://cdn.company.com/claude-configs.zip",
  "rootPath": "team-frontend/.claude"
}
```

**Backend team:**
```json
{
  "ConfigZipLocation": "https://cdn.company.com/claude-configs.zip",
  "rootPath": "team-backend/.claude"
}
```

### Private Configurations (Future Enhancement)

**Current limitation:** The hook doesn't support authentication.

**Workarounds:**
1. Use signed URLs with expiration (AWS S3, Google Cloud Storage)
2. Use a publicly accessible CDN for non-sensitive configs
3. Commit configs directly to repository (no sync needed)

## Files Reference

| File | Purpose | Required |
|------|---------|----------|
| `.claude/hooks/session-start.sh` | Main hook script | Yes |
| `.claude/settings.json` | Hook configuration | Yes |
| `.claude/additionalSettings.json` | User configuration (URL, path) | No* |
| `.claude/additionalSettings.example.json` | Example configuration | No (documentation) |

*Required only if you want to use the sync feature.

## Hook Configuration Reference

The hook is configured in `.claude/settings.json`:

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

**Configuration fields:**
- `matcher: "startup"` - Run only on session startup (not resume, clear, compact)
- `timeout: 120` - 120-second timeout (sufficient for download + extraction)
- Uses `$CLAUDE_PROJECT_DIR` for portability across environments

## FAQ

### Q: Does this work in Claude Code Desktop?

**A:** No, the hook only runs in Claude Code Web. Desktop users typically have direct access to their file system and don't need this feature.

### Q: Will this overwrite my local configurations?

**A:** No, existing files in `~/.claude/` are preserved. Only new files are copied.

### Q: Can I use this with a private GitHub repository?

**A:** Currently no. The hook doesn't support authentication. Use GitHub Releases on a public repository or a signed URL.

### Q: How often does the sync run?

**A:** Only on session startup in Claude Code Web. It doesn't run on resume, clear, or compact operations.

### Q: What if the download fails?

**A:** The session continues normally. An error message is shown, but it doesn't block your work.

### Q: Can I see what files were synced?

**A:** Yes, the success message includes the file count and paths. You can also check `~/.claude/` manually.

### Q: How do I update configurations?

**A:** Update the ZIP file at the URL, then start a new session. The hook downloads the latest version on each startup.

## Support

For issues or questions:

1. Check the [Troubleshooting](#troubleshooting) section
2. Review the [Testing](#testing) instructions to verify your setup
3. Check Claude Code Web documentation: https://docs.anthropic.com/claude-code/claude-code-on-the-web
4. File an issue on this repository

## Related Documentation

- [Claude Code Hooks Reference](https://docs.anthropic.com/en/docs/claude-code/hooks)
- [Claude Code on the Web](https://docs.anthropic.com/en/docs/claude-code/claude-code-on-the-web)
- [Claude Code Hooks Guide](https://docs.anthropic.com/en/docs/claude-code/hooks-guide)
