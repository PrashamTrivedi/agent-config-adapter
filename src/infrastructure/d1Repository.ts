import type { AgentConfig, ConfigCreateInput, ConfigUpdateInput } from '@domain/config';

export interface ConfigRepository {
  list(): Promise<AgentConfig[]>;
  get(id: string): Promise<AgentConfig | null>;
  create(input: ConfigCreateInput): Promise<AgentConfig>;
  update(id: string, input: ConfigUpdateInput): Promise<AgentConfig | null>;
  delete(id: string): Promise<void>;
}

export class D1ConfigRepository implements ConfigRepository {
  constructor(private readonly db: D1Database) {}

  async list(): Promise<AgentConfig[]> {
    const { results } = await this.db.prepare(
      `SELECT id, name, type, original_format as originalFormat, content, created_at as createdAt
       FROM configs
       ORDER BY created_at DESC`
    ).all<AgentConfig>();

    return results ?? [];
  }

  async get(id: string): Promise<AgentConfig | null> {
    const result = await this.db
      .prepare(
        `SELECT id, name, type, original_format as originalFormat, content, created_at as createdAt
         FROM configs
         WHERE id = ?`
      )
      .bind(id)
      .first<AgentConfig>();

    return result ?? null;
  }

  async create(input: ConfigCreateInput): Promise<AgentConfig> {
    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();

    await this.db
      .prepare(
        `INSERT INTO configs (id, name, type, original_format, content, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .bind(id, input.name, input.type, input.originalFormat, input.content, createdAt)
      .run();

    return {
      id,
      createdAt,
      ...input,
    };
  }

  async update(id: string, input: ConfigUpdateInput): Promise<AgentConfig | null> {
    const existing = await this.get(id);
    if (!existing) {
      return null;
    }

    const next = {
      ...existing,
      ...input,
    } satisfies AgentConfig;

    await this.db
      .prepare(
        `UPDATE configs
         SET name = ?, type = ?, original_format = ?, content = ?
         WHERE id = ?`
      )
      .bind(next.name, next.type, next.originalFormat, next.content, id)
      .run();

    return next;
  }

  async delete(id: string): Promise<void> {
    await this.db.prepare(`DELETE FROM configs WHERE id = ?`).bind(id).run();
  }
}
