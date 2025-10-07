import type { ConfigFormat } from '@domain/config';

export interface ConfigCache {
  get(id: string, format: ConfigFormat): Promise<string | null>;
  put(id: string, format: ConfigFormat, value: string): Promise<void>;
  invalidate(id: string): Promise<void>;
}

const buildKey = (id: string, format: ConfigFormat): string => `config:${id}:${format}`;

export class KVConfigCache implements ConfigCache {
  constructor(private readonly kv: KVNamespace) {}

  async get(id: string, format: ConfigFormat): Promise<string | null> {
    return this.kv.get(buildKey(id, format));
  }

  async put(id: string, format: ConfigFormat, value: string): Promise<void> {
    await this.kv.put(buildKey(id, format), value, { expirationTtl: 60 * 60 });
  }

  async invalidate(id: string): Promise<void> {
    const formats: ConfigFormat[] = ['claude_code', 'codex_agents', 'jules_manifest'];
    await Promise.all(formats.map((format) => this.kv.delete(buildKey(id, format))));
  }
}
