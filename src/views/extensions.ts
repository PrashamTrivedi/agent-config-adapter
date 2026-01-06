import { ExtensionWithConfigs, Config } from '../domain/types';
import { layout } from './layout';
import { icons } from './icons';

export function extensionListView(extensions: ExtensionWithConfigs[]): string {
  const content = `
    <div class="fade-in">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
        <h2 style="margin: 0; display: flex; align-items: center; gap: 12px;">
          ${icons.package('icon')} Extensions
        </h2>
        <button onclick="requireAuth(() => window.location.href='/extensions/new')" class="btn ripple">+ Create Extension</button>
      </div>

      ${extensions.length === 0 ? `
        <div class="card" style="text-align: center; padding: 40px;">
          <div style="margin-bottom: 15px;">
            ${icons.package('icon-lg')}
          </div>
          <h3>No extensions yet</h3>
          <p style="color: var(--text-secondary); margin-bottom: 20px;">Extensions bundle multiple configs into distributable packages</p>
          <button onclick="requireAuth(() => window.location.href='/extensions/new')" class="btn">Create your first extension</button>
        </div>
      ` : `
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 20px;">
          ${extensions.map(ext => `
            <div class="card card-hover card-interactive scale-in" onclick="window.location.href='/extensions/${ext.id}'">
              <div style="display: flex; align-items: flex-start; gap: 15px; margin-bottom: 15px;">
                ${ext.icon_url ? `
                  <img src="${escapeHtml(ext.icon_url)}" alt="${escapeHtml(ext.name)}" style="width: 48px; height: 48px; border-radius: 8px; object-fit: cover;">
                ` : `
                  <div style="width: 48px; height: 48px; background: var(--accent-primary); border-radius: 8px; display: flex; align-items: center; justify-content: center;">
                    ${icons.package('icon')}
                  </div>
                `}
                <div style="flex: 1; min-width: 0;">
                  <h3 style="margin: 0 0 5px 0; font-size: 1.1em; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                    ${escapeHtml(ext.name)}
                  </h3>
                  <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                    <span class="status-indicator status-info" style="font-size: 0.8em; padding: 2px 8px;">
                      <span class="status-dot"></span>
                      v${escapeHtml(ext.version)}
                    </span>
                    <span class="badge">${ext.configs.length} config${ext.configs.length !== 1 ? 's' : ''}</span>
                  </div>
                </div>
              </div>

              ${ext.description ? `
                <p style="font-size: 0.875em; color: var(--text-secondary); margin-bottom: 12px; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">
                  ${escapeHtml(ext.description)}
                </p>
              ` : ''}

              ${ext.author ? `
                <div style="font-size: 0.8em; color: var(--text-secondary); padding-top: 12px; border-top: 1px solid var(--border-color); display: flex; align-items: center; gap: 6px;">
                  ${icons.user('icon')} ${escapeHtml(ext.author)}
                </div>
              ` : ''}
            </div>
          `).join('')}
        </div>
      `}
    </div>
  `;
  return layout('Extensions', content);
}

