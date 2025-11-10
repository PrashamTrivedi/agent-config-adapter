import { Config } from '../domain/types';
import { layout } from './layout';

function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function renderConfigCard(config: Config): string {
  return `
    <article class="card fade-in" tabindex="0">
      <header class="toolbar" style="gap: 12px; align-items: flex-start;">
        <div>
          <a href="/configs/${config.id}" class="stretched-link" style="color: inherit; text-decoration: none;">
            <h3>${escapeHtml(config.name)}</h3>
          </a>
          <p>${escapeHtml(`Keep ${config.type.replace(/_/g, ' ')} definitions in sync across providers.`)}</p>
        </div>
        <div class="chip-group" style="justify-content: flex-end;">
          <span class="badge status-info" aria-label="Config type">${config.type}</span>
          <span class="badge" aria-label="Original format">${config.original_format}</span>
        </div>
      </header>
      <div class="card-meta" aria-label="Metadata">
        <span class="chip">Created ${formatDate(config.created_at)}</span>
        <span class="chip">Updated ${formatDate(config.updated_at ?? config.created_at)}</span>
      </div>
      <footer class="action-bar" style="justify-content: flex-start; margin-top: 18px;">
        <a href="/configs/${config.id}" class="btn btn-primary btn-sm" aria-label="View ${escapeHtml(config.name)} configuration">Open</a>
        <a href="/configs/${config.id}/edit" class="btn btn-secondary btn-sm" aria-label="Edit ${escapeHtml(config.name)} configuration">Edit</a>
        <button
          class="btn btn-ghost btn-sm"
          data-copy="${escapeHtml(`/configs/${config.id}`)}"
          type="button"
          title="Copy config link">
          Copy Link
        </button>
      </footer>
    </article>
  `;
}

// Helper function to render just the config list container (for HTMX partial updates)
export function configListContainerPartial(
  configs: Config[],
  hasActiveFilters: boolean
): string {
  if (configs.length === 0) {
    return `
      <section class="empty-state dynamic-content" role="status">
        <h3>${hasActiveFilters ? 'No matches found' : 'No configurations yet'}</h3>
        <p>${hasActiveFilters ? 'Try adjusting your filters or search query.' : 'Create your first config to start building adapters.'}</p>
        ${hasActiveFilters ? '<button class="btn btn-secondary" type="button" onclick="window.location.href=\'/configs\'">Clear Filters</button>' : ''}
      </section>
    `;
  }

  return `
    <div class="card-grid dynamic-content" role="list">
      ${configs.map(config => `
        <div role="listitem">
          ${renderConfigCard(config)}
        </div>
      `).join('')}
    </div>
  `;
}

