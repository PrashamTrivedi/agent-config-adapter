# Claude Code Web: Setup Scripts Guide

How to automatically install dependencies and configure your environment when Claude Code starts a new web session.

## Two Mechanisms

Claude Code provides two hook-based mechanisms for session initialization:

| Hook | When it runs | Skipped on resume | Use case |
|------|-------------|-------------------|----------|
| **Setup** | Only with `--init` / `--init-only` / `--maintenance` flags | Yes | One-time onboarding, DB migrations, heavy installs |
| **SessionStart** | Every session start, resume, clear, compact | No (use `"matcher": "startup"` to scope) | Env vars, context loading, quick dependency checks |

For **Claude Code Web**, the recommended approach is **SessionStart hooks** — they run automatically without requiring CLI flags.

## Quick Start: SessionStart Hook

### 1. Create the install script

```bash
# scripts/install_pkgs.sh
#!/bin/bash

# Only run in remote (web) environments
if [ "$CLAUDE_CODE_REMOTE" != "true" ]; then
  exit 0
fi

npm install
# Add other dependency commands as needed:
# pip install -r requirements.txt
# bundle install

exit 0
```

Make it executable:

```bash
chmod +x scripts/install_pkgs.sh
```

### 2. Configure the hook

Add to `.claude/settings.json` (commit to repo for team sharing):

```json
{
  "hooks": {
    "SessionStart": [
      {
        "matcher": "startup",
        "hooks": [
          {
            "type": "command",
            "command": "\"$CLAUDE_PROJECT_DIR\"/scripts/install_pkgs.sh"
          }
        ]
      }
    ]
  }
}
```

### 3. Commit both files

```bash
git add scripts/install_pkgs.sh .claude/settings.json
git commit -m "Add Claude Code Web session startup hook"
```

That's it. Next time a new web session starts, dependencies install automatically before Claude begins.

## Setting Environment Variables

Use `CLAUDE_ENV_FILE` to persist environment variables across all Bash commands in the session:

```bash
# scripts/setup_env.sh
#!/bin/bash

if [ -n "$CLAUDE_ENV_FILE" ]; then
  echo 'export NODE_ENV=development' >> "$CLAUDE_ENV_FILE"
  echo 'export DATABASE_URL=postgresql://localhost:5432/mydb' >> "$CLAUDE_ENV_FILE"
  echo 'export PATH="$PATH:./node_modules/.bin"' >> "$CLAUDE_ENV_FILE"
fi

exit 0
```

Always use `>>` (append) to avoid overwriting variables from other hooks.

### Loading Tool Environments (nvm, pyenv, etc.)

```bash
#!/bin/bash

ENV_BEFORE=$(export -p | sort)

# Activate your tool
source ~/.nvm/nvm.sh
nvm use 20

# Capture the diff
if [ -n "$CLAUDE_ENV_FILE" ]; then
  ENV_AFTER=$(export -p | sort)
  comm -13 <(echo "$ENV_BEFORE") <(echo "$ENV_AFTER") >> "$CLAUDE_ENV_FILE"
fi

exit 0
```

## Setup Hooks (CLI-triggered)

For heavier one-time setup (team onboarding, migrations), use Setup hooks with explicit CLI flags:

### Configuration

```json
{
  "hooks": {
    "Setup": [
      {
        "matcher": "init",
        "hooks": [
          {
            "type": "command",
            "command": ".claude/hooks/setup.sh",
            "timeout": 120
          }
        ]
      }
    ]
  }
}
```

### Triggering

```bash
# Run setup, then start interactive session
claude --init

# Run setup only (no session — good for CI)
claude --init-only

# Run maintenance tasks
claude --maintenance
```

### Example setup script

```bash
#!/bin/bash
# .claude/hooks/setup.sh

echo "Installing dependencies..."
npm install
pip install -r requirements.txt

echo "Running migrations..."
npx prisma migrate deploy

echo "Setup complete."
exit 0
```

## Returning Context to Claude

Hook stdout is injected into Claude's conversation as context:

```bash
#!/bin/bash
# Simple: plain text becomes context
echo "## Project Status"
echo "Branch: $(git branch --show-current)"
echo "Node: $(node --version)"
echo "Last commit: $(git log --oneline -1)"
exit 0
```

Or structured JSON:

```bash
#!/bin/bash
cat <<'EOF'
{
  "hookSpecificOutput": {
    "hookEventName": "SessionStart",
    "additionalContext": "Dependencies installed. Dev server available at http://localhost:3000"
  }
}
EOF
exit 0
```