export function extensionDetailView(extension: ExtensionWithConfigs): string {
  const content = `
    <h2>${escapeHtml(extension.name)}</h2>
    <div style="margin-bottom: 20px;">
      <span class="badge">v${escapeHtml(extension.version)}</span>
      <span class="badge">${extension.configs.length} config${extension.configs.length !== 1 ? 's' : ''}</span>
    </div>

    ${extension.description ? `
      <h3>Description</h3>
      <p>${escapeHtml(extension.description)}</p>
    ` : ''}

    ${extension.author ? `
      <h3>Author</h3>
      <p>${escapeHtml(extension.author)}</p>
    ` : ''}

    <h3>Included Configs</h3>
    ${extension.configs.length === 0 ? '<p>No configs in this extension yet.</p>' : `
      <ul class="config-list">
        ${extension.configs.map(c => `
          <li>
            <a href="/configs/${c.id}" style="font-weight: 500;">
              ${escapeHtml(c.name)}
            </a>
            <span class="badge">${c.type}</span>
            <span class="badge">${c.original_format}</span>
          </li>
        `).join('')}
      </ul>
    `}

    <h3>Manifest Preview</h3>
    <div style="margin-bottom: 20px;">
      <button class="btn" hx-get="/api/extensions/${extension.id}/manifest/gemini" hx-target="#manifest-preview">
        Gemini Format
      </button>
      <button class="btn" hx-get="/api/extensions/${extension.id}/manifest/claude_code" hx-target="#manifest-preview">
        Claude Code Format
      </button>
    </div>

    <div id="manifest-preview"></div>

    <h3 style="display: flex; align-items: center; gap: 10px;">${icons.download('icon')} Download Plugin</h3>
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin-bottom: 30px;">
      <!-- Claude Code Plugin -->
      <div style="background: var(--bg-secondary); padding: 20px; border-radius: 8px; border: 1px solid var(--border-color);">
        <h4 style="margin-top: 0; display: flex; align-items: center; gap: 8px;"><span style="color: var(--accent-primary);">●</span> Claude Code Plugin</h4>
        <p style="font-size: 0.875rem; color: var(--text-secondary); margin: 0 0 15px 0;">
          Full plugin with manifest, commands, agents, and MCP configs
        </p>
        <div style="display: flex; flex-direction: column; gap: 10px;">
          <a href="/plugins/${extension.id}/claude_code" class="btn" style="text-align: center;">
            ${icons.folder('icon')} Browse Files
          </a>
          <a href="/plugins/${extension.id}/claude_code/download" class="btn btn-primary" style="text-align: center;">
            ${icons.download('icon')} Download ZIP
          </a>
        </div>
      </div>

      <!-- Gemini CLI Extension -->
      <div style="background: var(--bg-secondary); padding: 20px; border-radius: 8px; border: 1px solid var(--border-color);">
        <h4 style="margin-top: 0; display: flex; align-items: center; gap: 8px;"><span style="color: #eab308;">●</span> Gemini CLI Extension</h4>
        <p style="font-size: 0.875rem; color: var(--text-secondary); margin: 0 0 15px 0;">
          JSON definition file - recommended for Gemini extensions
        </p>
        <div style="display: flex; flex-direction: column; gap: 10px;">
          <a href="/plugins/${extension.id}/gemini/definition" class="btn btn-primary" style="text-align: center;">
            ${icons.file('icon')} Download JSON Definition
          </a>
          <details style="margin-top: 10px;">
            <summary style="cursor: pointer; font-size: 0.875rem; color: var(--text-secondary); user-select: none;">
              Advanced: Full Plugin Files
            </summary>
            <div style="display: flex; flex-direction: column; gap: 10px; margin-top: 10px;">
              <a href="/plugins/${extension.id}/gemini" class="btn btn-secondary" style="text-align: center; font-size: 0.875rem;">
                ${icons.folder('icon')} Browse Files
              </a>
              <a href="/plugins/${extension.id}/gemini/download" class="btn btn-secondary" style="text-align: center; font-size: 0.875rem;">
                ${icons.download('icon')} Download ZIP
              </a>
            </div>
          </details>
        </div>
      </div>
    </div>

    <h3>Installation Instructions</h3>
    <details open style="background: var(--bg-secondary); padding: 15px; border-radius: 6px; margin-bottom: 20px;">
      <summary style="cursor: pointer; font-weight: 600; margin-bottom: 10px;"><span style="color: var(--accent-primary);">●</span> Claude Code Installation</summary>
      <div style="padding-left: 20px;">
        <p><strong>Option 1: From Marketplace</strong></p>
        <p style="font-size: 0.875rem; color: var(--text-secondary);">
          Add this plugin to your marketplace.json for automatic updates
        </p>
        <pre style="background: var(--bg-primary); padding: 10px; border-radius: 4px; overflow-x: auto; font-size: 0.875rem;"><code>{
  "plugins": [
    {
      "source": {
        "source": "url",
        "url": "https://your-domain.com/plugins/${extension.id}/claude_code"
      }
    }
  ]
}</code></pre>

        <p style="margin-top: 15px;"><strong>Option 2: Manual Installation</strong></p>
        <ol style="font-size: 0.875rem;">
          <li>Click "Download ZIP" above</li>
          <li>Extract to <code>~/.claude/plugins/${escapeHtml(extension.name)}/</code></li>
          <li>Restart Claude Code</li>
        </ol>
      </div>
    </details>

    <details style="background: var(--bg-secondary); padding: 15px; border-radius: 6px; margin-bottom: 20px;">
      <summary style="cursor: pointer; font-weight: 600; margin-bottom: 10px;"><span style="color: #eab308;">●</span> Gemini CLI Installation</summary>
      <div style="padding-left: 20px;">
        <p><strong>Recommended: JSON Definition</strong></p>
        <p style="font-size: 0.875rem; color: var(--text-secondary); margin-bottom: 10px;">
          Gemini extensions use JSON manifest files that reference command files by path
        </p>
        <ol style="font-size: 0.875rem;">
          <li>Click "Download JSON Definition" above</li>
          <li>Save to your extensions directory as <code>${escapeHtml(extension.name)}.json</code></li>
          <li>Run: <code>gemini extension install ${escapeHtml(extension.name)}.json</code></li>
        </ol>

        <p style="margin-top: 15px; font-size: 0.875rem; color: var(--text-secondary);">
          <strong>Note:</strong> Command files must be accessible at the paths specified in the JSON manifest
        </p>
      </div>
    </details>

    <h3>Actions</h3>
    <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid var(--border-color);">
      <button onclick="requireAuth(() => window.location.href='/extensions/${extension.id}/edit')" class="btn ripple">${icons.edit('icon')} Edit</button>
      <a href="/extensions" class="btn btn-secondary">← Back to List</a>
      <button
        class="btn btn-danger ripple"
        onclick="requireAuth(() => htmx.trigger(this, 'click-confirmed'))"
        hx-delete="/api/extensions/${extension.id}"
        hx-trigger="click-confirmed"
        hx-confirm="Are you sure you want to delete this extension? This will not delete the configs."
        hx-target="body"
        hx-swap="outerHTML"
        data-success-message="Extension deleted successfully">
        ${icons.trash('icon')} Delete
      </button>
    </div>

    <script>
      // Handle manifest preview display
      document.body.addEventListener('htmx:afterSwap', function(evt) {
        if (evt.detail.target.id === 'manifest-preview') {
          const data = JSON.parse(evt.detail.xhr.responseText);
          const jsonStr = JSON.stringify(data, null, 2);
          evt.detail.target.innerHTML = \`
            <div class="card fade-in">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                <h4 style="margin: 0;">${icons.file('icon')} Manifest Content</h4>
                <button class="btn btn-secondary copy-btn" onclick="requireAuth(() => copyManifest(\\\`\${jsonStr.replace(/\`/g, '\\\\\`')}\\\`))">
                  ${icons.clipboard('icon')} Copy
                </button>
              </div>
              <pre style="margin: 0; max-height: 400px; overflow-y: auto;">\${jsonStr}</pre>
            </div>
          \`;
          window.showToast('Manifest loaded successfully', 'success');
        }
      });

      function copyManifest(text) {
        window.copyToClipboard(text, event.target);
      }
    </script>
  `;
  return layout(extension.name, content);
}

