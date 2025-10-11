# MCP Configuration Adapter Implementation

## Purpose
Implement proper format conversion for MCP (Model Context Protocol) configurations between Claude Code, Gemini, and Codex formats.

## Original Ask
MCP Definitions are saved as JSON, unlike prompts, they require special treatments as following: claude and gemini accepts them as is. But codex require them in toml format (check memory first, otherwise online). Our converters for mcp needs to take care of this, even though it's separate.

## Complexity and the reason behind it
**Complexity Score: 2/5**

**Reasoning:**
- Clear requirements with well-documented format specifications in memory
- Straightforward data transformation (JSON ↔ TOML)
- Existing adapter pattern to follow (SlashCommandAdapter)
- AI conversion fallback already implemented in infrastructure
- Good test coverage can be written easily
- Only requires one new adapter class and tests

The task is not complex because:
1. Format specifications are well-defined in the memory server
2. We have a clear adapter pattern to follow
3. JSON ↔ TOML conversion is a solved problem
4. The passthrough adapter already exists and needs replacement
5. Infrastructure (AI fallback, caching) is already in place

## Architectural changes required
None required. The existing architecture already supports this:
- `src/adapters/` - Where the new adapter will live
- Adapter factory pattern in `src/adapters/index.ts` already handles config types
- AI-enhanced conversion with fallback already implemented
- Caching infrastructure already in place

## Backend changes required

### 1. Create MCP Config Adapter (`src/adapters/mcp-config-adapter.ts`)

**Input/Output Formats:**

**Claude Code & Gemini (JSON):**
```json
{
  "mcpServers": {
    "server-name": {
      "command": "npx",
      "args": ["-y", "package-name"],
      "env": {
        "API_KEY": "value"
      }
    }
  }
}
```

**Claude Code specific (adds type):**
```json
{
  "mcpServers": {
    "server-name": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "package-name"],
      "env": {
        "API_KEY": "value"
      }
    }
  }
}
```

**Codex (TOML):**
```toml
[mcp_servers.server-name]
command = "npx"
args = ["-y", "package-name"]
env = { API_KEY = "value" }
startup_timeout_ms = 20000
```

**Conversion Logic:**

1. **JSON to TOML (Claude/Gemini → Codex):**
   - Parse `mcpServers` object
   - For each server entry:
     - Create `[mcp_servers.{name}]` section
     - Map `command`, `args`, `env` directly
     - Strip `type` field if present (Claude only)
     - Add default `startup_timeout_ms = 20000` if not specified

