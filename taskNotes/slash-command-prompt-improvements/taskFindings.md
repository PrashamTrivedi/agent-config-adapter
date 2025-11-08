# Purpose

Improve Slash Command Converter prompt for cleaner, more structured output with XML-tagged inlining

## Original Ask

Exact original requirements AS IS:

```
It's just a prompt update. For Slash Command Converter
But here is what I want.

- The inlining of any content should be outside of main prompt and must have external xml tags. E.g. If prompt says `use **conventional commit** skill`, the prompt should also have <Skill-Conventional-Commit> tag, and inside of that tag there will be the content.

- Even if we told in system prompt, there are mentions of Github and git check commands, The sandboxing details are have clear point that the repo is always a github repo checked out in clean state and there is no other access to github. If that's followed properly, the resultant converted prompt will be much lighter.

- How about telling the prompt to trim all the code examples and keep commands?
```

## Complexity and the reason behind it

**Complexity Score: 2/5**

**Reasoning:**
- This is purely a prompt engineering task - no code changes to service logic
- Changes are confined to `buildSystemPrompt()` method in SlashCommandConverterService
- No database schema changes, no new infrastructure
- No new API endpoints or routes
- Testing requires updating test expectations for new output format
- Main complexity is in crafting clear prompt instructions for the new XML structure
- Similar to previous prompt fix task (complexity 2)

## Architectural changes required

None required - this is a prompt-only update:
- Service layer architecture remains unchanged
- Tool support (`read_configs`) remains unchanged
- Database integration remains unchanged
- Output format changes from "single text blob" to "main prompt + XML sections"

## Backend changes required

### 1. Update System Prompt in SlashCommandConverterService

**File:** `src/services/slash-command-converter-service.ts`

**Method:** `buildSystemPrompt()` (lines 254-407)

#### Change 1.1: Update Core Task Section (lines 257-262)

**Current:**
```typescript
<core_task>
Convert Claude Code slash commands to standalone prompts with SURGICAL changes only:
1. Remove YAML frontmatter
2. Replace $ARGUMENT in execution contexts (NOT in explanatory text)
3. Inline critical dependencies (converted from system → user prompt format)
</core_task>
```

**New:**
```typescript
<core_task>
Convert Claude Code slash commands to standalone prompts with SURGICAL changes only:
1. Remove YAML frontmatter
2. Replace $ARGUMENT in execution contexts (NOT in explanatory text)
3. Extract critical dependencies to external XML sections (preserve references in main prompt)

Output Format:
- Main prompt (with references to skills/agents preserved)
- Followed by XML sections for each inlined dependency
</core_task>
```

#### Change 1.2: Update Sandbox Environment Context (lines 265-291)

**Current:**
```typescript
<sandbox_environment_context>
(This section is context for YOU to understand - do NOT add this to the output)

The converted output will run in sandboxed environments that:
- Only have codebase files available
- Are always git repositories
- Have limited network access
- Cannot access GitHub directly
- Cannot read from ~/.claude or similar directories
- **File Browsing Limitation**: The AI agent can read/browse files, but the USER cannot directly browse the file system
  - Best practice: Agent should commit and push changes to a git branch so users can review via git/GitHub UI
  - If the original command instructs "review file X" or "check the output", consider adding git workflow guidance

Use this context to decide:
- Which references need inlining (external dependencies → inline)
- Which contents to strip down (Think, can we have github content since sandbox can't access github directly)
- Which assumptions are safe (git commands → safe)
- What network-dependent features to avoid
- When to add git commit/push guidance (if original command expects user file review)

**Available References in Database:**

To reduce false positives when detecting references:

Agents: ${availableReferences.agents.join(', ')}
Skills: ${availableReferences.skills.join(', ')}
</sandbox_environment_context>
```

**New:**
```typescript
<sandbox_environment_context>
(This section is context for YOU to understand - do NOT add this to the output)

The converted output will run in sandboxed environments that:
- Only have codebase files available
- Are ALWAYS git repositories (checked out in clean state)
- Have limited network access
- Have NO GitHub access (use git commands only)
- Cannot read from ~/.claude or similar external directories
- AI agent can read/browse files, but USER cannot directly browse filesystem unless pushed in the specific branch



Use this context to decide:
- Which references need extracting to XML sections
- Which git/GitHub checks to REMOVE (repo existence is guaranteed)
- What network-dependent features to avoid
- When to suggest git commit/push workflows (always safe)

**Available References in Database:**

To reduce false positives when detecting references:

Agents: ${availableReferences.agents.join(', ')}
Skills: ${availableReferences.skills.join(', ')}
</sandbox_environment_context>
```

