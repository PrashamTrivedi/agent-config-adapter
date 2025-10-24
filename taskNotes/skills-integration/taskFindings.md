# Purpose

Add Claude Skills support to agent-config-adapter as a new config type for plugin packaging (non-convertible, format-specific).

## Original Ask

Find online about the Claude Skills, What they are and how they are packaged. And then create a Plan to have new skills and package them in plugins.

## Complexity and the reason behind it

**Complexity Score: 2/5**

**Reasoning:**
- Skills are **NOT convertible** between formats - they are format-specific and stored as-is
- No adapter/conversion logic needed - much simpler than slash commands or MCP configs
- Database schema change is straightforward (add new type enum value)
- File generation is simple directory copying (skills/ folder)
- YAML frontmatter validation for Claude Code format only
- MCP servers do NOT expose skills - no MCP integration needed
- Main work: database migration, file generation updates, manifest updates
- Relatively low testing complexity - CRUD operations and file packaging only

## Architectural changes required

### 1. Domain Layer Changes

**File: `src/domain/types.ts`**

Add 'skill' to ConfigType:
```typescript
export type ConfigType = 'slash_command' | 'agent_definition' | 'mcp_config' | 'skill';
```

Add Claude Skills structure types:
```typescript
export interface ClaudeSkillMetadata {
  name: string;
  description: string;
  license?: string;
  allowed_tools?: string[];  // Claude Code only
  metadata?: Record<string, any>;
}

export interface ClaudeSkill {
  metadata: ClaudeSkillMetadata;
  content: string;  // Markdown body after frontmatter
  references?: Record<string, string>;  // Additional files (FORMS.md, etc.)
}

export interface GeminiSkill {
  name: string;
  description: string;
  prompt: string;  // Combined content
}

export interface CodexSkill {
  name: string;
  description: string;
  instructions: string;  // Combined content
}
```

### 2. Database Schema Changes

**New Migration: `migrations/0005_add_skill_config_type.sql`**

```sql
-- Add 'skill' to config type enum
-- SQLite doesn't have ALTER TYPE, so we use a check constraint update

-- Temporarily disable foreign key constraints
PRAGMA foreign_keys = OFF;

-- Create new table with updated constraint
CREATE TABLE configs_new (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('slash_command', 'agent_definition', 'mcp_config', 'skill')),
  original_format TEXT NOT NULL CHECK(original_format IN ('claude_code', 'codex', 'gemini')),
  content TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Copy data from old table
INSERT INTO configs_new SELECT * FROM configs;

-- Drop old table
DROP TABLE configs;

-- Rename new table
ALTER TABLE configs_new RENAME TO configs;

-- Recreate indexes
CREATE INDEX idx_configs_type ON configs(type);
CREATE INDEX idx_configs_format ON configs(original_format);
CREATE INDEX idx_configs_created_at ON configs(created_at DESC);

-- Re-enable foreign key constraints
PRAGMA foreign_keys = ON;
```

### 3. Adapter Layer Changes

**NONE - Skills are NOT convertible**

Skills remain in their original format and are never converted. The adapter layer does not apply to skills.

**Update: `src/adapters/index.ts`**

Add explicit check to reject skill conversion attempts:
```typescript
export function getAdapter(configType: ConfigType): FormatAdapter {
  if (configType === 'skill') {
    throw new Error('Skills are not convertible between formats');
  }

  switch (configType) {
    case 'slash_command':
      return new SlashCommandAdapter();
    case 'agent_definition':
      return new AgentDefinitionAdapter();
    case 'mcp_config':
      return new MCPConfigAdapter();
    default:
      throw new Error(`No adapter for config type: ${configType}`);
  }
}
```

### 4. Infrastructure Changes

**Dependencies:**
- Add `js-yaml` library for YAML frontmatter validation (Claude Code skills only)
- Ensure Cloudflare Workers compatibility

**No AI Conversion:**
Skills are never converted - they are format-specific resources.

## Backend changes required

### 1. Service Layer Updates

**File: `src/services/file-generation-service.ts`**

Update `generateClaudeCodeFiles()`:
```typescript
// Add skills directory generation (Claude Code format only)
const skillConfigs = extension.configs.filter(
  (c) => c.type === 'skill' && c.original_format === 'claude_code'
);

for (const config of skillConfigs) {
  const skillName = this.sanitizeFileName(config.name);
  files.push({
    path: `skills/${skillName}/SKILL.md`,
    content: config.content,  // Use as-is, no conversion
    mimeType: 'text/markdown',
  });

  // Handle reference files if they exist in config metadata
  const references = this.extractSkillReferences(config);
  for (const [refName, refContent] of Object.entries(references)) {
    files.push({
      path: `skills/${skillName}/${refName}`,
      content: refContent,
      mimeType: 'text/markdown',
    });
  }
}
```