export function extensionCreateView(
  availableConfigs: Config[],
  currentFilters?: { type?: string; format?: string; search?: string }
): string {
  const activeFilters = currentFilters || {};
  const hasActiveFilters = !!(activeFilters.type || activeFilters.format || activeFilters.search);

  const content = `
    <h2>Create Extension</h2>
    <form id="create-extension-form">
      <div class="form-group">
        <label for="name">Name *</label>
        <input type="text" id="name" name="name" required>
      </div>

      <div class="form-group">
        <label for="version">Version *</label>
        <input type="text" id="version" name="version" value="1.0.0" required>
      </div>

      <div class="form-group">
        <label for="author">Author</label>
        <input type="text" id="author" name="author">
      </div>

      <div class="form-group">
        <label for="description">Description</label>
        <textarea id="description" name="description" style="min-height: 100px;"></textarea>
      </div>

      <div class="form-group">
        <label for="icon_url">Icon URL</label>
        <input type="url" id="icon_url" name="icon_url" placeholder="https://example.com/icon.png">
      </div>

      <div class="form-group">
        <label>Select Configs</label>

        <!-- Filter Controls -->
        <div class="filter-container" style="margin-bottom: 15px;">
          <div class="filter-row">
            <div class="filter-group" style="flex: 1; min-width: 150px;">
              <label for="filter-type">Type:</label>
              <select
                id="filter-type"
                name="type"
                onchange="applyConfigFilters()">
                <option value="">All</option>
                <option value="slash_command" ${activeFilters.type === 'slash_command' ? 'selected' : ''}>Slash Command</option>
                <option value="agent_definition" ${activeFilters.type === 'agent_definition' ? 'selected' : ''}>Agent Definition</option>
                <option value="mcp_config" ${activeFilters.type === 'mcp_config' ? 'selected' : ''}>MCP Config</option>
              </select>
            </div>

            <div class="filter-group" style="flex: 1; min-width: 150px;">
              <label for="filter-format">Format:</label>
              <select
                id="filter-format"
                name="format"
                onchange="applyConfigFilters()">
                <option value="">All</option>
                <option value="claude_code" ${activeFilters.format === 'claude_code' ? 'selected' : ''}>Claude Code</option>
                <option value="codex" ${activeFilters.format === 'codex' ? 'selected' : ''}>Codex</option>
                <option value="gemini" ${activeFilters.format === 'gemini' ? 'selected' : ''}>Gemini</option>
              </select>
            </div>

            <div class="filter-group" style="flex: 2; min-width: 200px;">
              <label for="filter-search">Search:</label>
              <input
                type="text"
                id="filter-search"
                name="search"
                placeholder="Search by name..."
                value="${activeFilters.search || ''}"
                onkeyup="applyConfigFiltersDebounced()">
            </div>

            ${hasActiveFilters ? `
              <div class="filter-group" style="flex: 0; min-width: auto;">
                <label style="opacity: 0; user-select: none;">.</label>
                <button
                  type="button"
                  class="btn btn-secondary"
                  onclick="clearConfigFilters()">
                  Clear
                </button>
              </div>
            ` : ''}
          </div>
        </div>

        ${availableConfigs.length === 0 ?
          `<p style="color: var(--text-secondary);">${hasActiveFilters ? 'No configs match your filters.' : 'No configs available.'} <a href="/configs/new">Create a config first</a>.</p>`
          : `
          <div style="max-height: 300px; overflow-y: auto; border: 1px solid var(--border-color); border-radius: 6px; padding: 10px; background: var(--bg-secondary);">
            ${availableConfigs.map(c => `
              <label style="display: block; padding: 8px; cursor: pointer; border-radius: 4px; transition: background 0.2s;">
                <input type="checkbox" name="config_ids" value="${c.id}" style="width: auto; margin-right: 8px;">
                <span style="font-weight: 500;">${escapeHtml(c.name)}</span>
                <span class="badge">${c.type}</span>
                <span class="badge">${c.original_format}</span>
              </label>
            `).join('')}
          </div>
        `}
      </div>

      <button type="submit" class="btn">Create Extension</button>
      <a href="/extensions" class="btn btn-secondary">Cancel</a>
    </form>

    <script>
      let debounceTimer;

      function applyConfigFilters() {
        const type = document.getElementById('filter-type').value;
        const format = document.getElementById('filter-format').value;
        const search = document.getElementById('filter-search').value;

        const params = new URLSearchParams();
        if (type) params.set('type', type);
        if (format) params.set('format', format);
        if (search) params.set('search', search);

        const newUrl = params.toString() ? '/extensions/new?' + params.toString() : '/extensions/new';
        window.location.href = newUrl;
      }

      function applyConfigFiltersDebounced() {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(applyConfigFilters, 500);
      }

      function clearConfigFilters() {
        window.location.href = '/extensions/new';
      }

      // Handle form submission
      document.getElementById('create-extension-form').addEventListener('submit', async function(e) {
        e.preventDefault();

        const formData = new FormData(this);
        const configIds = [];

        // Collect all checked checkboxes
        document.querySelectorAll('input[name="config_ids"]:checked').forEach(cb => {
          configIds.push(cb.value);
        });

        const body = {
          name: formData.get('name'),
          version: formData.get('version'),
          author: formData.get('author') || undefined,
          description: formData.get('description') || undefined,
          icon_url: formData.get('icon_url') || undefined,
          config_ids: configIds.length > 0 ? configIds : undefined
        };

        try {
          const response = await fetch('/api/extensions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
          });

          if (response.ok) {
            const data = await response.json();
            window.location.href = '/extensions/' + data.extension.id;
          } else {
            const error = await response.json();
            alert('Error: ' + (error.error || 'Failed to create extension'));
          }
        } catch (error) {
          alert('Failed to create extension. Please try again.');
          console.error('Extension creation error:', error);
        }
      });

      // Highlight selected checkboxes
      document.querySelectorAll('input[name="config_ids"]').forEach(cb => {
        cb.addEventListener('change', function() {
          this.parentElement.style.background = this.checked ? 'var(--bg-tertiary)' : '';
        });
      });
    </script>
  `;
  return layout('Create Extension', content);
}