export function configListView(
  configs: Config[],
  currentFilters?: { type?: string; format?: string; search?: string }
): string {
  const activeFilters = currentFilters || {};
  const hasActiveFilters = Boolean(activeFilters.type || activeFilters.format || activeFilters.search);

  const content = `
    <section class="page-header">
      <div>
        <p class="eyebrow">Configuration Hub</p>
        <h2>All Configurations</h2>
        <p class="lead">Manage and convert agent-ready configurations across Claude Code, Codex, and Gemini formats.</p>
      </div>
      <div class="action-bar">
        <a href="/configs/new" class="btn btn-primary">➕ New Config</a>
        <a href="/skills/new" class="btn btn-secondary">Create Skill</a>
      </div>
    </section>

    <section class="panel" aria-labelledby="filter-heading">
      <div class="panel-header">
        <h3 id="filter-heading" class="panel-title">Refine results</h3>
        ${hasActiveFilters ? '<button class="btn btn-tertiary btn-sm" type="button" id="clear-filters">Reset</button>' : ''}
      </div>
      <div class="form-row">
        <div class="form-group">
          <label for="filter-type">Type</label>
          <select
            id="filter-type"
            name="type"
            aria-label="Filter by config type"
            hx-get="/api/configs"
            hx-trigger="change"
            hx-target="#config-list"
            hx-include="[name='format'], [name='search']"
            hx-indicator="#config-list-loading">
            <option value="">All types</option>
            <option value="slash_command" ${activeFilters.type === 'slash_command' ? 'selected' : ''}>Slash Command</option>
            <option value="agent_definition" ${activeFilters.type === 'agent_definition' ? 'selected' : ''}>Agent Definition</option>
            <option value="mcp_config" ${activeFilters.type === 'mcp_config' ? 'selected' : ''}>MCP Config</option>
            <option value="skill" ${activeFilters.type === 'skill' ? 'selected' : ''}>Skill</option>
          </select>
        </div>
        <div class="form-group">
          <label for="filter-format">Format</label>
          <select
            id="filter-format"
            name="format"
            aria-label="Filter by original format"
            hx-get="/api/configs"
            hx-trigger="change"
            hx-target="#config-list"
            hx-include="[name='type'], [name='search']"
            hx-indicator="#config-list-loading">
            <option value="">Any format</option>
            <option value="claude_code" ${activeFilters.format === 'claude_code' ? 'selected' : ''}>Claude Code</option>
            <option value="codex" ${activeFilters.format === 'codex' ? 'selected' : ''}>Codex</option>
            <option value="gemini" ${activeFilters.format === 'gemini' ? 'selected' : ''}>Gemini</option>
          </select>
        </div>
        <div class="form-group">
          <label for="filter-search">Search</label>
          <input
            type="search"
            id="filter-search"
            name="search"
            placeholder="Search by name or description"
            value="${escapeHtml(activeFilters.search || '')}"
            hx-get="/api/configs"
            hx-trigger="keyup changed delay:400ms"
            hx-target="#config-list"
            hx-include="[name='type'], [name='format']"
            hx-indicator="#config-list-loading"
            aria-label="Search configurations" />
          <span class="form-helper">Supports partial matches.</span>
        </div>
      </div>
      ${hasActiveFilters ? `
        <div class="divider"></div>
        <div class="toolbar" role="status" aria-live="polite">
          <span style="color: var(--text-muted);">Active filters:</span>
          <div class="filters">
            ${activeFilters.type ? `<span class="filter-chip">Type: ${activeFilters.type}</span>` : ''}
            ${activeFilters.format ? `<span class="filter-chip">Format: ${activeFilters.format}</span>` : ''}
            ${activeFilters.search ? `<span class="filter-chip">Search: “${escapeHtml(activeFilters.search)}”</span>` : ''}
          </div>
        </div>
      ` : ''}
    </section>

    <section id="config-list-container" data-loading-target>
      <div id="config-list-loading" class="skeleton" style="height: 180px; border-radius: var(--radius-lg);"></div>
      <div id="config-list">
        ${configListContainerPartial(configs, hasActiveFilters)}
      </div>
    </section>

    <script>
      (function registerConfigListInteractions() {
        if (window.__configListBound) return;
        window.__configListBound = true;
        const clearFilters = document.getElementById('clear-filters');
        if (clearFilters) {
          clearFilters.addEventListener('click', () => {
            window.location.href = '/configs';
          });
        }

        document.body.addEventListener('htmx:afterSwap', function(evt) {
          if (evt.detail.target && evt.detail.target.id === 'config-list') {
            const typeEl = document.getElementById('filter-type');
            const formatEl = document.getElementById('filter-format');
            const searchEl = document.getElementById('filter-search');
            const type = typeEl instanceof HTMLSelectElement ? typeEl.value : '';
            const format = formatEl instanceof HTMLSelectElement ? formatEl.value : '';
            const search = searchEl instanceof HTMLInputElement ? searchEl.value : '';
            const params = new URLSearchParams();
            if (type) params.set('type', type);
            if (format) params.set('format', format);
            if (search) params.set('search', search);
            const newUrl = params.toString() ? '/configs?' + params.toString() : '/configs';
            window.history.replaceState({}, '', newUrl);
          }
        });
      })();
    </script>
  `;
  return layout('Configurations', content);
}