Update `generateGeminiFiles()`:
```typescript
// Add skills directory generation (Gemini format only)
const skillConfigs = extension.configs.filter(
  (c) => c.type === 'skill' && c.original_format === 'gemini'
);

for (const config of skillConfigs) {
  const skillName = this.sanitizeFileName(config.name);
  files.push({
    path: `skills/${skillName}/SKILL.md`,
    content: config.content,  // Use as-is, no conversion
    mimeType: 'text/markdown',
  });
}
```

Add new methods:
```typescript
private generateSkillFile(config: Config, format: 'claude_code' | 'gemini'): string {
  // Skills are NOT converted - must match the target format
  if (config.original_format !== format) {
    throw new Error(`Skill "${config.name}" is in ${config.original_format} format and cannot be included in ${format} plugin`);
  }

  // Return content as-is (no conversion)
  return config.content;
}

private extractSkillReferences(config: Config): Record<string, string> {
  // Parse metadata to extract reference files (FORMS.md, etc.)
  // This assumes references are stored in config metadata
  try {
    const parsed = JSON.parse(config.content);
    return parsed.references || {};
  } catch {
    return {};
  }
}
```

**File: `src/services/manifest-service.ts`**

Update `generateClaudeCodePluginManifest()`:
```typescript
// Extract skills (list specific skill directories)
const skills = extension.configs.filter((c) => c.type === 'skill');
if (skills.length > 0) {
  manifest.skills = skills.map((skill) => {
    const skillName = this.sanitizeCommandName(skill.name);
    return `./skills/${skillName}`;
  });
}
```

Add skills to ClaudeCodePluginManifest type:
```typescript
export interface ClaudeCodePluginManifest {
  name: string;
  version: string;
  description?: string;
  author?: { name: string; email?: string; };
  commands?: string[];
  agents?: string[];
  skills?: string[];  // NEW
  mcpServers?: Record<string, MCPServerConfig>;
  source?: string | { type: 'git' | 'local'; url: string; };
}
```

Update `generateGeminiManifest()`:
```typescript
// Extract skills for Gemini
const skills = this.extractGeminiSkills(
  extension.configs.filter((c) => c.type === 'skill')
);
if (Object.keys(skills).length > 0) {
  manifest.skills = skills;
}
```

Add helper method:
```typescript
private extractGeminiSkills(skillConfigs: Config[]): Record<string, string> {
  const skills: Record<string, string> = {};
  for (const config of skillConfigs) {
    const skillName = this.sanitizeCommandName(config.name);
    skills[skillName] = `skills/${skillName}`;
  }
  return skills;
}
```

Update `getConfigTypeCounts()`:
```typescript
getConfigTypeCounts(configs: Config[]): Record<ConfigType, number> {
  const counts: Record<ConfigType, number> = {
    slash_command: 0,
    agent_definition: 0,
    mcp_config: 0,
    skill: 0,  // NEW
  };

  for (const config of configs) {
    counts[config.type]++;
  }

  return counts;
}
```

**File: `src/services/conversion-service.ts`**

Add validation to reject skill conversion requests:
```typescript
async convertConfig(configId: string, targetFormat: AgentFormat): Promise<ConversionResult> {
  const config = await this.configService.getConfig(configId);

  // Skills are not convertible
  if (config.type === 'skill') {
    throw new Error('Skills cannot be converted between formats. Skills are format-specific and must be used in their original format.');
  }

  // ... existing conversion logic
}
```

### 2. Route Layer Updates

**File: `src/routes/configs.ts`**

Add validation to format conversion endpoint to reject skills:
```typescript
// GET /api/configs/:id/format/:format
app.get('/api/configs/:id/format/:format', async (c) => {
  const { id, format } = c.req.param();
  const config = await configService.getConfig(id);

  // Skills cannot be converted
  if (config.type === 'skill') {
    return c.json({
      error: 'Skills cannot be converted between formats',
      message: 'Skills are format-specific and must be used in their original format'
    }, 400);
  }

  // ... existing conversion logic
});
```

**File: `src/routes/plugins.ts`**

No changes needed - file serving logic is already generic and will serve skills directories automatically.

