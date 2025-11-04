import { SkillFile, CreateSkillFileInput } from '../domain/types';
import { nanoid } from 'nanoid';

export class SkillFilesRepository {
  constructor(private db: D1Database) {}

  async create(input: CreateSkillFileInput): Promise<SkillFile> {
    const id = nanoid();
    const now = new Date().toISOString();

    await this.db
      .prepare(
        `INSERT INTO skill_files (id, skill_id, file_path, r2_key, file_size, mime_type, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        id,
        input.skill_id,
        input.file_path,
        input.r2_key,
        input.file_size || null,
        input.mime_type || null,
        now
      )
      .run();

    return {
      id,
      skill_id: input.skill_id,
      file_path: input.file_path,
      r2_key: input.r2_key,
      file_size: input.file_size || null,
      mime_type: input.mime_type || null,
      created_at: now,
    };
  }

  async findById(id: string): Promise<SkillFile | null> {
    const result = await this.db
      .prepare('SELECT * FROM skill_files WHERE id = ?')
      .bind(id)
      .first<SkillFile>();

    return result || null;
  }

  async findBySkillId(skillId: string): Promise<SkillFile[]> {
    const result = await this.db
      .prepare('SELECT * FROM skill_files WHERE skill_id = ? ORDER BY created_at ASC')
      .bind(skillId)
      .all<SkillFile>();

    return result.results || [];
  }

  async findBySkillIdAndPath(skillId: string, path: string): Promise<SkillFile | null> {
    const result = await this.db
      .prepare('SELECT * FROM skill_files WHERE skill_id = ? AND file_path = ?')
      .bind(skillId, path)
      .first<SkillFile>();

    return result || null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.db
      .prepare('DELETE FROM skill_files WHERE id = ?')
      .bind(id)
      .run();

    return result.success && (result.meta?.changes ?? 0) > 0;
  }

  async deleteBySkillId(skillId: string): Promise<boolean> {
    const result = await this.db
      .prepare('DELETE FROM skill_files WHERE skill_id = ?')
      .bind(skillId)
      .run();

    return result.success && (result.meta?.changes ?? 0) > 0;
  }

  async batchCreate(inputs: CreateSkillFileInput[]): Promise<SkillFile[]> {
    const skillFiles: SkillFile[] = [];

    for (const input of inputs) {
      const skillFile = await this.create(input);
      skillFiles.push(skillFile);
    }

    return skillFiles;
  }
}
