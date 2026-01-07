import { Config, CreateConfigInput, UpdateConfigInput, SlashCommandAnalysis } from '../domain/types';
import { nanoid } from 'nanoid';

export class ConfigRepository {
  constructor(private db: D1Database) {}

  async create(input: CreateConfigInput, analysis?: SlashCommandAnalysis): Promise<Config> {
    const id = nanoid();
    const now = new Date().toISOString();

    // If analysis is provided (for slash commands), include metadata
    if (analysis) {
      await this.db
        .prepare(
          `INSERT INTO configs (
            id, name, type, original_format, content,
            has_arguments, argument_hint, agent_references, skill_references, analysis_version,
            user_id, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(
          id,
          input.name,
          input.type,
          input.original_format,
          input.content,
          analysis.hasArguments ? 1 : 0,
          analysis.argumentHint || null,
          analysis.agentReferences.length > 0 ? JSON.stringify(analysis.agentReferences) : null,
          analysis.skillReferences.length > 0 ? JSON.stringify(analysis.skillReferences) : null,
          '1.0',
          input.user_id || null,
          now,
          now
        )
        .run();

      return {
        id,
        name: input.name,
        type: input.type,
        original_format: input.original_format,
        content: input.content,
        created_at: now,
        updated_at: now,
        user_id: input.user_id || null,
        has_arguments: analysis.hasArguments,
        argument_hint: analysis.argumentHint || null,
        agent_references: analysis.agentReferences.length > 0 ? JSON.stringify(analysis.agentReferences) : undefined,
        skill_references: analysis.skillReferences.length > 0 ? JSON.stringify(analysis.skillReferences) : undefined,
        analysis_version: '1.0',
      };
    }

    // No analysis - original behavior
    await this.db
      .prepare(
        `INSERT INTO configs (id, name, type, original_format, content, user_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(id, input.name, input.type, input.original_format, input.content, input.user_id || null, now, now)
      .run();

    return {
      id,
      name: input.name,
      type: input.type,
      original_format: input.original_format,
      content: input.content,
      created_at: now,
      updated_at: now,
      user_id: input.user_id || null,
    };
  }

  /**
   * Get the owner of a config
   */
  async getOwnerId(id: string): Promise<string | null> {
    const result = await this.db
      .prepare('SELECT user_id FROM configs WHERE id = ?')
      .bind(id)
      .first<{ user_id: string | null }>();

    return result?.user_id || null;
  }

  /**
   * Check if a user owns a config
   */
  async isOwner(id: string, userId: string): Promise<boolean> {
    const ownerId = await this.getOwnerId(id);
    // Allow if no owner (legacy data) or if user is the owner
    return ownerId === null || ownerId === userId;
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

  async update(id: string, input: UpdateConfigInput, analysis?: SlashCommandAnalysis): Promise<Config | null> {
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

    // If analysis is provided (for slash commands), update metadata
    if (analysis) {
      updates.push('has_arguments = ?');
      values.push(analysis.hasArguments ? 1 : 0);
      updates.push('argument_hint = ?');
      values.push(analysis.argumentHint || null);
      updates.push('agent_references = ?');
      values.push(analysis.agentReferences.length > 0 ? JSON.stringify(analysis.agentReferences) : null);
      updates.push('skill_references = ?');
      values.push(analysis.skillReferences.length > 0 ? JSON.stringify(analysis.skillReferences) : null);
      updates.push('analysis_version = ?');
      values.push('1.0');
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
