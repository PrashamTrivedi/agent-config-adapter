import {
  Marketplace,
  MarketplaceWithExtensions,
  CreateMarketplaceInput,
  UpdateMarketplaceInput,
  ExtensionWithConfigs,
} from '../domain/types';
import { nanoid } from 'nanoid';
import { ExtensionRepository } from './extension-repository';

export class MarketplaceRepository {
  private extensionRepo: ExtensionRepository;

  constructor(private db: D1Database) {
    this.extensionRepo = new ExtensionRepository(db);
  }

  async create(input: CreateMarketplaceInput): Promise<Marketplace> {
    const id = nanoid();
    const now = new Date().toISOString();

    await this.db
      .prepare(
        `INSERT INTO marketplaces (id, name, description, owner_name, owner_email, version, homepage, repository, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        id,
        input.name,
        input.description || null,
        input.owner_name,
        input.owner_email || null,
        input.version,
        input.homepage || null,
        input.repository || null,
        now,
        now
      )
      .run();

    // Add extension associations if provided
    if (input.extension_ids && input.extension_ids.length > 0) {
      await this.addExtensions(id, input.extension_ids);
    }

    return {
      id,
      name: input.name,
      description: input.description || null,
      owner_name: input.owner_name,
      owner_email: input.owner_email || null,
      version: input.version,
      homepage: input.homepage || null,
      repository: input.repository || null,
      created_at: now,
      updated_at: now,
    };
  }

  async findById(id: string): Promise<Marketplace | null> {
    const result = await this.db
      .prepare('SELECT * FROM marketplaces WHERE id = ?')
      .bind(id)
      .first<Marketplace>();

    return result || null;
  }

  async findByIdWithExtensions(id: string): Promise<MarketplaceWithExtensions | null> {
    const marketplace = await this.findById(id);
    if (!marketplace) return null;

    const extensionIds = await this.getMarketplaceExtensionIds(id);
    const extensions: ExtensionWithConfigs[] = [];

    for (const extensionId of extensionIds) {
      const extension = await this.extensionRepo.findByIdWithConfigs(extensionId);
      if (extension) {
        extensions.push(extension);
      }
    }

    return {
      ...marketplace,
      extensions,
    };
  }

  async findAll(): Promise<Marketplace[]> {
    const result = await this.db
      .prepare('SELECT * FROM marketplaces ORDER BY created_at DESC')
      .all<Marketplace>();

    return result.results || [];
  }

  async update(id: string, input: UpdateMarketplaceInput): Promise<Marketplace | null> {
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
    if (input.owner_name !== undefined) {
      updates.push('owner_name = ?');
      values.push(input.owner_name);
    }
    if (input.owner_email !== undefined) {
      updates.push('owner_email = ?');
      values.push(input.owner_email);
    }
    if (input.version !== undefined) {
      updates.push('version = ?');
      values.push(input.version);
    }
    if (input.homepage !== undefined) {
      updates.push('homepage = ?');
      values.push(input.homepage);
    }
    if (input.repository !== undefined) {
      updates.push('repository = ?');
      values.push(input.repository);
    }

    if (updates.length === 0) return existing;

    updates.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(id);

    await this.db
      .prepare(`UPDATE marketplaces SET ${updates.join(', ')} WHERE id = ?`)
      .bind(...values)
      .run();

    return this.findById(id);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.db
      .prepare('DELETE FROM marketplaces WHERE id = ?')
      .bind(id)
      .run();

    return result.success;
  }

  /**
   * Get extension IDs associated with a marketplace
   */
  async getMarketplaceExtensionIds(marketplaceId: string): Promise<string[]> {
    const result = await this.db
      .prepare(
        `SELECT extension_id FROM marketplace_extensions
         WHERE marketplace_id = ?
         ORDER BY sort_order ASC`
      )
      .bind(marketplaceId)
      .all<{ extension_id: string }>();

    return (result.results || []).map((row) => row.extension_id);
  }

  /**
   * Add extensions to a marketplace
   */
  async addExtensions(marketplaceId: string, extensionIds: string[]): Promise<void> {
    // Get current max sort_order
    const maxOrderResult = await this.db
      .prepare(
        'SELECT COALESCE(MAX(sort_order), -1) as max_order FROM marketplace_extensions WHERE marketplace_id = ?'
      )
      .bind(marketplaceId)
      .first<{ max_order: number }>();

    let currentOrder = (maxOrderResult?.max_order ?? -1) + 1;

    // Insert each extension association
    for (const extensionId of extensionIds) {
      await this.db
        .prepare(
          'INSERT OR IGNORE INTO marketplace_extensions (marketplace_id, extension_id, sort_order) VALUES (?, ?, ?)'
        )
        .bind(marketplaceId, extensionId, currentOrder)
        .run();
      currentOrder++;
    }

    // Update marketplace's updated_at timestamp
    await this.db
      .prepare('UPDATE marketplaces SET updated_at = ? WHERE id = ?')
      .bind(new Date().toISOString(), marketplaceId)
      .run();
  }

  /**
   * Remove an extension from a marketplace
   */
  async removeExtension(marketplaceId: string, extensionId: string): Promise<boolean> {
    const result = await this.db
      .prepare('DELETE FROM marketplace_extensions WHERE marketplace_id = ? AND extension_id = ?')
      .bind(marketplaceId, extensionId)
      .run();

    if (result.success) {
      // Update marketplace's updated_at timestamp
      await this.db
        .prepare('UPDATE marketplaces SET updated_at = ? WHERE id = ?')
        .bind(new Date().toISOString(), marketplaceId)
        .run();
    }

    return result.success;
  }
}
