import { ExtensionWithConfigs, Config } from '../domain/types';
import { layout } from './layout';

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function pluralize(count: number, singular: string, plural: string): string {
  return count === 1 ? singular : plural;
}

function renderExtensionCard(extension: ExtensionWithConfigs): string {
  const configCount = extension.configs.length;
  const description = extension.description
    ? escapeHtml(extension.description)
    : 'Bundle configs into shareable plugins across Claude Code and Gemini.';

  return `
    <article class="card fade-in" tabindex="0">
      <header class="toolbar" style="align-items: flex-start;">
        <div>
          <a href="/extensions/${extension.id}" class="stretched-link" style="color: inherit; text-decoration: none;">
            <h3>${escapeHtml(extension.name)}</h3>
          </a>
          <p>${description}</p>
        </div>
        <div class="chip-group" style="justify-content: flex-end;">
          <span class="badge status-info">v${escapeHtml(extension.version)}</span>
          <span class="badge">${configCount} ${pluralize(configCount, 'config', 'configs')}</span>
        </div>
      </header>
      <div class="card-meta">
        ${extension.author ? `<span class="chip">Author ${escapeHtml(extension.author)}</span>` : ''}
        <span class="chip">Created ${formatDate(extension.created_at)}</span>
        <span class="chip">Updated ${formatDate(extension.updated_at ?? extension.created_at)}</span>
      </div>
      <footer class="action-bar" style="margin-top: 18px;">
        <a href="/extensions/${extension.id}" class="btn btn-primary btn-sm">Open</a>
        <a href="/extensions/${extension.id}/edit" class="btn btn-secondary btn-sm">Edit</a>
        <button class="btn btn-ghost btn-sm" type="button" data-copy="${escapeHtml(
          `${extension.id}`
        )}" title="Copy extension ID">Copy ID</button>
      </footer>
    </article>
  `;
}

function renderConfigSelection(
  configs: Config[],
  selectedIds: Set<string>,
  emptyMessage: string
): string {
  if (configs.length === 0) {
    return `
      <div class="empty-state" role="status">
        <h3>No configs available</h3>
        <p>${emptyMessage}</p>
        <a href="/configs/new" class="btn btn-secondary">Create config</a>
      </div>
    `;
  }

  return `
    <div id="config-selection" style="display: grid; gap: 12px; max-height: 340px; overflow-y: auto; padding-right: 4px;">
      ${configs
        .map((config) => {
          const isSelected = selectedIds.has(config.id);
          const background = isSelected ? 'rgba(96, 165, 250, 0.12)' : 'rgba(15, 23, 42, 0.45)';
          const border = isSelected ? 'rgba(96, 165, 250, 0.45)' : 'rgba(148, 163, 184, 0.18)';
          return `
            <label
              class="config-option"
              data-config-option
              data-config-id="${config.id}"
              style="display: flex; gap: 14px; align-items: flex-start; padding: 16px 18px; border-radius: var(--radius-md); border: 1px solid ${border}; background: ${background}; transition: border var(--transition-fast), background var(--transition-fast); cursor: pointer;">
              <input
                type="checkbox"
                name="config_ids"
                value="${config.id}"
                ${isSelected ? 'checked' : ''}
                style="margin-top: 4px; flex-shrink: 0;" />
              <div style="flex: 1; display: grid; gap: 8px;">
                <div class="toolbar" style="align-items: flex-start; gap: 10px;">
                  <div>
                    <strong>${escapeHtml(config.name)}</strong>
                    <p style="margin: 6px 0 0; color: var(--text-muted); font-size: 0.9rem;">
                      ${escapeHtml(config.description ?? 'Ready for cross-agent conversion.')}
                    </p>
                  </div>
                  <div class="chip-group" style="justify-content: flex-end;">
                    <span class="badge">${config.type}</span>
                    <span class="badge status-info">${config.original_format}</span>
                  </div>
                </div>
              </div>
            </label>
          `;
        })
        .join('')}
    </div>
  `;
}

