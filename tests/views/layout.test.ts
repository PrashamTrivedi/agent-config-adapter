import { describe, it, expect } from 'vitest';
import { layout } from '../../src/views/layout';

describe('Layout View', () => {
  describe('Basic rendering', () => {
    it('should render complete HTML document', () => {
      const html = layout('Test Title', '<p>Test Content</p>');

      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('<html lang="en">');
      expect(html).toContain('</html>');
    });

    it('should include title in head', () => {
      const html = layout('My Page', '<p>Content</p>');

      expect(html).toContain('<title>My Page - Agent Config Adapter</title>');
    });

    it('should include HTMX script', () => {
      const html = layout('Test', '<p>Content</p>');

      expect(html).toContain('https://unpkg.com/htmx.org');
    });

    it('should include content in main tag', () => {
      const html = layout('Test', '<p>Custom Content Here</p>');

      expect(html).toContain('<main>');
      expect(html).toContain('<p>Custom Content Here</p>');
      expect(html).toContain('</main>');
    });
  });

  describe('Navigation', () => {
    it('should include navigation menu', () => {
      const html = layout('Test', '');

      expect(html).toContain('<nav>');
      expect(html).toContain('href="/"');
      expect(html).toContain('🏠');
      expect(html).toContain('Home');
      expect(html).toContain('href="/configs"');
      expect(html).toContain('📝');
      expect(html).toContain('Configs');
      expect(html).toContain('href="/extensions"');
      expect(html).toContain('📦');
      expect(html).toContain('Extensions');
      expect(html).toContain('href="/marketplaces"');
      expect(html).toContain('🏪');
      expect(html).toContain('Marketplaces');
    });

    it('should include header with site title', () => {
      const html = layout('Test', '');

      expect(html).toContain('<header>');
      expect(html).toContain('<h1>Agent Config Adapter</h1>');
    });
  });

  describe('Styling', () => {
    it('should include CSS styles', () => {
      const html = layout('Test', '');

      expect(html).toContain('<style>');
      expect(html).toContain('</style>');
    });

    it('should define CSS custom properties', () => {
      const html = layout('Test', '');

      expect(html).toContain(':root');
      expect(html).toContain('--bg-primary');
      expect(html).toContain('--text-primary');
      expect(html).toContain('--accent-primary');
    });

    it('should include responsive design rules', () => {
      const html = layout('Test', '');

      expect(html).toContain('@media');
      expect(html).toContain('max-width');
    });

    it('should style buttons', () => {
      const html = layout('Test', '');

      expect(html).toContain('.btn');
      expect(html).toContain('.btn-secondary');
      expect(html).toContain('.btn-danger');
    });

    it('should style forms', () => {
      const html = layout('Test', '');

      expect(html).toContain('.form-group');
      expect(html).toContain('input');
      expect(html).toContain('textarea');
    });

    it('should style filter controls', () => {
      const html = layout('Test', '');

      expect(html).toContain('.filter-container');
      expect(html).toContain('.filter-row');
      expect(html).toContain('.filter-group');
    });
  });

  describe('Meta tags', () => {
    it('should include charset meta tag', () => {
      const html = layout('Test', '');

      expect(html).toContain('<meta charset="UTF-8">');
    });

    it('should include viewport meta tag', () => {
      const html = layout('Test', '');

      expect(html).toContain('<meta name="viewport"');
      expect(html).toContain('width=device-width');
    });
  });

  describe('Edge cases', () => {
    it('should handle empty title', () => {
      const html = layout('', '<p>Content</p>');

      expect(html).toContain('<title> - Agent Config Adapter</title>');
    });

    it('should handle empty content', () => {
      const html = layout('Title', '');

      expect(html).toContain('<main>');
      expect(html).toContain('</main>');
    });

    it('should handle content with special characters', () => {
      const html = layout('Test', '<p>Content with & < > " \'</p>');

      expect(html).toContain('<p>Content with & < > " \'</p>');
    });

    it('should handle multiline content', () => {
      const content = `
        <div>
          <p>Line 1</p>
          <p>Line 2</p>
        </div>
      `;
      const html = layout('Test', content);

      expect(html).toContain('Line 1');
      expect(html).toContain('Line 2');
    });

    it('should handle very long titles', () => {
      const longTitle = 'A'.repeat(100);
      const html = layout(longTitle, '');

      expect(html).toContain(`<title>${longTitle} - Agent Config Adapter</title>`);
    });
  });

  describe('Structure validation', () => {
    it('should have properly nested HTML structure', () => {
      const html = layout('Test', '<p>Content</p>');

      // Check for proper nesting order
      const htmlIndex = html.indexOf('<html');
      const headIndex = html.indexOf('<head>');
      const bodyIndex = html.indexOf('<body>');
      const headerIndex = html.indexOf('<header>');
      const mainIndex = html.indexOf('<main>');

      expect(htmlIndex).toBeLessThan(headIndex);
      expect(headIndex).toBeLessThan(bodyIndex);
      expect(bodyIndex).toBeLessThan(headerIndex);
      expect(headerIndex).toBeLessThan(mainIndex);
    });

    it('should close all opened tags', () => {
      const html = layout('Test', '<p>Content</p>');

      // Count opening and closing tags (they should be equal)
      const openHtmlCount = (html.match(/<html/g) || []).length;
      const closeHtmlCount = (html.match(/<\/html>/g) || []).length;
      expect(openHtmlCount).toBe(closeHtmlCount);

      const openHeadCount = (html.match(/<head>/g) || []).length;
      const closeHeadCount = (html.match(/<\/head>/g) || []).length;
      expect(openHeadCount).toBe(closeHeadCount);

      const openBodyCount = (html.match(/<body>/g) || []).length;
      const closeBodyCount = (html.match(/<\/body>/g) || []).length;
      expect(openBodyCount).toBe(closeBodyCount);
    });
  });
});