#### Change 1.3: Update Agent/Skill Inlining Section (lines 321-371)

**Replace entire section with:**

```typescript
<agent_skill_extraction>
<decision_criteria>
EXTRACT if: Command logic depends on it OR explicitly delegates to it
OMIT if: Just a suggestion or optional reference
</decision_criteria>

<xml_output_format>
When you decide to extract agent/skill content:

1. **Keep reference in main prompt:**
   - Original: "Use **conventional-commit** skill for commits"
   - Main prompt: "Use **conventional-commit** skill for commits" (unchanged)
   - Do NOT inline content into main prompt body

2. **Add XML section AFTER main prompt:**
   Format: `<Skill-Conventional-Commit>content</Skill-Conventional-Commit>`

   Naming convention:
   - Skills: `<Skill-Name>` (capitalize each word, use hyphens)
   - Agents: `<Agent-Name>` (capitalize each word, use hyphens)

   Examples:
   - "conventional-commit" skill → `<Skill-Conventional-Commit>`
   - "web-search-specialist" agent → `<Agent-Web-Search-Specialist>`
   - "triage" agent → `<Agent-Triage>`
   - "qa-validator" agent → `<Agent-Qa-Validator>`

3. **Convert system prompt to user prompt in XML section:**
   ✅ STRIP from XML content:
   - YAML frontmatter (name, description, tools, color)
   - "You are..." identity statements
   - "You excel at..." capability declarations
   - Any personality/expertise descriptions

   ✅ PRESERVE in XML content:
   - ALL procedural content (## Process, steps, instructions)
   - ALL markdown structure (headers, bold, lists)
   - ALL output format specifications
   - ALL behavioral guidance ("Be concise", "Focus on...")
   - ALL examples and edge cases

   ✅ TRIM from XML content:
   - Code examples (remove or simplify to 1-2 lines)
   - Keep command references and command syntax
   - Example: Remove full code blocks, keep "Run `npm test`" or "Use `git status`"
</xml_output_format>

<complete_example>
INPUT (slash command):
```
---
description: Fix bugs in component
argument-hint: component name
---

Analyze the $ARGUMENT component.

Use **triage** agent to identify issues.
Use **conventional-commit** skill for commits.

Test thoroughly before committing.
```

TRIAGE AGENT CONTENT (system prompt):
```
---
name: triage
description: Issue analysis specialist
tools: [Bash, Read, Grep]
---

You are an Expert Technical Triage Specialist with deep expertise...

## Triage Process
1. Identify issue type from error/symptoms
2. Reproduce with minimal steps
3. Find root cause (check logs, inspect browser console)

Example reproduction:
\`\`\`typescript
// Reproduce the bug
const result = brokenFunction();
console.log(result); // Expected: X, Actual: Y
\`\`\`

## Output Format
**ISSUE**: [One line]
**CAUSE**: [Root cause]
**FIX**: [Solution]

Be extremely concise.
```

CONVENTIONAL-COMMIT SKILL CONTENT:
```
---
name: conventional-commit
description: Commit message formatter
---

You are a commit message expert...

## Commit Format
type(scope): message

Types: feat, fix, docs, refactor

Example:
\`\`\`bash
git commit -m "feat(auth): add OAuth2 support"
git commit -m "fix(ui): resolve button alignment"
\`\`\`
```

OUTPUT (with XML extraction):
```
Analyze the authentication component.

Use **triage** agent to identify issues.
Use **conventional-commit** skill for commits.

Test thoroughly before committing.

<Agent-Triage>
## Triage Process
1. Identify issue type from error/symptoms
2. Reproduce with minimal steps
3. Find root cause (check logs, inspect browser console)

## Output Format
**ISSUE**: [One line]
**CAUSE**: [Root cause]
**FIX**: [Solution]

Be extremely concise.
</Agent-Triage>

<Skill-Conventional-Commit>
## Commit Format
type(scope): message

Types: feat, fix, docs, refactor

Commands: `git commit -m "type(scope): message"`
</Skill-Conventional-Commit>
```

Notice what changed:
- ✓ Frontmatter removed
- ✓ $ARGUMENT → "authentication"
- ✓ Main prompt keeps agent/skill references (NOT inlined)
- ✓ XML sections added AFTER main prompt
- ✓ XML naming: `<Agent-Triage>`, `<Skill-Conventional-Commit>`
- ✓ System prompt identity removed from XML content
- ✓ Procedural content preserved in XML
- ✓ Code examples trimmed (kept command syntax only)
</complete_example>
</agent_skill_extraction>
```

#### Change 1.4: Update Preservation Rules (lines 373-390)

**Current section mentions inlining. Update to:**

```typescript
<preservation_rules>
CRITICAL: Keep original command as much as possible