export function extensionListView(extensions: ExtensionWithConfigs[]): string {
  const content = `
    <section class="page-header">
      <div>
        <p class="eyebrow">Extension catalog</p>
        <h2>Extensions</h2>
        <p class="lead">Package curated configs into distributable plugins ready for Claude Code and Gemini ecosystems.</p>
      </div>
      <div class="action-bar">
        <a href="/extensions/new" class="btn btn-primary">Create extension</a>
        <a href="/configs" class="btn btn-tertiary">Browse configs</a>
      </div>
    </section>

    ${
      extensions.length === 0
        ? `
          <section class="empty-state">
            <h3>No extensions yet</h3>
            <p>Bundle related configs to unlock reusable plugin experiences for your teams.</p>
            <a href="/extensions/new" class="btn btn-primary">Start building</a>
          </section>
        `
        : `
          <section class="panel">
            <div class="panel-header">
              <h3 class="panel-title">Published extensions</h3>
              <span class="form-helper">${extensions.length} total</span>
            </div>
            <div class="card-grid" role="list">
              ${extensions
                .map((extension) => `
                  <div role="listitem">${renderExtensionCard(extension)}</div>
                `)
                .join('')}
            </div>
          </section>
        `
    }

    <script>
      (function initExtensionList() {
        if (window.__extensionListBound) return;
        window.__extensionListBound = true;
        document.body.addEventListener('htmx:afterSwap', (event) => {
          if (event.detail?.requestConfig?.verb === 'delete') {
            window.UI?.showToast('Extension removed', 'success');
          }
        });
      })();
    </script>
  `;

  return layout('Extensions', content);
}

