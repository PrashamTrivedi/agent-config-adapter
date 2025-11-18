import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FileStorageService } from '../../src/services/file-storage-service';
import { createMockD1Database, createMockR2Bucket } from '../test-utils';

describe('FileStorageService', () => {
	let mockDb: D1Database;
	let mockR2: R2Bucket;
	let service: FileStorageService;

	beforeEach(() => {
		mockDb = createMockD1Database();
		mockR2 = createMockR2Bucket();
		service = new FileStorageService({ DB: mockDb, EXTENSION_FILES: mockR2 });
	});

	describe('uploadFile', () => {
		it('should upload file to R2 and store metadata in database', async () => {
			const fileContent = new TextEncoder().encode('test content');
			const mockInsert = vi.fn().mockResolvedValue({ success: true, meta: { changes: 1 } });

			mockDb.prepare = vi.fn().mockReturnValue({
				bind: vi.fn().mockReturnValue({
					run: mockInsert,
				}),
			});

			const result = await service.uploadFile('ext-1', 'commands/test.md', fileContent.buffer, {
				mimeType: 'text/markdown',
			});

			expect(result.extension_id).toBe('ext-1');
			expect(result.file_path).toBe('commands/test.md');
			expect(result.r2_key).toBe('extensions/ext-1/commands/test.md');
			expect(mockR2.put).toHaveBeenCalledWith(
				'extensions/ext-1/commands/test.md',
				fileContent.buffer,
				expect.objectContaining({
					httpMetadata: { contentType: 'text/markdown' },
				})
			);
		});

		it('should upload file with custom metadata', async () => {
			const fileContent = new ArrayBuffer(100);
			const mockInsert = vi.fn().mockResolvedValue({ success: true, meta: { changes: 1 } });

			mockDb.prepare = vi.fn().mockReturnValue({
				bind: vi.fn().mockReturnValue({
					run: mockInsert,
				}),
			});

			const result = await service.uploadFile('ext-1', 'test.bin', fileContent, {
				customMetadata: { source: 'upload' },
			});

			expect(mockR2.put).toHaveBeenCalledWith(
				'extensions/ext-1/test.bin',
				fileContent,
				expect.objectContaining({
					customMetadata: { source: 'upload' },
				})
			);
		});

		it('should upload ReadableStream content', async () => {
			const stream = new ReadableStream();
			const mockInsert = vi.fn().mockResolvedValue({ success: true, meta: { changes: 1 } });

			mockDb.prepare = vi.fn().mockReturnValue({
				bind: vi.fn().mockReturnValue({
					run: mockInsert,
				}),
			});

			const result = await service.uploadFile('ext-1', 'stream.bin', stream);

			// file_size is null when content is ReadableStream (not ArrayBuffer)
		expect(result.file_size).toBeNull();
			expect(mockR2.put).toHaveBeenCalledWith('extensions/ext-1/stream.bin', stream, expect.any(Object));
		});
	});

	describe('getFileMetadata', () => {
		it('should get file metadata by id', async () => {
			const mockFile = {
				id: 'file-1',
				extension_id: 'ext-1',
				file_path: 'commands/test.md',
				r2_key: 'extensions/ext-1/commands/test.md',
				file_size: 100,
				mime_type: 'text/markdown',
				created_at: '2024-01-01',
			};

			mockDb.prepare = vi.fn().mockReturnValue({
				bind: vi.fn().mockReturnValue({
					first: vi.fn().mockResolvedValue(mockFile),
				}),
			});

			const result = await service.getFileMetadata('file-1');

			expect(result).toBeDefined();
			expect(result?.id).toBe('file-1');
			expect(result?.file_path).toBe('commands/test.md');
		});

		it('should return null if file not found', async () => {
			mockDb.prepare = vi.fn().mockReturnValue({
				bind: vi.fn().mockReturnValue({
					first: vi.fn().mockResolvedValue(null),
				}),
			});

			const result = await service.getFileMetadata('nonexistent');
			expect(result).toBeNull();
		});
	});

	describe('getFileContent', () => {
		it('should get file content from R2', async () => {
			const mockFile = {
				id: 'file-1',
				extension_id: 'ext-1',
				file_path: 'test.txt',
				r2_key: 'extensions/ext-1/test.txt',
				file_size: 100,
				mime_type: 'text/plain',
				created_at: '2024-01-01',
			};

			mockDb.prepare = vi.fn().mockReturnValue({
				bind: vi.fn().mockReturnValue({
					first: vi.fn().mockResolvedValue(mockFile),
				}),
			});

			const result = await service.getFileContent('file-1');

			expect(result).toBeDefined();
			expect(mockR2.get).toHaveBeenCalledWith('extensions/ext-1/test.txt');
		});

		it('should return null if file metadata not found', async () => {
			mockDb.prepare = vi.fn().mockReturnValue({
				bind: vi.fn().mockReturnValue({
					first: vi.fn().mockResolvedValue(null),
				}),
			});

			const result = await service.getFileContent('nonexistent');
			expect(result).toBeNull();
		});
	});

	describe('listExtensionFiles', () => {
		it('should list all files for an extension', async () => {
			const mockFiles = [
				{
					id: 'file-1',
					extension_id: 'ext-1',
					file_path: 'commands/test1.md',
					r2_key: 'extensions/ext-1/commands/test1.md',
					file_size: 100,
					mime_type: 'text/markdown',
					created_at: '2024-01-01',
				},
				{
					id: 'file-2',
					extension_id: 'ext-1',
					file_path: 'commands/test2.md',
					r2_key: 'extensions/ext-1/commands/test2.md',
					file_size: 200,
					mime_type: 'text/markdown',
					created_at: '2024-01-02',
				},
			];

			mockDb.prepare = vi.fn().mockReturnValue({
				bind: vi.fn().mockReturnValue({
					all: vi.fn().mockResolvedValue({ results: mockFiles }),
				}),
			});

			const result = await service.listExtensionFiles('ext-1');

			expect(result).toHaveLength(2);
			expect(result[0].id).toBe('file-1');
			expect(result[1].id).toBe('file-2');
		});

		it('should return empty array if no files found', async () => {
			mockDb.prepare = vi.fn().mockReturnValue({
				bind: vi.fn().mockReturnValue({
					all: vi.fn().mockResolvedValue({ results: [] }),
				}),
			});

			const result = await service.listExtensionFiles('ext-1');
			expect(result).toHaveLength(0);
		});
	});

	describe('deleteFile', () => {
		it('should delete file from both R2 and database', async () => {
			const mockFile = {
				id: 'file-1',
				extension_id: 'ext-1',
				file_path: 'test.txt',
				r2_key: 'extensions/ext-1/test.txt',
				file_size: 100,
				mime_type: 'text/plain',
				created_at: '2024-01-01',
			};

			mockDb.prepare = vi.fn().mockReturnValue({
				bind: vi.fn().mockReturnValue({
					first: vi.fn().mockResolvedValue(mockFile),
					run: vi.fn().mockResolvedValue({ success: true, meta: { changes: 1 } }),
				}),
			});

			const result = await service.deleteFile('file-1');

			expect(result).toBe(true);
			expect(mockR2.delete).toHaveBeenCalledWith('extensions/ext-1/test.txt');
		});

		it('should return false if file not found', async () => {
			mockDb.prepare = vi.fn().mockReturnValue({
				bind: vi.fn().mockReturnValue({
					first: vi.fn().mockResolvedValue(null),
				}),
			});

			const result = await service.deleteFile('nonexistent');
			expect(result).toBe(false);
		});
	});

	describe('deleteExtensionFiles', () => {
		it('should delete all files for an extension', async () => {
			const mockFiles = [
				{
					id: 'file-1',
					extension_id: 'ext-1',
					file_path: 'test1.txt',
					r2_key: 'extensions/ext-1/test1.txt',
					file_size: 100,
					mime_type: 'text/plain',
					created_at: '2024-01-01',
				},
				{
					id: 'file-2',
					extension_id: 'ext-1',
					file_path: 'test2.txt',
					r2_key: 'extensions/ext-1/test2.txt',
					file_size: 200,
					mime_type: 'text/plain',
					created_at: '2024-01-02',
				},
			];

			mockDb.prepare = vi.fn().mockReturnValue({
				bind: vi.fn().mockReturnValue({
					all: vi.fn().mockResolvedValue({ results: mockFiles }),
					run: vi.fn().mockResolvedValue({ success: true, meta: { changes: 2 } }),
				}),
			});

			await service.deleteExtensionFiles('ext-1');

			expect(mockR2.delete).toHaveBeenCalledTimes(2);
			expect(mockR2.delete).toHaveBeenCalledWith('extensions/ext-1/test1.txt');
			expect(mockR2.delete).toHaveBeenCalledWith('extensions/ext-1/test2.txt');
		});

		it('should handle empty extension (no files)', async () => {
			mockDb.prepare = vi.fn().mockReturnValue({
				bind: vi.fn().mockReturnValue({
					all: vi.fn().mockResolvedValue({ results: [] }),
					run: vi.fn().mockResolvedValue({ success: true, meta: { changes: 0 } }),
				}),
			});

			await service.deleteExtensionFiles('ext-1');

			expect(mockR2.delete).not.toHaveBeenCalled();
		});
	});

	describe('getSignedDownloadUrl', () => {
		it('should generate download URL for existing file', async () => {
			const mockFile = {
				id: 'file-1',
				extension_id: 'ext-1',
				file_path: 'test.txt',
				r2_key: 'extensions/ext-1/test.txt',
				file_size: 100,
				mime_type: 'text/plain',
				created_at: '2024-01-01',
			};

			mockDb.prepare = vi.fn().mockReturnValue({
				bind: vi.fn().mockReturnValue({
					first: vi.fn().mockResolvedValue(mockFile),
				}),
			});

			const result = await service.getSignedDownloadUrl('file-1');

			expect(result).toBe('/api/files/file-1/download');
		});

		it('should return null if file not found', async () => {
			mockDb.prepare = vi.fn().mockReturnValue({
				bind: vi.fn().mockReturnValue({
					first: vi.fn().mockResolvedValue(null),
				}),
			});

			const result = await service.getSignedDownloadUrl('nonexistent');
			expect(result).toBeNull();
		});

		it('should accept custom expiration time', async () => {
			const mockFile = {
				id: 'file-1',
				extension_id: 'ext-1',
				file_path: 'test.txt',
				r2_key: 'extensions/ext-1/test.txt',
				file_size: 100,
				mime_type: 'text/plain',
				created_at: '2024-01-01',
			};

			mockDb.prepare = vi.fn().mockReturnValue({
				bind: vi.fn().mockReturnValue({
					first: vi.fn().mockResolvedValue(mockFile),
				}),
			});

			const result = await service.getSignedDownloadUrl('file-1', 7200);

			expect(result).toBe('/api/files/file-1/download');
		});
	});

	describe('fileExists', () => {
		it('should return true if file exists in R2', async () => {
			mockR2.head = vi.fn().mockResolvedValue({
				key: 'extensions/ext-1/test.txt',
				size: 100,
				etag: 'mock-etag',
			} as R2Object);

			const result = await service.fileExists('extensions/ext-1/test.txt');

			expect(result).toBe(true);
			expect(mockR2.head).toHaveBeenCalledWith('extensions/ext-1/test.txt');
		});

		it('should return false if file does not exist in R2', async () => {
			mockR2.head = vi.fn().mockResolvedValue(null);

			const result = await service.fileExists('extensions/ext-1/nonexistent.txt');

			expect(result).toBe(false);
		});
	});

	describe('getFileSize', () => {
		it('should return file size from R2', async () => {
			mockR2.head = vi.fn().mockResolvedValue({
				key: 'extensions/ext-1/test.txt',
				size: 12345,
				etag: 'mock-etag',
			} as R2Object);

			const result = await service.getFileSize('extensions/ext-1/test.txt');

			expect(result).toBe(12345);
		});

		it('should return null if file does not exist', async () => {
			mockR2.head = vi.fn().mockResolvedValue(null);

			const result = await service.getFileSize('extensions/ext-1/nonexistent.txt');

			expect(result).toBeNull();
		});
	});
});
