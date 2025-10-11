import { Config } from '../domain/types';

export class CacheService {
  constructor(private kv: KVNamespace) {}

  private getKey(id: string, format?: string): string {
    return format ? `config:${id}:${format}` : `config:${id}`;
  }

  async get(id: string, format?: string): Promise<string | null> {
    const key = this.getKey(id, format);
    return await this.kv.get(key);
  }

  async set(id: string, value: string, format?: string, expirationTtl: number = 3600): Promise<void> {
    const key = this.getKey(id, format);
    await this.kv.put(key, value, { expirationTtl });
  }

  async delete(id: string): Promise<void> {
    // Delete all format variations
    const formats = ['claude_code', 'codex', 'gemini'];
    await Promise.all([
      this.kv.delete(this.getKey(id)),
      ...formats.map(format => this.kv.delete(this.getKey(id, format)))
    ]);
  }

  async invalidate(id: string): Promise<void> {
    await this.delete(id);
  }
}
