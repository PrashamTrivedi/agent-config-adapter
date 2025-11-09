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
          <li class="card card-hover fade-in">
            <a href="/configs/${c.id}" style="font-weight: 500; font-size: 1.1em;">
              ${escapeHtml(c.name)}
            </a>
            <div style="margin-top: 8px;">
              <span class="status-indicator status-info">
                <span class="status-dot"></span>
                ${c.type.replace('_', ' ')}
              </span>
              <span class="badge">${c.original_format}</span>
            </div>
            <div style="font-size: 0.875em; margin-top: 8px; color: var(--text-secondary); display: flex; justify-content: space-between; align-items: center;">
              <span>Created: ${new Date(c.created_at).toLocaleDateString()}</span>
              <div class="quick-actions" style="opacity: 0; transition: opacity 0.2s;">
                <a href="/configs/${c.id}/edit" class="btn btn-secondary" style="padding: 4px 10px; font-size: 0.875em; margin-right: 5px;">Edit</a>
                <a href="/configs/${c.id}" class="btn" style="padding: 4px 10px; font-size: 0.875em;">View →</a>
              </div>
            </div>
          </li>
        `).join('')}
      </ul>
      <style>
        .config-list li:hover .quick-actions {
          opacity: 1;
        }
      </style>
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
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
      <h2 style="margin: 0;">All Configurations</h2>
      <a href="/configs/new" class="btn ripple">+ Add New Config</a>
    </div>

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
            <option value="skill" ${activeFilters.type === 'skill' ? 'selected' : ''}>Skill</option>
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
  const isSlashCommand = config.type === 'slash_command';

  const content = `
    <div class="fade-in">
      <h2>${config.name}</h2>
      <div style="margin-bottom: 20px;">
        <span class="status-indicator status-info">
          <span class="status-dot"></span>
          ${config.type.replace('_', ' ')}
        </span>
        <span class="badge">${config.original_format}</span>
      </div>
    </div>

    ${isSlashCommand ? `
      <div class="card slide-up" style="margin-bottom: 20px; padding: 20px;">
        <h3 style="margin-top: 0;">📋 Slash Command Analysis</h3>
        <ul style="margin-left: 20px; line-height: 1.8;">
          <li><strong>Requires arguments:</strong> ${config.has_arguments ? '<span class="status-indicator status-warning">Yes</span>' : '<span class="status-indicator status-success">No</span>'}</li>
          ${config.argument_hint ? `<li><strong>Argument hint:</strong> <code>${escapeHtml(config.argument_hint)}</code></li>` : ''}
          ${config.agent_references ? `
            <li><strong>Agent references:</strong> ${JSON.parse(config.agent_references).map((a: string) => `<span class="badge">${escapeHtml(a)}</span>`).join(' ')}</li>
          ` : '<li><strong>Agent references:</strong> <span class="status-indicator status-info">None</span></li>'}
          ${config.skill_references ? `
            <li><strong>Skill references:</strong> ${JSON.parse(config.skill_references).map((s: string) => `<span class="badge">${escapeHtml(s)}</span>`).join(' ')}</li>
          ` : '<li><strong>Skill references:</strong> <span class="status-indicator status-info">None</span></li>'}
          ${config.analysis_version ? `<li><strong>Analysis version:</strong> ${config.analysis_version}</li>` : ''}
        </ul>

        <button
          id="refresh-analysis-btn"
          class="btn btn-secondary ripple"
          hx-post="/api/configs/${config.id}/refresh-analysis"
          hx-target="#analysis-status"
          hx-swap="innerHTML"
          data-success-message="Analysis refreshed successfully"
          data-error-message="Failed to refresh analysis"
          style="margin-top: 15px;">
          🔄 Refresh Analysis
        </button>
        <span class="help-text" style="display: inline-block; margin-left: 10px;">
          Re-analyzes command for arguments and references
        </span>

        <div id="analysis-status" style="margin-top: 10px;"></div>
        <div id="refresh-progress" class="progress-bar indeterminate" style="margin-top: 10px; display: none;">
          <div class="progress-bar-fill"></div>
        </div>
      </div>
    ` : ''}

    <h3>Original Content</h3>
    <pre>${escapeHtml(config.content)}</pre>

    <h3>🔄 Convert to Different Formats</h3>
    <div style="margin-bottom: 20px;">
      <button class="btn ripple" hx-get="/api/configs/${config.id}/format/claude_code" hx-target="#converted" hx-indicator="#convert-spinner">
        Claude Code
      </button>
      <button class="btn ripple" hx-get="/api/configs/${config.id}/format/codex" hx-target="#converted" hx-indicator="#convert-spinner">
        Codex
      </button>
      <button class="btn ripple" hx-get="/api/configs/${config.id}/format/gemini" hx-target="#converted" hx-indicator="#convert-spinner">
        Gemini
      </button>
      <span id="convert-spinner" class="htmx-indicator">
        <span class="spinner"></span>
      </span>
    </div>

    <div id="converted" class="fade-in"></div>

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

    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid var(--border-color);">
      <a href="/configs/${config.id}/edit" class="btn ripple">✏️ Edit</a>
      <a href="/configs" class="btn btn-secondary">← Back to List</a>
      <button
        class="btn btn-danger ripple"
        onclick="confirmAction('Are you sure you want to delete this config? This action cannot be undone.', () => {
          htmx.ajax('DELETE', '/api/configs/${config.id}', {target:'body', swap:'outerHTML'});
        })">
        🗑️ Delete
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
              aiIndicator = '<span class="status-indicator status-warning"><span class="status-dot"></span> Fallback conversion used</span>';
            } else {
              aiIndicator = '<span class="status-indicator status-success"><span class="status-dot"></span> AI-powered conversion</span>';
            }
          }

          evt.detail.target.innerHTML = \`
            <div class="card fade-in" style="margin-top: 20px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                <h3 style="margin: 0;">✅ Converted Content</h3>
                <button class="btn btn-secondary copy-btn" onclick="copyToClipboard(\\\`\${data.content.replace(/\`/g, '\\\\\`')}\\\`, this)">
                  📋 Copy
                </button>
              </div>
              <pre style="margin: 0;">\${data.content}</pre>
              <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid var(--border-color); display: flex; gap: 10px;">
                \${aiIndicator}
                \${data.cached ? '<span class="status-indicator status-info"><span class="status-dot"></span> From cache</span>' : ''}
              </div>
            </div>
          \`;
          window.showToast('Conversion completed successfully', 'success');
        }

        // Auto-reload page after analysis refresh for updated metadata
        if (evt.detail.target.id === 'analysis-status' && evt.detail.xhr.status === 200) {
          window.showToast('Analysis refreshed! Reloading page...', 'success');
          setTimeout(() => {
            window.location.reload();
          }, 2000);
        }
      });

      // Show progress bar during analysis refresh
      document.body.addEventListener('htmx:beforeRequest', function(evt) {
        if (evt.target.id === 'refresh-analysis-btn') {
          document.getElementById('refresh-progress').style.display = 'block';
        }
      });

      document.body.addEventListener('htmx:afterRequest', function(evt) {
        if (evt.target.id === 'refresh-analysis-btn') {
          document.getElementById('refresh-progress').style.display = 'none';
        }
      });
    </script>
  `;
  return layout(config.name, content);
}

