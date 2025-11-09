import { ConfigRepository } from '../infrastructure/database';
import { SkillFilesRepository } from '../infrastructure/skill-files-repository';
import { SkillZipService } from './skill-zip-service';
import {
  Config,
  CreateConfigInput,
  UpdateConfigInput,
  SkillWithFiles,
  UploadSkillFileInput,
  SkillFile,
} from '../domain/types';
import { nanoid } from 'nanoid';

export interface SkillsServiceEnv {
  DB: D1Database;
  EXTENSION_FILES: R2Bucket;
}

/**
 * SkillsService - Business logic for skills management
 * Handles multi-file skills with R2 storage
 */
export class SkillsService {
  private configRepo: ConfigRepository;
  private skillFilesRepo: SkillFilesRepository;
  private zipService: SkillZipService;
  private r2: R2Bucket;

  constructor(env: SkillsServiceEnv) {
    this.configRepo = new ConfigRepository(env.DB);
    this.skillFilesRepo = new SkillFilesRepository(env.DB);
    this.zipService = new SkillZipService();
    this.r2 = env.EXTENSION_FILES;
  }

  /**
   * Create a new skill with main content
   */
  async createSkill(input: CreateConfigInput): Promise<Config> {
    // Validate input
    if (!input.name || !input.content) {
      throw new Error('Missing required fields: name and content (SKILL.md)');
    }

    if (input.type !== 'skill') {
      throw new Error('Invalid type: must be "skill"');
    }

    return await this.configRepo.create(input);
  }

  /**
   * Get skill with all companion files
   */
  async getSkillWithFiles(skillId: string): Promise<SkillWithFiles | null> {
    const skill = await this.configRepo.findById(skillId);
    if (!skill || skill.type !== 'skill') {
      return null;
    }

    const files = await this.skillFilesRepo.findBySkillId(skillId);

    return {
      ...skill,
      type: 'skill',
      files,
    };
  }

  /**
   * Update skill metadata/content
   */
  async updateSkill(skillId: string, input: UpdateConfigInput): Promise<Config | null> {
    return await this.configRepo.update(skillId, input);
  }

  /**
   * Delete skill and all companion files
   */
  async deleteSkill(skillId: string): Promise<boolean> {
    // Get all files to delete from R2
    const files = await this.skillFilesRepo.findBySkillId(skillId);

    // Delete files from R2
    for (const file of files) {
      await this.r2.delete(file.r2_key);
    }

    // Delete from database (cascade will remove skill_files entries)
    return await this.configRepo.delete(skillId);
  }

  /**
   * Upload a companion file for a skill
   */
  async uploadCompanionFile(skillId: string, file: UploadSkillFileInput): Promise<SkillFile> {
    // Verify skill exists
    const skill = await this.configRepo.findById(skillId);
    if (!skill || skill.type !== 'skill') {
      throw new Error(`Skill not found: ${skillId}`);
    }

    // Validate file name
    this.zipService.validateFileName(file.file_path);

    // Check for duplicate path
    const existing = await this.skillFilesRepo.findBySkillIdAndPath(skillId, file.file_path);
    if (existing) {
      throw new Error(`File already exists: ${file.file_path}`);
    }

    // Generate R2 key
    const r2Key = `skills/${skillId}/files/${file.file_path}`;

    // Convert content to Uint8Array
    let contentBytes: Uint8Array;
    if (file.content instanceof ArrayBuffer) {
      contentBytes = new Uint8Array(file.content);
    } else {
      // ReadableStream - read all chunks
      const reader = file.content.getReader();
      const chunks: Uint8Array[] = [];
      let totalLength = 0;

      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        totalLength += value.length;
      }

      // Combine chunks
      contentBytes = new Uint8Array(totalLength);
      let offset = 0;
      for (const chunk of chunks) {
        contentBytes.set(chunk, offset);
        offset += chunk.length;
      }
    }

