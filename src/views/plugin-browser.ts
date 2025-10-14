import { ExtensionWithConfigs } from '../domain/types';
import { layout } from './layout';

interface FileInfo {
  path: string;
  r2Key: string;
  size: number | null;
  mimeType: string | null;
}

/**
 * Plugin file browser view - shows directory tree and file links
 */
export function pluginBrowserView(
  extension: ExtensionWithConfigs,
  format: 'claude_code' | 'gemini',
  files: FileInfo[],
  baseUrl: string
): string {
  const formatDisplay = format === 'claude_code' ? 'Claude Code' : 'Gemini CLI';
  const pluginUrl = `${baseUrl}/plugins/${extension.id}/${format}`;

  // Organize files by directory
  const fileTree = buildFileTree(files);

  const content = `
    <div class="container">
      <div class="header">
        <h1>📦 ${escapeHtml(extension.name)}</h1>
        <p class="subtitle">${formatDisplay} Plugin Files</p>
      </div>

      <div class="plugin-info">
        <div class="info-grid">
          <div class="info-item">
            <strong>Version:</strong> ${escapeHtml(extension.version)}
          </div>
          ${extension.author ? `<div class="info-item"><strong>Author:</strong> ${escapeHtml(extension.author)}</div>` : ''}
          <div class="info-item">
            <strong>Files:</strong> ${files.length}
          </div>
          <div class="info-item">
            <strong>Total Size:</strong> ${formatSize(files.reduce((sum, f) => sum + (f.size || 0), 0))}
          </div>
        </div>
      </div>

      <div class="actions-bar">
        <a href="${pluginUrl}/download" class="btn btn-primary">
          📥 Download ZIP
        </a>
        <button onclick="copyToClipboard('${pluginUrl}')" class="btn">
          📋 Copy Plugin URL
        </button>
        <a href="/extensions/${extension.id}" class="btn btn-secondary">
          ← Back to Extension
        </a>
      </div>

      <div class="file-browser">
        <h2>📁 File Structure</h2>
        <div class="file-tree">
          ${renderFileTree(fileTree, pluginUrl)}
        </div>
      </div>

      <div class="installation-guide">
        <h2>📖 Installation Instructions</h2>
        ${format === 'claude_code' ? renderClaudeCodeInstructions(pluginUrl, extension) : renderGeminiInstructions(extension)}
      </div>
    </div>

    <style>
      .container {
        max-width: 1200px;
        margin: 0 auto;
        padding: 2rem;
      }

      .header {
        margin-bottom: 2rem;
      }

      .subtitle {
        color: var(--text-secondary);
        font-size: 1.1rem;
        margin-top: 0.5rem;
      }

      .plugin-info {
        background: var(--bg-secondary);
        border-radius: 8px;
        padding: 1.5rem;
        margin-bottom: 2rem;
      }

      .info-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 1rem;
      }

      .info-item {
        padding: 0.5rem;
      }

      .actions-bar {
        display: flex;
        gap: 1rem;
        margin-bottom: 2rem;
        flex-wrap: wrap;
      }

      .file-browser {
        background: var(--bg-secondary);
        border-radius: 8px;
        padding: 1.5rem;
        margin-bottom: 2rem;
      }

      .file-tree {
        font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
        font-size: 0.9rem;
      }

      .file-tree ul {
        list-style: none;
        padding-left: 1.5rem;
        margin: 0.5rem 0;
      }

      .file-tree li {
        margin: 0.25rem 0;
      }

      .file-tree a {
        color: var(--text-link);
        text-decoration: none;
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.25rem 0.5rem;
        border-radius: 4px;
        transition: background-color 0.2s;
      }

      .file-tree a:hover {
        background: var(--bg-hover);
      }

      .directory-name {
        color: var(--text-primary);
        font-weight: 600;
        margin: 0.5rem 0 0.25rem 0;
      }

      .installation-guide {
        background: var(--bg-secondary);
        border-radius: 8px;
        padding: 1.5rem;
      }

      .installation-guide pre {
        background: var(--bg-primary);
        border: 1px solid var(--border-color);
        border-radius: 4px;
        padding: 1rem;
        overflow-x: auto;
        margin: 1rem 0;
      }

      .installation-guide code {
        font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
        font-size: 0.875rem;
      }

      .installation-step {
        margin: 1.5rem 0;
      }

      .installation-step h4 {
        margin-bottom: 0.5rem;
        color: var(--text-primary);
      }
    </style>

    <script>
      function copyToClipboard(text) {
        navigator.clipboard.writeText(text).then(() => {
          alert('Plugin URL copied to clipboard!');
        }).catch(err => {
          console.error('Failed to copy:', err);
        });
      }
    </script>
  `;

  return layout('Plugin Browser', content);
}

interface FileTreeNode {
  [key: string]: FileTreeNode | FileInfo;
}

