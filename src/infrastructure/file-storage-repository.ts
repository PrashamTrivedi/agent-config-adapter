import { ExtensionFile, CreateExtensionFileInput } from '../domain/types';
import { nanoid } from 'nanoid';

export class FileStorageRepository {
  constructor(private db: D1Database) {}

  async create(input: CreateExtensionFileInput): Promise<ExtensionFile> {
    const id = nanoid();
    const now = new Date().toISOString();

    await this.db
      .prepare(
        `INSERT INTO extension_files (id, extension_id, file_path, r2_key, file_size, mime_type, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        id,
        input.extension_id,
        input.file_path,
        input.r2_key,
        input.file_size || null,
        input.mime_type || null,
        now
      )
      .run();

    return {
      id,
      extension_id: input.extension_id,
      file_path: input.file_path,
      r2_key: input.r2_key,
      file_size: input.file_size || null,
      mime_type: input.mime_type || null,
      created_at: now,
    };
  }

  async findById(id: string): Promise<ExtensionFile | null> {
    const result = await this.db
      .prepare('SELECT * FROM extension_files WHERE id = ?')
      .bind(id)
      .first<ExtensionFile>();

    return result || null;
  }

  async findByExtensionId(extensionId: string): Promise<ExtensionFile[]> {
    const result = await this.db
      .prepare('SELECT * FROM extension_files WHERE extension_id = ? ORDER BY created_at DESC')
      .bind(extensionId)
      .all<ExtensionFile>();

    return result.results || [];
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.db
      .prepare('DELETE FROM extension_files WHERE id = ?')
      .bind(id)
      .run();

    return result.success;
  }

  async deleteByExtensionId(extensionId: string): Promise<boolean> {
    const result = await this.db
      .prepare('DELETE FROM extension_files WHERE extension_id = ?')
      .bind(extensionId)
      .run();

    return result.success;
  }
}
