# Purpose

Create an AI-powered slash command conversion tool that processes Claude Code slash commands for copy/paste to other AI agents by detecting arguments/skill/agent references, optionally collecting user input, inlining dependencies, and removing frontmatter.

## Original Ask

This is probably the AI powered feature.

This is speacially for manually copying and pasting the slash commands to the agents (like CC Web or Codex Or Jules) where this isn't supported or not easy to implement.

First USING AI: Determine if the slash command requires Argument, mentions agents or skills. If yes enable user input... Once User input is generated, use GPT 5 low thinking model to convert the slash command and I need to copy and paste slash commands, if they consists of some agents or skills, find them out by name and inline them if required or completely omit them.

The copied text should omit any frontmater, better do it programmatically.

## Complexity and the reason behind it

**Complexity Score: 3/5**

**Reasoning:**
- **Database migration** - New columns for pre-computed analysis metadata
- **AI-powered analysis** - Detect arguments, agent/skill references using GPT-5-mini
- **Proactive architecture** - Analysis runs on create/update (hooks into ConfigService)
- **Content parsing** - Dependency resolution (find and inline referenced files from ~/.claude)
- **Smart inlining** - AI decides what to inline vs. omit
- **Dynamic UI** - Form controls show/hide based on stored metadata
- **Two services** - SlashCommandAnalyzerService + SlashCommandConverterService
- Testing AI decision-making, database integration, file resolution

Not complexity 4+ because:
- Builds on existing AI converter infrastructure ([ai-converter.ts](src/infrastructure/ai-converter.ts))
- Database changes are simple (5 new columns + 1 index)
- File system operations are straightforward (read from ~/.claude)
- Frontmatter parsing already exists ([slash-command-adapter.ts](src/adapters/slash-command-adapter.ts))
- UI follows existing HTMX patterns
- Well-defined scope (slash commands only, local dev only)

## Architectural changes required

### Database Schema Changes

**Extend `configs` table** - Add metadata columns for pre-computed analysis:

```sql
ALTER TABLE configs ADD COLUMN has_arguments INTEGER DEFAULT 0;  -- 0=false, 1=true
ALTER TABLE configs ADD COLUMN argument_hint TEXT;
ALTER TABLE configs ADD COLUMN agent_references TEXT;  -- JSON array: ["triage", "web-search-specialist"]
ALTER TABLE configs ADD COLUMN skill_references TEXT;  -- JSON array: ["conventional-commit"]
ALTER TABLE configs ADD COLUMN analysis_version TEXT DEFAULT '1.0';  -- For cache invalidation
```

**Why this approach:**
- ✅ Analysis done ONCE when config created/updated (proactive)
- ✅ No runtime AI calls during conversion (fast)
- ✅ Metadata available for UI to dynamically show/hide controls
- ✅ Can invalidate cache by bumping version

### New Service Layer Components

**New Service:** `SlashCommandAnalyzerService`
- Location: `src/services/slash-command-analyzer-service.ts`
- Responsibilities:
  - Analyze slash command content when created/updated
  - Detect arguments from frontmatter (`argument-hint` field)
  - Detect agent/skill references using AI pattern matching
  - Store analysis results in database

**Updated Service:** `SlashCommandConverterService`
- Location: `src/services/slash-command-converter-service.ts`
- Responsibilities:
  - Fetch pre-computed analysis from database
  - Accept user arguments if needed
  - Resolve and inline agent/skill references
  - Generate final converted output
  - Remove frontmatter programmatically

**Service Dependencies:**
- `AIConverterService` - For AI-powered analysis (during create/update only)
- `ConfigService` - To store/fetch analysis metadata
- File system - For resolving agent/skill files

### Architecture Pattern - Proactive Analysis

```
CREATE/UPDATE Slash Command Config
    ↓
SlashCommandAnalyzerService (automatic)
    ↓
1. Parse frontmatter (extract argument-hint)
    ↓
2. Scan content for agent/skill patterns
    ↓
3. AI Analysis (GPT-5-mini):
   - Detect agent references: **agent-name**
   - Detect skill references: **skill-name**
   - Determine if arguments required
    ↓
4. Store in database:
   - has_arguments
   - argument_hint
   - agent_references (JSON array)
   - skill_references (JSON array)
    ↓
5. Config saved with metadata
```

