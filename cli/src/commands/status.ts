/**
 * Status command
 * Shows current auth status, server URL, last sync summary
 */

import { loadConfig, getConfigPath, getApiKey, getServerUrl, getApiKeySource, getServerUrlSource } from '../lib/config';
import { ApiClient } from '../lib/api-client';
import * as display from '../lib/display';

export async function statusCommand(): Promise<void> {
  display.header('ACA Status');
  console.log('');

  const serverUrl = getServerUrl();
  const serverSource = getServerUrlSource();
  const apiKey = getApiKey();
  const apiKeySource = getApiKeySource();
  const config = loadConfig();

  console.log(`  Server:    ${serverUrl} (${serverSource})`);

  if (apiKey) {
    const masked = apiKey.substring(0, 4) + '****' + apiKey.substring(apiKey.length - 3);
    console.log(`  API Key:   ${masked} (from ${apiKeySource})`);
  } else {
    console.log(`  API Key:   Not set`);
  }

  console.log(`  Last Sync: ${config?.last_sync || 'Never'}`);
  console.log(`  Config:    ${getConfigPath()}`);
  console.log('');

  if (apiKey) {
    display.info('Validating API key...');
    const client = new ApiClient(serverUrl, apiKey);
    const valid = await client.validateKey();

    if (valid) {
      display.success('API key is valid');
    } else {
      display.error('API key is invalid or expired. Run "aca login" to re-authenticate.');
    }
  } else {
    display.warn('No API key configured. Run "aca login" or set ACA_API_KEY env var.');
  }
}
