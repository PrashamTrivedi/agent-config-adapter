import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConversionService } from '../../src/services/conversion-service';
import { createMockD1Database, createMockKVNamespace, sampleConfigs, createMockConfig } from '../test-utils';

describe('ConversionService', () => {
  let mockDb: D1Database;
  let mockKV: KVNamespace;
  let service: ConversionService;

  beforeEach(() => {
    mockDb = createMockD1Database();
    mockKV = createMockKVNamespace();
    service = new ConversionService({
      DB: mockDb,
      CONFIG_CACHE: mockKV,
      ACCOUNT_ID: 'test-account',
      GATEWAY_ID: 'test-gateway',
    });
  });

  describe('convertWithMetadata', () => {
    it('should return cached conversion when available', async () => {
      const configId = 'test-id';
      const cachedContent = '# Cached Content\n\nCached prompt';

      await mockKV.put(`config:${configId}:codex`, cachedContent);

      const result = await service.convertWithMetadata(configId, 'codex');

      expect(result.content).toBe(cachedContent);
      expect(result.cached).toBe(true);
    });

    it('should throw error when config not found', async () => {
      mockDb.prepare = vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(null),
        }),
      });

      await expect(
        service.convertWithMetadata('non-existent-id', 'codex')
      ).rejects.toThrow('Config not found');
    });

    it('should throw error when trying to convert skills', async () => {
      const skillConfig = {
        ...createMockConfig(sampleConfigs.claudeCodeSlashCommand),
        type: 'skill' as const,
      };

      mockDb.prepare = vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(skillConfig),
        }),
      });

      await expect(
        service.convertWithMetadata('test-id', 'codex')
      ).rejects.toThrow('Skills cannot be converted');
    });

    it('should return original content when source and target formats are same', async () => {
      const config = createMockConfig(sampleConfigs.claudeCodeSlashCommand);

      mockDb.prepare = vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(config),
        }),
      });

      const result = await service.convertWithMetadata('test-id', 'claude_code');

      expect(result.content).toBe(config.content);
      expect(result.cached).toBe(false);
      expect(result.usedAI).toBe(false);
      expect(result.fallbackUsed).toBe(false);
    });

    it('should perform conversion for slash commands', async () => {
      const config = createMockConfig(sampleConfigs.claudeCodeSlashCommand);

      mockDb.prepare = vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(config),
        }),
      });

      const result = await service.convertWithMetadata('test-id', 'codex');

      expect(result.content).toBeDefined();
      expect(result.content).toContain('# test-command');
      expect(result.cached).toBe(false);
    });

    it('should cache conversion result after converting', async () => {
      const config = createMockConfig(sampleConfigs.claudeCodeSlashCommand);

      mockDb.prepare = vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(config),
        }),
      });

      await service.convertWithMetadata('test-id', 'codex');

      expect(mockKV.put).toHaveBeenCalled();
    });

    it('should perform conversion for MCP configs', async () => {
      const config = createMockConfig(sampleConfigs.mcpConfig);

      mockDb.prepare = vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(config),
        }),
      });

      const result = await service.convertWithMetadata('test-id', 'codex');

      expect(result.content).toBeDefined();
      expect(result.content).toContain('[mcp_servers.test-server]');
      expect(result.cached).toBe(false);
    });

    it('should handle agent definition passthrough', async () => {
      const config = createMockConfig(sampleConfigs.agentDefinition);

      mockDb.prepare = vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(config),
        }),
      });

      const result = await service.convertWithMetadata('test-id', 'codex');

      expect(result.content).toBeDefined();
      expect(result.cached).toBe(false);
    });
  });

  describe('convert', () => {
    it('should return only content without metadata', async () => {
      const config = createMockConfig(sampleConfigs.claudeCodeSlashCommand);

      mockDb.prepare = vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(config),
        }),
      });

      const content = await service.convert('test-id', 'codex');

      expect(typeof content).toBe('string');
      expect(content).toContain('# test-command');
    });

    it('should throw error for non-existent config', async () => {
      mockDb.prepare = vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(null),
        }),
      });

      await expect(service.convert('non-existent-id', 'codex')).rejects.toThrow('Config not found');
    });

    it('should use cached result when available', async () => {
      const cachedContent = '# Cached Content';
      await mockKV.put('config:test-id:codex', cachedContent);

      const content = await service.convert('test-id', 'codex');

      expect(content).toBe(cachedContent);
    });
  });

  describe('Cache behavior', () => {
    it('should store converted content in cache', async () => {
      const config = createMockConfig(sampleConfigs.claudeCodeSlashCommand);

      mockDb.prepare = vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(config),
        }),
      });

      await service.convert('test-id', 'codex');

      expect(mockKV.put).toHaveBeenCalledWith(
        expect.stringContaining('config:test-id'),
        expect.any(String),
        expect.any(Object)
      );
    });

    it('should reuse cached conversion on subsequent calls', async () => {
      const config = createMockConfig(sampleConfigs.claudeCodeSlashCommand);

      mockDb.prepare = vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(config),
        }),
      });

      // First call - should convert and cache
      const result1 = await service.convertWithMetadata('test-id', 'codex');
      expect(result1.cached).toBe(false);

      // Second call - should use cache
      const result2 = await service.convertWithMetadata('test-id', 'codex');
      expect(result2.cached).toBe(true);
      expect(result2.content).toBe(result1.content);
    });

    it('should cache different formats separately', async () => {
      const config = createMockConfig(sampleConfigs.claudeCodeSlashCommand);

      mockDb.prepare = vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(config),
        }),
      });

      await service.convert('test-id', 'codex');
      await service.convert('test-id', 'gemini');

      // Should have cached both formats
      expect(mockKV.put).toHaveBeenCalledTimes(2);
    });
  });

  describe('Format conversions', () => {
    it('should convert Claude Code to Codex', async () => {
      const config = createMockConfig(sampleConfigs.claudeCodeSlashCommand);

      mockDb.prepare = vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(config),
        }),
      });

      const result = await service.convert('test-id', 'codex');

      expect(result).toContain('# test-command');
      expect(result).toContain('## Prompt');
    });

    it('should convert Claude Code to Gemini', async () => {
      const config = createMockConfig(sampleConfigs.claudeCodeSlashCommand);

      mockDb.prepare = vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(config),
        }),
      });

      const result = await service.convert('test-id', 'gemini');

      expect(result).toContain('description =');
      expect(result).toContain('prompt = """');
    });

    it('should convert Codex to Claude Code', async () => {
      const config = createMockConfig(sampleConfigs.codexSlashCommand);

      mockDb.prepare = vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(config),
        }),
      });

      const result = await service.convert('test-id', 'claude_code');

      expect(result).toContain('---');
      expect(result).toContain('name: test-command');
    });

    it('should convert Gemini to Claude Code', async () => {
      const config = createMockConfig(sampleConfigs.geminiSlashCommand);

      mockDb.prepare = vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(config),
        }),
      });

      const result = await service.convert('test-id', 'claude_code');

      expect(result).toContain('---');
      expect(result).toContain('name:');
      expect(result).toContain('description:');
    });
  });

  describe('MCP config conversions', () => {
    it('should convert MCP config between formats', async () => {
      const config = createMockConfig(sampleConfigs.mcpConfig);

      mockDb.prepare = vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(config),
        }),
      });

      const result = await service.convert('test-id', 'codex');

      expect(result).toContain('[mcp_servers.test-server]');
      expect(result).toContain('command = "npx"');
      expect(result).toContain('startup_timeout_ms');
    });

    it('should preserve MCP config structure during conversion', async () => {
      const config = createMockConfig(sampleConfigs.mcpConfig);

      mockDb.prepare = vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(config),
        }),
      });

      const result = await service.convert('test-id', 'gemini');
      const parsed = JSON.parse(result);

      expect(parsed.mcpServers['test-server']).toBeDefined();
      expect(parsed.mcpServers['test-server'].command).toBe('npx');
    });
  });
});
