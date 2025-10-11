# Adapters

Format converters for transforming configurations between different agent formats.

## Conversion Strategy

- **AI-first with fallback**: `AIEnhancedAdapter` wraps base adapters, tries AI conversion first, falls back to rule-based
- All conversions must preserve semantic meaning
- Return metadata: `{content, usedAI, fallbackUsed}`

## Format Specifications

**Claude Code**: Markdown with YAML frontmatter
```markdown
---
name: command-name
description: Brief description
---
Prompt content
```

**Codex**: AGENTS.md style
```markdown
# command-name
Brief description

## Prompt
Prompt content
```

**Gemini**: TOML format
```toml
description = "Brief description"
prompt = """
Prompt content
"""
args = []  # optional
```

## Parser Rules

- **Claude Code**: Parse frontmatter between `---` markers, prompt is everything after
- **Codex**: `# name`, first non-header line is description, content after `## Prompt` is prompt
- **Gemini**: TOML with triple-quoted strings for multi-line prompts, no name field (derive from description)

## Adding New Formats

1. Add format to `AgentFormat` type in domain
2. Implement parsing and conversion methods in adapter
3. Update factory in `index.ts`
4. Update AI format spec in `infrastructure/ai-converter.ts`
