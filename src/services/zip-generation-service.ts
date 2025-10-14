import { zipSync, strToU8 } from 'fflate';
import { ExtensionWithConfigs } from '../domain/types';
import { FileGenerationService } from './file-generation-service';

export interface ZipGenerationServiceEnv {
  DB: D1Database;
  EXTENSION_FILES: R2Bucket;
}

/**
 * ZipGenerationService - Generates ZIP archives of plugin files
 * Uses fflate for Cloudflare Workers compatibility
 */
export class ZipGenerationService {
  private fileGenService: FileGenerationService;
  private r2: R2Bucket;

  constructor(env: ZipGenerationServiceEnv) {
    this.fileGenService = new FileGenerationService(env);
    this.r2 = env.EXTENSION_FILES;
  }

  /**
   * Generate a ZIP archive containing all plugin files
   * Returns Uint8Array ready to be streamed to client
   */
  async generatePluginZip(
    extension: ExtensionWithConfigs,
    format: 'claude_code' | 'gemini'
  ): Promise<Uint8Array> {
    // Ensure files are generated
    const hasFiles = await this.fileGenService.hasGeneratedFiles(extension.id, format);
    if (!hasFiles) {
      await this.fileGenService.generateExtensionFiles(extension, format);
    }

    // Get all generated files
    const generatedFiles = await this.fileGenService.getGeneratedFiles(extension.id, format);

    // Build file map for fflate
    const fileMap: Record<string, Uint8Array> = {};

    // Fetch each file from R2 and add to ZIP
    for (const file of generatedFiles) {
      const object = await this.r2.get(file.r2Key);
      if (object) {
        const content = await object.text();
        fileMap[file.path] = strToU8(content);
      }
    }

    // Generate ZIP synchronously (fflate's zipSync is fast for small files)
    const zipped = zipSync(fileMap, {
      level: 6, // Balanced compression
    });

    return zipped;
  }

  /**
   * Generate a ZIP archive containing all plugins in a marketplace
   * Creates a directory structure: plugins/{plugin-name}/*
   */
  async generateMarketplaceZip(
    marketplace: { id: string; name: string; extensions: ExtensionWithConfigs[] },
    format: 'claude_code' | 'gemini'
  ): Promise<Uint8Array> {
    const fileMap: Record<string, Uint8Array> = {};

    // Process each extension
    for (const extension of marketplace.extensions) {
      // Ensure files are generated
      const hasFiles = await this.fileGenService.hasGeneratedFiles(extension.id, format);
      if (!hasFiles) {
        await this.fileGenService.generateExtensionFiles(extension, format);
      }

      // Get all generated files
      const generatedFiles = await this.fileGenService.getGeneratedFiles(extension.id, format);

      // Fetch each file and add to ZIP with plugin directory prefix
      const pluginDirName = this.sanitizeDirectoryName(extension.name);
      for (const file of generatedFiles) {
        const object = await this.r2.get(file.r2Key);
        if (object) {
          const content = await object.text();
          fileMap[`plugins/${pluginDirName}/${file.path}`] = strToU8(content);
        }
      }
    }

    // Generate ZIP
    const zipped = zipSync(fileMap, {
      level: 6,
    });

    return zipped;
  }

  /**
   * Get suggested filename for ZIP download
   */
  getZipFilename(name: string, format: 'claude_code' | 'gemini', type: 'plugin' | 'marketplace'): string {
    const sanitized = this.sanitizeDirectoryName(name);
    return `${sanitized}-${format}-${type}.zip`;
  }

  /**
   * Sanitize directory name for file system usage
   */
  private sanitizeDirectoryName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }
}
