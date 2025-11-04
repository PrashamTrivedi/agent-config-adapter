import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FileStorageRepository } from '../../src/infrastructure/file-storage-repository';
import { createMockD1Database } from '../test-utils';

describe('FileStorageRepository', () => {
  let mockDb: D1Database;
  let repository: FileStorageRepository;

  beforeEach(() => {
    mockDb = createMockD1Database();
    repository = new FileStorageRepository(mockDb);
  });

  describe('create', () => {
    it('should create an extension file', async () => {
      const mockInsert = vi.fn().mockResolvedValue({ success: true, meta: { changes: 1 } });

      mockDb.prepare = vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          run: mockInsert,
        }),
      });

      const file = await repository.create({
        extension_id: 'ext-1',
        file_path: 'commands/test.md',
        r2_key: 'extensions/ext-1/files/commands/test.md',
        file_size: 100,
        mime_type: 'text/markdown',
      });

      expect(file.extension_id).toBe('ext-1');
      expect(file.file_path).toBe('commands/test.md');
      expect(file.r2_key).toBe('extensions/ext-1/files/commands/test.md');
      expect(file.file_size).toBe(100);
      expect(file.mime_type).toBe('text/markdown');
      expect(file.id).toBeDefined();
      expect(file.created_at).toBeDefined();
    });

    it('should create file with null file_size and mime_type if not provided', async () => {
      const mockInsert = vi.fn().mockResolvedValue({ success: true, meta: { changes: 1 } });

      mockDb.prepare = vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          run: mockInsert,
        }),
      });

      const file = await repository.create({
        extension_id: 'ext-1',
        file_path: 'test.bin',
        r2_key: 'extensions/ext-1/files/test.bin',
      });

      expect(file.extension_id).toBe('ext-1');
      expect(file.file_size).toBeNull();
      expect(file.mime_type).toBeNull();
    });
  });

  describe('findById', () => {
    it('should find extension file by id', async () => {
      const mockFile = {
        id: 'file-1',
        extension_id: 'ext-1',
        file_path: 'commands/test.md',
        r2_key: 'extensions/ext-1/files/commands/test.md',
        file_size: 100,
        mime_type: 'text/markdown',
        created_at: '2024-01-01',
      };

      mockDb.prepare = vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(mockFile),
        }),
      });

      const file = await repository.findById('file-1');

      expect(file).toBeDefined();
      expect(file?.id).toBe('file-1');
      expect(file?.extension_id).toBe('ext-1');
      expect(file?.file_path).toBe('commands/test.md');
    });

    it('should return null if file not found', async () => {
      mockDb.prepare = vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(null),
        }),
      });

      const file = await repository.findById('nonexistent');
      expect(file).toBeNull();
    });
  });

  describe('findByExtensionId', () => {
    it('should find all files for an extension', async () => {
      const mockFiles = [
        {
          id: 'file-1',
          extension_id: 'ext-1',
          file_path: 'commands/test.md',
          r2_key: 'extensions/ext-1/files/commands/test.md',
          file_size: 100,
          mime_type: 'text/markdown',
          created_at: '2024-01-02',
        },
        {
          id: 'file-2',
          extension_id: 'ext-1',
          file_path: 'agents/test.md',
          r2_key: 'extensions/ext-1/files/agents/test.md',
          file_size: 200,
          mime_type: 'text/markdown',
          created_at: '2024-01-01',
        },
      ];

      mockDb.prepare = vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          all: vi.fn().mockResolvedValue({ results: mockFiles }),
        }),
      });

      const files = await repository.findByExtensionId('ext-1');

      expect(files).toHaveLength(2);
      expect(files[0].id).toBe('file-1');
      expect(files[1].id).toBe('file-2');
    });

    it('should return empty array if no files found', async () => {
      mockDb.prepare = vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          all: vi.fn().mockResolvedValue({ results: [] }),
        }),
      });

      const files = await repository.findByExtensionId('ext-1');
      expect(files).toHaveLength(0);
    });
  });

  describe('delete', () => {
    it('should delete extension file by id', async () => {
      mockDb.prepare = vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          run: vi.fn().mockResolvedValue({ success: true, meta: { changes: 1 } }),
        }),
      });

      const success = await repository.delete('file-1');
      expect(success).toBe(true);
    });

    it('should return false if file not found', async () => {
      mockDb.prepare = vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          run: vi.fn().mockResolvedValue({ success: true, meta: { changes: 0 } }),
        }),
      });

      const success = await repository.delete('nonexistent');
      expect(success).toBe(false);
    });

    it('should return false if delete fails', async () => {
      mockDb.prepare = vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          run: vi.fn().mockResolvedValue({ success: false, meta: { changes: 0 } }),
        }),
      });

      const success = await repository.delete('file-1');
      expect(success).toBe(false);
    });
  });

  describe('deleteByExtensionId', () => {
    it('should delete all files for an extension', async () => {
      mockDb.prepare = vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          run: vi.fn().mockResolvedValue({ success: true, meta: { changes: 3 } }),
        }),
      });

      const success = await repository.deleteByExtensionId('ext-1');
      expect(success).toBe(true);
    });

    it('should return false if no files found', async () => {
      mockDb.prepare = vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          run: vi.fn().mockResolvedValue({ success: true, meta: { changes: 0 } }),
        }),
      });

      const success = await repository.deleteByExtensionId('ext-1');
      expect(success).toBe(false);
    });

    it('should return false if delete fails', async () => {
      mockDb.prepare = vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          run: vi.fn().mockResolvedValue({ success: false, meta: { changes: 0 } }),
        }),
      });

      const success = await repository.deleteByExtensionId('ext-1');
      expect(success).toBe(false);
    });
  });
});
