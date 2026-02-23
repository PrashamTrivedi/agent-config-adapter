/**
 * HTTP client for server API
 * Communicates with the Agent Config Adapter server
 */

import type { LocalConfigInput, ConfigType, SyncResponse, DeleteResponse, Extension } from './types';

export class ApiClient {
  constructor(
    private serverUrl: string,
    private apiKey: string
  ) {}

  private get headers(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`,
    };
  }

  private get baseUrl(): string {
    return this.serverUrl.replace(/\/+$/, '');
  }

  /**
   * Batch sync configs to server
   */
  async sync(
    configs: LocalConfigInput[],
    types?: ConfigType[],
    dryRun: boolean = false
  ): Promise<SyncResponse> {
    const body: Record<string, any> = {
      configs,
      dry_run: dryRun,
    };
    if (types && types.length > 0) {
      body.types = types;
    }

    const response = await fetch(`${this.baseUrl}/api/sync`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText }));
      throw new ApiError(response.status, (error as any).error || 'Sync failed');
    }

    return response.json() as Promise<SyncResponse>;
  }

  /**
   * Batch delete configs from server
   */
  async deleteBatch(configIds: string[]): Promise<DeleteResponse> {
    const response = await fetch(`${this.baseUrl}/api/sync/batch`, {
      method: 'DELETE',
      headers: this.headers,
      body: JSON.stringify({ config_ids: configIds }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText }));
      throw new ApiError(response.status, (error as any).error || 'Delete failed');
    }

    return response.json() as Promise<DeleteResponse>;
  }

  /**
   * List available extensions (public, no auth required)
   */
  async listExtensions(): Promise<Extension[]> {
    const response = await fetch(`${this.baseUrl}/api/extensions`, {
      headers: { 'Accept': 'application/json' },
    });

    if (!response.ok) {
      throw new ApiError(response.status, 'Failed to list extensions');
    }

    const data = await response.json() as { extensions: Extension[] };
    return data.extensions;
  }

  /**
   * Download extension as Claude Code ZIP (public, no auth required)
   */
  async downloadPluginZip(extensionId: string): Promise<Uint8Array> {
    const response = await fetch(`${this.baseUrl}/plugins/${extensionId}/claude_code/download`);

    if (!response.ok) {
      if (response.status === 404) {
        throw new ApiError(404, 'Extension not found');
      }
      throw new ApiError(response.status, 'Failed to download extension');
    }

    const buffer = await response.arrayBuffer();
    return new Uint8Array(buffer);
  }

  /**
   * Validate API key by making a simple authenticated request
   */
  async validateKey(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/sync`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({ configs: [], dry_run: true }),
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