### Architecture Pattern - Conversion (Using Pre-computed Metadata)

```
GET Slash Command Config
    ↓
Fetch from database WITH metadata
    ↓
UI displays form:
  - Show argument field if has_arguments=true
  - Show detected references
    ↓
User provides arguments (if needed)
    ↓
POST /api/slash-commands/:id/convert
    ↓
SlashCommandConverterService
    ↓
1. Fetch config with metadata (already analyzed!)
    ↓
2. If has_arguments && no userArguments → return needsInput=true
    ↓
3. Resolve agent/skill files from file system
    ↓
4. AI Decision (GPT-5-mini):
   - Which references to inline vs. omit
    ↓
5. Generate output:
   - Inline selected content
   - Replace $ARGUMENTS
   - Remove frontmatter
    ↓
6. Return clean text for copy/paste
```

**Key Improvement:**
- Analysis done proactively (1 time) vs. reactively (every conversion)
- UI knows what controls to show immediately
- Conversion is faster (no analysis step)

### Integration Points

**Existing Infrastructure:**
- Reuse `AIConverterService` from [src/infrastructure/ai-converter.ts](src/infrastructure/ai-converter.ts)
- Use existing OpenAI/AI Gateway setup (GPT-5-mini)
- No changes to database or cache layers

**New Endpoints:**
- REST API: `/api/slash-commands/convert` (POST)
- UI: `/slash-commands/convert` (form view)

## Backend changes required

### 1. Database Migration

**File:** `migrations/0006_add_slash_command_metadata.sql`

```sql
-- Add metadata columns for slash command analysis (proactive caching)
ALTER TABLE configs ADD COLUMN has_arguments INTEGER DEFAULT 0;  -- 0=false, 1=true
ALTER TABLE configs ADD COLUMN argument_hint TEXT;
ALTER TABLE configs ADD COLUMN agent_references TEXT;  -- JSON array: ["triage"]
ALTER TABLE configs ADD COLUMN skill_references TEXT;  -- JSON array: ["conventional-commit"]
ALTER TABLE configs ADD COLUMN analysis_version TEXT DEFAULT '1.0';  -- For cache invalidation

-- Index for filtering commands that need arguments
CREATE INDEX idx_configs_has_arguments ON configs(has_arguments) WHERE type = 'slash_command';
```

### 2. Domain Types

**File:** `src/domain/types.ts`

Update Config interface and add new types:

```typescript
// Update existing Config interface
export interface Config {
  id: string;
  name: string;
  type: ConfigType;
  original_format: AgentFormat;
  content: string;
  created_at: string;
  updated_at: string;
  // NEW: Slash command metadata (for conversion)
  has_arguments?: boolean;
  argument_hint?: string | null;
  agent_references?: string;  // JSON array stored as string
  skill_references?: string;  // JSON array stored as string
  analysis_version?: string;
}

// Slash command analysis result
export interface SlashCommandAnalysis {
  hasArguments: boolean;
  argumentHint?: string;
  agentReferences: string[];  // Parsed from JSON
  skillReferences: string[];  // Parsed from JSON
}

// Conversion request
export interface SlashCommandConversionInput {
  configId: string;  // Config ID to convert
  userArguments?: string;  // Optional user-provided arguments
}

// Conversion result
export interface SlashCommandConversionResult {
  convertedContent: string;  // Final output without frontmatter
  needsUserInput: boolean;  // True if arguments required but not provided
  analysis: SlashCommandAnalysis;  // Pre-computed analysis
}
```

### 3. New Services

**File:** `src/services/slash-command-analyzer-service.ts`

**Purpose:** Proactively analyze slash commands when created/updated

