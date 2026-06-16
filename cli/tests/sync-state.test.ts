import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { join } from 'path';
import { tmpdir } from 'os';
import { existsSync, rmSync, mkdtempSync } from 'fs';
import { stateKey, loadState, getEntry, saveEntry, hasChanges } from '../src/lib/sync-state';

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'aca-state-'));
  process.env.ACA_STATE_FILE = join(dir, 'sync-state.json');
});

afterEach(() => {
  delete process.env.ACA_STATE_FILE;
  if (existsSync(dir)) rmSync(dir, { recursive: true, force: true });
});

describe('stateKey', () => {
  it('isolates by scope, server, and directory', () => {
    const a = stateKey('https://s1', 'global', '/home/me/.claude');
    const b = stateKey('https://s1', 'project', '/home/me/.claude');
    const c = stateKey('https://s2', 'global', '/home/me/.claude');
    const d = stateKey('https://s1', 'global', '/other/.claude');
    expect(new Set([a, b, c, d]).size).toBe(4);
  });

  it('strips trailing slashes from the server URL', () => {
    expect(stateKey('https://s1/', 'global', '/d')).toBe(stateKey('https://s1', 'global', '/d'));
  });
});

describe('saveEntry / getEntry', () => {
  it('round-trips an entry', () => {
    saveEntry('https://s1', 'project', '/proj/.claude', { 'slash_command:deploy': 'h1' }, '2026-01-01T00:00:00Z');
    const entry = getEntry('https://s1', 'project', '/proj/.claude');
    expect(entry).not.toBeNull();
    expect(entry!.configs['slash_command:deploy']).toBe('h1');
    expect(entry!.lastSync).toBe('2026-01-01T00:00:00Z');
  });

  it('does not leak entries across scopes', () => {
    saveEntry('https://s1', 'global', '/d', { 'a:x': 'h' }, 't');
    expect(getEntry('https://s1', 'project', '/d')).toBeNull();
  });

  it('returns empty state when file is missing', () => {
    expect(loadState().entries).toEqual({});
  });
});

describe('hasChanges', () => {
  const entry = { lastSync: 't', configs: { 'a:x': 'h1', 'b:y': 'h2' } };

  it('is true when there is no entry (first run)', () => {
    expect(hasChanges({ 'a:x': 'h1' }, null)).toBe(true);
  });

  it('is false when hashes match exactly', () => {
    expect(hasChanges({ 'a:x': 'h1', 'b:y': 'h2' }, entry)).toBe(false);
  });

  it('is true when a hash changes', () => {
    expect(hasChanges({ 'a:x': 'CHANGED', 'b:y': 'h2' }, entry)).toBe(true);
  });

  it('is true when a config is added', () => {
    expect(hasChanges({ 'a:x': 'h1', 'b:y': 'h2', 'c:z': 'h3' }, entry)).toBe(true);
  });

  it('is true when a config is removed (local deletion)', () => {
    expect(hasChanges({ 'a:x': 'h1' }, entry)).toBe(true);
  });
});