    // Validate file size (10MB limit per file)
    const maxFileSize = 10 * 1024 * 1024;
    if (contentBytes.byteLength > maxFileSize) {
      throw new Error(`File exceeds maximum size of 10MB: ${contentBytes.byteLength} bytes`);
    }

    // Upload to R2
    await this.r2.put(r2Key, contentBytes, {
      httpMetadata: {
        contentType: file.mime_type || 'application/octet-stream',
      },
    });

    // Create database record
    return await this.skillFilesRepo.create({
      skill_id: skillId,
      file_path: file.file_path,
      r2_key: r2Key,
      file_size: contentBytes.byteLength,
      mime_type: file.mime_type || 'application/octet-stream',
    });
  }

  /**
   * Upload multiple companion files
   */
  async uploadCompanionFiles(skillId: string, files: UploadSkillFileInput[]): Promise<SkillFile[]> {
    const uploadedFiles: SkillFile[] = [];

    for (const file of files) {
      const uploaded = await this.uploadCompanionFile(skillId, file);
      uploadedFiles.push(uploaded);
    }

    return uploadedFiles;
  }

  /**
   * Get a companion file content from R2
   */
  async getCompanionFile(skillId: string, fileId: string): Promise<R2ObjectBody | null> {
    const file = await this.skillFilesRepo.findById(fileId);
    if (!file || file.skill_id !== skillId) {
      return null;
    }

    return await this.r2.get(file.r2_key);
  }

  /**
   * Delete a companion file
   */
  async deleteCompanionFile(skillId: string, fileId: string): Promise<boolean> {
    const file = await this.skillFilesRepo.findById(fileId);
    if (!file || file.skill_id !== skillId) {
      return false;
    }

    // Delete from R2
    await this.r2.delete(file.r2_key);

    // Delete from database
    return await this.skillFilesRepo.delete(fileId);
  }

  /**
   * List all companion files for a skill
   */
  async listCompanionFiles(skillId: string): Promise<SkillFile[]> {
    return await this.skillFilesRepo.findBySkillId(skillId);
  }

  /**
   * Create skill from uploaded ZIP file
   */
  async uploadFromZip(zipBuffer: ArrayBuffer, metadata: CreateConfigInput): Promise<SkillWithFiles> {
    // Parse ZIP structure
    const structure = await this.zipService.parseZip(zipBuffer);

    // Validate structure
    if (!this.zipService.validateStructure(structure)) {
      throw new Error('Invalid skill ZIP: SKILL.md is empty or missing');
    }

    // Validate file sizes
    this.zipService.validateFileSizes([
      { path: 'SKILL.md', content: new TextEncoder().encode(structure.skillContent).buffer as ArrayBuffer },
      ...structure.companionFiles,
    ]);

    // Create skill with main content
    const skillInput: CreateConfigInput = {
      ...metadata,
      type: 'skill',
      content: structure.skillContent,
    };

    const skill = await this.createSkill(skillInput);

    // Upload companion files
    const uploadInputs: UploadSkillFileInput[] = structure.companionFiles.map((file) => ({
      skill_id: skill.id,
      file_path: file.path,
      content: file.content,
      mime_type: file.mimeType,
    }));

    const files = await this.uploadCompanionFiles(skill.id, uploadInputs);

    return {
      ...skill,
      type: 'skill',
      files,
    };
  }

  /**
   * Download skill as ZIP file
   */
  async downloadAsZip(skillId: string): Promise<Uint8Array> {
    const skillWithFiles = await this.getSkillWithFiles(skillId);
    if (!skillWithFiles) {
      throw new Error(`Skill not found: ${skillId}`);
    }

    return await this.zipService.generateZip(skillWithFiles, this.r2);
  }

  /**
   * List all skills (configs with type='skill')
   */
  async listSkills(): Promise<Config[]> {
    return await this.configRepo.findAll({ type: 'skill' });
  }
}