**IMPORTANT:** Skills are only packaged in their native format:
- Claude Code skills → only in Claude Code plugins
- Gemini skills → only in Gemini plugins
- Codex skills → only in Codex plugins

### 3. View Layer Updates

**File: `src/views/configs.ts`**

Update config type selector in forms:
```typescript
<select name="type" required>
  <option value="slash_command">Slash Command</option>
  <option value="agent_definition">Agent Definition</option>
  <option value="mcp_config">MCP Config</option>
  <option value="skill">Skill</option>  <!-- NEW -->
</select>
```

**File: `src/views/extensions.ts`**

Update config type display to show skills count:
```typescript
const counts = manifestService.getConfigTypeCounts(extension.configs);
// Display counts.skill in UI
```

**File: `src/views/plugin-browser.ts`**

No changes needed - file browser will automatically list `skills/` directories.

### 4. Seeds Data

**New File: `seeds/example-skills.sql`**

Add sample skill configs:
```sql
-- Example Claude Code skill
INSERT INTO configs (id, name, type, original_format, content) VALUES
('skill-example-1', 'PDF Processing', 'skill', 'claude_code', '---
name: pdf-processing
description: Extract text and tables from PDF files, fill forms, merge documents. Use when working with PDF files or when the user mentions PDFs, forms, or document extraction.
license: Apache-2.0
allowed_tools:
  - Read
  - Bash
  - Python
---

# PDF Processing Skill

## Overview
This skill provides comprehensive PDF manipulation capabilities.

## Instructions

1. **Text Extraction**: Use pdfplumber to extract text
2. **Table Extraction**: Use tabula-py for tables
3. **Form Filling**: Use PyPDF2 to fill form fields

## Examples

[Example usage here]

## Advanced Features

See [FORMS.md](FORMS.md) for form-filling details.
');

-- Example Gemini skill (if format differs)
INSERT INTO configs (id, name, type, original_format, content) VALUES
('skill-example-2', 'Code Review Helper', 'skill', 'gemini', '[Gemini format here]');
```

## Frontend changes required

No frontend application exists - all UI is server-rendered HTMX views. Changes are covered in View Layer Updates above.

## Acceptance Criteria

1. **Database Support**
   - ✅ Skills can be stored with type='skill' in configs table
   - ✅ Migration successfully adds 'skill' to type constraint
   - ✅ Existing configs remain intact after migration

2. **CRUD Operations**
   - ✅ Skills can be created via POST /api/configs
   - ✅ Skills can be retrieved via GET /api/configs/:id
   - ✅ Skills can be updated via PUT /api/configs/:id
   - ✅ Skills can be deleted via DELETE /api/configs/:id
   - ✅ Skills appear in GET /api/configs list

3. **Format Validation (No Conversion)**
   - ✅ Skills cannot be converted via GET /api/configs/:id/format/:format
   - ✅ Conversion endpoint returns 400 error for skills with clear message
   - ✅ Skills remain in their original format
   - ✅ Format mismatch validation works (e.g., cannot add Gemini skill to Claude Code plugin)

4. **YAML Frontmatter Validation**
   - ✅ 'name' field is required and validated (max 64 chars, lowercase/numbers/hyphens)
   - ✅ 'description' field is required and validated (max 1024 chars, non-empty)
   - ✅ 'license' field is optional
   - ✅ 'allowed_tools' field is optional array
   - ✅ Invalid YAML frontmatter is rejected with clear error message

5. **Plugin File Generation**
   - ✅ Claude Code plugins include `skills/` directory
   - ✅ Each skill is in `skills/{skill-name}/SKILL.md` structure
   - ✅ Reference files (FORMS.md, etc.) are included when present
   - ✅ Gemini plugins include skills in appropriate format
   - ✅ Plugin manifests list skills correctly

6. **Extension Integration**
   - ✅ Skills can be added to extensions
   - ✅ Extensions with skills generate correct manifests
   - ✅ Skills count appears in extension views
   - ✅ Skills can be downloaded as part of plugin ZIPs

7. **Marketplace Integration**
   - ✅ Marketplaces correctly include extensions with skills
   - ✅ Marketplace ZIPs contain skill directories
   - ✅ Marketplace manifests reference skills properly

8. **MCP Server Integration**
   - ✅ MCP servers do NOT expose skills (skills are not part of MCP specification)
   - ✅ Skills are excluded from MCP tools and resources
   - ✅ Attempting to create skill via MCP returns clear error message

