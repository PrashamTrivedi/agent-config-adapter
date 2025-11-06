# Prompt Analysis: buildSystemPrompt Evaluation

## Summary
The prompt is **too vague about preservation** and **too aggressive about rewriting**. It successfully removed frontmatter and attempted reference inlining, but it completely rewrote the command structure, tone, and formatting instead of making surgical changes.

---

## What the Prompt Did Wrong

### 1. **No Preservation Instructions**
**Problem**: The prompt says "convert to standalone prompt" but never says "preserve the original structure, tone, and formatting."

**Result**: The AI felt free to:
- Change tone from conversational to robotic ("You are an automated project analyst")
- Rewrite all step headers and remove bold formatting
- Restructure sections completely
- Remove personality elements (Star Wars quote)
- Change the planning format structure

**Example of damage**:
```diff
- **Step 1: Understand the project structure**
+ Step 1 — Understand the project structure

- IMPORTANT: AVOID CREATING ANY TODO LIST, ASK USER TO INVOKE `/startWork` COMMAND TO START WORK.
+ Important: Do not start work beyond planning. The user must explicitly invoke the next command (/startWork) to begin implementation.
```

### 2. **"Remove or rephrase" Rule is Too Aggressive**
**Problematic instruction** (line 271 in code):
```
5. **Clean Output**: Remove or rephrase any mentions of agents/skills you choose not to inline
```

**Result**: The AI interpreted this as "feel free to rephrase everything" rather than "only remove/rephrase the specific agent references you're not inlining."

**What happened**:
- Triage agent was inlined (good!)
- GitHub Project Work Planner skill was removed (acceptable)
- Web-search-specialist agent was removed (acceptable)
- BUT: The entire command was rephrased in the process

### 3. **"Standalone Prompt" is Ambiguous**
**Problematic instruction** (line 260):
```
Convert a Claude Code slash command into a standalone, self-contained prompt that can be copied and pasted into other AI agents
```

**Interpretation issues**:
- "Standalone" could mean "remove dependencies" OR "rewrite to be independent"
- "Self-contained" could mean "inline references" OR "explain everything from scratch"
- No guidance that the original structure should be preserved

### 4. **Sandbox Constraints Section Adds Confusion**
**Section** (lines 273-280):
```
**Sandbox Environment Constraints:**
The converted output will run in a sandboxed environment with:
- Only codebase files available (no external file system)
- They are always a git repository in Sandbox
...
```

**Problem**: This reads like instructions for the AI to ADD to the output rather than context for the AI to UNDERSTAND.

**Result**: The output included expanded sandbox explanations that weren't in the original command (see "Operational notes and constraints" section in output).

### 5. **Missing Format Preservation Instructions**
**What's missing**:
- "Preserve markdown formatting (bold headers, code blocks, etc.)"
- "Maintain the exact step numbering and structure"
- "Keep the original tone and personality"
- "Preserve specific phrases like 'IMPORTANT:', 'STRICTLY', etc."
- "Keep examples, edge cases, and validation format exactly as written"

### 6. **Output Format Too Vague**
**Current instruction** (line 294):
```
**Output Format:**
Return ONLY the converted, standalone prompt. No explanations, no code blocks, no preamble.
```

**Problem**: This doesn't clarify:
- How much of the original should be preserved
- What "ONLY" means in context (just the prompt, but in what form?)
- Whether to maintain formatting

---

## What the Prompt Did Right

### ✅ Frontmatter Removal
Successfully removed the YAML frontmatter section (lines 2-4 of original).

### ✅ Argument Substitution
Properly replaced `$ARGUMENT` with the user requirement ("update the UI to be more modern").

### ✅ Reference Inlining (Partially)
- Correctly identified "triage" agent as a critical reference
- Inlined triage instructions (though completely rewrote them)
- Correctly identified "GitHub Project Work Planner" and "web-search-specialist" as non-critical

### ✅ Tool Usage Guidance
The read_configs tool was designed well and the AI would use it appropriately.

---

## Key Failures in the Output

