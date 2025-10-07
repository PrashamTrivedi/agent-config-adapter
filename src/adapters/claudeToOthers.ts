import type { ConfigFormat } from '@domain/config';

import { adapters } from './registry';

const formatTitle = (title: string): string => `# ${title}`;

const wrapSection = (heading: string, body: string): string => `${heading}\n\n${body.trim()}\n`;

const convertClaudeToCodex = (input: string): string => {
  const lines = input.trim().split(/\r?\n/).map((line) => line.trim());
  const name = lines[0]?.replace(/^\//, '') ?? 'claude-command';
  const description = lines.slice(1).join('\n');

  return [
    formatTitle('Codex Agent Command'),
    wrapSection('## Command', `/${name}`),
    wrapSection('## Description', description || 'No description provided'),
  ]
    .filter(Boolean)
    .join('\n');
};

const convertClaudeToJules = (input: string): string => {
  const payload = {
    manifestVersion: '1.0.0',
    name: 'claude-imported-command',
    description: 'Converted from Claude Code slash command',
    steps: input
      .trim()
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line, index) => ({
        id: `step-${index + 1}`,
        action: line.replace(/^\//, ''),
      })),
  };

  return JSON.stringify(payload, null, 2);
};

const register = (from: ConfigFormat, to: ConfigFormat, fn: (input: string) => string): void => {
  adapters.register(from, to, fn);
};

export const registerDefaultAdapters = (): void => {
  register('claude_code', 'codex_agents', convertClaudeToCodex);
  register('claude_code', 'jules_manifest', convertClaudeToJules);
};