✅ Preserve exactly in MAIN PROMPT:
- Formatting: Bold (**text**), italics, code blocks, XML tags
- Structure: Step numbering, headers, bullet nesting
- Tone: Formal/casual/funny - maintain voice
- Emphasis: IMPORTANT, NEVER, ALWAYS - keep them
- Personality: Jokes, quotes, cultural references
- Details: Examples, edge cases, validation formats
- Agent/skill references: Keep "use **agent-name** agent" as is

❌ Only modify in MAIN PROMPT:
- Frontmatter (remove)
- $ARGUMENT in execution contexts (replace smartly in context)
- Nothing else in main prompt

✅ In XML SECTIONS (extracted agent/skill content):
- Strip system prompt identity ("You are...")
- Preserve all procedural content and structure
- Trim code examples to command syntax only
- Keep all behavioral guidance and output formats

Quality check: < 5% of main prompt content should change (excluding frontmatter)
</preservation_rules>
```

#### Change 1.5: Remove Non-Inlined References Section (lines 392-398)

**Delete this section entirely** - no longer relevant since we're extracting to XML, not inlining into main prompt.

#### Change 1.6: Update Output Format Section (lines 400-406)

**Current:**
```typescript
<output_format>
Return ONLY the converted prompt.
- No explanations
- No code block wrappers
- No preamble
- Just the clean, converted command
</output_format>
```

**New:**
```typescript
<output_format>
Return the converted output in this exact format:

1. Main prompt (with frontmatter removed, $ARGUMENT replaced, references preserved)
2. Blank line
3. XML sections (one per extracted agent/skill)

Structure:
```
[Main prompt content]

<Agent-Name>
[Agent content - system identity removed, procedural content preserved, code examples trimmed]
</Agent-Name>

<Skill-Name>
[Skill content - system identity removed, procedural content preserved, code examples trimmed]
</Skill-Name>
```

