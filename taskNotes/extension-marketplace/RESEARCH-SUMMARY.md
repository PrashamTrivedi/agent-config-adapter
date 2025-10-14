# Claude Code Plugin Research - Executive Summary

**Date**: 2025-10-14
**Researcher**: Claude (Sonnet 4.5)
**Status**: Complete

## Quick Answer to Your Questions

### 1. What is the exact structure of a Claude Code plugin?

```
my-plugin/
├── .claude-plugin/
│   └── plugin.json          # REQUIRED manifest file
├── commands/                # Optional: Slash commands (*.md files)
├── agents/                  # Optional: Subagents (*.md files)
├── hooks/                   # Optional: Event hooks
│   └── hooks.json
├── .mcp.json               # Optional: MCP server config
└── scripts/                # Optional: Helper scripts
```

**Key Point**: `.claude-plugin/plugin.json` is the ONLY required file.

### 2. What files are required in a plugin directory?

**Minimum Requirements**:
- `.claude-plugin/plugin.json` (when strict: true, which is default)

**plugin.json Minimal Example**:
```json
{
  "name": "my-plugin"
}
```

**Real Example from Anthropic**:
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

### 3. How should the plugin.json "source" field work?

**CRITICAL CORRECTION**: The "source" field is NOT in plugin.json!

The "source" field is in **marketplace.json** and points to a **plugin directory**, NOT individual files.

### 4. Marketplace.json "source" Field Options

#### Option A: Relative Path (Same Repo)
```json
{
  "name": "my-plugin",
  "source": "./plugins/my-plugin"
}
```

Points to directory containing `.claude-plugin/plugin.json`

#### Option B: GitHub Repository
```json
{
  "name": "my-plugin",
  "source": {
    "source": "github",
    "repo": "owner/plugin-repo"
  }
}
```

#### Option C: Git URL
```json
{
  "name": "my-plugin",
  "source": {
    "source": "git",
    "url": "https://gitlab.com/team/plugin.git"
  }
}
```

#### Option D: HTTP URL
```json
{
  "name": "my-plugin",
  "source": {
    "source": "url",
    "url": "https://example.com/plugin-directory"
  }
}
```

**Important**: In all cases, Claude Code expects to find:
- `.claude-plugin/plugin.json` at the source location
- Other files relative to that location (commands/, agents/, etc.)

### 5. How do commands, agents, and MCP configs get loaded?

**Default Locations** (automatically discovered):
- Commands: `commands/*.md`
- Agents: `agents/*.md`
- Hooks: `hooks/hooks.json`
- MCP Servers: `.mcp.json`

**Custom Locations** (specified in plugin.json):
```json
{
  "name": "my-plugin",
  "commands": ["./custom/commands/special.md"],
  "agents": "./custom/agents/",
  "hooks": "./config/hooks.json",
  "mcpServers": "./mcp-config.json"
}
```

**Key Behavior**: Custom paths are **additive** - if both default and custom paths exist, both are loaded.

### 6. Real Examples

**Official Anthropic Marketplace**:
https://github.com/anthropics/claude-code/blob/main/.claude-plugin/marketplace.json

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
      "source": "./plugins/commit-commands",
      "category": "productivity"
    }
  ]
}
```

## What This Means for Agent Config Adapter

### Current Implementation Issue

❌ **Wrong Approach**:
```json
"source": "https://agent-config-adapter.com/api/plugins/my-plugin/plugin.json"
```

This won't work because Claude Code expects a directory, not a JSON file URL.

### Correct Approaches

✅ **Option 1: Host Full Plugin Directory Structure**

Serve plugins as directory hierarchies:

```
https://agent-config-adapter.com/plugins/my-plugin/
├── .claude-plugin/plugin.json
├── commands/command1.md
└── agents/agent1.md
```

marketplace.json:
```json
{
  "name": "my-plugin",
  "source": {
    "source": "url",
    "url": "https://agent-config-adapter.com/plugins/my-plugin"
  }
}
```

✅ **Option 2: GitHub Repository (Recommended)**

Host each generated plugin as a GitHub repo or branch:

```json
{
  "name": "my-plugin",
  "source": {
    "source": "github",
    "repo": "your-org/my-plugin"
  }
}
```

✅ **Option 3: Git Repository**

Create a git repo with all plugins and use relative paths:

```
your-repo/
├── .claude-plugin/marketplace.json
└── plugins/
    ├── plugin1/
    └── plugin2/