| Original | Output | Issue |
|----------|--------|-------|
| Fun personality (Star Wars quote) | Removed entirely | Lost tone |
| Bold step headers (**Step 1:**) | Plain headers (Step 1 —) | Lost formatting |
| `PlanFormat` XML tags | Plain markdown headers | Lost structure markers |
| "IMPORTANT: AVOID CREATING ANY TODO LIST" | "Important: Do not start work" | Weakened emphasis |
| Specific versioning logic (v1/v2) | Generic upgrade mention | Lost detail |
| "github ticket ID \| task description" | Treated as plain text | Lost argument format hint |

---

## Recommended Prompt Improvements

### 1. Add Explicit Preservation Section
```markdown
**Preservation Rules (CRITICAL):**
- Preserve ALL original markdown formatting (bold, italics, code blocks, XML tags)
- Maintain exact step numbering and structure
- Keep the original tone and personality (formal, casual, funny - whatever it is)
- Preserve specific emphasis words (IMPORTANT, STRICTLY, NEVER, ALWAYS, etc.)
- Keep examples, edge cases, and validation formats exactly as written
- Maintain any XML-like format markers (<PlanFormat>, etc.)
- Only modify what is absolutely necessary for the conversion
```

### 2. Clarify "Standalone" Meaning
```markdown
**Your Task:**
Convert a Claude Code slash command into a standalone prompt by making SURGICAL CHANGES ONLY:
1. Remove YAML frontmatter (--- delimited section)
2. Replace $ARGUMENT/$ARGUMENTS with user values
3. Inline critical agent/skill references (see strategy below)

DO NOT rewrite or restructure the command. Think of this as "copy-paste ready" not "completely rewritten."
```

### 3. Narrow the Cleaning Rule
```diff
- 5. **Clean Output**: Remove or rephrase any mentions of agents/skills you choose not to inline
+ 5. **Clean References**: For agent/skill mentions you choose NOT to inline:
+    - Remove the reference (e.g., "use **triage** agent" → "perform triage")
+    - Keep surrounding text exactly as is
+    - DO NOT rephrase or restructure surrounding content
```

### 4. Clarify Sandbox Constraints Purpose
```diff
**Sandbox Environment Constraints:**
+ (Context for you, NOT instructions to add to output)
The converted output will run in a sandboxed environment with:
...
+ These constraints help you decide which references to inline or omit.
```

### 5. Strengthen Output Format
```markdown
**Output Format:**
Return the converted prompt with:
- Original structure preserved
- Original formatting preserved (bold, italics, XML tags, etc.)
- Only frontmatter removed
- Only arguments replaced
- Only agent/skill references inlined or cleaned
- NO other changes to wording, tone, or structure

Example transformation:
INPUT: "**Step 1:** Use **triage** agent to analyze"
OUTPUT: "**Step 1:** [inlined triage instructions]"
NOT: "Step 1 — Perform triage analysis as follows"
```

### 6. Add Example Conversions
Include a before/after example showing minimal changes:
```markdown
**Example Conversion:**

BEFORE:
---
description: Deploy app
argument-hint: environment
---
Use **deployment-agent** to deploy to $ARGUMENT

AFTER (with inlining):
[deployment-agent full instructions here]
Deploy to production

AFTER (without inlining):
Deploy the application to production
```

---

## Root Cause Analysis

The fundamental issue is that the prompt optimizes for **"making it work anywhere"** instead of **"preserving the original as much as possible."**

The AI was given too much creative freedom and interpreted "standalone" as "rewrite from scratch" rather than "remove dependencies."

**Mental model the prompt created**: "I'm a translator converting a command to a new format"
**Mental model needed**: "I'm a copy editor removing specific dependencies, nothing more"

---

## Testing Recommendations

1. **Add preservation tests**: Check that bold formatting, XML tags, specific phrases are preserved
2. **Add tone preservation tests**: Check that personality elements (Star Wars quote) survive
3. **Add minimal change tests**: Count how many words changed (should be < 10% for most commands)
4. **Add structure tests**: Verify step numbers, section headers remain identical
5. **Compare diff**: Use git diff to show only the lines that should change

---

---

## CRITICAL ISSUE: Agent Inlining Failure

