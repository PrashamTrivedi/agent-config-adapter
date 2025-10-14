import { Config } from '../domain/types';
import { layout } from './layout';

// Helper function to render just the config list container (for HTMX partial updates)
export function configListContainerPartial(
  configs: Config[],
  hasActiveFilters: boolean
): string {
  return `
    ${configs.length === 0 ? `
      <p class="no-results">
        ${hasActiveFilters ? 'No configurations match your filters. Try adjusting your search criteria.' : 'No configurations yet. Add your first one!'}
      </p>
    ` : `
      <ul class="config-list">
        ${configs.map(c => `
          <li>
            <a href="/configs/${c.id}" style="font-weight: 500;">
              ${escapeHtml(c.name)}
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
}

export function configListView(
  configs: Config[],
  currentFilters?: { type?: string; format?: string; search?: string }
): string {
  const activeFilters = currentFilters || {};
  const hasActiveFilters = !!(activeFilters.type || activeFilters.format || activeFilters.search);

  const content = `
    <h2>All Configurations</h2>
    <a href="/configs/new" class="btn">Add New Config</a>

    <!-- Filter Controls -->
    <div class="filter-container" id="filter-controls">
      <div class="filter-row">
        <div class="filter-group">
          <label for="filter-type">Type:</label>
          <select
            id="filter-type"
            name="type"
            hx-get="/api/configs"
            hx-trigger="change"
            hx-target="#config-list-container"
            hx-swap="innerHTML"
            hx-include="[name='format'], [name='search']">
            <option value="">All</option>
            <option value="slash_command" ${activeFilters.type === 'slash_command' ? 'selected' : ''}>Slash Command</option>
            <option value="agent_definition" ${activeFilters.type === 'agent_definition' ? 'selected' : ''}>Agent Definition</option>
            <option value="mcp_config" ${activeFilters.type === 'mcp_config' ? 'selected' : ''}>MCP Config</option>
          </select>
        </div>

        <div class="filter-group">
          <label for="filter-format">Format:</label>
          <select
            id="filter-format"
            name="format"
            hx-get="/api/configs"
            hx-trigger="change"
            hx-target="#config-list-container"
            hx-swap="innerHTML"
            hx-include="[name='type'], [name='search']">
            <option value="">All</option>
            <option value="claude_code" ${activeFilters.format === 'claude_code' ? 'selected' : ''}>Claude Code</option>
            <option value="codex" ${activeFilters.format === 'codex' ? 'selected' : ''}>Codex</option>
            <option value="gemini" ${activeFilters.format === 'gemini' ? 'selected' : ''}>Gemini</option>
          </select>
        </div>

        <div class="filter-group">
          <label for="filter-search">Search:</label>
          <input
            type="text"
            id="filter-search"
            name="search"
            placeholder="Search by name..."
            value="${activeFilters.search || ''}"
            hx-get="/api/configs"
            hx-trigger="keyup changed delay:500ms"
            hx-target="#config-list-container"
            hx-swap="innerHTML"
            hx-include="[name='type'], [name='format']">
        </div>

        ${hasActiveFilters ? `
          <div class="filter-group">
            <button
              class="btn btn-secondary"
              onclick="clearFilters()">
              Clear Filters
            </button>
          </div>
        ` : ''}
      </div>

      ${hasActiveFilters ? `
        <div class="active-filters">
          <span style="font-weight: 500; margin-right: 10px;">Active Filters:</span>
          ${activeFilters.type ? `<span class="filter-badge">Type: ${activeFilters.type}</span>` : ''}
          ${activeFilters.format ? `<span class="filter-badge">Format: ${activeFilters.format}</span>` : ''}
          ${activeFilters.search ? `<span class="filter-badge">Search: "${activeFilters.search}"</span>` : ''}
        </div>
      ` : ''}
    </div>

    <!-- Config List Container -->
    <div id="config-list-container">
      ${configListContainerPartial(configs, hasActiveFilters)}
    </div>

    <script>
      // Clear filters function
      function clearFilters() {
        document.getElementById('filter-type').value = '';
        document.getElementById('filter-format').value = '';
        document.getElementById('filter-search').value = '';
        // Trigger change to reload
        window.location.href = '/configs';
      }

      // Handle HTMX response for filter updates
      document.body.addEventListener('htmx:afterSwap', function(evt) {
        if (evt.detail.target.id === 'config-list-container') {
          // Update URL with current filter state
          const type = document.getElementById('filter-type').value;
          const format = document.getElementById('filter-format').value;
          const search = document.getElementById('filter-search').value;

          const params = new URLSearchParams();
          if (type) params.set('type', type);
          if (format) params.set('format', format);
          if (search) params.set('search', search);

          const newUrl = params.toString() ? '/configs?' + params.toString() : '/configs';
          window.history.pushState({}, '', newUrl);
        }
      });
    </script>
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

    <h3>Actions</h3>
    <div style="margin-bottom: 20px;">
      <button
        class="btn"
        hx-post="/api/configs/${config.id}/invalidate"
        hx-target="#cache-status"
        hx-swap="innerHTML">
        Refresh Conversions
      </button>
      <span style="font-size: 0.875em; color: var(--text-secondary); margin-left: 10px;">
        (Clears cached conversions and forces re-processing)
      </span>
    </div>
    <div id="cache-status"></div>

    <div style="margin-top: 30px;">
      <a href="/configs/${config.id}/edit" class="btn">Edit</a>
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

export function configEditView(config: Config): string {
  const content = `
    <h2>Edit Configuration</h2>
    <form hx-put="/api/configs/${config.id}" hx-target="body" hx-swap="outerHTML">
      <div class="form-group">
        <label for="name">Name</label>
        <input type="text" id="name" name="name" value="${escapeHtml(config.name)}" required>
      </div>

      <div class="form-group">
        <label for="type">Type</label>
        <select id="type" name="type" required>
          <option value="slash_command" ${config.type === 'slash_command' ? 'selected' : ''}>Slash Command</option>
          <option value="agent_definition" ${config.type === 'agent_definition' ? 'selected' : ''}>Agent Definition</option>
          <option value="mcp_config" ${config.type === 'mcp_config' ? 'selected' : ''}>MCP Config</option>
        </select>
      </div>

      <div class="form-group">
        <label for="original_format">Original Format</label>
        <select id="original_format" name="original_format" required>
          <option value="claude_code" ${config.original_format === 'claude_code' ? 'selected' : ''}>Claude Code</option>
          <option value="codex" ${config.original_format === 'codex' ? 'selected' : ''}>Codex</option>
          <option value="gemini" ${config.original_format === 'gemini' ? 'selected' : ''}>Gemini</option>
        </select>
      </div>

      <div class="form-group">
        <label for="content">Content</label>
        <textarea id="content" name="content" required>${escapeHtml(config.content)}</textarea>
      </div>

      <button type="submit" class="btn">Update Config</button>
      <a href="/configs/${config.id}" class="btn btn-secondary">Cancel</a>
    </form>
  `;
  return layout('Edit Config', content);
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