export function extensionEditView(
  extension: ExtensionWithConfigs,
  availableConfigs: Config[],
  currentFilters?: { type?: string; format?: string; search?: string }
): string {
  const selectedConfigIds = new Set(extension.configs.map(c => c.id));
  const activeFilters = currentFilters || {};
  const hasActiveFilters = !!(activeFilters.type || activeFilters.format || activeFilters.search);

  const content = `
    <h2>Edit Extension</h2>
    <form hx-put="/api/extensions/${extension.id}" hx-target="body" hx-swap="outerHTML">
      <div class="form-group">
        <label for="name">Name *</label>
        <input type="text" id="name" name="name" value="${escapeHtml(extension.name)}" required>
      </div>

      <div class="form-group">
        <label for="version">Version *</label>
        <input type="text" id="version" name="version" value="${escapeHtml(extension.version)}" required>
      </div>

      <div class="form-group">
        <label for="author">Author</label>
        <input type="text" id="author" name="author" value="${extension.author ? escapeHtml(extension.author) : ''}">
      </div>

      <div class="form-group">
        <label for="description">Description</label>
        <textarea id="description" name="description" style="min-height: 100px;">${extension.description ? escapeHtml(extension.description) : ''}</textarea>
      </div>

      <div class="form-group">
        <label for="icon_url">Icon URL</label>
        <input type="url" id="icon_url" name="icon_url" value="${extension.icon_url ? escapeHtml(extension.icon_url) : ''}" placeholder="https://example.com/icon.png">
      </div>

      <button type="submit" class="btn">Update Extension</button>
      <a href="/extensions/${extension.id}" class="btn btn-secondary">Cancel</a>
    </form>

    <h3 style="margin-top: 30px;">Manage Configs</h3>
    <p style="color: var(--text-secondary); margin-bottom: 15px;">
      Add or remove configs from this extension. Changes are applied immediately.
    </p>

    <!-- Filter Controls -->
    <div class="filter-container" style="margin-bottom: 15px;">
      <div class="filter-row">
        <div class="filter-group" style="flex: 1; min-width: 150px;">
          <label for="filter-type">Type:</label>
          <select
            id="filter-type"
            name="type"
            onchange="applyConfigFilters()">
            <option value="">All</option>
            <option value="slash_command" ${activeFilters.type === 'slash_command' ? 'selected' : ''}>Slash Command</option>
            <option value="agent_definition" ${activeFilters.type === 'agent_definition' ? 'selected' : ''}>Agent Definition</option>
            <option value="mcp_config" ${activeFilters.type === 'mcp_config' ? 'selected' : ''}>MCP Config</option>
          </select>
        </div>

        <div class="filter-group" style="flex: 1; min-width: 150px;">
          <label for="filter-format">Format:</label>
          <select
            id="filter-format"
            name="format"
            onchange="applyConfigFilters()">
            <option value="">All</option>
            <option value="claude_code" ${activeFilters.format === 'claude_code' ? 'selected' : ''}>Claude Code</option>
            <option value="codex" ${activeFilters.format === 'codex' ? 'selected' : ''}>Codex</option>
            <option value="gemini" ${activeFilters.format === 'gemini' ? 'selected' : ''}>Gemini</option>
          </select>
        </div>

        <div class="filter-group" style="flex: 2; min-width: 200px;">
          <label for="filter-search">Search:</label>
          <input
            type="text"
            id="filter-search"
            name="search"
            placeholder="Search by name..."
            value="${activeFilters.search || ''}"
            onkeyup="applyConfigFiltersDebounced()">
        </div>

        ${hasActiveFilters ? `
          <div class="filter-group" style="flex: 0; min-width: auto;">
            <label style="opacity: 0; user-select: none;">.</label>
            <button
              type="button"
              class="btn btn-secondary"
              onclick="clearConfigFilters()">
              Clear
            </button>
          </div>
        ` : ''}
      </div>
    </div>

    ${availableConfigs.length === 0 ?
      `<p style="color: var(--text-secondary);">${hasActiveFilters ? 'No configs match your filters.' : 'No configs available.'}</p>`
      : `
      <div style="max-height: 400px; overflow-y: auto; border: 1px solid var(--border-color); border-radius: 6px; padding: 10px; background: var(--bg-secondary);">
        ${availableConfigs.map(c => {
          const isSelected = selectedConfigIds.has(c.id);
          return `
            <div style="display: flex; align-items: center; padding: 8px; border-radius: 4px; margin-bottom: 5px; background: ${isSelected ? 'var(--bg-tertiary)' : 'transparent'};">
              <label style="flex: 1; cursor: pointer; display: flex; align-items: center;">
                <input
                  type="checkbox"
                  data-config-id="${c.id}"
                  ${isSelected ? 'checked' : ''}
                  style="width: auto; margin-right: 8px;"
                  hx-post="/api/extensions/${extension.id}/configs/${c.id}"
                  hx-trigger="change"
                  hx-swap="none">
                <span style="font-weight: 500;">${escapeHtml(c.name)}</span>
                <span class="badge">${c.type}</span>
                <span class="badge">${c.original_format}</span>
              </label>
            </div>
          `;
        }).join('')}
      </div>
    `}

    <script>
      let debounceTimer;

      function applyConfigFilters() {
        const type = document.getElementById('filter-type').value;
        const format = document.getElementById('filter-format').value;
        const search = document.getElementById('filter-search').value;

        const params = new URLSearchParams();
        if (type) params.set('type', type);
        if (format) params.set('format', format);
        if (search) params.set('search', search);

        const newUrl = params.toString() ? '/extensions/${extension.id}/edit?' + params.toString() : '/extensions/${extension.id}/edit';
        window.location.href = newUrl;
      }

      function applyConfigFiltersDebounced() {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(applyConfigFilters, 500);
      }

      function clearConfigFilters() {
        window.location.href = '/extensions/${extension.id}/edit';
      }

      // Handle metadata form submission
      document.body.addEventListener('htmx:afterSwap', function(evt) {
        const response = evt.detail.xhr.responseText;
        try {
          const data = JSON.parse(response);
          if (data.extension) {
            window.location.href = '/extensions/' + data.extension.id;
          }
        } catch(e) {
          // Response is HTML, let it render
        }
      });

      // Handle config checkbox changes
      document.querySelectorAll('input[type="checkbox"][data-config-id]').forEach(cb => {
        cb.addEventListener('change', async function(e) {
          const configId = this.getAttribute('data-config-id');
          const isChecked = this.checked;
          const method = isChecked ? 'POST' : 'DELETE';

          try {
            const response = await fetch('/api/extensions/${extension.id}/configs/' + configId, {
              method: method,
              headers: { 'Content-Type': 'application/json' }
            });

            if (response.ok) {
              // Update visual feedback
              this.parentElement.parentElement.style.background = isChecked ? 'var(--bg-tertiary)' : 'transparent';
            } else {
              // Revert checkbox on error
              this.checked = !isChecked;
              alert('Failed to update config association');
            }
          } catch (error) {
            this.checked = !isChecked;
            alert('Error updating config association');
          }
        });
      });
    </script>
  `;
  return layout('Edit Extension', content);
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
