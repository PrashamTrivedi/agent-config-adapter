/**
 * Status command
 * Shows current auth status, server URL, last sync summary
 */

import { loadConfig, getConfigPath } from '../lib/config';
import { ApiClient } from '../lib/api-client';
import * as display from '../lib/display';

export async function statusCommand(): Promise<void> {
  const config = loadConfig();

  display.header('ACA Status');
  console.log('');

  if (!config) {
    display.warn(`No config file found at ${getConfigPath()}`);
    display.info('Run "aca login" to configure.');
    return;
  }

  console.log(`  Server:    ${config.server_url}`);
  console.log(`  API Key:   ${config.api_key ? config.api_key.substring(0, 12) + '...' : 'Not set'}`);
  console.log(`  Last Sync: ${config.last_sync || 'Never'}`);
  console.log('');

  if (config.api_key) {
    display.info('Validating API key...');
    const client = new ApiClient(config.server_url, config.api_key);
    const valid = await client.validateKey();

    if (valid) {
      display.success('API key is valid');
    } else {
      display.error('API key is invalid or expired. Run "aca login" to re-authenticate.');
    }
  } else {
    display.warn('No API key configured. Run "aca login" to authenticate.');
  }
}
