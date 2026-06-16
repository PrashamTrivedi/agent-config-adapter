/**
 * Config fingerprinting
 * Produces a stable content hash for a local config so `sync` can skip
 * configs that haven't changed since the last sync. For skills the hash folds
 * in every companion file (text and binary), so any companion change flips it.
 */

import { createHash } from 'crypto';
import type { LocalConfigInput } from './types';

function normalize(content: string): string {
  return content.trim().replace(/\r\n/g, '\n');
}

/**
 * SHA-256 hex digest over a canonical serialization of the config:
 * type, name, normalized content, and (for skills) each companion file's
 * path + raw content, sorted by path for stability.
 */
export function hashConfig(config: LocalConfigInput): string {
  const h = createHash('sha256');
  h.update(config.type);
  h.update('\0');
  h.update(config.name);
  h.update('\0');
  h.update(normalize(config.content));

  if (config.companionFiles && config.companionFiles.length > 0) {
    const sorted = [...config.companionFiles].sort((a, b) =>
      a.path < b.path ? -1 : a.path > b.path ? 1 : 0
    );
    for (const file of sorted) {
      h.update('\0file\0');
      h.update(file.path);
      h.update('\0');
      // content is base64 for binary, raw text otherwise — hash as-is so any
      // byte change (including binary assets) flips the digest.
      h.update(file.content);
    }
  }

  return h.digest('hex');
}

/** Map key for a config within a scope: `${type}:${name}`. */
export function configKey(config: { name: string; type: string }): string {
  return `${config.type}:${config.name}`;
}

/** Build a `${type}:${name}` → hash map for a set of local configs. */
export function hashConfigs(configs: LocalConfigInput[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const config of configs) {
    map[configKey(config)] = hashConfig(config);
  }
  return map;
}
