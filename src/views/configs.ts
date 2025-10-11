import { Config } from '../domain/types';
import { layout } from './layout';

export function configListView(configs: Config[]): string {
  const content = `
    <h2>All Configurations</h2>
    <a href="/configs/new" class="btn">Add New Config</a>
    ${configs.length === 0 ? '<p>No configurations yet. Add your first one!</p>' : `
      <ul class="config-list">
        ${configs.map(c => `
          <li>
            <a href="/configs/${c.id}" style="font-weight: 500;">
              ${c.name}
            </a>
            <span class="badge">${c.type}</span>
            <span class="badge">${c.original_format}</span>
            <div style="font-size: 0.875em; margin-top: 5px; color: var(--text-secondary);">
              Created: ${new Date(c.created_at).toLocaleDateString()}
            </div>
          </li>
        `).join('')}
      </ul>
    `}
  `;
  return layout('Configurations', content);
}

export function configDetailView(config: Config): string {
  const content = `
    <h2>${config.name}</h2>
    <div style="margin-bottom: 20px;">
      <span class="badge">${config.type}</span>
      <span class="badge">${config.original_format}</span>
    </div>

    <h3>Original Content</h3>
    <pre>${escapeHtml(config.content)}</pre>

    <h3>Convert to Different Formats</h3>
    <div style="margin-bottom: 20px;">
      <button class="btn" hx-get="/api/configs/${config.id}/format/claude_code" hx-target="#converted">
        Claude Code
      </button>
      <button class="btn" hx-get="/api/configs/${config.id}/format/codex" hx-target="#converted">
        Codex
      </button>
      <button class="btn" hx-get="/api/configs/${config.id}/format/gemini" hx-target="#converted">
        Gemini
      </button>
    </div>

    <div id="converted"></div>

    <div style="margin-top: 30px;">
      <a href="/configs" class="btn btn-secondary">Back to List</a>
      <button
        class="btn btn-danger"
        hx-delete="/api/configs/${config.id}"
        hx-confirm="Are you sure you want to delete this config?"
        hx-target="body"
        hx-swap="outerHTML">
        Delete
      </button>
    </div>

    <script>
      // Handle converted content display
      document.body.addEventListener('htmx:afterSwap', function(evt) {
        if (evt.detail.target.id === 'converted') {
          const data = JSON.parse(evt.detail.xhr.responseText);

          // Determine AI status indicator
          let aiIndicator = '';
          if (data.usedAI) {
            if (data.fallbackUsed) {
              aiIndicator = '<p style="color: #ff9800; font-size: 0.875em;">⚠ Fallback conversion used</p>';
            } else {
              aiIndicator = '<p style="color: #4caf50; font-size: 0.875em;">✓ AI-powered conversion</p>';
            }
          }

          evt.detail.target.innerHTML = \`
            <h3>Converted Content</h3>
            <pre>\${data.content}</pre>
            \${aiIndicator}
            \${data.cached ? '<p style="color: var(--text-secondary); font-size: 0.875em;">From cache</p>' : ''}
          \`;
        }
      });
    </script>
  `;
  return layout(config.name, content);
}

export function configCreateView(): string {
  const content = `
    <h2>Add New Configuration</h2>
    <form hx-post="/api/configs" hx-target="body" hx-swap="outerHTML">
      <div class="form-group">
        <label for="name">Name</label>
        <input type="text" id="name" name="name" required>
      </div>

      <div class="form-group">
        <label for="type">Type</label>
        <select id="type" name="type" required>
          <option value="slash_command">Slash Command</option>
          <option value="agent_definition">Agent Definition</option>
          <option value="mcp_config">MCP Config</option>
        </select>
      </div>

      <div class="form-group">
        <label for="original_format">Original Format</label>
        <select id="original_format" name="original_format" required>
          <option value="claude_code">Claude Code</option>
          <option value="codex">Codex</option>
          <option value="gemini">Gemini</option>
        </select>
      </div>

      <div class="form-group">
        <label for="content">Content</label>
        <textarea id="content" name="content" required></textarea>
      </div>

      <button type="submit" class="btn">Create Config</button>
      <a href="/configs" class="btn btn-secondary">Cancel</a>
    </form>

    <script>
      // Handle form submission
      document.body.addEventListener('htmx:afterSwap', function(evt) {
        const response = evt.detail.xhr.responseText;
        try {
          const data = JSON.parse(response);
          if (data.config) {
            window.location.href = '/configs/' + data.config.id;
          }
        } catch(e) {
          // Response is HTML, let it render
        }
      });
    </script>
  `;
  return layout('Add Config', content);
}

function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}
