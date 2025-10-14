import { FileStorageRepository } from '../infrastructure/file-storage-repository';
import { ExtensionFile, CreateExtensionFileInput } from '../domain/types';

export interface FileStorageServiceEnv {
  DB: D1Database;
  EXTENSION_FILES: R2Bucket;
}

/**
 * FileStorageService - Handles file uploads to R2 and metadata in D1
 * Used for extension files (README, icons, context files, scripts)
 */
export class FileStorageService {
  private repo: FileStorageRepository;
  private r2: R2Bucket;

  constructor(env: FileStorageServiceEnv) {
    this.repo = new FileStorageRepository(env.DB);
    this.r2 = env.EXTENSION_FILES;
  }

  /**
   * Upload a file to R2 and store metadata in database
   */
  async uploadFile(
    extensionId: string,
    filePath: string,
    fileContent: ArrayBuffer | ReadableStream,
    options?: {
      mimeType?: string;
      customMetadata?: Record<string, string>;
    }
  ): Promise<ExtensionFile> {
    // Generate R2 key: extensions/{extension_id}/{file_path}
    const r2Key = `extensions/${extensionId}/${filePath}`;

    // Determine file size if content is ArrayBuffer
    const fileSize = fileContent instanceof ArrayBuffer ? fileContent.byteLength : undefined;

    // Upload to R2
    const httpMetadata: R2HTTPMetadata = {};
    if (options?.mimeType) {
      httpMetadata.contentType = options.mimeType;
    }

    await this.r2.put(r2Key, fileContent, {
      httpMetadata,
      customMetadata: options?.customMetadata,
    });

    // Store metadata in database
    const fileMetadata = await this.repo.create({
      extension_id: extensionId,
      file_path: filePath,
      r2_key: r2Key,
      file_size: fileSize,
      mime_type: options?.mimeType,
    });

    return fileMetadata;
  }

  /**
   * Get file metadata by ID
   */
  async getFileMetadata(fileId: string): Promise<ExtensionFile | null> {
    return await this.repo.findById(fileId);
  }

  /**
   * Get file content from R2
   */
  async getFileContent(fileId: string): Promise<R2ObjectBody | null> {
    const metadata = await this.repo.findById(fileId);
    if (!metadata) return null;

    const object = await this.r2.get(metadata.r2_key);
    return object;
  }

  /**
   * List all files for an extension
   */
  async listExtensionFiles(extensionId: string): Promise<ExtensionFile[]> {
    return await this.repo.findByExtensionId(extensionId);
  }

  /**
   * Delete a file (from both R2 and database)
   */
  async deleteFile(fileId: string): Promise<boolean> {
    const metadata = await this.repo.findById(fileId);
    if (!metadata) return false;

    // Delete from R2
    await this.r2.delete(metadata.r2_key);

    // Delete from database
    return await this.repo.delete(fileId);
  }

  /**
   * Delete all files for an extension (cleanup on extension deletion)
   */
  async deleteExtensionFiles(extensionId: string): Promise<void> {
    const files = await this.repo.findByExtensionId(extensionId);

    // Delete all files from R2
    const deletePromises = files.map((file) => this.r2.delete(file.r2_key));
    await Promise.all(deletePromises);

    // Delete all file metadata from database
    await this.repo.deleteByExtensionId(extensionId);
  }

  /**
   * Generate a signed URL for file download (1 hour expiration)
   */
  async getSignedDownloadUrl(fileId: string, expiresIn: number = 3600): Promise<string | null> {
    const metadata = await this.repo.findById(fileId);
    if (!metadata) return null;

    // For R2, we can use presigned URLs or direct public URLs
    // Note: This requires R2 bucket to be configured for public access or presigned URLs
    // For now, return a direct URL (assumes public bucket or custom domain)
    // In production, implement R2 presigned URL generation

    // Placeholder: return R2 public URL pattern
    // Format: https://{bucket}.{account}.r2.cloudflarestorage.com/{key}
    // You'll need to configure this based on your R2 setup

    return `/api/files/${fileId}/download`;
  }

  /**
   * Check if a file exists in R2
   */
  async fileExists(r2Key: string): Promise<boolean> {
    const object = await this.r2.head(r2Key);
    return object !== null;
  }

  /**
   * Get file size from R2
   */
  async getFileSize(r2Key: string): Promise<number | null> {
    const object = await this.r2.head(r2Key);
    return object?.size || null;
  }
}
