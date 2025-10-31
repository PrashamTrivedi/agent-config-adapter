import { describe, it, expect, beforeEach } from 'vitest';
import { CacheService } from '../../src/infrastructure/cache';
import { createMockKVNamespace } from '../test-utils';

describe('CacheService', () => {
  let mockKV: KVNamespace;
  let cache: CacheService;

  beforeEach(() => {
    mockKV = createMockKVNamespace();
    cache = new CacheService(mockKV);
  });

  describe('get', () => {
    it('should return null when key does not exist', async () => {
      const value = await cache.get('non-existent-id');
      expect(value).toBeNull();
    });

    it('should return cached value when it exists', async () => {
      const testValue = 'cached content';
      await mockKV.put('config:test-id', testValue);

      const value = await cache.get('test-id');
      expect(value).toBe(testValue);
    });

    it('should use format in key when provided', async () => {
      const testValue = 'converted content';
      await mockKV.put('config:test-id:codex', testValue);

      const value = await cache.get('test-id', 'codex');
      expect(value).toBe(testValue);
    });

    it('should distinguish between different formats', async () => {
      await mockKV.put('config:test-id:claude_code', 'claude content');
      await mockKV.put('config:test-id:codex', 'codex content');

      const claudeValue = await cache.get('test-id', 'claude_code');
      const codexValue = await cache.get('test-id', 'codex');

      expect(claudeValue).toBe('claude content');
      expect(codexValue).toBe('codex content');
    });
  });

  describe('set', () => {
    it('should store value in KV', async () => {
      await cache.set('test-id', 'test content');

      const value = await mockKV.get('config:test-id');
      expect(value).toBe('test content');
    });

    it('should store value with format key', async () => {
      await cache.set('test-id', 'converted content', 'codex');

      const value = await mockKV.get('config:test-id:codex');
      expect(value).toBe('converted content');
    });

    it('should use default TTL of 3600 seconds', async () => {
      await cache.set('test-id', 'content');

      expect(mockKV.put).toHaveBeenCalledWith(
        'config:test-id',
        'content',
        { expirationTtl: 3600 }
      );
    });

    it('should use custom TTL when provided', async () => {
      await cache.set('test-id', 'content', undefined, 7200);

      expect(mockKV.put).toHaveBeenCalledWith(
        'config:test-id',
        'content',
        { expirationTtl: 7200 }
      );
    });

    it('should overwrite existing value', async () => {
      await cache.set('test-id', 'old content');
      await cache.set('test-id', 'new content');

      const value = await mockKV.get('config:test-id');
      expect(value).toBe('new content');
    });
  });

  describe('delete', () => {
    it('should delete all format variations', async () => {
      // Set up multiple format caches
      await mockKV.put('config:test-id', 'original');
      await mockKV.put('config:test-id:claude_code', 'claude');
      await mockKV.put('config:test-id:codex', 'codex');
      await mockKV.put('config:test-id:gemini', 'gemini');

      await cache.delete('test-id');

      // All variations should be deleted
      expect(await mockKV.get('config:test-id')).toBeNull();
      expect(await mockKV.get('config:test-id:claude_code')).toBeNull();
      expect(await mockKV.get('config:test-id:codex')).toBeNull();
      expect(await mockKV.get('config:test-id:gemini')).toBeNull();
    });

    it('should call KV delete for each format', async () => {
      await cache.delete('test-id');

      expect(mockKV.delete).toHaveBeenCalledTimes(4); // base + 3 formats
    });

    it('should not throw error when deleting non-existent keys', async () => {
      await expect(cache.delete('non-existent-id')).resolves.not.toThrow();
    });
  });

  describe('invalidate', () => {
    it('should be an alias for delete', async () => {
      await mockKV.put('config:test-id:claude_code', 'content');
      await cache.invalidate('test-id');

      expect(await mockKV.get('config:test-id:claude_code')).toBeNull();
    });

    it('should clear all cached conversions', async () => {
      await mockKV.put('config:test-id:claude_code', 'claude');
      await mockKV.put('config:test-id:codex', 'codex');
      await mockKV.put('config:test-id:gemini', 'gemini');

      await cache.invalidate('test-id');

      expect(await mockKV.get('config:test-id:claude_code')).toBeNull();
      expect(await mockKV.get('config:test-id:codex')).toBeNull();
      expect(await mockKV.get('config:test-id:gemini')).toBeNull();
    });
  });

  describe('Key generation', () => {
    it('should generate correct key without format', async () => {
      await cache.set('test-123', 'content');
      expect(mockKV.put).toHaveBeenCalledWith(
        'config:test-123',
        'content',
        expect.any(Object)
      );
    });

    it('should generate correct key with format', async () => {
      await cache.set('test-456', 'content', 'claude_code');
      expect(mockKV.put).toHaveBeenCalledWith(
        'config:test-456:claude_code',
        'content',
        expect.any(Object)
      );
    });

    it('should handle special characters in ID', async () => {
      await cache.set('test-id_123-abc', 'content');
      expect(mockKV.put).toHaveBeenCalledWith(
        'config:test-id_123-abc',
        'content',
        expect.any(Object)
      );
    });
  });

  describe('Cache isolation', () => {
    it('should not interfere with different config IDs', async () => {
      await cache.set('config-1', 'content-1', 'claude_code');
      await cache.set('config-2', 'content-2', 'claude_code');

      const value1 = await cache.get('config-1', 'claude_code');
      const value2 = await cache.get('config-2', 'claude_code');

      expect(value1).toBe('content-1');
      expect(value2).toBe('content-2');
    });

    it('should delete only specified config', async () => {
      await cache.set('config-1', 'content-1');
      await cache.set('config-2', 'content-2');

      await cache.delete('config-1');

      expect(await cache.get('config-1')).toBeNull();
      expect(await cache.get('config-2')).toBe('content-2');
    });
  });
});