## Validation

### Test Commands

**1. Database Migration**
```bash
# Apply migration locally
npx wrangler d1 execute agent-config-adapter --local --file=./migrations/0005_add_skill_config_type.sql

# Verify schema
npx wrangler d1 execute agent-config-adapter --local --command="PRAGMA table_info(configs);"

# Load sample skills
npx wrangler d1 execute agent-config-adapter --local --file=./seeds/example-skills.sql
```

**2. Start Development Server**
```bash
npm run dev
# Server should start on http://localhost:8787
```

**3. Test CRUD Operations**
```bash
BASE_URL="http://localhost:8787"

# Create a Claude Code skill
curl -X POST "$BASE_URL/api/configs" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Skill",
    "type": "skill",
    "original_format": "claude_code",
    "content": "---\nname: test-skill\ndescription: A test skill for validation\nlicense: MIT\nallowed_tools:\n  - Read\n  - Bash\n---\n\n# Test Skill\n\nThis is a test skill."
  }'

# Get all configs (should include skills)
curl "$BASE_URL/api/configs" | jq '.configs[] | select(.type=="skill")'

# Get specific skill
SKILL_ID="<id-from-create-response>"
curl "$BASE_URL/api/configs/$SKILL_ID" | jq .

# Update skill
curl -X PUT "$BASE_URL/api/configs/$SKILL_ID" \
  -H "Content-Type: application/json" \
  -d '{"name": "Updated Test Skill"}'

# Delete skill
curl -X DELETE "$BASE_URL/api/configs/$SKILL_ID"
```

**4. Test Format Validation (Skills Cannot Convert)**
```bash
SKILL_ID="<id-of-claude-code-skill>"

# Attempt to convert skill (should fail)
curl "$BASE_URL/api/configs/$SKILL_ID/format/gemini"
# Expected: 400 error with message "Skills cannot be converted between formats"

# Attempt to convert to Codex (should fail)
curl "$BASE_URL/api/configs/$SKILL_ID/format/codex"
# Expected: 400 error

# Verify original format is preserved
curl "$BASE_URL/api/configs/$SKILL_ID" | jq '.config.original_format'
# Expected: "claude_code" (unchanged)
```

**5. Test Extension Integration**
```bash
# Create extension with skill
curl -X POST "$BASE_URL/api/extensions" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Extension with Skill",
    "version": "1.0.0",
    "description": "Extension including a skill",
    "config_ids": ["<skill-id>"]
  }'

EXTENSION_ID="<id-from-create-response>"

# Get extension manifest
curl "$BASE_URL/api/extensions/$EXTENSION_ID/manifest/claude_code" | jq .

# Verify skills field in manifest
curl "$BASE_URL/api/extensions/$EXTENSION_ID/manifest/claude_code" | jq '.skills'
```

**6. Test Plugin File Generation**
```bash
# Browse plugin files
curl "$BASE_URL/plugins/$EXTENSION_ID/claude_code" | grep -i skill

# Check if skills directory exists
curl "$BASE_URL/plugins/$EXTENSION_ID/claude_code/skills/" | grep SKILL.md

# Download plugin ZIP
curl -o test-plugin.zip "$BASE_URL/plugins/$EXTENSION_ID/claude_code/download"

# Verify ZIP contents
unzip -l test-plugin.zip | grep skills/
```

**7. Test MCP Server (Skills NOT Exposed)**
```bash
# List all configs via MCP (should NOT include skills)
curl -X POST "$BASE_URL/mcp" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "resources/read",
    "params": {"uri": "config://list"},
    "id": 1
  }' | jq '.result.contents[0].text' | jq '. | map(select(.type=="skill"))'
# Expected: empty array (skills filtered out)

# Attempt to create skill via MCP (should fail)
curl -X POST "$BASE_URL/mcp" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "create_config",
      "arguments": {
        "name": "MCP Test Skill",
        "type": "skill",
        "original_format": "claude_code",
        "content": "---\nname: mcp-test\ndescription: Skill created via MCP\n---\n\n# MCP Test Skill"
      }
    },
    "id": 2
  }' | jq .
# Expected: Error - MCP does not support skills
```

