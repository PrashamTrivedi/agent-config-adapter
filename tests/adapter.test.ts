import { describe, expect, it, beforeAll } from 'vitest';

import { registerDefaultAdapters } from '@adapters/claudeToOthers';
import { adapters } from '@adapters/registry';

beforeAll(() => {
  registerDefaultAdapters();
});

describe('adapter conversions', () => {
  it('converts claude command to codex format', () => {
    const source = `/build\nCreate build script`;
    const converted = adapters.convert('claude_code', 'codex_agents', source);

    expect(converted).toContain('# Codex Agent Command');
    expect(converted).toContain('/build');
    expect(converted).toContain('Create build script');
  });

  it('converts claude command to jules manifest', () => {
    const source = `/deploy\nRun deployment`;
    const converted = adapters.convert('claude_code', 'jules_manifest', source);
    const parsed = JSON.parse(converted);

    expect(parsed.manifestVersion).toBe('1.0.0');
    expect(parsed.steps).toHaveLength(2);
    expect(parsed.steps[0].action).toBe('deploy');
  });

  it('throws when adapter missing', () => {
    expect(() => adapters.convert('codex_agents', 'jules_manifest', 'data')).toThrow();
  });
});
