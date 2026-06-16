import { describe, it, expect } from 'bun:test';
import { hashConfig, hashConfigs, configKey } from '../src/lib/hash';
import type { LocalConfigInput } from '../src/lib/types';

const base: LocalConfigInput = {
  name: 'deploy',
  type: 'slash_command',
  content: 'Deploy the app',
};

describe('hashConfig', () => {
  it('is deterministic for identical configs', () => {
    expect(hashConfig(base)).toBe(hashConfig({ ...base }));
  });

  it('ignores trailing whitespace / CRLF differences in content', () => {
    const a = hashConfig({ ...base, content: 'Deploy the app' });
    const b = hashConfig({ ...base, content: 'Deploy the app\r\n  ' });
    expect(a).toBe(b);
  });

  it('changes when content changes', () => {
    expect(hashConfig(base)).not.toBe(hashConfig({ ...base, content: 'Deploy v2' }));
  });

  it('changes when name or type changes', () => {
    expect(hashConfig(base)).not.toBe(hashConfig({ ...base, name: 'release' }));
    expect(hashConfig(base)).not.toBe(hashConfig({ ...base, type: 'agent_definition' }));
  });

  it('detects skill companion text changes', () => {
    const skill: LocalConfigInput = {
      name: 'pdf',
      type: 'skill',
      content: '# Skill',
      companionFiles: [{ path: 'helper.py', content: 'print(1)' }],
    };
    const changed: LocalConfigInput = {
      ...skill,
      companionFiles: [{ path: 'helper.py', content: 'print(2)' }],
    };
    expect(hashConfig(skill)).not.toBe(hashConfig(changed));
  });

  it('detects skill companion binary (base64) changes', () => {
    const skill: LocalConfigInput = {
      name: 'pdf',
      type: 'skill',
      content: '# Skill',
      companionFiles: [{ path: 'logo.png', content: 'AAAA', mimeType: 'image/png' }],
    };
    const changed: LocalConfigInput = {
      ...skill,
      companionFiles: [{ path: 'logo.png', content: 'BBBB', mimeType: 'image/png' }],
    };
    expect(hashConfig(skill)).not.toBe(hashConfig(changed));
  });

  it('is stable regardless of companion file ordering', () => {
    const a: LocalConfigInput = {
      name: 'pdf',
      type: 'skill',
      content: '# Skill',
      companionFiles: [
        { path: 'a.py', content: '1' },
        { path: 'b.py', content: '2' },
      ],
    };
    const b: LocalConfigInput = {
      ...a,
      companionFiles: [
        { path: 'b.py', content: '2' },
        { path: 'a.py', content: '1' },
      ],
    };
    expect(hashConfig(a)).toBe(hashConfig(b));
  });

  it('detects adding a companion file', () => {
    const a: LocalConfigInput = { name: 'pdf', type: 'skill', content: '# Skill' };
    const b: LocalConfigInput = { ...a, companionFiles: [{ path: 'x.py', content: '1' }] };
    expect(hashConfig(a)).not.toBe(hashConfig(b));
  });
});

describe('hashConfigs / configKey', () => {
  it('keys by type:name', () => {
    expect(configKey(base)).toBe('slash_command:deploy');
  });

  it('builds a map of key -> hash', () => {
    const map = hashConfigs([base, { name: 'x', type: 'skill', content: 'y' }]);
    expect(Object.keys(map).sort()).toEqual(['skill:x', 'slash_command:deploy']);
    expect(map['slash_command:deploy']).toBe(hashConfig(base));
  });
});