```

marketplace.json:
```json
{
  "plugins": [
    {
      "name": "plugin1",
      "source": "./plugins/plugin1"
    }
  ]
}
```

### Recommendation for Implementation

**Best Approach**: Serve full plugin directory structures via HTTP

```
GET /plugins/{plugin-id}/
├── .claude-plugin/plugin.json
├── commands/{command-slug}.md
└── agents/{agent-slug}.md
```

**Why?**
- Most flexible for dynamic content
- No need for git infrastructure
- Can generate on-the-fly from database
- Works with our existing API architecture

**Implementation Plan**:
1. Add new route: `GET /plugins/:id/*` - Serve plugin file tree
2. Generate `.claude-plugin/plugin.json` from extension metadata
3. Generate `commands/*.md` from associated configs (type: slash_command)
4. Generate `agents/*.md` from associated configs (type: agent_definition)
5. Generate `.mcp.json` from associated configs (type: mcp_config)
6. Update marketplace.json to use: `"source": "https://your-domain.com/plugins/{id}"`

## Complete Marketplace.json Schema

```json
{
  "$schema": "https://anthropic.com/claude-code/marketplace.schema.json",
  "name": "marketplace-identifier",
  "version": "1.0.0",
  "description": "Marketplace description",
  "owner": {
    "name": "Owner Name",
    "email": "owner@example.com"
  },
  "metadata": {
    "pluginRoot": "./plugins"
  },
  "plugins": [
    {
      "name": "plugin-name",
      "source": "./path/or/url",
      "version": "1.0.0",
      "description": "Plugin description",
      "author": {
        "name": "Author Name",
        "email": "author@example.com",
        "url": "https://github.com/author"
      },
      "homepage": "https://docs.example.com",
      "repository": "https://github.com/author/plugin",
      "license": "MIT",
      "keywords": ["tag1", "tag2"],
      "category": "development",
      "tags": ["additional", "tags"],
      "strict": true,
      "commands": ["./custom/cmd.md"],
      "agents": "./custom/agents/",
      "hooks": "./hooks.json",
      "mcpServers": "./.mcp.json"
    }
  ]
}
```

## Official Documentation

- **Plugin Marketplaces**: https://docs.claude.com/en/docs/claude-code/plugin-marketplaces
- **Plugins Reference**: https://docs.claude.com/en/docs/claude-code/plugins-reference
- **Schema**: https://anthropic.com/claude-code/marketplace.schema.json
- **Example Repo**: https://github.com/anthropics/claude-code/tree/main/plugins

## Key Takeaways

1. ✅ Source field points to DIRECTORY, not files
2. ✅ Only `.claude-plugin/plugin.json` is required
3. ✅ Commands, agents, etc. are optional
4. ✅ Default directories are auto-discovered
5. ✅ Custom paths supplement (not replace) defaults
6. ✅ strict: true (default) requires plugin.json
7. ✅ strict: false allows inline definitions
8. ✅ ${CLAUDE_PLUGIN_ROOT} for portable paths

## Next Steps for Implementation

1. Update Extension model to support plugin directory structure
2. Create route to serve plugins as file trees
3. Generate markdown files for commands and agents
4. Update marketplace manifest generation to use correct source format
5. Test with Claude Code client
6. Update documentation

See `CLAUDE-CODE-PLUGIN-RESEARCH.md` for detailed findings.