export function configDetailView(config: Config): string {
  const isSlashCommand = config.type === 'slash_command';

  const content = `
    <section class="page-header">
      <div>
        <p class="eyebrow">Configuration</p>
        <h2>${escapeHtml(config.name)}</h2>
        <p class="lead">Centralized view of configuration metadata, conversions, and analysis state.</p>
        <div class="chip-group" style="margin-top: 16px;">
          <span class="badge status-info">${config.type}</span>
          <span class="badge">${config.original_format}</span>
          <span class="badge">Created ${formatDate(config.created_at)}</span>
        </div>
      </div>
      <div class="action-bar">
        <a href="/configs/${config.id}/edit" class="btn btn-secondary">Edit</a>
        <a href="/configs" class="btn btn-tertiary">Back to list</a>
      </div>
    </section>

    ${isSlashCommand ? `
      <section class="panel" aria-labelledby="analysis-heading" data-loading-target>
        <div class="panel-header">
          <h3 id="analysis-heading" class="panel-title">Slash command analysis</h3>
          <button
            class="btn btn-secondary btn-sm"
            hx-post="/api/configs/${config.id}/refresh-analysis"
            hx-target="#analysis-status"
            hx-swap="innerHTML"
            data-busy
            data-busy-label="Refreshing"
            hx-on::before-request="window.UI && window.UI.setBusyButton(this, true)"
            hx-on::after-request="window.UI && window.UI.setBusyButton(this, false)">
            🔄 Refresh analysis
          </button>
        </div>
        <div class="dynamic-content">
          <ul style="list-style: none; padding: 0; margin: 0; display: grid; gap: 12px;">
            <li><strong>Requires arguments:</strong> ${config.has_arguments ? 'Yes' : 'No'}</li>
            ${config.argument_hint ? `<li><strong>Argument hint:</strong> ${escapeHtml(config.argument_hint)}</li>` : ''}
            ${config.agent_references ? `<li><strong>Agent references:</strong> ${JSON.parse(config.agent_references).map((a: string) => escapeHtml(a)).join(', ')}</li>` : '<li><strong>Agent references:</strong> None</li>'}
            ${config.skill_references ? `<li><strong>Skill references:</strong> ${JSON.parse(config.skill_references).map((s: string) => escapeHtml(s)).join(', ')}</li>` : '<li><strong>Skill references:</strong> None</li>'}
            ${config.analysis_version ? `<li><strong>Analysis version:</strong> ${config.analysis_version}</li>` : ''}
          </ul>
        </div>
        <div id="analysis-status" class="form-helper" style="margin-top: 16px;"></div>
      </section>
    ` : ''}

    <section class="panel" aria-labelledby="content-heading">
        <div class="panel-header">
          <h3 id="content-heading" class="panel-title">Original content</h3>
          <button
            class="btn btn-ghost btn-sm"
            type="button"
            data-copy-target="#original-config-content"
            title="Copy original content">
            Copy content
          </button>
        </div>
        <pre id="original-config-content">${escapeHtml(config.content)}</pre>
    </section>

    <section class="panel" aria-labelledby="convert-heading" data-loading-target>
      <div class="panel-header">
        <h3 id="convert-heading" class="panel-title">Convert to different formats</h3>
        <div class="action-bar" style="gap: 10px;">
          <button
            class="btn btn-secondary btn-sm"
            hx-get="/api/configs/${config.id}/format/claude_code"
            hx-target="#converted"
            data-busy
            data-busy-label="Converting"
            hx-on::before-request="window.UI && window.UI.setBusyButton(this, true)"
            hx-on::after-request="window.UI && window.UI.setBusyButton(this, false)">
            Claude Code
          </button>
          <button
            class="btn btn-secondary btn-sm"
            hx-get="/api/configs/${config.id}/format/codex"
            hx-target="#converted"
            data-busy
            data-busy-label="Converting"
            hx-on::before-request="window.UI && window.UI.setBusyButton(this, true)"
            hx-on::after-request="window.UI && window.UI.setBusyButton(this, false)">
            Codex
          </button>
          <button
            class="btn btn-secondary btn-sm"
            hx-get="/api/configs/${config.id}/format/gemini"
            hx-target="#converted"
            data-busy
            data-busy-label="Converting"
            hx-on::before-request="window.UI && window.UI.setBusyButton(this, true)"
            hx-on::after-request="window.UI && window.UI.setBusyButton(this, false)">
            Gemini
          </button>
        </div>
      </div>
      <div id="converted" class="dynamic-content" aria-live="polite"></div>
    </section>

    <section class="panel" aria-labelledby="actions-heading">
      <div class="panel-header">
        <h3 id="actions-heading" class="panel-title">Actions</h3>
      </div>
      <div class="action-bar">
        <button
          class="btn"
          hx-post="/api/configs/${config.id}/invalidate"
          hx-target="#cache-status"
          hx-swap="innerHTML"
          data-busy
          data-busy-label="Refreshing"
          hx-on::before-request="window.UI && window.UI.setBusyButton(this, true)"
          hx-on::after-request="window.UI && window.UI.setBusyButton(this, false)">
          Refresh conversions
        </button>
        <span class="form-helper">Clears cached conversions and forces regeneration.</span>
      </div>
      <div id="cache-status" class="form-helper" style="margin-top: 12px;"></div>
      <div class="divider"></div>
      <div class="action-bar">
        <button
          class="btn btn-danger"
          hx-delete="/api/configs/${config.id}"
          hx-confirm="Are you sure you want to delete this config?"
          hx-target="body"
          hx-swap="outerHTML"
          data-busy
          data-busy-label="Deleting"
          hx-on::before-request="window.UI && window.UI.setBusyButton(this, true)"
          hx-on::after-request="window.UI && window.UI.setBusyButton(this, false)">
          Delete config
        </button>
      </div>
    </section>

    <script>
      document.body.addEventListener('htmx:afterSwap', function(evt) {
        if (evt.detail.target && evt.detail.target.id === 'converted') {
          const target = evt.detail.target;
          target.innerHTML = '';
          try {
            const data = JSON.parse(evt.detail.xhr.responseText);
            const content = typeof data.content === 'string' ? data.content : '';
            const article = document.createElement('article');
            article.className = 'fade-in';
            article.style.display = 'grid';
            article.style.gap = '16px';

            const toolbar = document.createElement('div');
            toolbar.className = 'toolbar';

            const heading = document.createElement('h4');
            heading.textContent = 'Converted content';
            heading.style.margin = '0';
            toolbar.appendChild(heading);

            const copyButton = document.createElement('button');
            copyButton.className = 'btn btn-ghost btn-sm';
            copyButton.type = 'button';
            copyButton.textContent = 'Copy';
            copyButton.addEventListener('click', () => {
              window.UI?.copyWithFeedback(content, copyButton, 'Converted content copied');
            });
            toolbar.appendChild(copyButton);

            const pre = document.createElement('pre');
            pre.textContent = content;

            article.appendChild(toolbar);
            article.appendChild(pre);

            if (data.fallbackUsed) {
              const warning = document.createElement('p');
              warning.className = 'form-helper';
              warning.style.color = '#fcd34d';
              warning.textContent = '⚠️ Fallback conversion used';
              article.appendChild(warning);
            } else if (data.usedAI) {
              const success = document.createElement('p');
              success.className = 'form-helper';
              success.style.color = '#6ee7b7';
              success.textContent = '✓ AI powered conversion';
              article.appendChild(success);
            }

            if (data.cached) {
              const cached = document.createElement('p');
              cached.className = 'form-helper';
              cached.textContent = 'Loaded from cache';
              article.appendChild(cached);
            }

            target.appendChild(article);
          } catch (error) {
            target.innerHTML = '<p class="form-helper status-error">Unable to parse conversion response.</p>';
          }
        }

        if (evt.detail.target && evt.detail.target.id === 'analysis-status' && evt.detail.xhr.status === 200) {
          window.UI?.showToast('Analysis refreshed successfully', 'success');
          setTimeout(() => window.location.reload(), 1200);
        }

        if (evt.detail.target && evt.detail.target.id === 'cache-status') {
          window.UI?.showToast('Conversion cache refreshed', 'info');
        }
      });
    </script>
  `;
  return layout(config.name, content);
}

