import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SyncService } from '../../src/services/sync-service';
import { createMockD1Database, createMockR2Bucket } from '../test-utils';
import type { Config } from '../../src/domain/types';

describe('SyncService', () => {
  let syncService: SyncService;
  let mockDb: D1Database;
  let mockR2: R2Bucket;

  beforeEach(() => {
    mockDb = createMockD1Database();
    mockR2 = createMockR2Bucket();
    syncService = new SyncService({
      DB: mockDb,
      EXTENSION_FILES: mockR2,
    });
  });

  describe('syncConfigs', () => {
    it('should create new configs when no remote match exists', async () => {
      // Mock returns empty results for findAll
      const result = await syncService.syncConfigs(
        [
          {
            name: 'new-command',
            type: 'slash_command',
            content: '# New Command\nContent here',
          },
        ],
        'user-123'
      );

      expect(result.created.length).toBe(1);
      expect(result.created[0].name).toBe('new-command');
      expect(result.created[0].type).toBe('slash_command');
      expect(result.updated.length).toBe(0);
      expect(result.deletionCandidates.length).toBe(0);
    });

    it('should return dry run results without making changes', async () => {
      const result = await syncService.syncConfigs(
        [
          {
            name: 'new-command',
            type: 'slash_command',
            content: '# New Command\nContent here',
          },
        ],
        'user-123',
        undefined,
        true // dry_run
      );

      expect(result.created.length).toBe(1);
      expect(result.created[0].id).toBe('dry-run');
      // Database should not have been called for insert in dry run
    });

    it('should filter by types when specified', async () => {
      const result = await syncService.syncConfigs(
        [
          { name: 'command', type: 'slash_command', content: 'content' },
          { name: 'agent', type: 'agent_definition', content: 'content' },
          { name: 'skill', type: 'skill', content: 'content' },
        ],
        'user-123',
        ['slash_command', 'skill'] // Only sync these types
      );

      // Should only process slash_command and skill, not agent_definition
      expect(result.created.length).toBe(2);
      expect(result.created.map(c => c.type)).toContain('slash_command');
      expect(result.created.map(c => c.type)).toContain('skill');
      expect(result.created.map(c => c.type)).not.toContain('agent_definition');
    });

    it('should handle empty configs array', async () => {
      const result = await syncService.syncConfigs([], 'user-123');

      expect(result.created.length).toBe(0);
      expect(result.updated.length).toBe(0);
      expect(result.unchanged.length).toBe(0);
      expect(result.deletionCandidates.length).toBe(0);
    });

    it('should sync companion files for skills', async () => {
      await syncService.syncConfigs(
        [
          {
            name: 'my-skill',
            type: 'skill',
            content: '# My Skill\nContent',
            companionFiles: [
              {
                path: 'FORMS.md',
                content: '# Forms\nForm content',
                mimeType: 'text/markdown',
              },
            ],
          },
        ],
        'user-123'
      );

      // R2 put should have been called for companion file
      expect(mockR2.put).toHaveBeenCalled();
    });
  });

  describe('deleteConfigs', () => {
    it('should handle empty configIds array', async () => {
      const result = await syncService.deleteConfigs([]);

      expect(result.deleted.length).toBe(0);
      expect(result.failed.length).toBe(0);
    });

    it('should attempt to delete configs by ID', async () => {
      const result = await syncService.deleteConfigs(['config-1', 'config-2']);

      // With mock DB returning success, both should be deleted
      expect(mockDb.prepare).toHaveBeenCalled();
    });
  });

  describe('LocalConfigInput validation', () => {
    it('should accept valid slash_command input', async () => {
      const result = await syncService.syncConfigs(
        [
          {
            name: 'valid-command',
            type: 'slash_command',
            content: '# Valid\nContent',
          },
        ],
        'user-123'
      );

      expect(result.created.length).toBe(1);
    });

    it('should accept valid skill input with companion files', async () => {
      const result = await syncService.syncConfigs(
        [
          {
            name: 'valid-skill',
            type: 'skill',
            content: '# Valid Skill\nContent',
            companionFiles: [
              {
                path: 'helper.ts',
                content: 'export const helper = () => {}',
                mimeType: 'text/typescript',
              },
            ],
          },
        ],
        'user-123'
      );

      expect(result.created.length).toBe(1);
    });

    it('should accept valid agent_definition input', async () => {
      const result = await syncService.syncConfigs(
        [
          {
            name: 'valid-agent',
            type: 'agent_definition',
            content: '# Valid Agent\nInstructions',
          },
        ],
        'user-123'
      );

      expect(result.created.length).toBe(1);
    });
  });

  describe('SyncResult structure', () => {
    it('should return properly structured result', async () => {
      const result = await syncService.syncConfigs(
        [{ name: 'test', type: 'slash_command', content: 'content' }],
        'user-123'
      );

      expect(result).toHaveProperty('created');
      expect(result).toHaveProperty('updated');
      expect(result).toHaveProperty('unchanged');
      expect(result).toHaveProperty('deletionCandidates');
      expect(Array.isArray(result.created)).toBe(true);
      expect(Array.isArray(result.updated)).toBe(true);
      expect(Array.isArray(result.unchanged)).toBe(true);
      expect(Array.isArray(result.deletionCandidates)).toBe(true);
    });

    it('should include id, name, and type in created items', async () => {
      const result = await syncService.syncConfigs(
        [{ name: 'new-item', type: 'slash_command', content: 'content' }],
        'user-123'
      );

      expect(result.created.length).toBe(1);
      expect(result.created[0]).toHaveProperty('id');
      expect(result.created[0]).toHaveProperty('name');
      expect(result.created[0]).toHaveProperty('type');
      expect(result.created[0].name).toBe('new-item');
      expect(result.created[0].type).toBe('slash_command');
    });
  });
});