```typescript
export class SlashCommandAnalyzerService {
  constructor(private aiConverter: AIConverterService) {}

  // Main analysis method (called on create/update)
  async analyze(content: string): Promise<SlashCommandAnalysis> {
    // 1. Parse frontmatter to detect argument-hint
    const hasArguments = this.detectArgumentsFromFrontmatter(content);
    const argumentHint = this.extractArgumentHint(content);

    // 2. Use AI to detect agent/skill references
    const references = await this.detectReferences(content);

    return {
      hasArguments,
      argumentHint,
      agentReferences: references.agents,
      skillReferences: references.skills
    };
  }

  // Detect if command requires arguments from frontmatter
  private detectArgumentsFromFrontmatter(content: string): boolean {
    // Check for "argument-hint:" in frontmatter
    // Check for $ARGUMENTS or $ARGUMENT in content
  }

  // Extract argument hint from frontmatter
  private extractArgumentHint(content: string): string | undefined {
    // Parse YAML frontmatter and extract argument-hint field
  }

  // Use AI to detect agent/skill references
  private async detectReferences(content: string): Promise<{
    agents: string[];
    skills: string[];
  }> {
    // Use GPT-5-mini to scan for **agent-name** and **skill-name** patterns
    // Return arrays of detected names
  }
}
```

**File:** `src/services/slash-command-converter-service.ts`

**Purpose:** Convert slash commands using pre-computed metadata

```typescript
export class SlashCommandConverterService {
  constructor(
    private aiConverter: AIConverterService,
    private configService: ConfigService
  ) {}

  // Main conversion method (uses pre-computed analysis)
  async convert(input: SlashCommandConversionInput): Promise<SlashCommandConversionResult> {
    // 1. Fetch config with metadata
    const config = await this.configService.getById(input.configId);

    // 2. Parse stored analysis
    const analysis = this.parseAnalysis(config);

    // 3. Check if user input needed
    if (analysis.hasArguments && !input.userArguments) {
      return {
        convertedContent: '',
        needsUserInput: true,
        analysis
      };
    }

    // 4. Resolve agent/skill files
    const references = await this.resolveReferences(
      analysis.agentReferences,
      analysis.skillReferences
    );

    // 5. Use AI to determine inlining strategy
    const toInline = await this.determineInliningStrategy(
      config.content,
      references
    );

    // 6. Generate final output
    const convertedContent = await this.generateOutput(
      config.content,
      references,
      toInline,
      input.userArguments
    );

    return {
      convertedContent,
      needsUserInput: false,
      analysis
    };
  }

  // Parse stored analysis from config
  private parseAnalysis(config: Config): SlashCommandAnalysis {
    return {
      hasArguments: config.has_arguments || false,
      argumentHint: config.argument_hint || undefined,
      agentReferences: config.agent_references
        ? JSON.parse(config.agent_references)
        : [],
      skillReferences: config.skill_references
        ? JSON.parse(config.skill_references)
        : []
    };
  }

  // Find and read agent/skill files from ~/.claude
  private async resolveReferences(
    agents: string[],
    skills: string[]
  ): Promise<Map<string, string>> {
    // Read files from file system
  }

  // Use AI to decide what to inline
  private async determineInliningStrategy(
    content: string,
    references: Map<string, string>
  ): Promise<string[]> {
    // AI decides which references to inline
  }

  // Generate final output
  private async generateOutput(
    content: string,
    references: Map<string, string>,
    toInline: string[],
    userArguments?: string
  ): Promise<string> {
    // 1. Remove frontmatter
    // 2. Replace $ARGUMENTS with user input
    // 3. Inline selected references
    // 4. Return clean text
  }

  // Remove YAML frontmatter
  private removeFrontmatter(content: string): string {
    // Reuse logic from slash-command-adapter.ts
  }
}
```

### 4. ConfigService Integration

**File:** `src/services/config-service.ts`

Update create/update methods to trigger analysis for slash commands:

