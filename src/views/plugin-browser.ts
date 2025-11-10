import { ExtensionWithConfigs } from '../domain/types';
import { layout } from './layout';

interface FileInfo {
  path: string;
  r2Key: string;
  size: number | null;
  mimeType: string | null;
}

interface FileNode {
  name: string;
  path: string;
  isDirectory: boolean;
  children?: FileNode[];
  file?: FileInfo;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatSize(bytes: number | null): string {
  if (bytes === null) return '—';
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, exponent);
  return `${value.toFixed(exponent === 0 ? 0 : 1)} ${units[exponent]}`;
}

function buildFileTree(files: FileInfo[]): FileNode[] {
  const root: Record<string, FileNode> = {};

  files.forEach((file) => {
    const segments = file.path.split('/');
    let currentLevel = root;
    let currentPath = '';

    segments.forEach((segment, index) => {
      currentPath = currentPath ? `${currentPath}/${segment}` : segment;
      if (!currentLevel[segment]) {
        currentLevel[segment] = {
          name: segment,
          path: currentPath,
          isDirectory: index < segments.length - 1,
          children: {},
        } as FileNode & { children: Record<string, FileNode> };
      }

      const node = currentLevel[segment] as FileNode & { children: Record<string, FileNode> };
      if (index === segments.length - 1) {
        node.isDirectory = false;
        node.file = file;
      }

      currentLevel = node.children || {};
      node.children = currentLevel;
    });
  });

  const convert = (nodes: Record<string, FileNode>): FileNode[] =>
    Object.values(nodes)
      .map((node) => {
        const converted: FileNode = {
          name: node.name,
          path: node.path,
          isDirectory: node.isDirectory,
          file: node.file,
        };
        if (node.children) {
          converted.children = convert(node.children as Record<string, FileNode>);
        }
        return converted;
      })
      .sort((a, b) => {
        if (a.isDirectory !== b.isDirectory) {
          return a.isDirectory ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      });

  return convert(root);
}

function renderFileTree(nodes: FileNode[], baseUrl: string): string {
  if (!nodes.length) {
    return '<p style="color: var(--text-muted);">No files generated yet.</p>';
  }

  return `
    <div class="file-tree">
      ${renderNodes(nodes, baseUrl)}
    </div>
  `;
}

function renderNodes(nodes: FileNode[], baseUrl: string): string {
  return `
    <ul>
      ${nodes
        .map((node) => {
          if (node.isDirectory) {
            return `
              <li>
                <strong>${escapeHtml(node.name)}/</strong>
                ${node.children ? renderNodes(node.children, baseUrl) : ''}
              </li>
            `;
          }

          const file = node.file!;
          const href = `${baseUrl}/${encodeURI(file.path)}`;
          return `
            <li>
              <a href="${href}" class="link-muted" target="_blank">${escapeHtml(node.name)}</a>
              <span style="color: var(--text-muted); font-size: 0.85rem;">${formatSize(file.size)}</span>
            </li>
          `;
        })
        .join('')}
    </ul>
  `;
}

export function pluginBrowserView(
  extension: ExtensionWithConfigs,
  format: 'claude_code' | 'gemini',
  files: FileInfo[],
  baseUrl: string
): string {
  const formatDisplay = format === 'claude_code' ? 'Claude Code' : 'Gemini CLI';
  const pluginUrl = `${baseUrl}/plugins/${extension.id}/${format}`;
  const fileTree = buildFileTree(files);
  const totalSize = files.reduce((sum, file) => sum + (file.size ?? 0), 0);

  const content = `
    <section class="page-header">
      <div>
        <p class="eyebrow">Plugin files</p>
        <h2>${escapeHtml(extension.name)} · ${formatDisplay}</h2>
        <p class="lead">Inspect generated artifacts, copy install URLs, and download bundles.</p>
        <div class="chip-group" style="margin-top: 18px;">
          <span class="badge status-info">v${escapeHtml(extension.version)}</span>
          <span class="badge">${files.length} ${files.length === 1 ? 'file' : 'files'}</span>
          <span class="badge">${formatSize(totalSize)} total</span>
        </div>
      </div>
      <div class="action-bar">
        <a href="/extensions/${extension.id}" class="btn btn-tertiary">Back to extension</a>
      </div>
    </section>

    <section class="panel">
      <div class="panel-header">
        <h3 class="panel-title">Quick actions</h3>
        <span class="form-helper">Use these shortcuts to distribute the plugin.</span>
      </div>
      <div class="action-bar" style="flex-wrap: wrap;">
        <button class="btn btn-primary" type="button" data-plugin-copy="${pluginUrl}">Copy plugin URL</button>
        <a href="${pluginUrl}/download" class="btn btn-secondary">Download ZIP</a>
        ${
          format === 'claude_code'
            ? `<a href="/plugins/${extension.id}/gemini/definition" class="btn btn-ghost">Gemini JSON definition</a>`
            : `<a href="/plugins/${extension.id}/claude_code" class="btn btn-ghost">Browse Claude files</a>`
        }
      </div>
    </section>

    <section class="panel">
      <div class="panel-header">
        <h3 class="panel-title">File structure</h3>
        <span class="form-helper">Click any file to open it in a new tab.</span>
      </div>
      ${renderFileTree(fileTree, pluginUrl)}
    </section>

    <section class="panel">
      <div class="panel-header">
        <h3 class="panel-title">Installation guide</h3>
        <span class="form-helper">Follow these steps to install the plugin.</span>
      </div>
      ${format === 'claude_code' ? renderClaudeInstructions(pluginUrl, extension) : renderGeminiInstructions(pluginUrl, extension)}
    </section>

    <script>
      (function initPluginBrowser() {
        if (window.__pluginBrowserBound) return;
        window.__pluginBrowserBound = true;
        const copyButtons = document.querySelectorAll('[data-plugin-copy]');
        copyButtons.forEach((button) => {
          button.addEventListener('click', () => {
            if (!(button instanceof HTMLElement)) return;
            const url = button.getAttribute('data-plugin-copy');
            if (!url) return;
            window.UI?.copyWithFeedback(url, button, 'Plugin URL copied');
          });
        });
      })();
    </script>
  `;

  return layout(`${extension.name} · Plugin Files`, content);
}

function renderClaudeInstructions(pluginUrl: string, extension: ExtensionWithConfigs): string {
  return `
    <details open>
      <summary>Claude Code setup</summary>
      <div style="padding-top: 12px; display: grid; gap: 12px;">
        <p><strong>Install via marketplace:</strong></p>
        <pre style="margin: 0; max-height: 240px; overflow: auto;">${escapeHtml(`{
  "plugins": [
    {
      "source": {
        "source": "url",
        "url": "${pluginUrl}"
      }
    }
  ]
}`)}</pre>
        <p style="color: var(--text-muted);">Add the snippet to <code>marketplace.json</code> and restart Claude Code.</p>
        <p><strong>Manual installation:</strong></p>
        <ol style="margin: 0 0 0 18px; color: var(--text-muted);">
          <li>Download the ZIP using the button above.</li>
          <li>Extract into <code>~/.claude/plugins/${escapeHtml(extension.name)}</code>.</li>
          <li>Restart Claude Code to load the plugin.</li>
        </ol>
      </div>
    </details>
  `;
}

function renderGeminiInstructions(pluginUrl: string, extension: ExtensionWithConfigs): string {
  return `
    <details open>
      <summary>Gemini CLI setup</summary>
      <div style="padding-top: 12px; display: grid; gap: 12px;">
        <p><strong>Recommended:</strong> Use the JSON definition.</p>
        <div class="action-bar" style="margin-top: 4px;">
          <a href="/plugins/${extension.id}/gemini/definition" class="btn btn-primary">Download JSON definition</a>
        </div>
        <p style="color: var(--text-muted);">Install with <code>gemini extension install ${escapeHtml(extension.name)}.json</code>.</p>
        <p><strong>Advanced:</strong> Work with the full file set.</p>
        <ol style="margin: 0 0 0 18px; color: var(--text-muted);">
          <li>Download the ZIP using the button above.</li>
          <li>Extract the files to your Gemini extensions directory.</li>
          <li>Reference them from your CLI configuration.</li>
        </ol>
      </div>
    </details>
  `;
}
