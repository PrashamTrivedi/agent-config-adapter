import { unzipSync, zipSync, strToU8, strFromU8 } from 'fflate';
import { SkillZipStructure, SkillWithFiles } from '../domain/types';

/**
 * SkillZipService - Handles ZIP operations for skills
 * Parse uploaded ZIPs and generate downloadable skill ZIPs
 */
export class SkillZipService {
  /**
   * Parse an uploaded ZIP file and extract skill structure
   * Validates that SKILL.md exists at root level
   */
  async parseZip(zipBuffer: ArrayBuffer): Promise<SkillZipStructure> {
    // Convert ArrayBuffer to Uint8Array
    const uint8Array = new Uint8Array(zipBuffer);

    // Unzip the archive
    let unzipped: Record<string, Uint8Array>;
    try {
      unzipped = unzipSync(uint8Array);
    } catch (error: any) {
      throw new Error(`Failed to unzip file: ${error.message}`);
    }

    // Find SKILL.md at root level (case-insensitive)
    const skillMdEntry = Object.keys(unzipped).find((path) => {
      const normalized = path.toLowerCase();
      return normalized === 'skill.md' || normalized === './skill.md';
    });

    if (!skillMdEntry) {
      throw new Error('SKILL.md not found at root level of ZIP archive');
    }

    // Extract SKILL.md content
    const skillContent = strFromU8(unzipped[skillMdEntry]);

    // Extract companion files (everything except SKILL.md)
    const companionFiles: Array<{ path: string; content: ArrayBuffer; mimeType: string }> = [];

    for (const [path, content] of Object.entries(unzipped)) {
      // Skip SKILL.md and directory entries
      if (path.toLowerCase() === 'skill.md' || path.toLowerCase() === './skill.md' || path.endsWith('/')) {
        continue;
      }

      // Determine mime type based on extension
      const mimeType = this.getMimeType(path);

      companionFiles.push({
        path: this.normalizePath(path),
        content: content.buffer,
        mimeType,
      });
    }

    return {
      skillContent,
      companionFiles,
    };
  }

  /**
   * Validate skill structure (SKILL.md must exist)
   */
  validateStructure(structure: SkillZipStructure): boolean {
    return structure.skillContent.length > 0;
  }

  /**
   * Generate a downloadable ZIP containing skill and all companion files
   */
  async generateZip(skill: SkillWithFiles, r2: R2Bucket): Promise<Uint8Array> {
    const fileMap: Record<string, Uint8Array> = {};

    // Add main SKILL.md file
    fileMap['SKILL.md'] = strToU8(skill.content);

    // Add companion files from R2
    for (const file of skill.files) {
      const object = await r2.get(file.r2_key);
      if (object) {
        const content = await object.text();
        fileMap[file.file_path] = strToU8(content);
      }
    }

    // Generate ZIP with compression
    const zipped = zipSync(fileMap, {
      level: 6, // Balanced compression
    });

    return zipped;
  }

  /**
   * Get MIME type based on file extension
   */
  private getMimeType(filePath: string): string {
    const ext = filePath.split('.').pop()?.toLowerCase();

    const mimeTypes: Record<string, string> = {
      md: 'text/markdown',
      txt: 'text/plain',
      json: 'application/json',
      js: 'text/javascript',
      ts: 'text/typescript',
      py: 'text/x-python',
      yaml: 'text/yaml',
      yml: 'text/yaml',
      xml: 'application/xml',
      html: 'text/html',
      css: 'text/css',
      sh: 'text/x-shellscript',
    };

    return mimeTypes[ext || ''] || 'application/octet-stream';
  }

  /**
   * Normalize file path (remove leading ./ and duplicates)
   */
  private normalizePath(path: string): string {
    return path
      .replace(/^\.\//, '') // Remove leading ./
      .replace(/\/+/g, '/') // Remove duplicate slashes
      .trim();
  }

  /**
   * Validate file size limits
   * Max 10MB per file, max 50MB total
   */
  validateFileSizes(files: Array<{ path: string; content: ArrayBuffer }>): void {
    const maxFileSize = 10 * 1024 * 1024; // 10MB
    const maxTotalSize = 50 * 1024 * 1024; // 50MB

    let totalSize = 0;

    for (const file of files) {
      const fileSize = file.content.byteLength;

      if (fileSize > maxFileSize) {
        throw new Error(`File "${file.path}" exceeds maximum size of 10MB (${fileSize} bytes)`);
      }

      totalSize += fileSize;
    }

    if (totalSize > maxTotalSize) {
      throw new Error(`Total file size exceeds maximum of 50MB (${totalSize} bytes)`);
    }
  }

  /**
   * Validate file name restrictions
   * No special characters except: - _ . /
   */
  validateFileName(fileName: string): void {
    const validPattern = /^[a-zA-Z0-9\-_./]+$/;

    if (!validPattern.test(fileName)) {
      throw new Error(
        `Invalid file name "${fileName}". Only alphanumeric characters, hyphens, underscores, dots, and slashes are allowed.`
      );
    }

    // Prevent path traversal
    if (fileName.includes('..')) {
      throw new Error(`Invalid file name "${fileName}". Path traversal is not allowed.`);
    }
  }
}
