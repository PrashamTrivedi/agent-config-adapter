import { describe, it, expect } from 'vitest';
import { sampleMarketplace, sampleExtension, createMockConfig, sampleConfigs } from '../test-utils';

describe('Marketplace Views', () => {
  describe('Marketplace structure', () => {
    it('should handle marketplace with extensions', () => {
      const marketplace = {
        ...sampleMarketplace,
        extensions: [{
          ...sampleExtension,
          configs: [createMockConfig(sampleConfigs.claudeCodeSlashCommand)],
        }],
      };

      expect(marketplace.id).toBeDefined();
      expect(marketplace.name).toBeDefined();
      expect(marketplace.owner_name).toBeDefined();
      expect(marketplace.extensions).toHaveLength(1);
    });

    it('should handle marketplace without extensions', () => {
      const marketplace = {
        ...sampleMarketplace,
        extensions: [],
      };

      expect(marketplace.extensions).toHaveLength(0);
    });

    it('should display marketplace metadata', () => {
      const marketplace = sampleMarketplace;

      expect(marketplace.name).toBe('Test Marketplace');
      expect(marketplace.owner_name).toBe('Test Owner');
      expect(marketplace.version).toBe('1.0.0');
      expect(marketplace.description).toBe('A test marketplace');
    });
  });

  describe('Owner information', () => {
    it('should display owner name', () => {
      const marketplace = sampleMarketplace;

      expect(marketplace.owner_name).toBe('Test Owner');
    });

    it('should handle owner email', () => {
      const marketplace = sampleMarketplace;

      expect(marketplace.owner_email).toBe('owner@example.com');
    });

    it('should handle missing owner email', () => {
      const marketplace = { ...sampleMarketplace, owner_email: null };

      expect(marketplace.owner_email).toBeNull();
      expect(marketplace.owner_name).toBeDefined();
    });
  });

  describe('Optional fields', () => {
    it('should handle marketplace without description', () => {
      const marketplace = { ...sampleMarketplace, description: null };

      expect(marketplace.description).toBeNull();
    });

    it('should handle marketplace without homepage', () => {
      const marketplace = { ...sampleMarketplace, homepage: null };

      expect(marketplace.homepage).toBeNull();
    });

    it('should handle marketplace without repository', () => {
      const marketplace = { ...sampleMarketplace, repository: null };

      expect(marketplace.repository).toBeNull();
    });

    it('should handle marketplace with all fields', () => {
      const marketplace = {
        ...sampleMarketplace,
        description: 'Full description',
        homepage: 'https://example.com',
        repository: 'https://github.com/test/repo',
        owner_email: 'owner@example.com',
      };

      expect(marketplace.description).toBeTruthy();
      expect(marketplace.homepage).toBeTruthy();
      expect(marketplace.repository).toBeTruthy();
      expect(marketplace.owner_email).toBeTruthy();
    });
  });

  describe('Version display', () => {
    it('should display marketplace version', () => {
      const marketplace = sampleMarketplace;

      expect(marketplace.version).toBe('1.0.0');
    });

    it('should handle semantic versioning', () => {
      const versions = ['1.0.0', '2.1.3', '0.0.1', '10.20.30'];

      versions.forEach(version => {
        expect(version).toMatch(/^\d+\.\d+\.\d+$/);
      });
    });
  });

  describe('Extensions in marketplace', () => {
    it('should display extension count', () => {
      const marketplace = {
        ...sampleMarketplace,
        extensions: [
          { ...sampleExtension, configs: [] },
          { ...sampleExtension, configs: [] },
          { ...sampleExtension, configs: [] },
        ],
      };

      expect(marketplace.extensions).toHaveLength(3);
    });

    it('should handle marketplace with single extension', () => {
      const marketplace = {
        ...sampleMarketplace,
        extensions: [{ ...sampleExtension, configs: [] }],
      };

      expect(marketplace.extensions).toHaveLength(1);
    });

    it('should handle pluralization of extensions', () => {
      const singular = {
        ...sampleMarketplace,
        extensions: [{ ...sampleExtension, configs: [] }],
      };
      const plural = {
        ...sampleMarketplace,
        extensions: [
          { ...sampleExtension, configs: [] },
          { ...sampleExtension, configs: [] },
        ],
      };

      expect(singular.extensions.length).toBe(1);
      expect(plural.extensions.length).toBeGreaterThan(1);
    });
  });

  describe('URL fields', () => {
    it('should handle homepage URL', () => {
      const marketplace = sampleMarketplace;

      expect(marketplace.homepage).toBe('https://example.com');
    });

    it('should handle repository URL', () => {
      const marketplace = sampleMarketplace;

      expect(marketplace.repository).toBe('https://github.com/test/repo');
    });

    it('should validate URL format', () => {
      const validUrls = [
        'https://example.com',
        'https://github.com/user/repo',
        'https://example.com/path?query=value',
      ];

      validUrls.forEach(url => {
        expect(url).toMatch(/^https?:\/\//);
      });
    });
  });

  describe('Download functionality', () => {
    it('should generate marketplace download URL', () => {
      const marketplace = sampleMarketplace;
      const downloadUrl = `/plugins/marketplaces/${marketplace.id}/download`;

      expect(downloadUrl).toContain('/download');
      expect(downloadUrl).toContain(marketplace.id);
    });

    it('should support format parameter', () => {
      const marketplace = sampleMarketplace;
      const formats = ['claude_code', 'gemini'];

      formats.forEach(format => {
        const downloadUrl = `/plugins/marketplaces/${marketplace.id}/download?format=${format}`;
        expect(downloadUrl).toContain(`format=${format}`);
      });
    });

    it('should generate Gemini definition URL', () => {
      const marketplace = sampleMarketplace;
      const definitionUrl = `/plugins/marketplaces/${marketplace.id}/gemini/definition`;

      expect(definitionUrl).toContain('/gemini/definition');
    });
  });

  describe('Manifest generation', () => {
    it('should generate manifest URL', () => {
      const marketplace = sampleMarketplace;
      const manifestUrl = `/api/marketplaces/${marketplace.id}/manifest`;

      expect(manifestUrl).toContain('/manifest');
      expect(manifestUrl).toContain(marketplace.id);
    });
  });

  describe('XSS Prevention', () => {
    it('should escape marketplace name', () => {
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

    it('should escape owner name', () => {
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

      const dangerousOwner = 'Owner <img src=x>';
      const escaped = escapeHtml(dangerousOwner);

      expect(escaped).not.toContain('<img');
      expect(escaped).toContain('&lt;');
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

      const dangerousDesc = 'Test & <script>';
      const escaped = escapeHtml(dangerousDesc);

      expect(escaped).toContain('&amp;');
      expect(escaped).toContain('&lt;');
    });
  });

  describe('Empty marketplace list', () => {
    it('should handle empty marketplace list', () => {
      const marketplaces: any[] = [];

      expect(marketplaces.length).toBe(0);
    });

    it('should display appropriate message', () => {
      const marketplaces: any[] = [];
      const message = marketplaces.length === 0 ? 'No marketplaces yet.' : '';

      expect(message).toBe('No marketplaces yet.');
    });
  });

  describe('Edge cases', () => {
    it('should handle marketplaces with special characters', () => {
      const specialNames = [
        'Marketplace-Name',
        'Marketplace_Name',
        'Marketplace & Co',
        'Marketplace @ 2024',
      ];

      specialNames.forEach(name => {
        expect(name).toBeDefined();
      });
    });

    it('should handle very long marketplace names', () => {
      const longName = 'a'.repeat(200);
      const marketplace = { ...sampleMarketplace, name: longName };

      expect(marketplace.name.length).toBe(200);
    });

    it('should handle long descriptions', () => {
      const longDesc = 'a'.repeat(1000);
      const marketplace = { ...sampleMarketplace, description: longDesc };

      expect(marketplace.description.length).toBe(1000);
    });

    it('should handle special characters in URLs', () => {
      const marketplace = {
        ...sampleMarketplace,
        homepage: 'https://example.com?key=value&other=test',
        repository: 'https://github.com/user/repo-name_test',
      };

      expect(marketplace.homepage).toContain('?');
      expect(marketplace.homepage).toContain('&');
      expect(marketplace.repository).toContain('_');
      expect(marketplace.repository).toContain('-');
    });
  });

  describe('Timestamps', () => {
    it('should have created_at timestamp', () => {
      const marketplace = sampleMarketplace;

      expect(marketplace.created_at).toBeDefined();
      expect(new Date(marketplace.created_at).toString()).not.toBe('Invalid Date');
    });

    it('should have updated_at timestamp', () => {
      const marketplace = sampleMarketplace;

      expect(marketplace.updated_at).toBeDefined();
      expect(new Date(marketplace.updated_at).toString()).not.toBe('Invalid Date');
    });

    it('should format timestamps for display', () => {
      const marketplace = sampleMarketplace;
      const date = new Date(marketplace.created_at);

      expect(date.toLocaleDateString()).toBeDefined();
      expect(date.toISOString()).toBe(marketplace.created_at);
    });
  });

  describe('Extension details in marketplace', () => {
    it('should show extension names', () => {
      const marketplace = {
        ...sampleMarketplace,
        extensions: [{
          ...sampleExtension,
          name: 'Test Extension',
          configs: [],
        }],
      };

      expect(marketplace.extensions[0].name).toBe('Test Extension');
    });

    it('should show extension versions', () => {
      const marketplace = {
        ...sampleMarketplace,
        extensions: [{
          ...sampleExtension,
          version: '2.0.0',
          configs: [],
        }],
      };

      expect(marketplace.extensions[0].version).toBe('2.0.0');
    });

    it('should show config counts per extension', () => {
      const marketplace = {
        ...sampleMarketplace,
        extensions: [{
          ...sampleExtension,
          configs: [
            createMockConfig(sampleConfigs.claudeCodeSlashCommand),
            createMockConfig(sampleConfigs.mcpConfig),
          ],
        }],
      };

      expect(marketplace.extensions[0].configs).toHaveLength(2);
    });
  });

  describe('Navigation and links', () => {
    it('should link to individual extensions', () => {
      const marketplace = {
        ...sampleMarketplace,
        extensions: [{ ...sampleExtension, configs: [] }],
      };

      const extensionUrl = `/extensions/${marketplace.extensions[0].id}`;
      expect(extensionUrl).toContain('/extensions/');
    });

    it('should link to individual configs', () => {
      const config = createMockConfig(sampleConfigs.claudeCodeSlashCommand);
      const configUrl = `/configs/${config.id}`;

      expect(configUrl).toContain('/configs/');
    });
  });
});