export function configCreateView(): string {
  const content = `
    <section class="page-header">
      <div>
        <p class="eyebrow">New configuration</p>
        <h2>Add configuration</h2>
        <p class="lead">Define agent capabilities and conversion preferences. All fields support HTMX powered validation.</p>
      </div>
      <div class="action-bar">
        <a href="/configs" class="btn btn-tertiary">Cancel</a>
      </div>
    </section>

    <section class="panel">
      <form id="config-create-form" hx-post="/api/configs" hx-target="body" hx-swap="outerHTML">
        <div class="form-row">
          <div class="form-group">
            <label for="name">Name *</label>
            <input type="text" id="name" name="name" required placeholder="Give it a memorable name" />
          </div>
          <div class="form-group">
            <label for="type">Type *</label>
            <select id="type" name="type" required>
              <option value="slash_command">Slash Command</option>
              <option value="agent_definition">Agent Definition</option>
              <option value="mcp_config">MCP Config</option>
              <option value="skill">Skill</option>
            </select>
            <span class="form-helper">Select “Skill” to jump into the multi-file editor.</span>
          </div>
          <div class="form-group">
            <label for="original_format">Original format *</label>
            <select id="original_format" name="original_format" required>
              <option value="claude_code">Claude Code</option>
              <option value="codex">Codex</option>
              <option value="gemini">Gemini</option>
            </select>
          </div>
        </div>
        <div class="form-group">
          <label for="content">Content *</label>
          <textarea id="content" name="content" required placeholder="Paste the configuration body here..."></textarea>
          <span class="form-helper">Supports markdown, TOML, and JSON payloads.</span>
        </div>
        <div class="action-bar">
          <button type="submit" class="btn btn-primary" data-busy data-busy-label="Saving">Create config</button>
          <a href="/configs" class="btn btn-secondary">Back</a>
        </div>
      </form>
    </section>

    <script>
      (function initConfigCreateForm() {
        const form = document.getElementById('config-create-form');
        if (!form) return;
        form.addEventListener('submit', (event) => {
          if (!window.UI?.validateForm(form)) {
            event.preventDefault();
            return;
          }
          const submit = form.querySelector('[data-busy]');
          if (submit) {
            window.UI?.setBusyButton(submit, true);
          }
        });

        document.body.addEventListener('htmx:afterSwap', (evt) => {
          if (evt.detail.target && evt.detail.target.tagName === 'BODY') {
            try {
              const response = JSON.parse(evt.detail.xhr.responseText);
              if (response?.config?.id) {
                window.location.href = '/configs/' + response.config.id;
              }
            } catch (error) {
              // Allow HTML response to render normally
            }
          }
        });

        const typeField = document.getElementById('type');
        typeField?.addEventListener('change', (event) => {
          const target = event.target;
          if (target instanceof HTMLSelectElement && target.value === 'skill') {
            window.UI?.showToast('Redirecting to Skill editor…', 'info');
            window.location.href = '/skills/new';
          }
        });
      })();
    </script>
  `;
  return layout('Add Config', content);
}