**8. Test Validation**
```bash
# Test invalid YAML frontmatter (missing required fields)
curl -X POST "$BASE_URL/api/configs" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Invalid Skill",
    "type": "skill",
    "original_format": "claude_code",
    "content": "---\nname: test\n---\n\nNo description"
  }'
# Should return 400 error

# Test invalid name (uppercase, special chars)
curl -X POST "$BASE_URL/api/configs" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Invalid Skill Name",
    "type": "skill",
    "original_format": "claude_code",
    "content": "---\nname: Invalid-Name!!!\ndescription: Test\n---\n\nContent"
  }'
# Should return 400 error

# Test description too long (>1024 chars)
curl -X POST "$BASE_URL/api/configs" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Long Description Skill",
    "type": "skill",
    "original_format": "claude_code",
    "content": "---\nname: test\ndescription: '"$(python3 -c 'print(\"a\" * 1025)')"'\n---\n\nContent"
  }'
# Should return 400 error
```

**9. Run Automated Tests**
```bash
npm test

# Watch mode during development
npm run test:watch
```

**10. Verify UI**
```bash
# Open browser to http://localhost:8787
# Navigate to:
# - /configs - Should show "Skill" option in type dropdown
# - /extensions - Should show skills count
# - /plugins/<extension-id>/claude_code - Should list skills/ directory
```

### Expected Results

✅ All test commands execute without errors
✅ Skills are stored and retrieved correctly
✅ Format conversions produce valid output
✅ Plugin ZIPs include skills/ directory with SKILL.md files
✅ Manifests correctly reference skills
✅ YAML frontmatter validation catches invalid inputs
✅ All automated tests pass
✅ UI shows skills as a config type option

### Edge Cases to Test

1. **Skill without optional fields** (license, allowed_tools, metadata)
2. **Skill with reference files** (FORMS.md, reference.md)
3. **Extension with mixed config types** (commands + agents + skills + MCP)
4. **Skill name sanitization** (spaces, special chars → kebab-case)
5. **Duplicate skill names in same extension**
6. **Large skill content** (>100KB markdown)
7. **Skill with scripts directory** (scripts/*.py)
8. **Format mismatch** (attempting to add Gemini skill to Claude Code plugin)
9. **Mixed format skills** (extension with both Claude Code and Gemini skills - should generate separate plugin formats)
10. **Conversion attempt rejection** (verify 400 error with helpful message)

## Research Notes

### Claude Skills Format Details

**YAML Frontmatter Requirements:**
- `name`: Required, max 64 chars, lowercase/numbers/hyphens only
- `description`: Required, max 1024 chars, non-empty, no XML tags
- `license`: Optional, short string
- `allowed_tools`: Optional array (Claude Code only)
- `metadata`: Optional key-value map

**Directory Structure:**
```
skill-name/
├── SKILL.md              # Entrypoint (YAML + Markdown)
├── FORMS.md              # Optional reference
├── reference.md          # Optional reference
└── scripts/
    ├── analyze.py        # Optional script
    └── validate.py       # Optional script
```

**Progressive Disclosure:**
1. Level 1 (Metadata): name + description (~100 tokens)
2. Level 2 (Instructions): SKILL.md body (~5k tokens)
3. Level 3 (Resources): Reference files + scripts (on-demand)

**Gemini vs Codex Format:**
- Research needed to determine exact Gemini and Codex skill formats
- May use TOML (Gemini) or Markdown sections (Codex)
- Conversion rules TBD based on findings

### Implementation Dependencies

**NPM Packages:**
- `js-yaml` (^4.1.0) - YAML parsing/generation
- Verify Cloudflare Workers compatibility

**Cloudflare Workers Considerations:**
- Ensure YAML library works in Workers runtime (nodejs_compat flag)
- R2 storage for skill files (already configured)
- KV cache for converted skills (already configured)

### Implementation Notes

**Key Principles:**
1. **No Conversion** - Skills are format-specific and immutable
2. **Format Filtering** - Only include skills matching the plugin format
3. **MCP Exclusion** - Skills are not part of MCP specification
4. **YAML Validation** - Only validate Claude Code skills (YAML frontmatter)
5. **Reference Files** - Store as metadata within skill config (JSON encoded)

**Reference Files Storage Strategy:**
Store reference files as JSON-encoded metadata within the config content:
```json
{
  "skill": "--- YAML frontmatter + markdown body ---",
  "references": {
    "FORMS.md": "content here",
    "reference.md": "content here",
    "scripts/analyze.py": "content here"
  }
}
```

**Simplified Approach:**
- No adapter needed (skills never convert)
- No AI Gateway calls for skills (no conversion = no AI needed)
- Validation only for Claude Code format (YAML frontmatter)
- Much simpler implementation than initially planned
