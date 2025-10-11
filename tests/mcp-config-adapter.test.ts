import { describe, it, expect } from 'vitest';
import { MCPConfigAdapter } from '../src/adapters/mcp-config-adapter';

describe('MCPConfigAdapter', () => {
  const adapter = new MCPConfigAdapter();

  // Sample configurations
  const claudeCodeJSON = {
    mcpServers: {
      'test-server': {
        type: 'stdio' as const,
        command: 'npx',
        args: ['-y', 'test-package'],
        env: {
          API_KEY: 'test123',
        },
      },
    },
  };

  const geminiJSON = {
    mcpServers: {
      'test-server': {
        command: 'npx',
        args: ['-y', 'test-package'],
        env: {
          API_KEY: 'test123',
        },
      },
    },
  };

  const codexTOML = `[mcp_servers.test-server]
command = "npx"
args = ["-y", "test-package"]
startup_timeout_ms = 20000

[mcp_servers.test-server.env]
API_KEY = "test123"
`;

  describe('Validation', () => {
    it('should validate Claude Code JSON format', () => {
      const content = JSON.stringify(claudeCodeJSON);
      expect(adapter.validate(content, 'claude_code')).toBe(true);
    });

    it('should validate Gemini JSON format', () => {
      const content = JSON.stringify(geminiJSON);
      expect(adapter.validate(content, 'gemini')).toBe(true);
    });

    it('should validate Codex TOML format', () => {
      expect(adapter.validate(codexTOML, 'codex')).toBe(true);
    });

    it('should reject malformed JSON', () => {
      expect(adapter.validate('invalid json', 'claude_code')).toBe(false);
      expect(adapter.validate('invalid json', 'gemini')).toBe(false);
    });

    it('should reject malformed TOML', () => {
      expect(adapter.validate('invalid = toml [', 'codex')).toBe(false);
    });

    it('should reject JSON without mcpServers', () => {
      expect(adapter.validate('{"other": "data"}', 'claude_code')).toBe(false);
    });

    it('should reject TOML without mcp_servers', () => {
      expect(adapter.validate('[other]\ndata = "test"', 'codex')).toBe(false);
    });
  });

  describe('Claude Code to Codex conversion', () => {
    it('should convert Claude Code JSON to Codex TOML', () => {
      const content = JSON.stringify(claudeCodeJSON);
      const result = adapter.convert(content, 'claude_code', 'codex');

      expect(result).toContain('[mcp_servers.test-server]');
      expect(result).toContain('command = "npx"');
      expect(result).toMatch(/args = \[\s*"-y",\s*"test-package"\s*\]/);
      expect(result).toMatch(/startup_timeout_ms = 20[_,]?000/);
      expect(result).toContain('API_KEY = "test123"');
      expect(result).not.toContain('type'); // Should strip type field
    });

    it('should add default timeout when converting to Codex', () => {
      const content = JSON.stringify(claudeCodeJSON);
      const result = adapter.convert(content, 'claude_code', 'codex');

      expect(result).toMatch(/startup_timeout_ms = 20[_,]?000/);
    });
  });

  describe('Codex to Claude Code conversion', () => {
    it('should convert Codex TOML to Claude Code JSON', () => {
      const result = adapter.convert(codexTOML, 'codex', 'claude_code');
      const parsed = JSON.parse(result);

      expect(parsed.mcpServers['test-server'].type).toBe('stdio');
      expect(parsed.mcpServers['test-server'].command).toBe('npx');
      expect(parsed.mcpServers['test-server'].args).toEqual(['-y', 'test-package']);
      expect(parsed.mcpServers['test-server'].env.API_KEY).toBe('test123');
      expect(parsed.mcpServers['test-server'].startup_timeout_ms).toBeUndefined();
    });

    it('should add type field when converting to Claude Code', () => {
      const result = adapter.convert(codexTOML, 'codex', 'claude_code');
      const parsed = JSON.parse(result);

      expect(parsed.mcpServers['test-server'].type).toBe('stdio');
    });
  });

  describe('Claude Code to Gemini conversion', () => {
    it('should convert Claude Code to Gemini (strip type)', () => {
      const content = JSON.stringify(claudeCodeJSON);
      const result = adapter.convert(content, 'claude_code', 'gemini');
      const parsed = JSON.parse(result);

      expect(parsed.mcpServers['test-server'].type).toBeUndefined();
      expect(parsed.mcpServers['test-server'].command).toBe('npx');
      expect(parsed.mcpServers['test-server'].args).toEqual(['-y', 'test-package']);
      expect(parsed.mcpServers['test-server'].env.API_KEY).toBe('test123');
    });
  });

  describe('Gemini to Claude Code conversion', () => {
    it('should convert Gemini to Claude Code (add type)', () => {
      const content = JSON.stringify(geminiJSON);
      const result = adapter.convert(content, 'gemini', 'claude_code');
      const parsed = JSON.parse(result);

      expect(parsed.mcpServers['test-server'].type).toBe('stdio');
      expect(parsed.mcpServers['test-server'].command).toBe('npx');
    });
  });

  describe('Gemini to Codex conversion', () => {
    it('should convert Gemini JSON to Codex TOML', () => {
      const content = JSON.stringify(geminiJSON);
      const result = adapter.convert(content, 'gemini', 'codex');

      expect(result).toContain('[mcp_servers.test-server]');
      expect(result).toContain('command = "npx"');
      expect(result).toMatch(/startup_timeout_ms = 20[_,]?000/);
    });
  });

  describe('Codex to Gemini conversion', () => {
    it('should convert Codex TOML to Gemini JSON', () => {
      const result = adapter.convert(codexTOML, 'codex', 'gemini');
      const parsed = JSON.parse(result);

      expect(parsed.mcpServers['test-server'].type).toBeUndefined();
      expect(parsed.mcpServers['test-server'].startup_timeout_ms).toBeUndefined();
      expect(parsed.mcpServers['test-server'].command).toBe('npx');
    });
  });

  describe('Multiple servers', () => {
    it('should handle multiple servers in JSON', () => {
      const multiServer = {
        mcpServers: {
          'server-1': {
            type: 'stdio' as const,
            command: 'npx',
            args: ['-y', 'package-1'],
          },
          'server-2': {
            type: 'stdio' as const,
            command: 'node',
            args: ['script.js'],
          },
        },
      };

      const result = adapter.convert(
        JSON.stringify(multiServer),
        'claude_code',
        'codex'
      );

      expect(result).toContain('[mcp_servers.server-1]');
      expect(result).toContain('[mcp_servers.server-2]');
    });

    it('should handle multiple servers in TOML', () => {
      const multiServerTOML = `[mcp_servers.server-1]
command = "npx"
args = ["-y", "package-1"]
startup_timeout_ms = 20000

[mcp_servers.server-1.env]

[mcp_servers.server-2]
command = "node"
args = ["script.js"]
startup_timeout_ms = 20000

[mcp_servers.server-2.env]
`;

      const result = adapter.convert(multiServerTOML, 'codex', 'claude_code');
      const parsed = JSON.parse(result);

      expect(Object.keys(parsed.mcpServers)).toHaveLength(2);
      expect(parsed.mcpServers['server-1'].command).toBe('npx');
      expect(parsed.mcpServers['server-2'].command).toBe('node');
    });
  });

  describe('Edge cases', () => {
    it('should handle servers with no args', () => {
      const noArgs = {
        mcpServers: {
          'simple-server': {
            type: 'stdio' as const,
            command: 'simple-mcp',
          },
        },
      };

      const result = adapter.convert(
        JSON.stringify(noArgs),
        'claude_code',
        'codex'
      );

      expect(result).toContain('[mcp_servers.simple-server]');
      expect(result).toContain('command = "simple-mcp"');
      expect(result).toMatch(/args = \[\s*\]/); // Empty array with possible spaces
    });

    it('should handle servers with no env', () => {
      const noEnv = {
        mcpServers: {
          'no-env-server': {
            type: 'stdio' as const,
            command: 'test-cmd',
            args: ['arg1'],
          },
        },
      };

      const result = adapter.convert(
        JSON.stringify(noEnv),
        'claude_code',
        'codex'
      );

      expect(result).toContain('[mcp_servers.no-env-server]');
      // smol-toml creates separate env section or inline empty object
      expect(result).toMatch(/(\[mcp_servers\.no-env-server\.env\]|env = \{\s*\})/);
    });

    it('should handle env variables with special characters', () => {
      const specialEnv = {
        mcpServers: {
          'special-server': {
            type: 'stdio' as const,
            command: 'cmd',
            env: {
              URL: 'https://example.com/api?key=value&test=1',
              PATH: '/usr/bin:/usr/local/bin',
            },
          },
        },
      };

      const result = adapter.convert(
        JSON.stringify(specialEnv),
        'claude_code',
        'codex'
      );

      expect(result).toContain('URL = "https://example.com/api?key=value&test=1"');
      expect(result).toContain('PATH = "/usr/bin:/usr/local/bin"');
    });

    it('should return same content when source and target formats are identical', () => {
      const content = JSON.stringify(claudeCodeJSON);
      const result = adapter.convert(content, 'claude_code', 'claude_code');
      expect(result).toBe(content);
    });

    it('should handle httpUrl in Gemini format', () => {
      const geminiWithHttp = {
        mcpServers: {
          'remote-server': {
            httpUrl: 'https://mcp.example.com',
            env: {
              TOKEN: 'secret',
            },
          },
        },
      };

      const result = adapter.convert(
        JSON.stringify(geminiWithHttp),
        'gemini',
        'claude_code'
      );
      const parsed = JSON.parse(result);

      expect(parsed.mcpServers['remote-server'].type).toBe('http');
    });
  });

  describe('Error handling', () => {
    it('should throw error for unsupported source format', () => {
      expect(() => {
        adapter.convert('{}', 'unsupported' as any, 'claude_code');
      }).toThrow();
    });

    it('should throw error for unsupported target format', () => {
      expect(() => {
        adapter.convert(JSON.stringify(claudeCodeJSON), 'claude_code', 'unsupported' as any);
      }).toThrow();
    });
  });
});