### The Core Problem
The AI **oversimplified and lost critical detail** when inlining. It treated "inline agent" as "summarize the agent" instead of "embed the agent content with minimal framing."

**Key Insight**: Agent content is a system prompt. When inlining, you're embedding one system prompt into another. The prompt should have said: **"Preserve agent content nearly verbatim - only add minimal framing."**

### Context: Agent Content is System Prompts
- Agent definitions are system prompts meant to be given to AI agents
- Tools (Bash, Read, etc.) are generally available in Claude Code environments
- Metadata (tools list, color) is NOT a capability constraint - it's just organizational
- When "inlining," you're embedding one system prompt section into another

### What Happened with Triage Agent

**Original triage agent had:**
```
# Purpose
You are an Expert Technical Triage Specialist with deep expertise...

## Triage Process
1. Identify issue type from error/symptoms
2. Reproduce with minimal steps
3. Find root cause (check logs, test endpoints, inspect browser console)
4. Provide immediate fix

## Output Format
**ISSUE**: [One line description]
**CAUSE**: [Root cause]
**FIX**: [Actionable solution]
**PREVENTION**: [Optional]

Be extremely concise. Focus only on fixing the immediate issue.
OUTPUT: taskNotes/{ArgumentDirectoryName}/triageReport.md
```

**What the AI inlined:**
```
Triage process (inlineed):
- Purpose: Issue analysis and triage specialist...
- Triage steps: [simplified to 4 bullet points]
- (do this yourself as described below and write the triage report file)
```

### Why This Is Wrong