export function configEditView(config: Config): string {
  const content = `
    <section class="page-header">
      <div>
        <p class="eyebrow">Update</p>
        <h2>Edit configuration</h2>
        <p class="lead">Apply adjustments and instantly revalidate conversions across supported platforms.</p>
      </div>
      <div class="action-bar">
        <a href="/configs/${config.id}" class="btn btn-tertiary">Back to detail</a>
      </div>
    </section>

    <section class="panel">
      <form id="config-edit-form" hx-put="/api/configs/${config.id}" hx-target="body" hx-swap="outerHTML">
        <div class="form-row">
          <div class="form-group">
            <label for="name">Name *</label>
            <input type="text" id="name" name="name" value="${escapeHtml(config.name)}" required />
          </div>
          <div class="form-group">
            <label for="type">Type *</label>
            <select id="type" name="type" required>
              <option value="slash_command" ${config.type === 'slash_command' ? 'selected' : ''}>Slash Command</option>
              <option value="agent_definition" ${config.type === 'agent_definition' ? 'selected' : ''}>Agent Definition</option>
              <option value="mcp_config" ${config.type === 'mcp_config' ? 'selected' : ''}>MCP Config</option>
              <option value="skill" ${config.type === 'skill' ? 'selected' : ''}>Skill</option>
            </select>
          </div>
          <div class="form-group">
            <label for="original_format">Original format *</label>
            <select id="original_format" name="original_format" required>
              <option value="claude_code" ${config.original_format === 'claude_code' ? 'selected' : ''}>Claude Code</option>
              <option value="codex" ${config.original_format === 'codex' ? 'selected' : ''}>Codex</option>
              <option value="gemini" ${config.original_format === 'gemini' ? 'selected' : ''}>Gemini</option>
            </select>
          </div>
        </div>
        <div class="form-group">
          <label for="content">Content *</label>
          <textarea id="content" name="content" required>${escapeHtml(config.content)}</textarea>
        </div>
        <div class="action-bar">
          <button type="submit" class="btn btn-primary" data-busy data-busy-label="Saving">Save changes</button>
          <a href="/configs/${config.id}" class="btn btn-secondary">Cancel</a>
        </div>
      </form>
    </section>

    <script>
      (function initConfigEditForm() {
        const form = document.getElementById('config-edit-form');
        if (!form) return;
        form.addEventListener('submit', (event) => {
          if (!window.UI?.validateForm(form)) {
            event.preventDefault();
            return;
          }
          const submit = form.querySelector('[data-busy]');
          if (submit) {
            window.UI?.setBusyButton(submit, true);
          }
        });

        document.body.addEventListener('htmx:afterSwap', (evt) => {
          if (evt.detail.target && evt.detail.target.tagName === 'BODY') {
            window.UI?.showToast('Configuration updated', 'success');
            window.location.href = '/configs/${config.id}';
          }
        });
      })();
    </script>
  `;
  return layout('Edit Config', content);
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