export function extensionDetailView(extension: ExtensionWithConfigs): string {
  const configCount = extension.configs.length;
  const content = `
    <section class="page-header">
      <div>
        <p class="eyebrow">Extension detail</p>
        <h2>${escapeHtml(extension.name)}</h2>
        <p class="lead">Review metadata, included configs, and generated plugin artifacts.</p>
        <div class="chip-group" style="margin-top: 18px;">
          <span class="badge status-info">v${escapeHtml(extension.version)}</span>
          <span class="badge">${configCount} ${pluralize(configCount, 'config', 'configs')}</span>
          <span class="badge">Updated ${formatDate(extension.updated_at ?? extension.created_at)}</span>
        </div>
      </div>
      <div class="action-bar">
        <a href="/extensions/${extension.id}/edit" class="btn btn-secondary">Edit</a>
        <button class="btn btn-primary" type="button" data-manifest-download data-format="claude_code" data-extension="${extension.id}">Download Claude ZIP</button>
        <a href="/extensions" class="btn btn-tertiary">Back to list</a>
      </div>
    </section>

    <section class="panel">
      <div class="panel-header">
        <h3 class="panel-title">Overview</h3>
        <div class="action-bar">
          <button class="btn btn-ghost btn-sm" type="button" data-copy="${escapeHtml(
            `${extension.id}`
          )}">Copy ID</button>
          <button class="btn btn-ghost btn-sm" type="button" data-copy="${escapeHtml(
            `/plugins/${extension.id}/claude_code`
          )}">Copy plugin URL</button>
        </div>
      </div>
      <div class="resource-grid">
        <article class="card">
          <h4>Version</h4>
          <p>${escapeHtml(extension.version)}</p>
        </article>
        <article class="card">
          <h4>Author</h4>
          <p>${extension.author ? escapeHtml(extension.author) : '—'}</p>
        </article>
        <article class="card">
          <h4>Created</h4>
          <p>${new Date(extension.created_at).toLocaleString()}</p>
        </article>
        <article class="card">
          <h4>Updated</h4>
          <p>${new Date(extension.updated_at ?? extension.created_at).toLocaleString()}</p>
        </article>
      </div>
      ${
        extension.description
          ? `
            <div class="divider"></div>
            <p style="margin: 0; color: var(--text-muted);">${escapeHtml(extension.description)}</p>
          `
          : ''
      }
      <div class="divider"></div>
      <div class="action-bar" style="flex-wrap: wrap;">
        <a href="/plugins/${extension.id}/claude_code" class="btn btn-secondary">Browse Claude files</a>
        <a href="/plugins/${extension.id}/claude_code/download" class="btn btn-secondary">Download Claude ZIP</a>
        <a href="/plugins/${extension.id}/gemini" class="btn btn-ghost">Browse Gemini files</a>
        <a href="/plugins/${extension.id}/gemini/download" class="btn btn-ghost">Download Gemini ZIP</a>
        <a href="/plugins/${extension.id}/gemini/definition" class="btn btn-primary">Gemini JSON definition</a>
      </div>
    </section>

    <section class="panel">
      <div class="panel-header">
        <h3 class="panel-title">Included configs</h3>
        <span class="form-helper">${configCount} ${pluralize(configCount, 'item', 'items')}</span>
      </div>
      ${
        configCount === 0
          ? `
            <div class="empty-state">
              <h3>No configs linked</h3>
              <p>Add configs from the editor to generate plugin content.</p>
              <a href="/extensions/${extension.id}/edit" class="btn btn-secondary">Manage configs</a>
            </div>
          `
          : `
            <div class="card-grid" role="list">
              ${extension.configs
                .map((config) => `
                  <article class="card" role="listitem">
                    <h3 style="font-size: 1rem; margin-bottom: 4px;">${escapeHtml(config.name)}</h3>
                    <p>${escapeHtml(config.description ?? 'Ready for distribution across agents.')}</p>
                    <div class="chip-group" style="margin-top: 12px;">
                      <span class="badge">${config.type}</span>
                      <span class="badge status-info">${config.original_format}</span>
                    </div>
                    <div class="action-bar" style="margin-top: 16px;">
                      <a href="/configs/${config.id}" class="btn btn-ghost btn-sm">Open config</a>
                    </div>
                  </article>
                `)
                .join('')}
            </div>
          `
      }
    </section>

    <section class="panel" data-loading-target>
      <div class="panel-header">
        <h3 class="panel-title">Manifest preview</h3>
        <div class="action-bar">
          <button class="btn btn-secondary btn-sm" type="button" data-manifest-trigger data-format="claude_code">Claude manifest</button>
          <button class="btn btn-secondary btn-sm" type="button" data-manifest-trigger data-format="gemini">Gemini manifest</button>
        </div>
      </div>
      <div id="manifest-preview" class="skeleton" style="height: 240px; border-radius: var(--radius-md);"></div>
      <pre id="manifest-output" style="display: none; max-height: 360px; overflow: auto; margin: 0;"></pre>
    </section>

    <section class="panel" style="border: 1px solid rgba(248, 113, 113, 0.35);">
      <div class="panel-header">
        <h3 class="panel-title">Danger zone</h3>
        <span class="form-helper" style="color: #fecaca;">Deletes the extension and cached plugin artifacts.</span>
      </div>
      <button class="btn btn-danger" type="button" data-delete-extension data-extension-id="${extension.id}">Delete extension</button>
    </section>

    <script>
      (function initExtensionDetail() {
        if (window.__extensionDetailBound) return;
        window.__extensionDetailBound = true;
        const manifestButtons = document.querySelectorAll('[data-manifest-trigger]');
        const manifestPreview = document.getElementById('manifest-preview');
        const manifestOutput = document.getElementById('manifest-output');

        function setManifestLoading(isLoading) {
          if (!manifestPreview || !manifestOutput) return;
          if (isLoading) {
            manifestPreview.style.display = 'block';
            manifestOutput.style.display = 'none';
            manifestPreview.classList.add('skeleton');
          } else {
            manifestPreview.classList.remove('skeleton');
          }
        }

        manifestButtons.forEach((button) => {
          button.addEventListener('click', async () => {
            if (!(button instanceof HTMLButtonElement)) return;
            const format = button.getAttribute('data-format');
            if (!format) return;
            window.UI?.setBusyButton(button, true);
            setManifestLoading(true);
            try {
              const response = await fetch('/api/extensions/${extension.id}/manifest/' + format);
              if (!response.ok) {
                const error = await response.json().catch(() => ({ error: 'Unable to load manifest' }));
                throw new Error(error.error || 'Unable to load manifest');
              }
              const manifest = await response.json();
              if (manifestPreview && manifestOutput) {
                manifestPreview.style.display = 'none';
                manifestOutput.style.display = 'block';
                manifestOutput.textContent = JSON.stringify(manifest, null, 2);
              }
              window.UI?.showToast((format === 'gemini' ? 'Gemini' : 'Claude') + ' manifest ready', 'success');
            } catch (error) {
              setManifestLoading(false);
              window.UI?.showToast(error instanceof Error ? error.message : 'Manifest request failed', 'error');
            } finally {
              window.UI?.setBusyButton(button, false);
            }
          });
        });

        const downloadButtons = document.querySelectorAll('[data-manifest-download]');
        downloadButtons.forEach((button) => {
          button.addEventListener('click', (event) => {
            if (!(button instanceof HTMLButtonElement)) return;
            const format = button.getAttribute('data-format');
            const id = button.getAttribute('data-extension');
            if (!format || !id) return;
            const url = '/plugins/' + id + '/' + format + '/download';
            window.location.href = url;
            window.UI?.showToast('Download started', 'info');
          });
        });

        const deleteTrigger = document.querySelector('[data-delete-extension]');
        if (deleteTrigger) {
          deleteTrigger.addEventListener('click', async () => {
            if (!(deleteTrigger instanceof HTMLButtonElement)) return;
            if (!confirm('Delete this extension and generated files?')) return;
            window.UI?.setBusyButton(deleteTrigger, true);
            try {
              const response = await fetch('/api/extensions/${extension.id}', { method: 'DELETE' });
              if (!response.ok) {
                const error = await response.json().catch(() => ({ error: 'Failed to delete extension' }));
                throw new Error(error.error || 'Failed to delete extension');
              }
              window.UI?.showToast('Extension deleted', 'success');
              window.location.href = '/extensions';
            } catch (error) {
              window.UI?.showToast(error instanceof Error ? error.message : 'Unable to delete extension', 'error');
            } finally {
              window.UI?.setBusyButton(deleteTrigger, false);
            }
          });
        }
      })();
    </script>
  `;

  return layout(extension.name, content);
}