function buildFileTree(files: FileInfo[]): FileTreeNode {
  const tree: FileTreeNode = {};

  for (const file of files) {
    const parts = file.path.split('/');
    let current = tree;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (i === parts.length - 1) {
        // Leaf node (file)
        current[part] = file;
      } else {
        // Directory node
        if (!current[part] || typeof current[part] !== 'object' || 'path' in current[part]) {
          current[part] = {};
        }
        current = current[part] as FileTreeNode;
      }
    }
  }

  return tree;
}

function renderFileTree(tree: FileTreeNode, baseUrl: string, depth: number = 0): string {
  let html = '<ul>';

  const entries = Object.entries(tree).sort(([aKey], [bKey]) => {
    // Sort directories first, then files
    const aNode = tree[aKey];
    const bNode = tree[bKey];
    const aIsDir = typeof aNode === 'object' && !('path' in aNode);
    const bIsDir = typeof bNode === 'object' && !('path' in bNode);
    if (aIsDir && !bIsDir) return -1;
    if (!aIsDir && bIsDir) return 1;
    return aKey.localeCompare(bKey);
  });

  for (const [name, node] of entries) {
    if (typeof node === 'object' && 'path' in node) {
      // File - node is FileInfo
      const fileNode = node as FileInfo;
      const icon = getFileIcon(name);
      const size = fileNode.size ? ` (${formatSize(fileNode.size)})` : '';
      html += `
        <li>
          <a href="${baseUrl}/${escapeHtml(fileNode.path)}" target="_blank">
            <span>${icon}</span>
            <span>${escapeHtml(name)}${size}</span>
          </a>
        </li>
      `;
    } else {
      // Directory - node is FileTreeNode
      html += `
        <li>
          <div class="directory-name">
            <span>📁</span>
            <span>${escapeHtml(name)}/</span>
          </div>
          ${renderFileTree(node as FileTreeNode, baseUrl, depth + 1)}
        </li>
      `;
    }
  }

  html += '</ul>';
  return html;
}

function getFileIcon(filename: string): string {
  if (filename.endsWith('.json')) return '📄';
  if (filename.endsWith('.md')) return '📝';
  if (filename.endsWith('.toml')) return '⚙️';
  return '📄';
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function renderClaudeCodeInstructions(pluginUrl: string, extension: ExtensionWithConfigs): string {
  return `
    <div class="installation-step">
      <h4>Option 1: Install from Marketplace</h4>
      <p>Add to your <code>marketplace.json</code>:</p>
      <pre><code>{
  "plugins": [
    {
      "source": {
        "source": "url",
        "url": "${pluginUrl}"
      }
    }
  ]
}</code></pre>
    </div>

    <div class="installation-step">
      <h4>Option 2: Manual Installation</h4>
      <ol>
        <li>Download the ZIP file using the button above</li>
        <li>Extract to <code>~/.claude/plugins/${escapeHtml(extension.name)}/</code></li>
        <li>Restart Claude Code</li>
      </ol>
    </div>

    <div class="installation-step">
      <h4>Option 3: Direct HTTP Source</h4>
      <p>Claude Code will automatically discover and load files from:</p>
      <pre><code>${pluginUrl}</code></pre>
      <p>The plugin includes:</p>
      <ul>
        ${extension.configs.filter((c) => c.type === 'slash_command').length > 0 ? `<li>Commands: ${extension.configs.filter((c) => c.type === 'slash_command').length}</li>` : ''}
        ${extension.configs.filter((c) => c.type === 'agent_definition').length > 0 ? `<li>Agents: ${extension.configs.filter((c) => c.type === 'agent_definition').length}</li>` : ''}
        ${extension.configs.filter((c) => c.type === 'mcp_config').length > 0 ? `<li>MCP Servers: ${extension.configs.filter((c) => c.type === 'mcp_config').length}</li>` : ''}
      </ul>
    </div>
  `;
}

function renderGeminiInstructions(extension: ExtensionWithConfigs): string {
  return `
    <div class="installation-step">
      <h4>Installation Steps</h4>
      <ol>
        <li>Download the ZIP file using the button above</li>
        <li>Extract to your Gemini extensions directory</li>
        <li>Run: <code>gemini extension install /path/to/${escapeHtml(extension.name)}/</code></li>
      </ol>
    </div>

    <div class="installation-step">
      <h4>What's Included</h4>
      <ul>
        ${extension.configs.filter((c) => c.type === 'slash_command').length > 0 ? `<li>Commands: ${extension.configs.filter((c) => c.type === 'slash_command').length}</li>` : ''}
        ${extension.configs.filter((c) => c.type === 'mcp_config').length > 0 ? `<li>MCP Servers: ${extension.configs.filter((c) => c.type === 'mcp_config').length}</li>` : ''}
        ${extension.description ? `<li>Context file (GEMINI.md)</li>` : ''}
      </ul>
    </div>
  `;
}

function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
