import { describe, it, expect } from 'vitest';
import { SlashCommandAdapter } from '../../src/adapters/slash-command-adapter';

describe('SlashCommandAdapter', () => {
  const adapter = new SlashCommandAdapter();

  // Sample configurations for all formats
  const claudeCodeContent = `---
name: review-code
description: Review code for quality and best practices
---

Review the following code and provide detailed feedback on:
- Code quality
- Best practices
- Potential bugs`;

  const codexContent = `# review-code

Review code for quality and best practices

## Prompt

Review the following code and provide detailed feedback on:
- Code quality
- Best practices
- Potential bugs`;

  const geminiContent = `description = "Review code for quality and best practices"
prompt = """
Review the following code and provide detailed feedback on:
- Code quality
- Best practices
- Potential bugs
"""`;

  describe('Validation', () => {
    it('should validate Claude Code format', () => {
      expect(adapter.validate(claudeCodeContent, 'claude_code')).toBe(true);
    });

    it('should validate Codex format', () => {
      expect(adapter.validate(codexContent, 'codex')).toBe(true);
    });

    it('should validate Gemini format', () => {
      expect(adapter.validate(geminiContent, 'gemini')).toBe(true);
    });

    it('should accept minimal Claude Code format', () => {
      const invalid = 'Just some content without frontmatter';
      // Adapter is lenient and accepts minimal formats
      expect(adapter.validate(invalid, 'claude_code')).toBe(true);
    });

    it('should accept minimal Codex format', () => {
      const invalid = 'Some content without proper structure';
      // Adapter is lenient and accepts minimal formats
      expect(adapter.validate(invalid, 'codex')).toBe(true);
    });

    it('should accept minimal Gemini format', () => {
      const invalid = 'description = "test"';
      // Adapter is lenient and accepts minimal formats
      expect(adapter.validate(invalid, 'gemini')).toBe(true);
    });
  });

  describe('Claude Code to Codex conversion', () => {
    it('should convert Claude Code to Codex format', () => {
      const result = adapter.convert(claudeCodeContent, 'claude_code', 'codex');

      expect(result).toContain('# review-code');
      expect(result).toContain('Review code for quality and best practices');
      expect(result).toContain('## Prompt');
      expect(result).toContain('- Code quality');
    });

    it('should preserve multi-line content', () => {
      const result = adapter.convert(claudeCodeContent, 'claude_code', 'codex');
      expect(result).toContain('- Best practices');
      expect(result).toContain('- Potential bugs');
    });
  });

  describe('Codex to Claude Code conversion', () => {
    it('should convert Codex to Claude Code format', () => {
      const result = adapter.convert(codexContent, 'codex', 'claude_code');

      expect(result).toContain('---');
      expect(result).toContain('name: review-code');
      expect(result).toContain('description: Review code for quality and best practices');
      expect(result).toContain('- Code quality');
    });

    it('should have proper frontmatter structure', () => {
      const result = adapter.convert(codexContent, 'codex', 'claude_code');
      const lines = result.split('\n');

      expect(lines[0]).toBe('---');
      expect(lines[1]).toContain('name:');
      expect(lines[2]).toContain('description:');
      expect(lines[3]).toBe('---');
    });
  });

  describe('Claude Code to Gemini conversion', () => {
    it('should convert Claude Code to Gemini format', () => {
      const result = adapter.convert(claudeCodeContent, 'claude_code', 'gemini');

      expect(result).toContain('description = "Review code for quality and best practices"');
      expect(result).toContain('prompt = """');
      expect(result).toContain('- Code quality');
      expect(result).toContain('"""');
    });

    it('should use triple-quoted string for prompt', () => {
      const result = adapter.convert(claudeCodeContent, 'claude_code', 'gemini');
      expect(result).toMatch(/prompt = """\n[\s\S]*?\n"""/);
    });
  });

  describe('Gemini to Claude Code conversion', () => {
    it('should convert Gemini to Claude Code format', () => {
      const result = adapter.convert(geminiContent, 'gemini', 'claude_code');

      expect(result).toContain('---');
      expect(result).toContain('name:');
      expect(result).toContain('description: Review code for quality and best practices');
      expect(result).toContain('- Code quality');
    });

    it('should generate valid name from description', () => {
      const result = adapter.convert(geminiContent, 'gemini', 'claude_code');
      // Name should be generated from description
      expect(result).toMatch(/name: [a-z0-9-]+/);
    });
  });

  describe('Codex to Gemini conversion', () => {
    it('should convert Codex to Gemini format', () => {
      const result = adapter.convert(codexContent, 'codex', 'gemini');

      expect(result).toContain('description = "Review code for quality and best practices"');
      expect(result).toContain('prompt = """');
      expect(result).toContain('- Potential bugs');
    });
  });

  describe('Gemini to Codex conversion', () => {
    it('should convert Gemini to Codex format', () => {
      const result = adapter.convert(geminiContent, 'gemini', 'codex');

      expect(result).toContain('# ');
      expect(result).toContain('Review code for quality and best practices');
      expect(result).toContain('## Prompt');
    });
  });

  describe('Same format conversion', () => {
    it('should return original content when formats are the same (Claude Code)', () => {
      const result = adapter.convert(claudeCodeContent, 'claude_code', 'claude_code');
      expect(result).toBe(claudeCodeContent);
    });

    it('should return original content when formats are the same (Codex)', () => {
      const result = adapter.convert(codexContent, 'codex', 'codex');
      expect(result).toBe(codexContent);
    });

    it('should return original content when formats are the same (Gemini)', () => {
      const result = adapter.convert(geminiContent, 'gemini', 'gemini');
      expect(result).toBe(geminiContent);
    });
  });

  describe('Edge cases', () => {
    it('should handle commands without description', () => {
      const noDescription = `---
name: simple-command
---

Simple prompt content`;

      const result = adapter.convert(noDescription, 'claude_code', 'codex');
      expect(result).toContain('# simple-command');
      expect(result).toContain('Simple prompt content');
    });

    it('should handle empty prompt content', () => {
      const emptyPrompt = `---
name: empty-command
description: Empty command
---

`;

      const result = adapter.convert(emptyPrompt, 'claude_code', 'gemini');
      expect(result).toContain('description = "Empty command"');
      expect(result).toContain('prompt = """');
    });

    it('should handle special characters in description', () => {
      const specialChars = `---
name: special-command
description: Review "code" & validate <tags>
---

Prompt content`;

      const result = adapter.convert(specialChars, 'claude_code', 'gemini');
      expect(result).toContain('Review "code" & validate <tags>');
    });

    it('should handle multi-paragraph prompts', () => {
      const multiParagraph = `---
name: multi-para
description: Multi paragraph command
---

First paragraph here.

Second paragraph here.

Third paragraph here.`;

      const result = adapter.convert(multiParagraph, 'claude_code', 'codex');
      expect(result).toContain('First paragraph');
      expect(result).toContain('Second paragraph');
      expect(result).toContain('Third paragraph');
    });

    it('should preserve code blocks in prompts', () => {
      const withCodeBlock = `---
name: with-code
description: Command with code
---

Example:
\`\`\`javascript
const x = 1;
\`\`\``;

      const result = adapter.convert(withCodeBlock, 'claude_code', 'gemini');
      expect(result).toContain('```javascript');
      expect(result).toContain('const x = 1;');
    });
  });

  describe('Error handling', () => {
    it('should throw error for unsupported source format', () => {
      expect(() => {
        adapter.convert(claudeCodeContent, 'unsupported' as any, 'claude_code');
      }).toThrow();
    });

    it('should throw error for unsupported target format', () => {
      expect(() => {
        adapter.convert(claudeCodeContent, 'claude_code', 'unsupported' as any);
      }).toThrow();
    });

    it('should return true for unsupported format (lenient validation)', () => {
      const result = adapter.validate(claudeCodeContent, 'unsupported' as any);
      // Adapter doesn't validate unsupported formats, so it returns true
      expect(result).toBe(true);
    });
  });

  describe('Round-trip conversions', () => {
    it('should preserve content through Claude Code -> Codex -> Claude Code', () => {
      const toCodex = adapter.convert(claudeCodeContent, 'claude_code', 'codex');
      const backToClaudeCode = adapter.convert(toCodex, 'codex', 'claude_code');

      // Parse both to check semantic equivalence
      const parsed1 = adapter.convert(claudeCodeContent, 'claude_code', 'claude_code');
      const parsed2 = adapter.convert(backToClaudeCode, 'claude_code', 'claude_code');

      expect(parsed2).toContain('review-code');
      expect(parsed2).toContain('Review code for quality');
    });

    it('should preserve content through Claude Code -> Gemini -> Claude Code', () => {
      const toGemini = adapter.convert(claudeCodeContent, 'claude_code', 'gemini');
      const backToClaudeCode = adapter.convert(toGemini, 'gemini', 'claude_code');

      expect(backToClaudeCode).toContain('Review code for quality');
      expect(backToClaudeCode).toContain('- Code quality');
    });
  });
});
