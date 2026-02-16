/**
 * Login command
 * Opens browser for auth, prompts for API key, validates and stores
 */

import { loadConfig, saveConfig, getConfigPath } from '../lib/config';
import { ApiClient } from '../lib/api-client';
import * as display from '../lib/display';
import { exec } from 'child_process';
import { platform } from 'os';
import type { CLIConfig } from '../lib/types';

export async function loginCommand(serverOverride?: string): Promise<void> {
  const existing = loadConfig();
  const serverUrl = serverOverride || existing?.server_url || '';

  display.header('ACA Login');

  // Prompt for server URL if not set
  let server = serverUrl;
  if (!server) {
    server = await display.prompt(
      'Server URL (default: https://agent-config-adapter.prashamhtrivedi.workers.dev):'
    );
    if (!server) {
      server = 'https://agent-config-adapter.prashamhtrivedi.workers.dev';
    }
  }

  // Normalize server URL
  server = server.replace(/\/+$/, '');
  display.info(`Server: ${server}`);

  // Open browser to profile page
  const profileUrl = `${server}/profile`;
  display.info(`Opening browser to ${profileUrl}`);
  display.info('Create or copy an API key from your profile page.');

  openBrowser(profileUrl);

  // Prompt for API key
  console.log('');
  const apiKey = await display.prompt('Paste your API key:');

  if (!apiKey || !apiKey.startsWith('aca_')) {
    display.error('Invalid API key. Keys must start with "aca_".');
    process.exit(1);
  }

  // Validate the key
  display.info('Validating API key...');
  const client = new ApiClient(server, apiKey);
  const valid = await client.validateKey();

  if (!valid) {
    display.error('API key validation failed. Check your key and server URL.');
    process.exit(1);
  }

  // Save config
  const config: CLIConfig = {
    server_url: server,
    api_key: apiKey,
    last_sync: existing?.last_sync,
  };
  saveConfig(config);

  display.success(`Authenticated! Config saved to ${getConfigPath()}`);
}

function openBrowser(url: string): void {
  const os = platform();
  let cmd: string;

  switch (os) {
    case 'darwin':
      cmd = `open "${url}"`;
      break;
    case 'linux':
      cmd = `xdg-open "${url}" 2>/dev/null || sensible-browser "${url}" 2>/dev/null || echo "Open manually: ${url}"`;
      break;
    default:
      cmd = `start "${url}"`;
      break;
  }

  exec(cmd, (err) => {
    if (err) {
      display.warn(`Could not open browser. Open manually: ${url}`);
    }
  });
}