- No explanations before or after
- No code block wrappers around the entire output
- No preamble or commentary
- Just: main prompt + XML sections
</output_format>
```

### 2. Update Tests

**File:** `tests/services/slash-command-converter-service.test.ts`

**Changes Required:**
- Update test expectations to match new XML output format
- Verify XML sections are present for extracted references
- Verify main prompt preserves agent/skill references
- Verify code examples are trimmed in XML sections
- Add new test for XML tag naming convention

### 3. Update Frontend UI (Optional)

**File:** `src/views/slash-command-converter.ts`

**Consideration:**
- The converted output now has XML structure
- UI could display main prompt and XML sections separately
- Or keep as-is (single text output) - XML is valid text content
- Recommend keeping as-is for MVP, consider UI improvements later

## Frontend changes required

**Optional Enhancement (not required for MVP):**

If we want to improve UX, we could parse the XML sections and display them separately:

**File:** `src/views/slash-command-converter.ts`

- Add JavaScript to parse XML sections from converted content
- Display main prompt in one section
- Display each XML section in collapsible accordions
- Add "Copy Main Prompt" and "Copy Full Output" buttons

**Recommendation:** Skip this for now, implement in future iteration if users request it.

## Acceptance Criteria

### Prompt Updates

✅ **AC1:** System prompt includes XML extraction instructions
- Given: System prompt is built
- When: buildSystemPrompt() is called
- Then: Prompt includes `<xml_output_format>` section with clear XML structure instructions

✅ **AC2:** System prompt removes redundant git checks
- Given: Sandbox environment context section
- When: Reviewing prompt content
- Then: Prompt states "repo is always present", no instructions to check git existence

✅ **AC3:** System prompt includes code example trimming instructions
- Given: XML extraction section
- When: Reviewing prompt content
- Then: Prompt includes "TRIM code examples, keep commands" instruction

### Conversion Output Format

✅ **AC4:** Main prompt preserves agent/skill references
- Given: Slash command with "use **triage** agent"
- When: Conversion is executed
- Then: Main prompt output contains "use **triage** agent" (not inlined content)

✅ **AC5:** XML sections are added after main prompt
- Given: Slash command references "triage" agent
- When: Conversion is executed with extraction decision
- Then: Output includes `<Agent-Triage>content</Agent-Triage>` after main prompt

✅ **AC6:** XML tag naming follows convention
- Given: Agent "web-search-specialist", skill "conventional-commit"
- When: Conversion extracts these references
- Then: Tags are `<Agent-Web-Search-Specialist>` and `<Skill-Conventional-Commit>`

✅ **AC7:** XML content has system identity stripped
- Given: Agent content starts with "You are an expert..."
- When: Extracted to XML section
- Then: XML content does not include "You are..." statements

✅ **AC8:** XML content preserves procedural content
- Given: Agent has "## Process" section with steps
- When: Extracted to XML section
- Then: XML content includes full "## Process" section with all steps

✅ **AC9:** XML content has code examples trimmed
- Given: Agent content includes 10-line TypeScript code example
- When: Extracted to XML section
- Then: XML content has simplified version or just command reference

✅ **AC10:** Frontmatter and $ARGUMENT handling unchanged
- Given: Slash command with frontmatter and $ARGUMENT
- When: Conversion is executed with user arguments
- Then: Frontmatter removed, $ARGUMENT replaced (existing behavior works)

## Validation

### Unit Tests

**File:** `tests/services/slash-command-converter-service.test.ts`

**Test Cases to Update:**

1. **Update existing test expectations:**
   - Tests currently expect inlined content in main prompt
   - Update to expect XML sections instead
   - Verify main prompt preserves references

2. **New test: XML tag naming convention**
   - Test various agent/skill names (triage, web-search-specialist, qa-validator)
   - Verify correct capitalization and hyphenation
   - Expected: `<Agent-Triage>`, `<Agent-Web-Search-Specialist>`, `<Agent-Qa-Validator>`

3. **New test: Code example trimming**
   - Mock agent with large code block
   - Verify XML section has trimmed version
   - Verify commands/syntax are preserved

4. **New test: System identity removal in XML**
   - Mock agent with "You are..." statement
   - Verify XML section does not include identity
   - Verify procedural content is preserved

5. **New test: Main prompt reference preservation**
   - Slash command with "use **triage** agent"
   - Verify main prompt contains "use **triage** agent"
   - Verify content is NOT inlined into main prompt

### Integration Tests

**Manual Testing with Local Development:**

1. **Setup:**
   ```bash
   npm run dev
   ```

2. **Create test data (if not exists):**
   ```bash
   # Agent with code examples
   curl -X POST http://localhost:8787/api/configs \
     -H "Content-Type: application/json" \
     -d '{
       "name": "triage",
       "type": "agent_definition",
       "original_format": "claude_code",
       "content": "---\nname: triage\n---\n\nYou are a triage expert.\n\n## Process\n1. Reproduce\n2. Analyze\n\nExample:\n```typescript\nconst bug = reproduce();\nconsole.log(bug);\n```"
     }'

   # Skill with commands
   curl -X POST http://localhost:8787/api/configs \
     -H "Content-Type: application/json" \
     -d '{
       "name": "conventional-commit",
       "type": "skill",
       "original_format": "claude_code",
       "content": "## Format\ntype(scope): message\n\nExample:\n```bash\ngit commit -m \"feat: add feature\"\n```"
     }'

   # Slash command with references
   curl -X POST http://localhost:8787/api/configs \
     -H "Content-Type: application/json" \
     -d '{
       "name": "test-xml-extraction",
       "type": "slash_command",
       "original_format": "claude_code",
       "content": "---\nargument-hint: component\n---\n\nAnalyze $ARGUMENT.\n\nUse **triage** agent.\nUse **conventional-commit** skill."
     }'
   ```

3. **Test conversion:**
   ```bash
   # Get slash command ID from step above
   curl -X POST http://localhost:8787/api/slash-commands/<CONFIG_ID>/convert \
     -H "Content-Type: application/json" \
     -d '{ "userArguments": "authentication" }'
   ```

4. **Verify output:**
   - ✅ Main prompt: "Analyze authentication."
   - ✅ Main prompt: "Use **triage** agent." (reference preserved, not inlined)
   - ✅ Main prompt: "Use **conventional-commit** skill." (reference preserved)
   - ✅ XML section: `<Agent-Triage>` with procedural content
   - ✅ XML section: No "You are a triage expert" in agent XML
   - ✅ XML section: Code example trimmed to command syntax only
   - ✅ XML section: `<Skill-Conventional-Commit>` with format content
   - ✅ XML section: Command `git commit -m` preserved

### Verification Commands

**Run tests:**
```bash
npm test
```

**Run tests with coverage:**
```bash
npm test -- --run --coverage
```

**Build check:**
```bash
npm run build
```

**Lint check:**
```bash
npm run lint
```

### Success Criteria

- All unit tests pass with updated expectations
- All integration tests pass
- Manual testing shows XML-structured output
- Main prompt preserves agent/skill references (not inlined)
- XML sections have correct naming convention
- XML content has system identity removed
- XML content has code examples trimmed
- No regressions in argument replacement or frontmatter removal
- TypeScript compilation succeeds
- Linting passes
- Code coverage remains at or above current levels