```typescript
export class ConfigService {
  constructor(
    private db: D1Database,
    private analyzer: SlashCommandAnalyzerService  // NEW
  ) {}

  async create(input: CreateConfigInput): Promise<Config> {
    // Generate ID
    const id = nanoid();

    // Analyze if it's a slash command
    let analysis: SlashCommandAnalysis | null = null;
    if (input.type === 'slash_command') {
      analysis = await this.analyzer.analyze(input.content);
    }

    // Insert with metadata
    const result = await this.db.prepare(`
      INSERT INTO configs (
        id, name, type, original_format, content,
        has_arguments, argument_hint, agent_references, skill_references,
        analysis_version, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      input.name,
      input.type,
      input.original_format,
      input.content,
      analysis ? (analysis.hasArguments ? 1 : 0) : null,
      analysis?.argumentHint || null,
      analysis ? JSON.stringify(analysis.agentReferences) : null,
      analysis ? JSON.stringify(analysis.skillReferences) : null,
      analysis ? '1.0' : null,
      now,
      now
    ).run();

    return this.getById(id);
  }

  async update(id: string, input: UpdateConfigInput): Promise<Config> {
    // If content changed and it's a slash command, re-analyze
    let analysis: SlashCommandAnalysis | null = null;
    if (input.content && input.type === 'slash_command') {
      analysis = await this.analyzer.analyze(input.content);
    }

    // Update with new metadata
    const updates: string[] = [];
    const values: any[] = [];

    if (input.name) {
      updates.push('name = ?');
      values.push(input.name);
    }
    // ... other fields

    if (analysis) {
      updates.push('has_arguments = ?');
      values.push(analysis.hasArguments ? 1 : 0);
      updates.push('argument_hint = ?');
      values.push(analysis.argumentHint || null);
      updates.push('agent_references = ?');
      values.push(JSON.stringify(analysis.agentReferences));
      updates.push('skill_references = ?');
      values.push(JSON.stringify(analysis.skillReferences));
      updates.push('analysis_version = ?');
      values.push('1.0');
    }

    // Execute update
    // ...
  }
}
```

### 5. REST API Routes

**New File:** `src/routes/slash-command-converter.ts`

```typescript
import { Hono } from 'hono';

const router = new Hono();

// POST /api/slash-commands/:id/convert
// Convert a slash command config using pre-computed metadata
// Request body: { "userArguments": "optional arguments" }
// Response: { "convertedContent": "...", "needsUserInput": false, "analysis": {...} }
router.post('/:id/convert', async (c) => {
  const configId = c.req.param('id');
  const { userArguments } = await c.req.json();

  const converterService = new SlashCommandConverterService(
    c.env.AI_CONVERTER,
    c.env.CONFIG_SERVICE
  );

  const result = await converterService.convert({
    configId,
    userArguments
  });

  if (result.needsUserInput) {
    return c.json({
      message: 'User input required',
      ...result
    }, 400);
  }

  return c.json(result);
});

// GET /api/slash-commands
// List all slash commands with metadata
router.get('/', async (c) => {
  const configService = c.env.CONFIG_SERVICE;

  // Filter for slash_command type
  const configs = await configService.list({ type: 'slash_command' });

  return c.json({ configs });
});

// GET /api/slash-commands/:id
// Get specific slash command with metadata
router.get('/:id', async (c) => {
  const id = c.req.param('id');
  const configService = c.env.CONFIG_SERVICE;

  const config = await configService.getById(id);

  if (!config || config.type !== 'slash_command') {
    return c.json({ error: 'Slash command not found' }, 404);
  }

  return c.json({ config });
});

export default router;
```

**Update:** `src/index.ts`

```typescript
import slashCommandConverterRouter from './routes/slash-command-converter';

// Mount routes
app.route('/api/slash-commands', slashCommandConverterRouter);
```

### 4. Reference Resolution Logic

**File reading patterns:**

```typescript
// Agent references: ~/.claude/agents/{agent-name}/AGENTS.md
// Skill references: ~/.claude/skills/{skill-name}/SKILL.md

