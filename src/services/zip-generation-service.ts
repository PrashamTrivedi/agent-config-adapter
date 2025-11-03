import { zipSync, strToU8 } from 'fflate';
import { ExtensionWithConfigs } from '../domain/types';
import { FileGenerationService } from './file-generation-service';
import { ManifestService } from './manifest-service';

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
  private manifestService: ManifestService;

  constructor(env: ZipGenerationServiceEnv) {
    this.fileGenService = new FileGenerationService(env);
    this.r2 = env.EXTENSION_FILES;
    this.manifestService = new ManifestService();
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
    console.log('[ZipGeneration] Starting marketplace ZIP generation', {
      marketplaceId: marketplace.id,
      marketplaceName: marketplace.name,
      format,
      extensionCount: marketplace.extensions.length,
    });

    const fileMap: Record<string, Uint8Array> = {};
    let totalFilesAdded = 0;

    // Process each extension
    for (let i = 0; i < marketplace.extensions.length; i++) {
      const extension = marketplace.extensions[i];
      console.log(`[ZipGeneration] Processing extension ${i + 1}/${marketplace.extensions.length}`, {
        extensionId: extension.id,
        extensionName: extension.name,
        configCount: extension.configs?.length || 0,
      });

      try {
        // Ensure files are generated
        const hasFiles = await this.fileGenService.hasGeneratedFiles(extension.id, format);
        console.log('[ZipGeneration] Checking for generated files', {
          extensionId: extension.id,
          hasFiles,
        });

        if (!hasFiles) {
          console.log('[ZipGeneration] Generating files for extension', {
            extensionId: extension.id,
          });
          await this.fileGenService.generateExtensionFiles(extension, format);
          console.log('[ZipGeneration] Files generated successfully', {
            extensionId: extension.id,
          });
        }

        // Get all generated files
        const generatedFiles = await this.fileGenService.getGeneratedFiles(extension.id, format);
        console.log('[ZipGeneration] Retrieved generated files list', {
          extensionId: extension.id,
          fileCount: generatedFiles.length,
          files: generatedFiles.map((f) => f.path),
        });

        // Fetch each file and add to ZIP with plugin directory prefix
        const pluginDirName = this.sanitizeDirectoryName(extension.name);
        for (let j = 0; j < generatedFiles.length; j++) {
          const file = generatedFiles[j];
          console.log(
            `[ZipGeneration] Fetching file ${j + 1}/${generatedFiles.length} from R2`,
            {
              extensionId: extension.id,
              filePath: file.path,
              r2Key: file.r2Key,
            }
          );

          const object = await this.r2.get(file.r2Key);
          if (object) {
            const content = await object.text();
            const zipPath = `plugins/${pluginDirName}/${file.path}`;
            fileMap[zipPath] = strToU8(content);
            totalFilesAdded++;
            console.log('[ZipGeneration] File added to ZIP', {
              zipPath,
              sizeBytes: content.length,
            });
          } else {
            console.warn('[ZipGeneration] File not found in R2', {
              extensionId: extension.id,
              r2Key: file.r2Key,
            });
          }
        }

        console.log('[ZipGeneration] Extension processing complete', {
          extensionId: extension.id,
          filesAdded: generatedFiles.length,
        });
      } catch (error: any) {
        console.error('[ZipGeneration] Error processing extension', {
          extensionId: extension.id,
          extensionName: extension.name,
          error: error.message,
          stack: error.stack,
        });
        throw new Error(
          `Failed to process extension "${extension.name}" (${extension.id}): ${error.message}`
        );
      }
    }

    // Add marketplace.json manifest for Claude Code format
    if (format === 'claude_code') {
      console.log('[ZipGeneration] Generating marketplace manifest', { format });
      const manifest = await this.manifestService.generateClaudeCodeMarketplaceManifest(
        marketplace as any
      );
      fileMap['marketplace.json'] = strToU8(JSON.stringify(manifest, null, 2));
      totalFilesAdded++;
      console.log('[ZipGeneration] Marketplace manifest added to ZIP');
    }

    // Generate ZIP
    console.log('[ZipGeneration] Creating ZIP archive', {
      totalFiles: totalFilesAdded,
      compressionLevel: 6,
    });

    const zipped = zipSync(fileMap, {
      level: 6,
    });

    console.log('[ZipGeneration] ZIP generation complete', {
      finalSizeBytes: zipped.length,
      totalFilesAdded,
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
