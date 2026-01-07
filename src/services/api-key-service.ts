/**
 * API Key Service
 * Handles CRUD operations for MCP API keys with proper hashing
 */

import { nanoid } from 'nanoid';

export interface ApiKey {
  id: string;
  key_hash: string;
  user_id: string;
  name: string;
  created_at: number;
  last_used_at: number | null;
  expires_at: number | null;
  is_active: number;
}

export interface ApiKeyWithPrefix {
  id: string;
  name: string;
  prefix: string; // First 8 chars of the key for identification
  created_at: number;
  last_used_at: number | null;
  expires_at: number | null;
  is_active: boolean;
}

export interface CreateApiKeyResult {
  id: string;
  name: string;
  key: string; // Full key - only returned once on creation
  prefix: string;
  created_at: number;
  expires_at: number | null;
}

export class ApiKeyService {
  constructor(private db: D1Database) {}

  /**
   * Generate a cryptographically secure API key
   */
  private generateApiKey(): string {
    // Format: aca_<32 char random string>
    return `aca_${nanoid(32)}`;
  }

  /**
   * Hash an API key using SHA-256
   */
  private async hashKey(key: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(key);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Create a new API key for a user
   * @returns The full key (only available once) and metadata
   */
  async create(
    userId: string,
    name: string,
    expiresInDays?: number
  ): Promise<CreateApiKeyResult> {
    const id = nanoid(12);
    const key = this.generateApiKey();
    const keyHash = await this.hashKey(key);
    const now = Date.now();
    const expiresAt = expiresInDays ? now + expiresInDays * 24 * 60 * 60 * 1000 : null;

    await this.db
      .prepare(
        `INSERT INTO api_keys (id, key_hash, user_id, name, created_at, expires_at, is_active)
         VALUES (?, ?, ?, ?, ?, ?, 1)`
      )
      .bind(id, keyHash, userId, name, now, expiresAt)
      .run();

    return {
      id,
      name,
      key, // Return full key only once
      prefix: key.substring(0, 12), // aca_<first 8 of random>
      created_at: now,
      expires_at: expiresAt,
    };
  }

  /**
   * List all API keys for a user (without the actual key values)
   */
  async listByUser(userId: string): Promise<ApiKeyWithPrefix[]> {
    const result = await this.db
      .prepare(
        `SELECT id, name, key_hash, created_at, last_used_at, expires_at, is_active
         FROM api_keys
         WHERE user_id = ?
         ORDER BY created_at DESC`
      )
      .bind(userId)
      .all<ApiKey>();

    return (result.results || []).map((row) => ({
      id: row.id,
      name: row.name,
      prefix: row.key_hash.substring(0, 12), // First 12 chars of hash as identifier
      created_at: row.created_at,
      last_used_at: row.last_used_at,
      expires_at: row.expires_at,
      is_active: row.is_active === 1,
    }));
  }

  /**
   * Get an API key by ID (for the owner only)
   */
  async getById(id: string, userId: string): Promise<ApiKeyWithPrefix | null> {
    const result = await this.db
      .prepare(
        `SELECT id, name, key_hash, created_at, last_used_at, expires_at, is_active
         FROM api_keys
         WHERE id = ? AND user_id = ?`
      )
      .bind(id, userId)
      .first<ApiKey>();

    if (!result) return null;

    return {
      id: result.id,
      name: result.name,
      prefix: result.key_hash.substring(0, 12),
      created_at: result.created_at,
      last_used_at: result.last_used_at,
      expires_at: result.expires_at,
      is_active: result.is_active === 1,
    };
  }

  /**
   * Validate an API key and return the associated user ID
   * Also updates last_used_at timestamp
   */
  async validate(key: string): Promise<{ userId: string; keyId: string } | null> {
    const keyHash = await this.hashKey(key);
    const now = Date.now();

    const result = await this.db
      .prepare(
        `SELECT id, user_id, expires_at, is_active
         FROM api_keys
         WHERE key_hash = ?`
      )
      .bind(keyHash)
      .first<{ id: string; user_id: string; expires_at: number | null; is_active: number }>();

    if (!result) return null;

    // Check if key is active
    if (result.is_active !== 1) return null;

    // Check if key is expired
    if (result.expires_at && result.expires_at < now) return null;

    // Update last_used_at
    await this.db
      .prepare(`UPDATE api_keys SET last_used_at = ? WHERE id = ?`)
      .bind(now, result.id)
      .run();

    return { userId: result.user_id, keyId: result.id };
  }

  /**
   * Revoke (deactivate) an API key
   */
  async revoke(id: string, userId: string): Promise<boolean> {
    const result = await this.db
      .prepare(`UPDATE api_keys SET is_active = 0 WHERE id = ? AND user_id = ?`)
      .bind(id, userId)
      .run();

    return (result.meta?.changes || 0) > 0;
  }

  /**
   * Delete an API key permanently
   */
  async delete(id: string, userId: string): Promise<boolean> {
    const result = await this.db
      .prepare(`DELETE FROM api_keys WHERE id = ? AND user_id = ?`)
      .bind(id, userId)
      .run();

    return (result.meta?.changes || 0) > 0;
  }

  /**
   * Update the name of an API key
   */
  async rename(id: string, userId: string, newName: string): Promise<boolean> {
    const result = await this.db
      .prepare(`UPDATE api_keys SET name = ? WHERE id = ? AND user_id = ?`)
      .bind(newName, id, userId)
      .run();

    return (result.meta?.changes || 0) > 0;
  }

  /**
   * Reactivate a previously revoked API key
   */
  async reactivate(id: string, userId: string): Promise<boolean> {
    const result = await this.db
      .prepare(`UPDATE api_keys SET is_active = 1 WHERE id = ? AND user_id = ?`)
      .bind(id, userId)
      .run();

    return (result.meta?.changes || 0) > 0;
  }

  /**
   * Count API keys for a user
   */
  async countByUser(userId: string): Promise<number> {
    const result = await this.db
      .prepare(`SELECT COUNT(*) as count FROM api_keys WHERE user_id = ?`)
      .bind(userId)
      .first<{ count: number }>();

    return result?.count || 0;
  }
}