## Hook Input (stdin)

All hooks receive JSON on stdin with these fields:

| Field | Description |
|-------|-------------|
| `session_id` | Current session identifier |
| `transcript_path` | Path to conversation JSON |
| `cwd` | Current working directory |
| `permission_mode` | Current permission mode |
| `hook_event_name` | Event that fired (e.g., `SessionStart`) |

SessionStart also provides:

| Field | Description |
|-------|-------------|
| `source` | How session started: `startup`, `resume`, `clear`, `compact` |
| `model` | Model identifier (e.g., `claude-sonnet-4-6`) |

## Environment Variables Reference

| Variable | Available in | Description |
|----------|-------------|-------------|
| `CLAUDE_ENV_FILE` | SessionStart, Setup | Write `export` lines here to persist env vars |
| `CLAUDE_CODE_REMOTE` | All hooks | `"true"` in web/remote environments |
| `CLAUDE_PROJECT_DIR` | All hooks | Project root directory |

## Configuration File Locations

| File | Scope | Commit to repo? |
|------|-------|-----------------|
| `.claude/settings.json` | Project | Yes — shared with team |
| `.claude/settings.local.json` | Project | No — gitignored, personal |
| `~/.claude/settings.json` | Global | No — all your projects |

## Matchers

### SessionStart matchers

| Matcher | Fires on |
|---------|----------|
| `startup` | New session only |
| `resume` | Resumed session (`--resume`, `--continue`, `/resume`) |
| `clear` | After `/clear` |
| `compact` | After auto or manual compaction |
| *(omitted)* | All of the above |

### Setup matchers

| Matcher | Fires on |
|---------|----------|
| `init` | `--init` and `--init-only` |
| `maintenance` | `--maintenance` |

## Best Practices

1. **Keep SessionStart hooks fast** — they run on every session. Check if work is needed before doing it.
2. **Use Setup hooks for heavy lifting** — dependency installs, migrations, onboarding.
3. **Guard with `CLAUDE_CODE_REMOTE`** — avoid running install scripts in local environments where deps already exist.
4. **Use `matcher: "startup"`** — avoid reinstalling on resume/clear/compact.
5. **Idempotent scripts** — always safe to run twice (check if deps exist before installing).
6. **Test locally first** — run `claude --debug` to see hook execution details.
7. **Proxy awareness** — remote environments route traffic through a security proxy. Some package managers (e.g., Bun) may not work correctly with this.

## Claude Code Web Environment Variables (UI)

You can also set environment variables directly in the Claude Code Web UI:

**Settings > Environment > Add environment** — use `.env` format (`KEY=value`, one per line).

Use `/remote-env` from your terminal to choose which environment to use when starting web sessions.

## Full Example: Node.js + Python Project

`.claude/settings.json`:

```json
{
  "hooks": {
    "SessionStart": [
      {
        "matcher": "startup",
        "hooks": [
          {
            "type": "command",
            "command": "\"$CLAUDE_PROJECT_DIR\"/scripts/session-setup.sh"
          }
        ]
      }
    ],
    "Setup": [
      {
        "matcher": "init",
        "hooks": [
          {
            "type": "command",
            "command": "\"$CLAUDE_PROJECT_DIR\"/scripts/full-setup.sh",
            "timeout": 180
          }
        ]
      }
    ]
  }
}
```

`scripts/session-setup.sh`:

```bash
#!/bin/bash

# Set environment variables
if [ -n "$CLAUDE_ENV_FILE" ]; then
  echo 'export NODE_ENV=development' >> "$CLAUDE_ENV_FILE"
  echo 'export PATH="$PATH:./node_modules/.bin"' >> "$CLAUDE_ENV_FILE"
fi

# Quick dep check (only install if missing)
if [ "$CLAUDE_CODE_REMOTE" = "true" ] && [ ! -d "node_modules" ]; then
  npm install --prefer-offline
fi

# Return context to Claude
echo "## Environment"
echo "Node: $(node --version 2>/dev/null || echo 'not installed')"
echo "Branch: $(git branch --show-current)"
echo "Modified: $(git diff --stat --shortstat HEAD 2>/dev/null)"

exit 0
```

`scripts/full-setup.sh`:

```bash
#!/bin/bash

echo "Running full project setup..."

npm install
pip install -r requirements.txt
npx prisma migrate deploy
npm run build

echo "Setup complete. Run 'npm run dev' to start the dev server."
exit 0
```