private async resolveReferences(
  agents: string[],
  skills: string[]
): Promise<Map<string, string>> {
  const references = new Map<string, string>();

  // Resolve agents
  for (const agent of agents) {
    const agentPath = path.join(
      process.env.HOME || '/root',
      '.claude',
      'agents',
      agent,
      'AGENTS.md'
    );

    try {
      const content = await fs.readFile(agentPath, 'utf-8');
      references.set(`agent:${agent}`, content);
    } catch (error) {
      // Agent not found - skip or warn
    }
  }

  // Resolve skills
  for (const skill of skills) {
    const skillPath = path.join(
      process.env.HOME || '/root',
      '.claude',
      'skills',
      skill,
      'SKILL.md'
    );

    try {
      const content = await fs.readFile(skillPath, 'utf-8');
      references.set(`skill:${skill}`, content);
    } catch (error) {
      // Skill not found - skip or warn
    }
  }

  return references;
}
```

### 5. AI Analysis Prompts

**For detecting arguments and references:**

```typescript
const analysisPrompt = `
Analyze this Claude Code slash command and determine:

1. Does it require user arguments? (Check for $ARGUMENTS, $ARGUMENT, or argument-hint in frontmatter)
2. What agents does it reference? (Look for **agent-name** patterns or explicit agent mentions)
3. What skills does it reference? (Look for **skill-name** patterns or explicit skill mentions)

Slash command:
${content}

Respond in JSON format:
{
  "hasArguments": boolean,
  "argumentHint": "string or null",
  "agentReferences": ["agent-name-1", "agent-name-2"],
  "skillReferences": ["skill-name-1"]
}
`;
```

**For determining inlining strategy:**

```typescript
const inliningPrompt = `
You are converting a Claude Code slash command for use in a different AI agent (Claude Code Web, Codex, or Gemini).

Original command:
${content}

Available references:
${Array.from(references.keys()).join(', ')}

Determine which references should be:
1. INLINED (include full content in output) - if the command logic depends on them
2. OMITTED (remove mention entirely) - if they're optional or not critical

Consider:
- If the command explicitly calls an agent/skill, inline it
- If it's just a suggestion ("you can use X"), omit it
- If the logic flow depends on it, inline it

Respond in JSON format:
{
  "inline": ["agent:triage", "skill:conventional-commit"],
  "omit": ["agent:web-search-specialist"]
}
`;
```

### 6. Frontmatter Removal

Reuse existing logic from [slash-command-adapter.ts:48-82](src/adapters/slash-command-adapter.ts#L48-L82):

```typescript
private removeFrontmatter(content: string): string {
  const lines = content.trim().split('\n');
  let inFrontMatter = false;
  let frontMatterDone = false;
  const resultLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line === '---' && i === 0) {
      inFrontMatter = true;
      continue;
    }

    if (line === '---' && inFrontMatter) {
      inFrontMatter = false;
      frontMatterDone = true;
      continue;
    }

    if (!inFrontMatter && frontMatterDone) {
      resultLines.push(line);
    }
  }

  return resultLines.join('\n').trim();
}
```

### 7. Error Handling

- `400 Bad Request` - Invalid slash command format, missing content
- `404 Not Found` - Referenced agent/skill files not found (non-blocking, just skip)
- `500 Internal Server Error` - AI conversion failed, file system errors

### 8. Environment Requirements

**No new environment variables needed:**
- Reuse existing `OPENAI_API_KEY`, `ACCOUNT_ID`, `GATEWAY_ID`
- File system access to `~/.claude` (already available in Cloudflare Workers local dev)

**Important:** This feature works in **local development only** - Cloudflare Workers in production don't have file system access to `~/.claude`. For production, would need to:
- Accept file uploads instead of reading from file system
- Or store agents/skills in D1/R2
- **For MVP: Local dev only**

## Frontend changes required

### 1. Slash Command Selection & Conversion UI

**New File:** `src/views/slash-command-converter.ts`

**Page:** `/slash-commands/convert`

**Two-Step Interface:**

**Step 1: Select Slash Command**

```html
<div class="container">
  <h1>Slash Command Converter</h1>
  <p>Convert Claude Code slash commands for use in other AI agents (Claude Code Web, Codex, Gemini)</p>

  <!-- Slash command selection -->
  <div class="form-group">
    <label for="command-select">Select Slash Command</label>
    <select
      id="command-select"
      name="configId"
      hx-get="/slash-commands/converter-form"
      hx-target="#converter-form-section"
      hx-trigger="change">
      <option value="">-- Select a command --</option>
      ${configs.map(c => `
        <option value="${c.id}">${c.name}</option>
      `).join('')}
    </select>
  </div>

  <!-- Dynamic form section (loaded via HTMX) -->
  <div id="converter-form-section">
    <!-- Form will be loaded here based on selected command -->
  </div>