2. **TOML to JSON (Codex → Claude/Gemini):**
   - Parse all `[mcp_servers.*]` sections
   - For each section:
     - Create entry under `mcpServers` key
     - Map `command`, `args`, `env` directly
     - For Claude format: add `"type": "stdio"` (or detect from httpUrl)
     - Strip `startup_timeout_ms` (Claude/Gemini don't use it)

3. **JSON to JSON (Claude ↔ Gemini):**
   - Claude → Gemini: Remove `type` field
   - Gemini → Claude: Add `"type": "stdio"` (default) or `"type":"http"` (For servers start with https://)
 
**Implementation Structure:**
```typescript
export class MCPConfigAdapter implements FormatAdapter {
  convert(content: string, sourceFormat: AgentFormat, targetFormat: AgentFormat): string
  validate(content: string, format: AgentFormat): boolean

  private parseJSON(content: string): MCPConfig
  private parseTOML(content: string): MCPConfig
  private toClaudeCode(parsed: MCPConfig): string
  private toGemini(parsed: MCPConfig): string
  private toCodex(parsed: MCPConfig): string
}
```

### 2. Update Adapter Factory (`src/adapters/index.ts`)
Replace `PassthroughAdapter` for `mcp_config` type:
```typescript
case 'mcp_config':
  return new MCPConfigAdapter();
```

### 3. Add TOML Parsing Library
Add dependency for TOML parsing:
```bash
npm install @iarna/toml
npm install -D @types/iarna__toml
```

### 4. Update Domain Types (`src/domain/types.ts`)
Add MCP-specific types:
```typescript
export interface MCPConfig {
  mcpServers: Record<string, MCPServerConfig>;
}

export interface MCPServerConfig {
  type?: 'stdio' | 'http';  // Claude Code only
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  httpUrl?: string;  // Gemini remote servers
  startup_timeout_ms?: number;  // Codex only
}
```

### 5. Create Comprehensive Tests (`tests/mcp-config-adapter.test.ts`)

Test cases:
- ✅ Parse valid Claude Code JSON (with type field)
- ✅ Parse valid Gemini JSON (without type field)
- ✅ Parse valid Codex TOML
- ✅ Convert Claude Code → Codex (strip type, add timeout)
- ✅ Convert Codex → Claude Code (add type, strip timeout)
- ✅ Convert Claude Code → Gemini (strip type)
- ✅ Convert Gemini → Claude Code (add type)
- ✅ Convert Gemini → Codex
- ✅ Convert Codex → Gemini
- ✅ Handle multiple servers
- ✅ Handle servers with no args
- ✅ Handle servers with no env
- ✅ Handle env variables with special characters
- ✅ Validate format detection
- ✅ Error handling for malformed configs

### 6. Update Example Seeds (Optional)
Add MCP config examples to `seeds/example-configs.sql`:
- Example in Claude Code format (JSON with type)
- Example in Gemini format (JSON without type)
- Example in Codex format (TOML)

## Frontend changes required
None required. The UI already supports:
- Creating/editing configs with type `mcp_config`
- Format conversion endpoint (`GET /configs/:id/format/:format`)
- Cache invalidation

## Validation

### Manual Testing Steps:

**Setup:**
```bash
npm install
npm run dev
```

**Test 1: Create Claude Code MCP Config**
```bash
curl -X POST http://localhost:8787/api/configs \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test MCP Server",
    "type": "mcp_config",
    "original_format": "claude_code",
    "content": "{\"mcpServers\":{\"test-server\":{\"type\":\"stdio\",\"command\":\"npx\",\"args\":[\"-y\",\"test-package\"],\"env\":{\"API_KEY\":\"test123\"}}}}"
  }'
```

Expected: Config created successfully

**Test 2: Convert Claude Code → Codex**
```bash
curl http://localhost:8787/api/configs/{id}/format/codex
```

Expected response (TOML format):
```toml
[mcp_servers.test-server]
command = "npx"
args = ["-y", "test-package"]
env = { API_KEY = "test123" }
startup_timeout_ms = 20000
```

**Test 3: Convert Claude Code → Gemini**
```bash
curl http://localhost:8787/api/configs/{id}/format/gemini
```

Expected response (JSON without type):
```json
{
  "mcpServers": {
    "test-server": {
      "command": "npx",
      "args": ["-y", "test-package"],
      "env": {
        "API_KEY": "test123"
      }
    }
  }
}
```

**Test 4: Create Codex MCP Config**
```bash
curl -X POST http://localhost:8787/api/configs \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Codex MCP Server",
    "type": "mcp_config",
    "original_format": "codex",
    "content": "[mcp_servers.github-server]\ncommand = \"gh-mcp\"\nargs = []\nenv = { GITHUB_TOKEN = \"ghp_xxx\" }\nstartup_timeout_ms = 30000"
  }'
```

Expected: Config created successfully

**Test 5: Convert Codex → Claude Code**
```bash
curl http://localhost:8787/api/configs/{id}/format/claude_code
```

Expected response (JSON with type, without timeout):
```json
{
  "mcpServers": {
    "github-server": {
      "type": "stdio",
      "command": "gh-mcp",
      "args": [],
      "env": {
        "GITHUB_TOKEN": "ghp_xxx"
      }
    }
  }
}
```

**Test 6: Verify AI Fallback**
- Create malformed config that can't be parsed by rule-based adapter
- Verify AI conversion is attempted
- Check response metadata (`usedAI`, `fallbackUsed`)

**Test 7: Verify Caching**
- Request format conversion twice
- First request: `cached: false`
- Second request: `cached: true`
- Response content should be identical

### Automated Testing:
```bash
npm test  # All tests must pass
```

Test coverage should include:
- All format conversions (9 combinations)
- Edge cases (empty args, no env, multiple servers)
- Error handling (malformed JSON/TOML)
- Validation logic

### Success Criteria:
- ✅ All automated tests pass
- ✅ Manual API tests show correct format conversion
- ✅ AI fallback works when rule-based conversion fails
- ✅ Cache correctly stores and retrieves converted configs
- ✅ No regression in existing slash_command adapter tests
- ✅ Code follows existing patterns in `SlashCommandAdapter`