export function configCreateView(): string {
  const content = `
    <div class="fade-in">
      <h2>✨ Add New Configuration</h2>
      <div class="card" style="margin-top: 20px;">
        <form id="config-form" hx-post="/api/configs" hx-target="body" hx-swap="outerHTML">
          <div class="form-group">
            <label for="name">Name <span style="color: var(--danger);">*</span></label>
            <input type="text" id="name" name="name" required placeholder="Enter configuration name">
            <span class="form-error-message"></span>
          </div>

          <div class="form-group">
            <label for="type">Type <span style="color: var(--danger);">*</span></label>
            <select id="type" name="type" required>
              <option value="slash_command">Slash Command</option>
              <option value="agent_definition">Agent Definition</option>
              <option value="mcp_config">MCP Config</option>
              <option value="skill">Skill</option>
            </select>
            <span class="form-error-message"></span>
          </div>

          <div class="form-group">
            <label for="original_format">Original Format <span style="color: var(--danger);">*</span></label>
            <select id="original_format" name="original_format" required>
              <option value="claude_code">Claude Code</option>
              <option value="codex">Codex</option>
              <option value="gemini">Gemini</option>
            </select>
            <span class="form-error-message"></span>
          </div>

          <div class="form-group">
            <label for="content">Content <span style="color: var(--danger);">*</span></label>
            <textarea id="content" name="content" required placeholder="Paste your configuration content here..."></textarea>
            <span class="form-error-message"></span>
          </div>

          <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid var(--border-color);">
            <button type="submit" id="submit-btn" class="btn ripple">✓ Create Config</button>
            <a href="/configs" class="btn btn-secondary">Cancel</a>
          </div>
        </form>
      </div>
    </div>

    <script>
      // Add character counter
      window.addCharCount('content');

      // Form validation
      const form = document.getElementById('config-form');
      form.addEventListener('submit', function(e) {
        if (!window.validateForm(form)) {
          e.preventDefault();
          window.showToast('Please fill in all required fields', 'error');
        }
      });

      // Handle form submission
      document.body.addEventListener('htmx:afterSwap', function(evt) {
        const response = evt.detail.xhr.responseText;
        try {
          const data = JSON.parse(response);
          if (data.config) {
            window.showToast('Configuration created successfully!', 'success');
            setTimeout(() => {
              window.location.href = '/configs/' + data.config.id;
            }, 500);
          }
        } catch(e) {
          // Response is HTML, let it render
        }
      });

      // Handle type selection change
      document.getElementById('type').addEventListener('change', function(e) {
        if (e.target.value === 'skill') {
          // Redirect to skills create page for multi-file support
          if (confirm('Skills require multi-file support. Redirect to skills creation page?')) {
            window.location.href = '/skills/new';
          } else {
            e.target.value = 'slash_command';
          }
        }
      });
    </script>
  `;
  return layout('Add Config', content);
}