export function extensionCreateView(
  availableConfigs: Config[],
  currentFilters?: { type?: string; format?: string; search?: string }
): string {
  const filters = currentFilters || {};
  const selectedIds = new Set<string>();

  const content = `
    <section class="page-header">
      <div>
        <p class="eyebrow">New extension</p>
        <h2>Create extension</h2>
        <p class="lead">Bundle configs, author metadata, and generate plugins for your teams.</p>
      </div>
      <div class="action-bar">
        <a href="/extensions" class="btn btn-tertiary">Cancel</a>
      </div>
    </section>

    <form id="create-extension-form" class="panel" novalidate>
      <div class="panel-header">
        <h3 class="panel-title">Metadata</h3>
        <span class="form-helper">Fields marked * are required.</span>
      </div>
      <div class="form-section">
        <div class="form-row">
          <div class="form-group">
            <label for="name">Name *</label>
            <input id="name" name="name" type="text" required placeholder="Gemini snippets" />
          </div>
          <div class="form-group">
            <label for="version">Version *</label>
            <input id="version" name="version" type="text" value="1.0.0" required />
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label for="author">Author</label>
            <input id="author" name="author" type="text" placeholder="Acme AI" />
          </div>
          <div class="form-group">
            <label for="icon_url">Icon URL</label>
            <input id="icon_url" name="icon_url" type="url" placeholder="https://example.com/icon.png" />
            <span class="form-helper">Optional square image displayed in galleries.</span>
          </div>
        </div>
        <div class="form-group">
          <label for="description">Description</label>
          <textarea id="description" name="description" rows="3" placeholder="What does this extension offer?"></textarea>
        </div>
      </div>

      <div class="divider"></div>

      <div class="panel-header" style="margin-bottom: 0;">
        <h3 class="panel-title">Select configs</h3>
        <span class="form-helper" id="config-selected-count">0 selected</span>
      </div>
      <div class="form-row" style="margin-bottom: 12px;">
        <div class="form-group">
          <label for="filter-type">Type filter</label>
          <select id="filter-type" data-extension-filter="type">
            <option value="">All types</option>
            <option value="slash_command" ${filters.type === 'slash_command' ? 'selected' : ''}>Slash command</option>
            <option value="agent_definition" ${filters.type === 'agent_definition' ? 'selected' : ''}>Agent definition</option>
            <option value="mcp_config" ${filters.type === 'mcp_config' ? 'selected' : ''}>MCP config</option>
            <option value="skill" ${filters.type === 'skill' ? 'selected' : ''}>Skill</option>
          </select>
        </div>
        <div class="form-group">
          <label for="filter-format">Format filter</label>
          <select id="filter-format" data-extension-filter="format">
            <option value="">All formats</option>
            <option value="claude_code" ${filters.format === 'claude_code' ? 'selected' : ''}>Claude Code</option>
            <option value="codex" ${filters.format === 'codex' ? 'selected' : ''}>Codex</option>
            <option value="gemini" ${filters.format === 'gemini' ? 'selected' : ''}>Gemini</option>
          </select>
        </div>
        <div class="form-group">
          <label for="filter-search">Search</label>
          <input id="filter-search" type="search" data-extension-filter="search" placeholder="Search configs" value="${escapeHtml(
            filters.search || ''
          )}" />
        </div>
        ${
          filters.type || filters.format || filters.search
            ? `
              <div class="form-group" style="align-self: flex-end;">
                <button class="btn btn-tertiary btn-sm" type="button" data-extension-clear>Clear filters</button>
              </div>
            `
            : ''
        }
      </div>

      ${renderConfigSelection(availableConfigs, selectedIds, 'Create a config first, then return to package it here.')}

      <div class="divider"></div>
      <div class="action-bar" style="justify-content: flex-end;">
        <button class="btn btn-secondary" type="button" onclick="window.history.back()">Cancel</button>
        <button class="btn btn-primary" type="submit" data-submit>Create extension</button>
      </div>
    </form>

    <script>
      (function initExtensionCreate() {
        if (window.__extensionCreateBound) return;
        window.__extensionCreateBound = true;
        const form = document.getElementById('create-extension-form');
        const countLabel = document.getElementById('config-selected-count');
        const filterInputs = document.querySelectorAll('[data-extension-filter]');
        const clearFilters = document.querySelector('[data-extension-clear]');

        function updateSelectedCount() {
          const count = form ? form.querySelectorAll('input[name="config_ids"]:checked').length : 0;
          if (countLabel) {
            countLabel.textContent = count + ' ' + (count === 1 ? 'selected' : 'selected');
          }
        }

        function updateVisuals(target) {
          const label = target.closest('[data-config-option]');
          if (!label) return;
          const isChecked = target.checked;
          label.style.background = isChecked ? 'rgba(96, 165, 250, 0.12)' : 'rgba(15, 23, 42, 0.45)';
          label.style.borderColor = isChecked ? 'rgba(96, 165, 250, 0.45)' : 'rgba(148, 163, 184, 0.18)';
        }

        form?.querySelectorAll('input[name="config_ids"]').forEach((input) => {
          if (input instanceof HTMLInputElement) {
            updateVisuals(input);
            input.addEventListener('change', (event) => {
              updateVisuals(event.target as HTMLInputElement);
              updateSelectedCount();
            });
          }
        });

        updateSelectedCount();

        filterInputs.forEach((input) => {
          if (!(input instanceof HTMLInputElement || input instanceof HTMLSelectElement)) return;
          if (input.type === 'search') {
            let debounce;
            input.addEventListener('input', () => {
              clearTimeout(debounce);
              debounce = setTimeout(applyFilters, 400);
            });
          } else {
            input.addEventListener('change', applyFilters);
          }
        });

        clearFilters?.addEventListener('click', () => {
          window.location.href = '/extensions/new';
        });

        function applyFilters() {
          const params = new URLSearchParams();
          const type = (document.getElementById('filter-type') as HTMLSelectElement | null)?.value || '';
          const format = (document.getElementById('filter-format') as HTMLSelectElement | null)?.value || '';
          const search = (document.getElementById('filter-search') as HTMLInputElement | null)?.value || '';
          if (type) params.set('type', type);
          if (format) params.set('format', format);
          if (search) params.set('search', search);
          const query = params.toString();
          window.location.href = query ? '/extensions/new?' + query : '/extensions/new';
        }

        form?.addEventListener('submit', async (event) => {
          event.preventDefault();
          if (!(form instanceof HTMLFormElement)) return;
          if (window.UI && !window.UI.validateForm(form)) {
            return;
          }
          const submitButton = form.querySelector('[data-submit]');
          if (submitButton instanceof HTMLButtonElement) {
            window.UI?.setBusyButton(submitButton, true);
          }
          try {
            const payload = {
              name: (form.querySelector('#name') as HTMLInputElement)?.value.trim(),
              version: (form.querySelector('#version') as HTMLInputElement)?.value.trim(),
              author: (form.querySelector('#author') as HTMLInputElement)?.value.trim() || undefined,
              description: (form.querySelector('#description') as HTMLTextAreaElement)?.value.trim() || undefined,
              icon_url: (form.querySelector('#icon_url') as HTMLInputElement)?.value.trim() || undefined,
              config_ids: Array.from(form.querySelectorAll('input[name="config_ids"]:checked')).map((input) => (
                input instanceof HTMLInputElement ? input.value : ''
              )).filter(Boolean),
            };

            const response = await fetch('/api/extensions', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
            });

            if (!response.ok) {
              const error = await response.json().catch(() => ({ error: 'Failed to create extension' }));
              throw new Error(error.error || 'Failed to create extension');
            }

            const data = await response.json();
            window.UI?.showToast('Extension created', 'success');
            window.location.href = '/extensions/' + data.extension.id;
          } catch (error) {
            window.UI?.showToast(error instanceof Error ? error.message : 'Unable to create extension', 'error');
          } finally {
            if (submitButton instanceof HTMLButtonElement) {
              window.UI?.setBusyButton(submitButton, false);
            }
          }
        });
      })();
    </script>
  `;

  return layout('Create Extension', content);
}

