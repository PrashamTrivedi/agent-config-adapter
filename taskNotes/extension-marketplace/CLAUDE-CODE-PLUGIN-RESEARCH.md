# Claude Code Plugin Structure - Research Findings

**Date**: 2025-10-14
**Purpose**: Document the official Claude Code plugin structure and marketplace format

## Key Findings Summary

### 1. Plugin Directory Structure

A Claude Code plugin has the following structure:

```
my-plugin/
├── .claude-plugin/          # Metadata directory (REQUIRED)
│   └── plugin.json          # Plugin manifest (REQUIRED)
├── commands/                # Slash commands (optional)
│   ├── command1.md
│   └── command2.md
├── agents/                  # Subagents (optional)
│   ├── agent1.md
│   └── agent2.md
├── hooks/                   # Event hooks (optional)
│   └── hooks.json
├── .mcp.json               # MCP server config (optional)
└── scripts/                # Utility scripts (optional)
```

**Critical Point**: The `.claude-plugin/` directory must be at the plugin root and contain `plugin.json`. Other directories (commands/, agents/, etc.) are at the plugin root, NOT inside `.claude-plugin/`.

### 2. Plugin Manifest (plugin.json)

Located at: `.claude-plugin/plugin.json`

**Required Fields**:
- `name` - Unique identifier (kebab-case, no spaces)

**Optional Metadata Fields**:
- `version` - Semantic version (e.g., "1.0.0")
- `description` - Brief plugin description
- `author` - Object with `name`, `email`, `url`
- `homepage` - Documentation URL
- `repository` - Source code URL
- `license` - SPDX identifier (e.g., "MIT")
- `keywords` - Array of tags

**Optional Component Path Fields**:
- `commands` - Additional command files/directories (string|array)
- `agents` - Additional agent files (string|array)
- `hooks` - Hook config path or inline config (string|object)
- `mcpServers` - MCP config path or inline config (string|object)

**Example from Official Repo**:
```json
{
  "name": "agent-sdk-dev",
  "description": "Claude Agent SDK Development Plugin",
  "version": "1.0.0",
  "author": {
    "name": "Ashwin Bhat",
    "email": "ashwin@anthropic.com"
  }
}
```

### 3. Marketplace Structure (marketplace.json)

Located at: `.claude-plugin/marketplace.json` in repository root

**Required Fields**:
- `name` - Marketplace identifier (kebab-case)
- `owner` - Object with `name` and `email`
- `plugins` - Array of plugin entries

**Optional Marketplace Metadata**:
- `$schema` - Reference to schema (recommended: "https://anthropic.com/claude-code/marketplace.schema.json")
- `version` - Marketplace version
- `description` - Marketplace description
- `metadata.pluginRoot` - Base path for relative plugin sources

**Plugin Entry Structure**:

Each plugin in the `plugins` array must have:
- `name` - Plugin identifier (REQUIRED)
- `source` - Where to find the plugin (REQUIRED)

The `source` field can be:

#### A. Relative Path (for plugins in same repo)
```json
{
  "name": "my-plugin",
  "source": "./plugins/my-plugin"
}
```

#### B. GitHub Repository Object
```json
{
  "name": "github-plugin",
  "source": {
    "source": "github",
    "repo": "owner/plugin-repo"
  }
}
```

#### C. Git Repository URL Object
```json
{
  "name": "git-plugin",
  "source": {
    "source": "git",
    "url": "https://gitlab.com/team/plugin.git"
  }
}
```

#### D. Direct URL Object
```json
{
  "name": "url-plugin",
  "source": {
    "source": "url",
    "url": "https://example.com/plugin.git"
  }
}
```

**Optional Plugin Entry Fields**:
- `description` - Plugin description
- `version` - Plugin version
- `author` - Author object
- `homepage` - Documentation URL
- `repository` - Source code URL
- `license` - License identifier
- `keywords` - Discovery tags (array)
- `category` - Plugin category (e.g., "development", "productivity")
- `tags` - Search tags (array)
- `strict` - Require plugin.json (boolean, default: true)
- `commands` - Custom command paths (string|array)
- `agents` - Custom agent paths (string|array)
- `hooks` - Hook configuration (string|object)
- `mcpServers` - MCP server config (string|object)

### 4. Official Anthropic Marketplace Example

From: https://github.com/anthropics/claude-code/blob/main/.claude-plugin/marketplace.json