export function configEditView(config: Config): string {
  const content = `
    <div class="fade-in">
      <h2>✏️ Edit Configuration</h2>
      <div class="card" style="margin-top: 20px;">
        <form id="config-form" hx-put="/api/configs/${config.id}" hx-target="body" hx-swap="outerHTML">
          <div class="form-group">
            <label for="name">Name <span style="color: var(--danger);">*</span></label>
            <input type="text" id="name" name="name" value="${escapeHtml(config.name)}" required>
            <span class="form-error-message"></span>
          </div>

          <div class="form-group">
            <label for="type">Type <span style="color: var(--danger);">*</span></label>
            <select id="type" name="type" required>
              <option value="slash_command" ${config.type === 'slash_command' ? 'selected' : ''}>Slash Command</option>
              <option value="agent_definition" ${config.type === 'agent_definition' ? 'selected' : ''}>Agent Definition</option>
              <option value="mcp_config" ${config.type === 'mcp_config' ? 'selected' : ''}>MCP Config</option>
              <option value="skill" ${config.type === 'skill' ? 'selected' : ''}>Skill</option>
            </select>
            <span class="form-error-message"></span>
          </div>

          <div class="form-group">
            <label for="original_format">Original Format <span style="color: var(--danger);">*</span></label>
            <select id="original_format" name="original_format" required>
              <option value="claude_code" ${config.original_format === 'claude_code' ? 'selected' : ''}>Claude Code</option>
              <option value="codex" ${config.original_format === 'codex' ? 'selected' : ''}>Codex</option>
              <option value="gemini" ${config.original_format === 'gemini' ? 'selected' : ''}>Gemini</option>
            </select>
            <span class="form-error-message"></span>
          </div>

          <div class="form-group">
            <label for="content">Content <span style="color: var(--danger);">*</span></label>
            <textarea id="content" name="content" required>${escapeHtml(config.content)}</textarea>
            <span class="form-error-message"></span>
          </div>

          <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid var(--border-color);">
            <button type="submit" id="submit-btn" class="btn ripple">✓ Update Config</button>
            <a href="/configs/${config.id}" class="btn btn-secondary">Cancel</a>
          </div>
        </form>
      </div>
    </div>
    <script>
      // Add character counter
      window.addCharCount('content');

      // Form validation
      const form = document.getElementById('config-form');
      form.addEventListener('submit', function(e) {
        if (!window.validateForm(form)) {
          e.preventDefault();
          window.showToast('Please fill in all required fields', 'error');
        }
      });

      // Handle successful update
      document.body.addEventListener('htmx:afterSwap', function(evt) {
        window.showToast('Configuration updated successfully!', 'success');
      });
    </script>
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