</div>
```

**Step 2: Dynamic Form (Loaded via HTMX)**

```html
<!-- Loaded into #converter-form-section when command selected -->
<div class="converter-form">
  <h2>${config.name}</h2>

  <!-- Analysis info -->
  <div class="analysis-info">
    <p><strong>Analysis:</strong></p>
    <ul>
      <li>Requires arguments: ${config.has_arguments ? 'Yes' : 'No'}</li>
      ${config.agent_references && JSON.parse(config.agent_references).length > 0 ? `
        <li>Agent references: ${JSON.parse(config.agent_references).join(', ')}</li>
      ` : ''}
      ${config.skill_references && JSON.parse(config.skill_references).length > 0 ? `
        <li>Skill references: ${JSON.parse(config.skill_references).join(', ')}</li>
      ` : ''}
    </ul>
  </div>

  <form
    hx-post="/api/slash-commands/${config.id}/convert"
    hx-target="#result-section"
    hx-swap="innerHTML">

    <!-- Conditionally show argument input if has_arguments=true -->
    ${config.has_arguments ? `
      <div class="form-group">
        <label for="userArguments">Arguments *</label>
        <input
          type="text"
          id="userArguments"
          name="userArguments"
          required
          placeholder="${config.argument_hint || 'Enter arguments here...'}"
        />
        <small class="help-text">
          ${config.argument_hint ? `Hint: ${config.argument_hint}` : 'This command requires arguments'}
        </small>
      </div>
    ` : ''}

    <button type="submit" class="btn btn-primary">Convert</button>
  </form>

  <!-- Result section -->
  <div id="result-section" style="margin-top: 2rem">
    <!-- Results will be inserted here via HTMX -->
  </div>
</div>
```

**Result Display:**

```html
<!-- Success response -->
<div class="result-success">
  <h2>Converted Command</h2>

  <!-- Analysis summary -->
  <div class="analysis-info">
    <p><strong>Detected:</strong></p>
    <ul>
      <li>Arguments: ${analysis.hasArguments ? 'Yes' : 'No'}</li>
      <li>Agent references: ${analysis.agentReferences.length}</li>
      <li>Skill references: ${analysis.skillReferences.length}</li>
    </ul>
  </div>

  <!-- Converted content -->
  <div class="converted-content">
    <textarea readonly rows="20" class="output-textarea">${convertedContent}</textarea>
    <button class="btn btn-secondary" onclick="copyToClipboard()">Copy to Clipboard</button>
  </div>
</div>

<!-- Needs user input response -->
<div class="result-needs-input">
  <p class="warning">This command requires arguments. Please provide them in the form above and convert again.</p>
  <p><strong>Hint:</strong> ${analysis.argumentHint}</p>
</div>
```

### 2. JavaScript for Copy and Dynamic Form

**Minimal JavaScript:**

```javascript
// Copy to clipboard
function copyToClipboard() {
  const textarea = document.querySelector('.output-textarea');
  textarea.select();
  document.execCommand('copy');
  alert('Copied to clipboard!');
}

// Show/hide argument section based on analysis
document.body.addEventListener('htmx:afterSwap', (event) => {
  if (event.detail.target.id === 'result-section') {
    const response = JSON.parse(event.detail.xhr.response);

    if (response.needsUserInput) {
      document.getElementById('argument-section').style.display = 'block';
    } else {
      document.getElementById('argument-section').style.display = 'none';
    }
  }
});
```

### 3. Navigation Update

**Update home page** (`src/index.ts`):

```html
<div class="tools-section">
  <h2>Tools</h2>
  <a href="/slash-commands/convert" class="btn">Convert Slash Command</a>
</div>
```

### 4. Styling

**Follow existing CSS patterns:**
- Use same `.btn`, `.form-group`, `.container` classes
- Add new classes:
  - `.result-success` - Success result styling (green border)
  - `.result-needs-input` - Warning styling (yellow border)
  - `.output-textarea` - Monospace font, read-only styling
  - `.analysis-info` - Summary box with background

### 5. Example CSS

```css
.result-success {
  border: 2px solid #4CAF50;
  padding: 1rem;
  border-radius: 4px;
  background-color: #f1f8f4;
}

.result-needs-input {
  border: 2px solid #FFC107;
  padding: 1rem;
  border-radius: 4px;
  background-color: #fff9e6;
}

.output-textarea {
  font-family: 'Monaco', 'Courier New', monospace;
  width: 100%;
  resize: vertical;
  background-color: #f5f5f5;
  border: 1px solid #ddd;
  padding: 0.5rem;
}