```json
{
  "$schema": "https://anthropic.com/claude-code/marketplace.schema.json",
  "name": "claude-code-plugins",
  "version": "1.0.0",
  "description": "Bundled plugins for Claude Code",
  "owner": {
    "name": "Anthropic",
    "email": "support@anthropic.com"
  },
  "plugins": [
    {
      "name": "agent-sdk-dev",
      "description": "Development kit for working with the Claude Agent SDK",
      "source": "./plugins/agent-sdk-dev",
      "category": "development"
    },
    {
      "name": "commit-commands",
      "description": "Commands for git commit workflows",
      "version": "1.0.0",
      "author": {
        "name": "Anthropic",
        "email": "support@anthropic.com"
      },
      "source": "./plugins/commit-commands",
      "category": "productivity"
    }
  ]
}
```

## Key Insights for Our Implementation

### 1. Source Field Behavior

**Important Discovery**: The `source` field in marketplace.json should point to the **plugin directory** that contains:
- `.claude-plugin/plugin.json` (required if strict: true)
- `commands/` (optional)
- `agents/` (optional)
- Other plugin files

**NOT** individual file URLs!

### 2. When strict: true (Default)

- Plugin MUST have `.claude-plugin/plugin.json`
- Marketplace fields supplement the plugin.json values
- Claude Code will look for the plugin.json first

### 3. When strict: false

- Plugin.json is optional
- If missing, marketplace entry serves as the complete manifest
- Useful for simple plugins or when hosting plugins without manifests

### 4. Environment Variables

`${CLAUDE_PLUGIN_ROOT}` - Resolves to plugin installation directory
- Use in hooks, MCP servers, and scripts for correct paths
- Example: `"${CLAUDE_PLUGIN_ROOT}/scripts/validate.sh"`

### 5. Path Behavior

- All custom paths are **additive** (don't replace defaults)
- If `commands/` exists, it's loaded in addition to custom paths
- All paths must be relative and start with `./`

## Recommendations for Agent Config Adapter

### Current Issue

Our marketplace.json had:
```json
"source": "https://agent-config-adapter.yourdomain.com/api/plugins/my-plugin/plugin.json"
```

This is **INCORRECT**. Claude Code expects a plugin directory, not individual file URLs.

### Correct Approach Options

#### Option 1: Host Complete Plugin Directory Structure
```json
{
  "name": "my-plugin",
  "source": {
    "source": "url",
    "url": "https://agent-config-adapter.yourdomain.com/plugins/my-plugin"
  }
}
```

Then serve at that URL:
- `/plugins/my-plugin/.claude-plugin/plugin.json`
- `/plugins/my-plugin/commands/command1.md`
- `/plugins/my-plugin/agents/agent1.md`

#### Option 2: Use GitHub Repository
Host plugins as a GitHub repo and use:
```json
{
  "name": "my-plugin",
  "source": {
    "source": "github",
    "repo": "your-org/your-plugin-repo"
  }
}
```

#### Option 3: Use strict: false for Inline Definitions
```json
{
  "name": "simple-plugin",
  "source": "./inline",
  "strict": false,
  "description": "Inline plugin without plugin.json",
  "commands": ["./commands/inline-command.md"]
}
```

But still need to host the actual command files somewhere accessible.

### Best Practice for Our Use Case

Since we're converting between formats and serving via API:

1. **Generate full plugin directory structure** for each config
2. **Serve via HTTP** at predictable paths
3. **Use relative path or URL source** in marketplace.json
4. Ensure `.claude-plugin/plugin.json` exists in each plugin directory

## Testing & Validation

### Validate Marketplace
```bash
claude plugin validate .
```

### Add Marketplace
```bash
/plugin marketplace add https://your-url/marketplace.json
/plugin marketplace add owner/repo
/plugin marketplace add ./local-path
```

### List Plugins
```bash
/plugin
/plugin marketplace list
```

### Install Plugin
```bash
/plugin install plugin-name@marketplace-name
```

## Official Documentation Links

- Plugin Marketplaces: https://docs.claude.com/en/docs/claude-code/plugin-marketplaces
- Plugins Reference: https://docs.claude.com/en/docs/claude-code/plugins-reference
- Official Example: https://github.com/anthropics/claude-code/blob/main/.claude-plugin/marketplace.json
- Official Plugins: https://github.com/anthropics/claude-code/tree/main/plugins

## Schema Reference

Schema URL: https://anthropic.com/claude-code/marketplace.schema.json

Always include in marketplace.json:
```json
{
  "$schema": "https://anthropic.com/claude-code/marketplace.schema.json"
}
```