export function extensionEditView(
  extension: ExtensionWithConfigs,
  availableConfigs: Config[],
  currentFilters?: { type?: string; format?: string; search?: string }
): string {
  const filters = currentFilters || {};
  const selectedIds = new Set(extension.configs.map((config) => config.id));

  const content = `
    <section class="page-header">
      <div>
        <p class="eyebrow">Extension editor</p>
        <h2>Edit ${escapeHtml(extension.name)}</h2>
        <p class="lead">Update metadata and curate the configs bundled into this extension.</p>
      </div>
      <div class="action-bar">
        <a href="/extensions/${extension.id}" class="btn btn-tertiary">Back to detail</a>
      </div>
    </section>

    <form id="extension-metadata-form" class="panel" novalidate>
      <div class="panel-header">
        <h3 class="panel-title">Metadata</h3>
        <span class="form-helper">Changes apply to generated manifests instantly.</span>
      </div>
      <div class="form-section">
        <div class="form-row">
          <div class="form-group">
            <label for="name">Name *</label>
            <input id="name" name="name" type="text" required value="${escapeHtml(extension.name)}" />
          </div>
          <div class="form-group">
            <label for="version">Version *</label>
            <input id="version" name="version" type="text" required value="${escapeHtml(extension.version)}" />
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label for="author">Author</label>
            <input id="author" name="author" type="text" value="${extension.author ? escapeHtml(extension.author) : ''}" />
          </div>
          <div class="form-group">
            <label for="icon_url">Icon URL</label>
            <input id="icon_url" name="icon_url" type="url" value="${extension.icon_url ? escapeHtml(extension.icon_url) : ''}" />
          </div>
        </div>
        <div class="form-group">
          <label for="description">Description</label>
          <textarea id="description" name="description" rows="3">${extension.description ? escapeHtml(extension.description) : ''}</textarea>
        </div>
      </div>
      <div class="divider"></div>
      <div class="action-bar" style="justify-content: flex-end;">
        <a href="/extensions/${extension.id}" class="btn btn-secondary">Cancel</a>
        <button class="btn btn-primary" type="submit" data-submit>Save changes</button>
      </div>
    </form>

    <section class="panel" id="config-management-panel">
      <div class="panel-header">
        <h3 class="panel-title">Manage configs</h3>
        <span class="form-helper" id="edit-config-count">${selectedIds.size} selected</span>
      </div>
      <div class="form-row" style="margin-bottom: 12px;">
        <div class="form-group">
          <label for="filter-type">Type filter</label>
          <select id="filter-type" data-extension-filter="type">
            <option value="">All types</option>
            <option value="slash_command" ${filters.type === 'slash_command' ? 'selected' : ''}>Slash command</option>
            <option value="agent_definition" ${filters.type === 'agent_definition' ? 'selected' : ''}>Agent definition</option>
            <option value="mcp_config" ${filters.type === 'mcp_config' ? 'selected' : ''}>MCP config</option>
            <option value="skill" ${filters.type === 'skill' ? 'selected' : ''}>Skill</option>
          </select>
        </div>
        <div class="form-group">
          <label for="filter-format">Format filter</label>
          <select id="filter-format" data-extension-filter="format">
            <option value="">All formats</option>
            <option value="claude_code" ${filters.format === 'claude_code' ? 'selected' : ''}>Claude Code</option>
            <option value="codex" ${filters.format === 'codex' ? 'selected' : ''}>Codex</option>
            <option value="gemini" ${filters.format === 'gemini' ? 'selected' : ''}>Gemini</option>
          </select>
        </div>
        <div class="form-group">
          <label for="filter-search">Search</label>
          <input id="filter-search" type="search" data-extension-filter="search" placeholder="Search configs" value="${escapeHtml(
            filters.search || ''
          )}" />
        </div>
        ${
          filters.type || filters.format || filters.search
            ? `
              <div class="form-group" style="align-self: flex-end;">
                <button class="btn btn-tertiary btn-sm" type="button" data-extension-clear>Clear filters</button>
              </div>
            `
            : ''
        }
      </div>
      ${renderConfigSelection(availableConfigs, selectedIds, 'No configs match your filters. Adjust the filters or add new configs.')}
    </section>

    <script>
      (function initExtensionEdit() {
        if (window.__extensionEditBound) return;
        window.__extensionEditBound = true;
        const form = document.getElementById('extension-metadata-form');
        const configPanel = document.getElementById('config-management-panel');
        const countLabel = document.getElementById('edit-config-count');
        const filterInputs = document.querySelectorAll('[data-extension-filter]');
        const clearFilters = document.querySelector('[data-extension-clear]');

        form?.addEventListener('submit', async (event) => {
          event.preventDefault();
          if (!(form instanceof HTMLFormElement)) return;
          if (window.UI && !window.UI.validateForm(form)) {
            return;
          }
          const submitButton = form.querySelector('[data-submit]');
          if (submitButton instanceof HTMLButtonElement) {
            window.UI?.setBusyButton(submitButton, true);
          }
          try {
            const payload = {
              name: (form.querySelector('#name') as HTMLInputElement)?.value.trim(),
              version: (form.querySelector('#version') as HTMLInputElement)?.value.trim(),
              author: (form.querySelector('#author') as HTMLInputElement)?.value.trim() || undefined,
              description: (form.querySelector('#description') as HTMLTextAreaElement)?.value.trim() || undefined,
              icon_url: (form.querySelector('#icon_url') as HTMLInputElement)?.value.trim() || undefined,
            };

            const response = await fetch(`/api/extensions/${extension.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
            });

            if (!response.ok) {
              const error = await response.json().catch(() => ({ error: 'Failed to update extension' }));
              throw new Error(error.error || 'Failed to update extension');
            }

            window.UI?.showToast('Extension updated', 'success');
          window.location.href = '/extensions/${extension.id}';
          } catch (error) {
            window.UI?.showToast(error instanceof Error ? error.message : 'Unable to update extension', 'error');
          } finally {
            if (submitButton instanceof HTMLButtonElement) {
              window.UI?.setBusyButton(submitButton, false);
            }
          }
        });

        function updateSelectedCount() {
          if (!configPanel || !countLabel) return;
          const count = configPanel.querySelectorAll('input[name="config_ids"]:checked').length;
          countLabel.textContent = count + ' ' + (count === 1 ? 'selected' : 'selected');
        }

        function updateVisuals(target) {
          const label = target.closest('[data-config-option]');
          if (!label) return;
          const isChecked = target.checked;
          label.style.background = isChecked ? 'rgba(96, 165, 250, 0.12)' : 'rgba(15, 23, 42, 0.45)';
          label.style.borderColor = isChecked ? 'rgba(96, 165, 250, 0.45)' : 'rgba(148, 163, 184, 0.18)';
        }

        configPanel?.querySelectorAll('input[name="config_ids"]').forEach((input) => {
          if (!(input instanceof HTMLInputElement)) return;
          updateVisuals(input);
          input.addEventListener('change', async () => {
            const configId = input.value;
            const isChecked = input.checked;
            const method = isChecked ? 'POST' : 'DELETE';
            try {
            const response = await fetch('/api/extensions/${extension.id}/configs/' + configId, { method });
              if (!response.ok) {
                const error = await response.json().catch(() => ({ error: 'Failed to update config association' }));
                throw new Error(error.error || 'Failed to update config association');
              }
              updateVisuals(input);
              updateSelectedCount();
              window.UI?.showToast(
                isChecked ? 'Config added to extension' : 'Config removed from extension',
                'success'
              );
            } catch (error) {
              input.checked = !isChecked;
              updateVisuals(input);
              window.UI?.showToast(
                error instanceof Error ? error.message : 'Unable to update config association',
                'error'
              );
            }
          });
        });

        updateSelectedCount();

        filterInputs.forEach((input) => {
          if (!(input instanceof HTMLInputElement || input instanceof HTMLSelectElement)) return;
          if (input.type === 'search') {
            let debounce;
            input.addEventListener('input', () => {
              clearTimeout(debounce);
              debounce = setTimeout(applyFilters, 400);
            });
          } else {
            input.addEventListener('change', applyFilters);
          }
        });

        clearFilters?.addEventListener('click', () => {
          window.location.href = '/extensions/${extension.id}/edit';
        });

        function applyFilters() {
          const params = new URLSearchParams();
          const type = (document.getElementById('filter-type') as HTMLSelectElement | null)?.value || '';
          const format = (document.getElementById('filter-format') as HTMLSelectElement | null)?.value || '';
          const search = (document.getElementById('filter-search') as HTMLInputElement | null)?.value || '';
          if (type) params.set('type', type);
          if (format) params.set('format', format);
          if (search) params.set('search', search);
          const query = params.toString();
          window.location.href = query ? '/extensions/${extension.id}/edit?' + query : '/extensions/${extension.id}/edit';
        }
      })();
    </script>
  `;

  return layout('Edit Extension', content);
}