.analysis-info {
  background-color: #e3f2fd;
  padding: 0.75rem;
  border-radius: 4px;
  margin-bottom: 1rem;
}
```

## Acceptance Criteria

1. **Database Migration:**
   - [ ] Migration 0006 creates new columns successfully
   - [ ] `has_arguments`, `argument_hint`, `agent_references`, `skill_references`, `analysis_version` columns exist
   - [ ] Index on `has_arguments` created
   - [ ] Existing configs not affected (NULL values for new columns)

2. **Proactive Analysis (on Create/Update):**
   - [ ] Creating slash command triggers automatic analysis
   - [ ] Updating slash command content triggers re-analysis
   - [ ] Analysis results stored in database columns
   - [ ] Non-slash-command configs skip analysis
   - [ ] Analysis failure doesn't block config creation

3. **SlashCommandAnalyzerService:**
   - [ ] Detects arguments from `argument-hint` frontmatter field
   - [ ] Detects `$ARGUMENTS` or `$ARGUMENT` in content
   - [ ] Uses AI to detect agent references (pattern: `**agent-name**`)
   - [ ] Uses AI to detect skill references (pattern: `**skill-name**`)
   - [ ] Returns SlashCommandAnalysis object
   - [ ] Handles malformed frontmatter gracefully

4. **Pre-computed Metadata:**
   - [ ] GET `/api/configs/:id` includes analysis metadata
   - [ ] GET `/api/slash-commands` lists all with metadata
   - [ ] Metadata is JSON-serialized correctly
   - [ ] Analysis version stored for cache invalidation

5. **SlashCommandConverterService:**
   - [ ] Fetches config with pre-computed metadata (no analysis step)
   - [ ] Parses JSON arrays from stored metadata
   - [ ] Returns `needsUserInput=true` if arguments required but not provided
   - [ ] Resolves agent/skill files from `~/.claude`
   - [ ] Uses AI to determine inlining strategy
   - [ ] Generates clean output without frontmatter

6. **Reference Resolution:**
   - [ ] Reads agent files from `~/.claude/agents/{name}/AGENTS.md`
   - [ ] Reads skill files from `~/.claude/skills/{name}/SKILL.md`
   - [ ] Handles missing files gracefully (skip, warn)
   - [ ] Builds map of available references

7. **Content Generation:**
   - [ ] Inlines selected agent/skill content in readable format
   - [ ] Replaces `$ARGUMENTS` with user-provided arguments
   - [ ] Removes YAML frontmatter programmatically
   - [ ] Returns clean, copy-pasteable text
   - [ ] Preserves markdown formatting

8. **API Endpoints:**
   - [ ] POST `/api/slash-commands/:id/convert` with optional userArguments
   - [ ] Returns `convertedContent`, `needsUserInput`, and `analysis`
   - [ ] GET `/api/slash-commands` lists all slash commands
   - [ ] GET `/api/slash-commands/:id` returns config with metadata
   - [ ] 400 if arguments required but not provided
   - [ ] 404 if config not found or not a slash command

9. **Dynamic UI:**
   - [ ] Dropdown lists all slash commands
   - [ ] Selecting command loads form with metadata
   - [ ] Analysis info displayed (args, references detected)
   - [ ] Argument input field shown ONLY if `has_arguments=true`
   - [ ] Argument hint displayed as placeholder/help text
   - [ ] Convert button triggers conversion
   - [ ] Result shows converted content in read-only textarea
   - [ ] "Copy to Clipboard" button works

10. **Error Handling:**
    - [ ] Analysis failure logs warning, stores NULL metadata
    - [ ] Missing reference files log warning, continue conversion
    - [ ] AI failure for inlining strategy falls back to inline all
    - [ ] User-friendly error messages in UI
    - [ ] 400/404/500 responses with clear messages

## Validation

### Backend Testing

**1. Unit Tests (`tests/services/slash-command-converter-service.test.ts`):**

```bash
npm test -- slash-command-converter-service
```

Test cases:
- Detect arguments from frontmatter
- Detect agent references from content
- Detect skill references from content
- Resolve references from file system
- AI analysis returns correct format
- Frontmatter removal works correctly
- Argument replacement works
- End-to-end conversion

**2. Integration Tests (`tests/routes/slash-command-converter.test.ts`):**

```bash
npm test -- routes/slash-command-converter
```

Test cases:
- POST /api/slash-commands/convert with simple command
- POST with command requiring arguments
- POST with command referencing agents
- POST with command referencing skills
- POST with command referencing both
- Error handling for invalid input

### Manual API Testing

**1. Simple Command (No References):**

```bash
curl -X POST http://localhost:8787/api/slash-commands/convert \
  -H "Content-Type: application/json" \
  -d '{
    "content": "---\nname: test\ndescription: A test command\n---\n\nThis is a test command."
  }'
