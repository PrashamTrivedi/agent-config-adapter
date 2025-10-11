import { AgentFormat, ClaudeCodeSlashCommand } from '../domain/types';
import { FormatAdapter } from './types';

export class SlashCommandAdapter implements FormatAdapter {
  convert(content: string, sourceFormat: AgentFormat, targetFormat: AgentFormat): string {
    if (sourceFormat === targetFormat) return content;

    // Parse source format
    let parsed: ClaudeCodeSlashCommand;

    if (sourceFormat === 'claude_code') {
      parsed = this.parseClaudeCode(content);
    } else if (sourceFormat === 'codex') {
      parsed = this.parseCodex(content);
    } else if (sourceFormat === 'jules') {
      // Jules uses similar format to Codex for now
      parsed = this.parseCodex(content);
    } else {
      throw new Error(`Unsupported source format: ${sourceFormat}`);
    }

    // Convert to target format
    if (targetFormat === 'claude_code') {
      return this.toClaudeCode(parsed);
    } else if (targetFormat === 'codex') {
      return this.toCodex(parsed);
    } else if (targetFormat === 'jules') {
      // Jules uses similar format to Codex for now
      return this.toCodex(parsed);
    } else {
      throw new Error(`Unsupported target format: ${targetFormat}`);
    }
  }

  validate(content: string, format: AgentFormat): boolean {
    try {
      if (format === 'claude_code') {
        this.parseClaudeCode(content);
      } else if (format === 'codex') {
        this.parseCodex(content);
      } else if (format === 'jules') {
        this.parseCodex(content); // Jules uses similar format
      }
      return true;
    } catch {
      return false;
    }
  }

  private parseClaudeCode(content: string): ClaudeCodeSlashCommand {
    // Claude Code format is markdown with front matter
    const lines = content.trim().split('\n');
    let name = '';
    let description = '';
    let prompt = '';
    let inFrontMatter = false;
    let frontMatterDone = false;

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

      if (inFrontMatter) {
        if (line.startsWith('name:')) {
          name = line.substring(5).trim();
        } else if (line.startsWith('description:')) {
          description = line.substring(12).trim();
        }
      } else if (frontMatterDone) {
        prompt += (prompt ? '\n' : '') + line;
      }
    }

    return { name, description, prompt: prompt.trim() };
  }

  private parseCodex(content: string): ClaudeCodeSlashCommand {
    // Codex format uses AGENTS.md style sections
    const lines = content.trim().split('\n');
    let name = '';
    let description = '';
    let prompt = '';

    for (const line of lines) {
      if (line.startsWith('# ')) {
        name = line.substring(2).trim();
      } else if (line.startsWith('## Description')) {
        continue;
      } else if (line.startsWith('## Prompt')) {
        continue;
      } else if (description === '' && name !== '' && !line.startsWith('#')) {
        description = line.trim();
      } else if (name !== '' && description !== '') {
        prompt += (prompt ? '\n' : '') + line;
      }
    }

    return { name, description, prompt: prompt.trim() };
  }

  private toClaudeCode(parsed: ClaudeCodeSlashCommand): string {
    let result = '---\n';
    result += `name: ${parsed.name}\n`;
    if (parsed.description) {
      result += `description: ${parsed.description}\n`;
    }
    result += '---\n\n';
    result += parsed.prompt;
    return result;
  }

  private toCodex(parsed: ClaudeCodeSlashCommand): string {
    let result = `# ${parsed.name}\n\n`;
    if (parsed.description) {
      result += `${parsed.description}\n\n`;
    }
    result += `## Prompt\n\n${parsed.prompt}`;
    return result;
  }
}
