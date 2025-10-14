import {
  Extension,
  ExtensionWithConfigs,
  CreateExtensionInput,
  UpdateExtensionInput,
  Config,
} from '../domain/types';
import { nanoid } from 'nanoid';

export class ExtensionRepository {
  constructor(private db: D1Database) {}

  async create(input: CreateExtensionInput): Promise<Extension> {
    const id = nanoid();
    const now = new Date().toISOString();

    await this.db
      .prepare(
        `INSERT INTO extensions (id, name, description, author, version, icon_url, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        id,
        input.name,
        input.description || null,
        input.author || null,
        input.version,
        input.icon_url || null,
        now,
        now
      )
      .run();

    // Add config associations if provided
    if (input.config_ids && input.config_ids.length > 0) {
      await this.addConfigs(id, input.config_ids);
    }

    return {
      id,
      name: input.name,
      description: input.description || null,
      author: input.author || null,
      version: input.version,
      icon_url: input.icon_url || null,
      created_at: now,
      updated_at: now,
    };
  }

  async findById(id: string): Promise<Extension | null> {
    const result = await this.db
      .prepare('SELECT * FROM extensions WHERE id = ?')
      .bind(id)
      .first<Extension>();

    return result || null;
  }

  async findByIdWithConfigs(id: string): Promise<ExtensionWithConfigs | null> {
    const extension = await this.findById(id);
    if (!extension) return null;

    const configs = await this.getExtensionConfigs(id);

    return {
      ...extension,
      configs,
    };
  }

  async findAll(): Promise<Extension[]> {
    const result = await this.db
      .prepare('SELECT * FROM extensions ORDER BY created_at DESC')
      .all<Extension>();

    return result.results || [];
  }

  async update(id: string, input: UpdateExtensionInput): Promise<Extension | null> {
    const existing = await this.findById(id);
    if (!existing) return null;

    const updates: string[] = [];
    const values: any[] = [];

    if (input.name !== undefined) {
      updates.push('name = ?');
      values.push(input.name);
    }
    if (input.description !== undefined) {
      updates.push('description = ?');
      values.push(input.description);
    }
    if (input.author !== undefined) {
      updates.push('author = ?');
      values.push(input.author);
    }
    if (input.version !== undefined) {
      updates.push('version = ?');
      values.push(input.version);
    }
    if (input.icon_url !== undefined) {
      updates.push('icon_url = ?');
      values.push(input.icon_url);
    }

    if (updates.length === 0) return existing;

    updates.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(id);

    await this.db
      .prepare(`UPDATE extensions SET ${updates.join(', ')} WHERE id = ?`)
      .bind(...values)
      .run();

    return this.findById(id);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.db
      .prepare('DELETE FROM extensions WHERE id = ?')
      .bind(id)
      .run();

    return result.success;
  }

  /**
   * Get all configs associated with an extension
   */
  async getExtensionConfigs(extensionId: string): Promise<Config[]> {
    const result = await this.db
      .prepare(
        `SELECT c.* FROM configs c
         INNER JOIN extension_configs ec ON c.id = ec.config_id
         WHERE ec.extension_id = ?
         ORDER BY ec.sort_order ASC, c.created_at DESC`
      )
      .bind(extensionId)
      .all<Config>();

    return result.results || [];
  }

  /**
   * Add configs to an extension
   */
  async addConfigs(extensionId: string, configIds: string[]): Promise<void> {
    // Get current max sort_order
    const maxOrderResult = await this.db
      .prepare(
        'SELECT COALESCE(MAX(sort_order), -1) as max_order FROM extension_configs WHERE extension_id = ?'
      )
      .bind(extensionId)
      .first<{ max_order: number }>();

    let currentOrder = (maxOrderResult?.max_order ?? -1) + 1;

    // Insert each config association
    for (const configId of configIds) {
      await this.db
        .prepare(
          'INSERT OR IGNORE INTO extension_configs (extension_id, config_id, sort_order) VALUES (?, ?, ?)'
        )
        .bind(extensionId, configId, currentOrder)
        .run();
      currentOrder++;
    }

    // Update extension's updated_at timestamp
    await this.db
      .prepare('UPDATE extensions SET updated_at = ? WHERE id = ?')
      .bind(new Date().toISOString(), extensionId)
      .run();
  }

  /**
   * Remove a config from an extension
   */
  async removeConfig(extensionId: string, configId: string): Promise<boolean> {
    const result = await this.db
      .prepare('DELETE FROM extension_configs WHERE extension_id = ? AND config_id = ?')
      .bind(extensionId, configId)
      .run();

    if (result.success) {
      // Update extension's updated_at timestamp
      await this.db
        .prepare('UPDATE extensions SET updated_at = ? WHERE id = ?')
        .bind(new Date().toISOString(), extensionId)
        .run();
    }

    return result.success;
  }
}