```

**Expected:** Returns converted content without frontmatter

**2. Command with Arguments:**

```bash
curl -X POST http://localhost:8787/api/slash-commands/convert \
  -H "Content-Type: application/json" \
  -d '{
    "content": "---\nname: test\nargument-hint: task description\n---\n\nTask: $ARGUMENTS",
    "userArguments": "Fix the login bug"
  }'
```

**Expected:** Returns content with `$ARGUMENTS` replaced by "Fix the login bug"

**3. Command with Agent Reference:**

```bash
# Using codePlanner command which references triage agent
curl -X POST http://localhost:8787/api/slash-commands/convert \
  -H "Content-Type: application/json" \
  -d @- <<EOF
{
  "content": "$(cat ~/.claude/commands/codePlanner.md)"
}
EOF
```

**Expected:** Returns content with triage agent inlined or omitted based on AI decision

**4. Command with Skill Reference:**

```bash
# Using a command that references a skill
curl -X POST http://localhost:8787/api/slash-commands/convert \
  -H "Content-Type: application/json" \
  -d '{
    "content": "---\nname: test\n---\n\nUse the **conventional-commit** skill to create commit messages."
  }'
```

**Expected:** Returns content with skill either inlined or mention removed

### UI Testing

**1. Navigate to Converter:**
- Go to http://localhost:8787/slash-commands/convert
- Verify form displays correctly

**2. Convert Simple Command:**
- Paste a simple slash command in textarea
- Click "Convert"
- Verify result shows without frontmatter
- Verify "Copy to Clipboard" works

**3. Convert Command with Arguments:**
- Paste codePlanner command
- Verify argument input field appears
- Fill in arguments
- Click "Convert" again
- Verify arguments replaced in output

**4. Convert Command with References:**
- Paste a command mentioning agents/skills
- Click "Convert"
- Verify analysis shows detected references
- Verify output has inlined content or clean removal

### Validation Checklist

- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] Manual API tests work as expected
- [ ] UI displays and functions correctly
- [ ] Copy to clipboard works
- [ ] Arguments replacement works
- [ ] Agent/skill detection works
- [ ] Reference resolution works
- [ ] AI inlining decisions are reasonable
- [ ] Frontmatter removed correctly
- [ ] Error handling works
- [ ] Works in local development environment

### Known Limitations

**Local Development Only:**
- This feature requires file system access to `~/.claude`
- Will NOT work in production Cloudflare Workers
- For production deployment, would need to:
  - Store agents/skills in D1/R2
  - Accept file uploads instead of reading from file system
  - Or make this a CLI tool instead of web service

**MVP Scope:**
- Basic detection of `**agent-name**` and `**skill-name**` patterns
- AI-powered inlining strategy (may not be perfect)
- Simple argument replacement (no complex templating)
- No support for nested references (agents referencing other agents)

## Summary of Proactive Architecture Benefits

**Why Proactive > Reactive:**

1. **Performance** ⚡
   - Analysis done once (on create/update) vs. every conversion
   - Conversion is ~10x faster (no AI analysis step)
   - Pre-computed metadata loads instantly

2. **User Experience** 🎯
   - UI knows what controls to show immediately
   - No waiting for analysis during conversion
   - Argument hints displayed upfront
   - Reference count visible before conversion

3. **Reliability** 🛡️
   - AI failure during create/update is non-blocking (stores NULL)
   - Conversion less dependent on AI availability
   - Metadata can be re-computed on-demand (bump version)

4. **Caching** 💾
   - Database acts as persistent cache
   - No KV needed for analysis results
   - Analysis persists across deployments

5. **Transparency** 📊
   - Users see what will be converted before converting
   - Reference detection visible in UI
   - Argument requirements clear upfront

**Trade-offs:**
- Slightly more complex (database migration required)
- Analysis runs even if user never converts
- Need to handle analysis failures gracefully

**Verdict:** The performance and UX benefits far outweigh the added complexity. Proactive architecture is the right choice.
