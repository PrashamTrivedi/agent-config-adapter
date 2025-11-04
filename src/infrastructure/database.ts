import { Config, CreateConfigInput, UpdateConfigInput } from '../domain/types';
import { nanoid } from 'nanoid';

export class ConfigRepository {
  constructor(private db: D1Database) {}

  async create(input: CreateConfigInput): Promise<Config> {
    const id = nanoid();
    const now = new Date().toISOString();

    await this.db
      .prepare(
        `INSERT INTO configs (id, name, type, original_format, content, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(id, input.name, input.type, input.original_format, input.content, now, now)
      .run();

    return {
      id,
      name: input.name,
      type: input.type,
      original_format: input.original_format,
      content: input.content,
      created_at: now,
      updated_at: now,
    };
  }

  async findById(id: string): Promise<Config | null> {
    const result = await this.db
      .prepare('SELECT * FROM configs WHERE id = ?')
      .bind(id)
      .first<Config>();

    return result || null;
  }

  async findAll(filters?: {
    type?: string;
    originalFormat?: string;
    searchName?: string;
  }): Promise<Config[]> {
    if (!filters || (!filters.type && !filters.originalFormat && !filters.searchName)) {
      // No filters, return all configs
      const result = await this.db
        .prepare('SELECT * FROM configs ORDER BY created_at DESC')
        .all<Config>();
      return result.results || [];
    }

    // Build dynamic WHERE clause
    const conditions: string[] = [];
    const values: any[] = [];

    if (filters.type) {
      conditions.push('type = ?');
      values.push(filters.type);
    }

    if (filters.originalFormat) {
      conditions.push('original_format = ?');
      values.push(filters.originalFormat);
    }

    if (filters.searchName) {
      conditions.push('name LIKE ?');
      values.push(`%${filters.searchName.trim()}%`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const query = `SELECT * FROM configs ${whereClause} ORDER BY created_at DESC`;

    const result = await this.db
      .prepare(query)
      .bind(...values)
      .all<Config>();

    return result.results || [];
  }

  async update(id: string, input: UpdateConfigInput): Promise<Config | null> {
    const existing = await this.findById(id);
    if (!existing) return null;

    const updates: string[] = [];
    const values: any[] = [];

    if (input.name !== undefined) {
      updates.push('name = ?');
      values.push(input.name);
    }
    if (input.type !== undefined) {
      updates.push('type = ?');
      values.push(input.type);
    }
    if (input.original_format !== undefined) {
      updates.push('original_format = ?');
      values.push(input.original_format);
    }
    if (input.content !== undefined) {
      updates.push('content = ?');
      values.push(input.content);
    }

    if (updates.length === 0) return existing;

    updates.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(id);

    await this.db
      .prepare(`UPDATE configs SET ${updates.join(', ')} WHERE id = ?`)
      .bind(...values)
      .run();

    return this.findById(id);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.db
      .prepare('DELETE FROM configs WHERE id = ?')
      .bind(id)
      .run();

    return result.success && (result.meta?.changes ?? 0) > 0;
  }
}
