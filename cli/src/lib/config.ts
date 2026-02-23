/**
 * Config file management
 * Reads/writes ~/.config/aca/config.json
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import type { CLIConfig } from './types';

const CONFIG_DIR = join(homedir(), '.config', 'aca');
const CONFIG_FILE = join(CONFIG_DIR, 'config.json');

const DEFAULT_SERVER_URL = 'https://agent-config-adapter.prashamhtrivedi.workers.dev';

export function getConfigPath(): string {
  return CONFIG_FILE;
}

export function loadConfig(): CLIConfig | null {
  if (!existsSync(CONFIG_FILE)) {
    return null;
  }

  try {
    const raw = readFileSync(CONFIG_FILE, 'utf-8');
    return JSON.parse(raw) as CLIConfig;
  } catch {
    return null;
  }
}

export function saveConfig(config: CLIConfig): void {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
  }

  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2) + '\n', 'utf-8');
}

export function getServerUrl(override?: string): string {
  if (override) return override;
  const envUrl = process.env.ACA_SERVER_URL;
  if (envUrl) return envUrl;
  const config = loadConfig();
  return config?.server_url || DEFAULT_SERVER_URL;
}

export function getApiKey(): string | null {
  const envKey = process.env.ACA_API_KEY;
  if (envKey) return envKey;
  const config = loadConfig();
  return config?.api_key || null;
}

export function getApiKeySource(): 'env' | 'config' | null {
  if (process.env.ACA_API_KEY) return 'env';
  const config = loadConfig();
  if (config?.api_key) return 'config';
  return null;
}

export function getServerUrlSource(override?: string): 'flag' | 'env' | 'config' | 'default' {
  if (override) return 'flag';
  if (process.env.ACA_SERVER_URL) return 'env';
  const config = loadConfig();
  if (config?.server_url) return 'config';
  return 'default';
}

export function updateLastSync(): void {
  const config = loadConfig();
  if (config) {
    config.last_sync = new Date().toISOString();
    saveConfig(config);
  }
}