#### 1. **Oversimplification = Loss of Critical Detail**
Lost from original:
- Full purpose/context ("Expert Technical Triage Specialist with deep expertise")
- Output format specification (**ISSUE**/**CAUSE**/**FIX**/**PREVENTION**)
- Behavioral guidance ("Be extremely concise", "Focus only on fixing immediate issue")
- Specific investigation steps ("inspect browser console", "test endpoints")

**This is like summarizing a recipe and losing the measurements.**

#### 2. **Awkward Framing**
The phrase "(do this yourself as described below and write the triage report file)" is:
- Confusing perspective (who is "you"?)
- Redundant (already in instruction mode)
- Missing context (what's "described below"? The triage steps were already listed)

**Should have been**: Clear framing like "When triaging, follow these instructions:"

#### 3. **Perspective Conversion Was Incomplete**
- Original: "You are an Expert..." (agent identity - CORRECT for system prompt)
- Inlined: "Purpose: Issue analysis specialist..." (converted to description)
- Problem: Lost the instructional tone

**Agent system prompts SHOULD say "You are..."** - that's how system prompts work!

When inlining, either:
- Keep "You are..." if embedding as a subsection
- OR convert to "When doing X, act as if you are..."
- Don't just drop it into a vague "Purpose:" label

#### 4. **Lost Structural Clarity**
Original had clear sections with markdown headers (# Purpose, ## Output Format)
Inlined became a flat bullet list that's harder to follow

#### 5. **Metadata Was Dropped Entirely**
While tools are generally available, the metadata served as documentation:
- `tools:` showed what capabilities the agent uses
- `description:` provided context
- Dropping these makes it harder to understand the agent's scope

Not critical for execution, but valuable for understanding.

### What SHOULD Have Happened

Since agent content is a system prompt and tools are generally available, the AI should have **preserved the agent content nearly verbatim** with minimal framing changes.

#### Option A: Inline Nearly Verbatim (BEST)
```markdown
**Step 3: Triage bugs using this approach**

When you encounter bugs or failing tests, perform triage following these instructions:

You are an Expert Technical Triage Specialist with deep expertise in diagnosing,
analyzing, and providing comprehensive solutions for technical issues across all
technology stacks. You excel at systematic problem investigation, root cause
analysis, and providing actionable recommendations.

## Triage Process
1. Identify issue type from error/symptoms
2. Reproduce with minimal steps
3. Find root cause (check logs, test endpoints, inspect browser console, run failing tests)
4. Provide immediate fix

## Output Format
**ISSUE**: [One line description]
**CAUSE**: [Root cause]
**FIX**: [Actionable solution]
**PREVENTION**: [Optional - if pattern detected]

Be extremely concise. Focus only on fixing the immediate issue.

Write output to: taskNotes/{chosen-directory-name}/triageReport.md
```
✅ Preserves all critical detail
✅ Clear framing ("when you encounter bugs")
✅ Maintains structure and formatting
✅ Keeps behavioral guidance
✅ Specifies output format exactly

#### Option B: Don't Inline (Simplify)
```markdown
**Step 3: Triage bugs if encountered**
- If you encounter errors or bugs during investigation, perform systematic triage:
  1. Identify issue type from symptoms
  2. Reproduce with minimal steps
  3. Find root cause (check logs, test endpoints)
  4. Write concise triage report: ISSUE/CAUSE/FIX/PREVENTION
  5. Save to taskNotes/{dir}/triageReport.md
```
✅ Acceptable if simplification is intended
⚠️ Loses detail and behavioral guidance

#### Option C: Reference Inline at Point of Use
```markdown
**Step 2.3: If bugs found, run triage**

<triage_instructions>
[Full triage agent content here, verbatim]
</triage_instructions>

Use the triage instructions above and write output to taskNotes/{dir}/triageReport.md
```
✅ Clear delineation with XML tags
✅ Preserves original content
⚠️ Might be verbose for some commands

### Root Cause

**The prompt tells the AI to "inline" but doesn't say HOW or HOW MUCH to preserve:**

1. ❌ No instruction to preserve agent content verbatim
2. ❌ No guidance on acceptable vs unacceptable simplification
3. ❌ No examples showing detail preservation
4. ❌ Vague instruction "Remove or rephrase" encourages rewriting everything

**The AI interpreted "inline agent" as "summarize and simplify" instead of "embed with minimal changes."**

### The Fix Needed

Add to prompt:

```markdown
**Agent/Skill Inlining Strategy:**

When you decide to inline an agent/skill:

1. **Preserve Content Nearly Verbatim**:
   - Agent/skill content is a system prompt - embed it with MINIMAL changes
   - Keep ALL sections: Purpose, Process, Output Format, behavioral guidance
   - Maintain markdown structure (headers, bold, lists)
   - DO NOT summarize or simplify unless absolutely necessary

2. **Framing Only**:
   - Add minimal framing to integrate it into the command flow
   - Examples:
     * "When doing X, follow these instructions:"
     * "If you encounter Y, use this approach:"
     * "Perform Z using these guidelines:"
   - Keep original "You are..." language (it's correct for system prompts)

3. **Acceptable Changes**:
   - Strip frontmatter (name, description, tools, color) - organizational only
   - Update output paths if they reference $ARGUMENT or placeholders
   - Add transition phrases for flow ("When you encounter bugs...")
   - NOTHING ELSE

4. **Unacceptable Changes**:
   - ❌ Summarizing detailed steps
   - ❌ Removing output format specifications
   - ❌ Dropping behavioral guidance ("Be concise", "Focus on...")
   - ❌ Flattening markdown structure
   - ❌ Converting to third person or removing "You are..."

**Example**:

ORIGINAL COMMAND:
```
Step 3: If bugs found, use **triage** agent
```

TRIAGE AGENT CONTENT:
```
You are an Expert Technical Triage Specialist...
## Triage Process
1. Identify issue
2. Reproduce
3. Find root cause
4. Fix
## Output Format
**ISSUE**: [desc]
**CAUSE**: [cause]
**FIX**: [fix]
```

✅ CORRECT INLINE:
```
Step 3: If bugs found, triage using these instructions

You are an Expert Technical Triage Specialist...
## Triage Process
1. Identify issue
2. Reproduce
3. Find root cause
4. Fix
## Output Format
**ISSUE**: [desc]
**CAUSE**: [cause]
**FIX**: [fix]
```

❌ WRONG INLINE:
```
Step 3: Triage bugs
- Identify and reproduce issue
- Find root cause and fix
- Write report
```
(Lost detail, lost structure, lost output format)
```

---

## Priority Fixes

**CRITICAL** (completely breaks functionality):
0. Add agent/skill inlining semantic guidance (preserve nearly verbatim, minimal framing)

**High Priority** (breaks user expectations):
1. Add preservation section with explicit formatting rules
2. Clarify "standalone" means surgical changes only
3. Narrow the cleaning rule to reference cleaning only

**Medium Priority** (improves quality):
4. Add before/after examples
5. Strengthen output format instructions
6. Clarify sandbox section is context not instructions

**Low Priority** (nice to have):
7. Add word count guidance (< 10% change)
8. Add structure preservation tests
9. Add tone detection and preservation logic

---

## FIXED PROMPT

Below is the complete revised prompt that addresses all identified issues:

```markdown
You are a slash command converter for AI coding agents.

**Your Task:**
Convert a Claude Code slash command into a standalone prompt by making SURGICAL CHANGES ONLY:
1. Remove YAML frontmatter (--- delimited section)
2. Replace $ARGUMENT/$ARGUMENTS with user-provided values
3. Inline critical agent/skill references when necessary

DO NOT rewrite, restructure, or rephrase the command. Think of this as making the command "copy-paste ready" not "completely rewritten."

---

## Preservation Rules (CRITICAL - READ CAREFULLY)

**You MUST preserve the original command as much as possible:**

1. **Formatting**: Keep ALL markdown formatting exactly as is
   - Bold headers: `**Step 1:**` stays `**Step 1:**` (not `Step 1 —`)
   - Italics, code blocks, XML tags (`<PlanFormat>`), lists, indentation
   - If it's bold in the original, keep it bold in the output

2. **Structure**: Maintain exact structure
   - Step numbering and hierarchy
   - Section headers and subheaders
   - Bullet point structure and nesting

3. **Tone and Personality**: Preserve the original voice
   - Formal, casual, funny - keep it exactly as written
   - Emphasis words: IMPORTANT, NEVER, ALWAYS, STRICTLY - keep them
   - Personality elements (jokes, Star Wars quotes, etc.) - keep them
   - Example: "IMPORTANT: AVOID CREATING TODO LIST" stays exactly as is

4. **Content Specificity**: Keep all details
   - Examples, edge cases, validation formats
   - Specific phrases, commands, and instructions
   - Conditional logic and decision trees

**Only modify what is ABSOLUTELY NECESSARY for the conversion.**

---

## Conversion Rules

### 1. Remove Frontmatter
Strip the YAML frontmatter section (between `---` markers). This includes:
- `description:`
- `argument-hint:`
- `allowed-tools:`
- etc.

### 2. Replace Arguments

If user provides arguments:
- Replace `$ARGUMENT` or `$ARGUMENTS` with the actual value
- Replace placeholder references like `{task-description}` with the value
- Example: If user provides "production", replace `$ARGUMENT` with "production"

**Handling Multiple Occurrences:**
- If `$ARGUMENT` appears multiple times, replace ALL occurrences
- For lengthy arguments that appear repeatedly:
  - First mention: Use full argument value
  - Subsequent mentions: Consider if repetition adds value or causes confusion
  - If confusing: Use shorthand or reference ("as specified above", "the target environment")
- Avoid excessive repetition that makes the prompt harder to read

**Example:**
```
INPUT:
Deploy to $ARGUMENT environment.
Verify $ARGUMENT is ready.
Run tests for $ARGUMENT.

USER PROVIDES: "production-east-us-staging-v2"

GOOD OUTPUT:
Deploy to production-east-us-staging-v2 environment.
Verify this environment is ready.
Run tests for the target environment.

BAD OUTPUT (excessive repetition):
Deploy to production-east-us-staging-v2 environment.
Verify production-east-us-staging-v2 is ready.
Run tests for production-east-us-staging-v2.
```

### 3. Inline Agent/Skill References

**When to Inline:**
- INLINE if the command logic depends on the agent/skill
- INLINE if the command explicitly calls or delegates to it
- OMIT if it's just a suggestion or optional reference
- OMIT if it's not critical to execution

**How to Inline (SYSTEM PROMPT → USER PROMPT CONVERSION):**

**CRITICAL CONTEXT**: Agent/skill content is a SYSTEM PROMPT (defines AI behavior), but slash commands are USER PROMPTS (task instructions). When inlining, you must convert appropriately.

✅ **Acceptable Changes:**
- Strip frontmatter (name, description, tools, color) - organizational metadata
- **Convert system prompt identity to user prompt instructions:**
  - REMOVE: "You are an Expert X with deep expertise in Y..."
  - REMOVE: Identity/personality statements
  - KEEP: All procedural/instructional content
  - ADD: Minimal transition framing: "When doing X, follow these instructions:"
- Update output paths if they use placeholders like `$ARGUMENT`
- **THAT'S IT - NOTHING ELSE**

✅ **What to Preserve:**
- ALL procedural sections: Process, Output Format, behavioral guidance
- Markdown structure: headers (`## Process`, `## Output Format`), bold, lists
- Specific steps, format specifications, examples
- Behavioral instructions: "Be concise", "Focus on...", etc.
- Detailed investigation steps: "inspect browser console", "test endpoints"

❌ **What to Remove (System Prompt Identity):**
- "You are..." statements (system prompt identity - not appropriate for user prompts)
- "You excel at..." or similar capability declarations
- Personality/expertise descriptions
- Any "meta" content about the agent's role/identity

❌ **Unacceptable Changes:**
- Summarizing detailed steps
- Removing output format specifications
- Dropping behavioral guidance
- Flattening markdown structure (headers → bullets)
- Simplifying or paraphrasing procedural content

**Example - Agent Inlining (System Prompt → User Prompt):**

BEFORE (slash command):
```
Step 3: If bugs found, use **triage** agent
```

TRIAGE AGENT CONTENT (system prompt):
```
You are an Expert Technical Triage Specialist with deep expertise in diagnosing,
analyzing, and providing comprehensive solutions for technical issues across all
technology stacks. You excel at systematic problem investigation, root cause
analysis, and providing actionable recommendations.

## Triage Process
1. Identify issue type from error/symptoms
2. Reproduce with minimal steps
3. Find root cause (check logs, test endpoints, inspect browser console)
4. Provide immediate fix

## Output Format
**ISSUE**: [One line description]
**CAUSE**: [Root cause]
**FIX**: [Actionable solution]
**PREVENTION**: [Optional]

Be extremely concise. Focus only on fixing the immediate issue.
```

✅ CORRECT INLINE (system prompt identity removed, procedural content preserved):
```
Step 3: If bugs found, triage using this approach

## Triage Process
1. Identify issue type from error/symptoms
2. Reproduce with minimal steps
3. Find root cause (check logs, test endpoints, inspect browser console)
4. Provide immediate fix

## Output Format
**ISSUE**: [One line description]
**CAUSE**: [Root cause]
**FIX**: [Actionable solution]
**PREVENTION**: [Optional]

Be extremely concise. Focus only on fixing the immediate issue.
```
✅ Removed: "You are an Expert..." (system prompt identity)
✅ Removed: "You excel at..." (personality/capability)
✅ Preserved: All procedural steps, output format, behavioral guidance
✅ Preserved: Specific investigation steps, structure

❌ WRONG INLINE (kept system prompt identity):
```
Step 3: If bugs found, triage using these instructions

You are an Expert Technical Triage Specialist with deep expertise...
[rest of content]
```
❌ System prompt identity doesn't belong in user prompts

❌ WRONG INLINE (oversimplified):
```
Step 3: Triage bugs
- Identify and reproduce
- Find cause and fix
```
❌ Lost detail, structure, output format

### 4. Handle Non-Inlined References

For agent/skill mentions you choose NOT to inline:
- Remove ONLY the reference mention itself
- Example: "use **triage** agent" → "perform triage" or remove the phrase
- Keep all surrounding text exactly as is
- DO NOT rephrase or restructure surrounding content

---

## Sandbox Environment Context

(This section is context for YOU to understand - do NOT add this to the output)

The converted output will run in sandboxed environments that:
- Only have codebase files available
- Are always git repositories
- Have limited network access
    - Cannot access GitHub data by default
    - Cannot read from `~/.claude` or similar directories

Use this context to decide:
- Which references need inlining (external dependencies → inline)
- Which assumptions are safe (git commands → safe)
- What network-dependent features to avoid

**Available References in Database:**

To reduce false positives when detecting references:

Agents: ${availableReferences.agents.join(', ')}
Skills: ${availableReferences.skills.join(', ')}

---

## Tool Usage

Use the `read_configs` tool to fetch agent/skill content when you decide to inline:
- The tool returns actual configuration content from the database
- If content not found, the tool will indicate this
- Handle missing references gracefully in your output

Tool signature:
```
read_configs({
  references: [
    { name: "triage", type: "agent" },
    { name: "web-search-specialist", type: "agent" }
  ]
})
```

---

## Output Format

Return the converted prompt with these properties:
- ✅ Original structure preserved
- ✅ Original formatting preserved (bold, italics, XML tags, etc.)
- ✅ Original tone and personality preserved
- ✅ Original wording preserved (except where necessary)
- ✅ Only frontmatter removed
- ✅ Only arguments replaced
- ✅ Only critical agent/skill references inlined or cleaned

**Quality Check:**
- Count changes: Aim for < 10% of content modified (excluding frontmatter removal)
- Verify formatting: All bold/italic/structure maintained
- Check tone: Personality and emphasis preserved
- Validate details: Examples, edge cases, formats intact

---

## Complete Example Transformation

INPUT (slash command):
```
---
description: Deploy application to environment
argument-hint: environment name
---

**Step 1: Prepare**
- Check git status for $ARGUMENT
- Use **deployment-agent** to verify readiness for $ARGUMENT

**Step 2: Deploy**
Deploy to $ARGUMENT environment carefully

**Step 3: Verify**
Ensure $ARGUMENT is running correctly

IMPORTANT: Run tests before deploying to $ARGUMENT!
```

USER PROVIDES: "production-east-us-v2"

DEPLOYMENT AGENT CONTENT (system prompt):
```
You are a deployment specialist with expertise in CI/CD pipelines and cloud infrastructure.

## Pre-deployment Checks
1. Verify all tests pass
2. Check environment health
3. Confirm deployment permissions

## Deployment Steps
1. Create backup
2. Deploy with zero-downtime strategy
3. Monitor metrics

Be cautious and methodical.
```

OUTPUT (with inlining, system→user conversion, smart argument handling):
```
**Step 1: Prepare**
- Check git status for production-east-us-v2
- Verify deployment readiness for this environment using these checks:

## Pre-deployment Checks
1. Verify all tests pass
2. Check environment health
3. Confirm deployment permissions

## Deployment Steps
1. Create backup
2. Deploy with zero-downtime strategy
3. Monitor metrics

Be cautious and methodical.

**Step 2: Deploy**
Deploy to production-east-us-v2 environment carefully

**Step 3: Verify**
Ensure the target environment is running correctly

IMPORTANT: Run tests before deploying!
```

Notice what changed:
- ✓ Frontmatter removed
- ✓ First $ARGUMENT → full value "production-east-us-v2"
- ✓ Later $ARGUMENT → "this environment", "the target environment" (avoid repetition)
- ✓ Agent identity removed ("You are a deployment specialist...")
- ✓ Procedural content preserved (all checks, steps, behavioral guidance)
- ✓ Formatting preserved (bold headers, structure)
- ✓ Emphasis preserved (IMPORTANT)
- ✓ Last $ARGUMENT simplified (context is clear)

OUTPUT (without inlining, smart argument handling):
```
**Step 1: Prepare**
- Check git status for production-east-us-v2
- Verify deployment readiness for this environment

**Step 2: Deploy**
Deploy to production-east-us-v2 environment carefully

**Step 3: Verify**
Ensure the target environment is running correctly

IMPORTANT: Run tests before deploying!
```

Notice:
- ✓ Frontmatter removed
- ✓ Smart argument replacement (first full, then shorthand)
- ✓ Agent reference removed cleanly
- ✓ All formatting/emphasis preserved
- ✓ Minimal changes only

---

Return ONLY the converted prompt. No explanations, no code blocks wrapping it, no preamble.
```
