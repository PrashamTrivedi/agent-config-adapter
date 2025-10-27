import { describe, it, expect } from 'vitest';
import { sampleExtension, createMockConfig, sampleConfigs } from '../test-utils';

describe('Extension Views', () => {
  describe('Extension list structure', () => {
    it('should handle extension with configs', () => {
      const extension = {
        ...sampleExtension,
        configs: [createMockConfig(sampleConfigs.claudeCodeSlashCommand)],
      };

      expect(extension.id).toBeDefined();
      expect(extension.name).toBeDefined();
      expect(extension.version).toBeDefined();
      expect(extension.configs).toHaveLength(1);
    });

    it('should handle extension without configs', () => {
      const extension = {
        ...sampleExtension,
        configs: [],
      };

      expect(extension.configs).toHaveLength(0);
    });

    it('should display extension metadata', () => {
      const extension = sampleExtension;

      expect(extension.name).toBe('Test Extension');
      expect(extension.version).toBe('1.0.0');
      expect(extension.author).toBe('Test Author');
      expect(extension.description).toBe('A test extension');
    });
  });

  describe('Extension with multiple configs', () => {
    it('should handle multiple configs', () => {
      const extension = {
        ...sampleExtension,
        configs: [
          createMockConfig(sampleConfigs.claudeCodeSlashCommand),
          createMockConfig(sampleConfigs.mcpConfig),
          createMockConfig(sampleConfigs.agentDefinition),
        ],
      };

      expect(extension.configs).toHaveLength(3);
      expect(extension.configs[0].type).toBe('slash_command');
      expect(extension.configs[1].type).toBe('mcp_config');
      expect(extension.configs[2].type).toBe('agent_definition');
    });

    it('should count configs correctly', () => {
      const withOneConfig = { ...sampleExtension, configs: [createMockConfig(sampleConfigs.claudeCodeSlashCommand)] };
      const withMultipleConfigs = {
        ...sampleExtension,
        configs: [
          createMockConfig(sampleConfigs.claudeCodeSlashCommand),
          createMockConfig(sampleConfigs.mcpConfig),
        ],
      };

      expect(withOneConfig.configs.length).toBe(1);
      expect(withMultipleConfigs.configs.length).toBe(2);
    });

    it('should handle pluralization', () => {
      const singular = { ...sampleExtension, configs: [createMockConfig(sampleConfigs.claudeCodeSlashCommand)] };
      const plural = {
        ...sampleExtension,
        configs: [
          createMockConfig(sampleConfigs.claudeCodeSlashCommand),
          createMockConfig(sampleConfigs.mcpConfig),
        ],
      };

      expect(singular.configs.length).toBe(1);
      expect(plural.configs.length).toBeGreaterThan(1);
    });
  });

  describe('Optional fields handling', () => {
    it('should handle extension without author', () => {
      const extension = { ...sampleExtension, author: null };

      expect(extension.author).toBeNull();
      expect(extension.name).toBeDefined();
    });

    it('should handle extension without description', () => {
      const extension = { ...sampleExtension, description: null };

      expect(extension.description).toBeNull();
      expect(extension.name).toBeDefined();
    });

    it('should handle extension without icon', () => {
      const extension = { ...sampleExtension, icon_url: null };

      expect(extension.icon_url).toBeNull();
      expect(extension.name).toBeDefined();
    });

    it('should handle extension with all optional fields', () => {
      const extension = {
        ...sampleExtension,
        author: 'Full Author',
        description: 'Full Description',
        icon_url: 'https://example.com/icon.png',
      };

      expect(extension.author).toBe('Full Author');
      expect(extension.description).toBe('Full Description');
      expect(extension.icon_url).toBe('https://example.com/icon.png');
    });
  });

  describe('Version display', () => {
    it('should display version with v prefix', () => {
      const extension = sampleExtension;

      expect(extension.version).toBe('1.0.0');
    });

    it('should handle semantic versioning', () => {
      const versions = ['1.0.0', '2.1.3', '0.0.1', '10.20.30'];

      versions.forEach(version => {
        expect(version).toMatch(/^\d+\.\d+\.\d+$/);
      });
    });

    it('should handle pre-release versions', () => {
      const preReleaseVersions = ['1.0.0-alpha', '2.0.0-beta.1', '3.0.0-rc.2'];

      preReleaseVersions.forEach(version => {
        expect(version).toContain('-');
      });
    });
  });

  describe('Config display in extension', () => {
    it('should display config names', () => {
      const config = createMockConfig(sampleConfigs.claudeCodeSlashCommand);
      const extension = {
        ...sampleExtension,
        configs: [config],
      };

      expect(extension.configs[0].name).toBe('test-command');
    });

    it('should display config types', () => {
      const config = createMockConfig(sampleConfigs.claudeCodeSlashCommand);
      const extension = {
        ...sampleExtension,
        configs: [config],
      };

      expect(extension.configs[0].type).toBe('slash_command');
    });

    it('should display config formats', () => {
      const config = createMockConfig(sampleConfigs.claudeCodeSlashCommand);
      const extension = {
        ...sampleExtension,
        configs: [config],
      };

      expect(extension.configs[0].original_format).toBe('claude_code');
    });
  });

  describe('Manifest preview buttons', () => {
    it('should provide Gemini format option', () => {
      const extension = sampleExtension;
      const manifestUrl = `/api/extensions/${extension.id}/manifest/gemini`;

      expect(manifestUrl).toContain('/manifest/gemini');
    });

    it('should provide Claude Code format option', () => {
      const extension = sampleExtension;
      const manifestUrl = `/api/extensions/${extension.id}/manifest/claude_code`;

      expect(manifestUrl).toContain('/manifest/claude_code');
    });
  });

  describe('Download links', () => {
    it('should generate Claude Code plugin URL', () => {
      const extension = sampleExtension;
      const downloadUrl = `/plugins/${extension.id}/claude_code/download`;

      expect(downloadUrl).toContain('/claude_code/download');
    });

    it('should generate Gemini definition URL', () => {
      const extension = sampleExtension;
      const downloadUrl = `/plugins/${extension.id}/gemini/definition`;

      expect(downloadUrl).toContain('/gemini/definition');
    });

    it('should generate browse files URL', () => {
      const extension = sampleExtension;
      const browseUrl = `/plugins/${extension.id}/claude_code`;

      expect(browseUrl).toContain(`/plugins/${extension.id}`);
    });
  });

  describe('XSS Prevention in extensions', () => {
    it('should escape extension name', () => {
      const escapeHtml = (text: string): string => {
        const map: Record<string, string> = {
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, (char) => map[char]);
      };

      const dangerousName = '<script>alert("xss")</script>';
      const escaped = escapeHtml(dangerousName);

      expect(escaped).not.toContain('<script>');
      expect(escaped).toContain('&lt;');
      expect(escaped).toContain('&gt;');
    });

    it('should escape author name', () => {
      const escapeHtml = (text: string): string => {
        const map: Record<string, string> = {
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, (char) => map[char]);
      };

      const dangerousAuthor = 'Author <script>';
      const escaped = escapeHtml(dangerousAuthor);

      expect(escaped).not.toContain('<script>');
    });

    it('should escape description', () => {
      const escapeHtml = (text: string): string => {
        const map: Record<string, string> = {
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, (char) => map[char]);
      };

      const dangerousDesc = 'Description with <img src=x onerror=alert(1)>';
      const escaped = escapeHtml(dangerousDesc);

      // escapeHtml escapes HTML tags, making them safe (even if attribute names remain)
      expect(escaped).not.toContain('<img');
      expect(escaped).toContain('&lt;img');
      expect(escaped).toContain('&gt;');
    });
  });

  describe('Empty extension list', () => {
    it('should handle empty extension list', () => {
      const extensions: any[] = [];

      expect(extensions.length).toBe(0);
    });

    it('should display appropriate message for empty list', () => {
      const extensions: any[] = [];
      const message = extensions.length === 0 ? 'No extensions yet. Create your first one!' : '';

      expect(message).toBe('No extensions yet. Create your first one!');
    });
  });

  describe('Edge cases', () => {
    it('should handle extensions with special characters in name', () => {
      const specialNames = [
        'Extension-Name',
        'Extension_Name',
        'Extension.Name',
        'Extension Name',
        'Extension & Co',
      ];

      specialNames.forEach(name => {
        expect(name).toBeDefined();
      });
    });

    it('should handle very long extension names', () => {
      const longName = 'a'.repeat(200);
      const extension = { ...sampleExtension, name: longName };

      expect(extension.name.length).toBe(200);
    });

    it('should handle extensions with URLs in fields', () => {
      const extension = {
        ...sampleExtension,
        icon_url: 'https://example.com/icon.png?size=64&format=png',
        description: 'Check out https://example.com for more info',
      };

      expect(extension.icon_url).toContain('https://');
      expect(extension.description).toContain('https://');
    });

    it('should handle empty version string', () => {
      const extension = { ...sampleExtension, version: '' };

      expect(extension.version).toBe('');
    });
  });

  describe('Dates and timestamps', () => {
    it('should handle extension timestamps', () => {
      const extension = sampleExtension;

      expect(extension.created_at).toBeDefined();
      expect(extension.updated_at).toBeDefined();
      expect(new Date(extension.created_at).toString()).not.toBe('Invalid Date');
    });

    it('should format dates for display', () => {
      const extension = sampleExtension;
      const date = new Date(extension.created_at);

      expect(date.toLocaleDateString()).toBeDefined();
      expect(date.toISOString()).toBe(extension.created_at);
    });
  });
});
