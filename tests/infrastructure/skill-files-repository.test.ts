import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SkillFilesRepository } from '../../src/infrastructure/skill-files-repository';
import { createMockD1Database } from '../test-utils';

describe('SkillFilesRepository', () => {
	let mockDb: D1Database;
	let repo: SkillFilesRepository;

	beforeEach(() => {
		mockDb = createMockD1Database();
		repo = new SkillFilesRepository(mockDb);
	});

	describe('create', () => {
		it('should create a skill file record', async () => {
			const mockRun = vi.fn().mockResolvedValue({ success: true, meta: { changes: 1 } });

			mockDb.prepare = vi.fn().mockReturnValue({
				bind: vi.fn().mockReturnValue({
					run: mockRun,
				}),
			});

			const file = await repo.create({
				skill_id: 'skill-123',
				file_path: 'FORMS.md',
				r2_key: 'skills/skill-123/files/FORMS.md',
				file_size: 1024,
				mime_type: 'text/markdown',
			});

			expect(file.skill_id).toBe('skill-123');
			expect(file.file_path).toBe('FORMS.md');
			expect(file.r2_key).toBe('skills/skill-123/files/FORMS.md');
			expect(mockRun).toHaveBeenCalled();
		});

		it('should create file with null values for optional fields', async () => {
			const mockRun = vi.fn().mockResolvedValue({ success: true, meta: { changes: 1 } });

			mockDb.prepare = vi.fn().mockReturnValue({
				bind: vi.fn().mockReturnValue({
					run: mockRun,
				}),
			});

			const file = await repo.create({
				skill_id: 'skill-123',
				file_path: 'data.bin',
				r2_key: 'skills/skill-123/files/data.bin',
			});

			expect(file.file_size).toBeNull();
			expect(file.mime_type).toBeNull();
		});
	});

	describe('findById', () => {
		it('should return file by id', async () => {
			const mockFile = {
				id: 'file-1',
				skill_id: 'skill-123',
				file_path: 'helper.py',
				r2_key: 'skills/skill-123/files/helper.py',
				file_size: 512,
				mime_type: 'text/x-python',
				created_at: '2024-01-01T00:00:00.000Z',
			};

			mockDb.prepare = vi.fn().mockReturnValue({
				bind: vi.fn().mockReturnValue({
					first: vi.fn().mockResolvedValue(mockFile),
				}),
			});

			const file = await repo.findById('file-1');
			expect(file).toEqual(mockFile);
		});

		it('should return null if file not found', async () => {
			mockDb.prepare = vi.fn().mockReturnValue({
				bind: vi.fn().mockReturnValue({
					first: vi.fn().mockResolvedValue(null),
				}),
			});

			const file = await repo.findById('nonexistent');
			expect(file).toBeNull();
		});
	});

	describe('findBySkillId', () => {
		it('should return files for a skill', async () => {
			const mockFiles = [
				{
					id: 'file-1',
					skill_id: 'skill-123',
					file_path: 'FORMS.md',
					r2_key: 'skills/skill-123/files/FORMS.md',
					file_size: 1024,
					mime_type: 'text/markdown',
					created_at: '2024-01-01T00:00:00.000Z',
				},
			];

			mockDb.prepare = vi.fn().mockReturnValue({
				bind: vi.fn().mockReturnValue({
					all: vi.fn().mockResolvedValue({ results: mockFiles }),
				}),
			});

			const files = await repo.findBySkillId('skill-123');
			expect(files).toEqual(mockFiles);
		});

		it('should return empty array if no files found', async () => {
			mockDb.prepare = vi.fn().mockReturnValue({
				bind: vi.fn().mockReturnValue({
					all: vi.fn().mockResolvedValue({ results: [] }),
				}),
			});

			const files = await repo.findBySkillId('skill-123');
			expect(files).toHaveLength(0);
		});
	});

	describe('findBySkillIdAndPath', () => {
		it('should return file by skill id and path', async () => {
			const mockFile = {
				id: 'file-1',
				skill_id: 'skill-123',
				file_path: 'config.json',
				r2_key: 'skills/skill-123/files/config.json',
				file_size: 256,
				mime_type: 'application/json',
				created_at: '2024-01-01T00:00:00.000Z',
			};

			mockDb.prepare = vi.fn().mockReturnValue({
				bind: vi.fn().mockReturnValue({
					first: vi.fn().mockResolvedValue(mockFile),
				}),
			});

			const file = await repo.findBySkillIdAndPath('skill-123', 'config.json');
			expect(file).toEqual(mockFile);
		});

		it('should return null if file not found', async () => {
			mockDb.prepare = vi.fn().mockReturnValue({
				bind: vi.fn().mockReturnValue({
					first: vi.fn().mockResolvedValue(null),
				}),
			});

			const file = await repo.findBySkillIdAndPath('skill-123', 'nonexistent.txt');
			expect(file).toBeNull();
		});
	});

	describe('delete', () => {
		it('should delete a skill file', async () => {
			mockDb.prepare = vi.fn().mockReturnValue({
				bind: vi.fn().mockReturnValue({
					run: vi.fn().mockResolvedValue({ success: true, meta: { changes: 1 } }),
				}),
			});

			const success = await repo.delete('file-1');
			expect(success).toBe(true);
		});

		it('should return false if file not found', async () => {
			mockDb.prepare = vi.fn().mockReturnValue({
				bind: vi.fn().mockReturnValue({
					run: vi.fn().mockResolvedValue({ success: true, meta: { changes: 0 } }),
				}),
			});

			const success = await repo.delete('nonexistent');
			expect(success).toBe(false);
		});

		it('should return false if delete operation fails', async () => {
			mockDb.prepare = vi.fn().mockReturnValue({
				bind: vi.fn().mockReturnValue({
					run: vi.fn().mockResolvedValue({ success: false, meta: { changes: 0 } }),
				}),
			});

			const success = await repo.delete('file-1');
			expect(success).toBe(false);
		});
	});

	describe('deleteBySkillId', () => {
		it('should delete all files for a skill', async () => {
			mockDb.prepare = vi.fn().mockReturnValue({
				bind: vi.fn().mockReturnValue({
					run: vi.fn().mockResolvedValue({ success: true, meta: { changes: 3 } }),
				}),
			});

			const success = await repo.deleteBySkillId('skill-123');
			expect(success).toBe(true);
		});

		it('should return false if no files deleted', async () => {
			mockDb.prepare = vi.fn().mockReturnValue({
				bind: vi.fn().mockReturnValue({
					run: vi.fn().mockResolvedValue({ success: true, meta: { changes: 0 } }),
				}),
			});

			const success = await repo.deleteBySkillId('skill-123');
			expect(success).toBe(false);
		});

		it('should return false if delete operation fails', async () => {
			mockDb.prepare = vi.fn().mockReturnValue({
				bind: vi.fn().mockReturnValue({
					run: vi.fn().mockResolvedValue({ success: false, meta: { changes: 0 } }),
				}),
			});

			const success = await repo.deleteBySkillId('skill-123');
			expect(success).toBe(false);
		});
	});

	describe('batchCreate', () => {
		it('should create multiple skill files', async () => {
			const mockRun = vi.fn().mockResolvedValue({ success: true, meta: { changes: 1 } });

			mockDb.prepare = vi.fn().mockReturnValue({
				bind: vi.fn().mockReturnValue({
					run: mockRun,
				}),
			});

			const inputs = [
				{
					skill_id: 'skill-123',
					file_path: 'file1.md',
					r2_key: 'skills/skill-123/files/file1.md',
					file_size: 100,
					mime_type: 'text/markdown',
				},
				{
					skill_id: 'skill-123',
					file_path: 'file2.py',
					r2_key: 'skills/skill-123/files/file2.py',
					file_size: 200,
					mime_type: 'text/x-python',
				},
			];

			const files = await repo.batchCreate(inputs);

			expect(files).toHaveLength(2);
			expect(files[0].file_path).toBe('file1.md');
			expect(files[1].file_path).toBe('file2.py');
			expect(mockRun).toHaveBeenCalledTimes(2);
		});

		it('should handle empty batch', async () => {
			const files = await repo.batchCreate([]);
			expect(files).toHaveLength(0);
		});
	});
});
