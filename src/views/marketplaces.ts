import { MarketplaceWithExtensions, ExtensionWithConfigs } from '../domain/types';
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

function renderMarketplaceCard(marketplace: MarketplaceWithExtensions): string {
  const extensionCount = marketplace.extensions.length;
  const description = marketplace.description
    ? escapeHtml(marketplace.description)
    : 'Curate extension collections for Claude Code and Gemini with one manifest.';

  return `
    <article class="card fade-in" tabindex="0">
      <header class="toolbar" style="align-items: flex-start;">
        <div>
          <a href="/marketplaces/${marketplace.id}" class="stretched-link" style="color: inherit; text-decoration: none;">
            <h3>${escapeHtml(marketplace.name)}</h3>
          </a>
          <p>${description}</p>
        </div>
        <div class="chip-group" style="justify-content: flex-end;">
          <span class="badge status-info">v${escapeHtml(marketplace.version)}</span>
          <span class="badge">${extensionCount} ${pluralize(extensionCount, 'extension', 'extensions')}</span>
        </div>
      </header>
      <div class="card-meta">
        <span class="chip">Owner ${escapeHtml(marketplace.owner_name)}</span>
        <span class="chip">Created ${formatDate(marketplace.created_at)}</span>
        <span class="chip">Updated ${formatDate(marketplace.updated_at ?? marketplace.created_at)}</span>
      </div>
      <footer class="action-bar" style="margin-top: 18px;">
        <a href="/marketplaces/${marketplace.id}" class="btn btn-primary btn-sm">Open</a>
        <a href="/marketplaces/${marketplace.id}/edit" class="btn btn-secondary btn-sm">Edit</a>
        <button class="btn btn-ghost btn-sm" type="button" data-copy="${escapeHtml(
          `${marketplace.id}`
        )}">Copy ID</button>
      </footer>
    </article>
  `;
}

function renderExtensionSelection(
  extensions: ExtensionWithConfigs[],
  selectedIds: Set<string>,
  emptyMessage: string
): string {
  if (extensions.length === 0) {
    return `
      <div class="empty-state" role="status">
        <h3>No extensions available</h3>
        <p>${emptyMessage}</p>
        <a href="/extensions/new" class="btn btn-secondary">Create extension</a>
      </div>
    `;
  }

  return `
    <div id="extension-selection" style="display: grid; gap: 12px; max-height: 340px; overflow-y: auto; padding-right: 4px;">
      ${extensions
        .map((extension) => {
          const isSelected = selectedIds.has(extension.id);
          const background = isSelected ? 'rgba(96, 165, 250, 0.12)' : 'rgba(15, 23, 42, 0.45)';
          const border = isSelected ? 'rgba(96, 165, 250, 0.45)' : 'rgba(148, 163, 184, 0.18)';
          return `
            <label
              class="extension-option"
              data-extension-option
              data-extension-id="${extension.id}"
              style="display: flex; gap: 14px; align-items: flex-start; padding: 16px 18px; border-radius: var(--radius-md); border: 1px solid ${border}; background: ${background}; transition: border var(--transition-fast), background var(--transition-fast); cursor: pointer;">
              <input
                type="checkbox"
                name="extension_ids"
                value="${extension.id}"
                ${isSelected ? 'checked' : ''}
                style="margin-top: 4px; flex-shrink: 0;" />
              <div style="flex: 1; display: grid; gap: 8px;">
                <div class="toolbar" style="align-items: flex-start; gap: 10px;">
                  <div>
                    <strong>${escapeHtml(extension.name)}</strong>
                    <p style="margin: 6px 0 0; color: var(--text-muted); font-size: 0.9rem;">
                      ${escapeHtml(extension.description ?? 'Includes ' + extension.configs.length + ' configs')}
                    </p>
                  </div>
                  <div class="chip-group" style="justify-content: flex-end;">
                    <span class="badge">${extension.configs.length} ${pluralize(extension.configs.length, 'config', 'configs')}</span>
                    <span class="badge status-info">v${escapeHtml(extension.version)}</span>
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

export function marketplaceListView(marketplaces: MarketplaceWithExtensions[]): string {
  const content = `
    <section class="page-header">
      <div>
        <p class="eyebrow">Marketplace hub</p>
        <h2>Marketplaces</h2>
        <p class="lead">Orchestrate extension collections with polished manifests and instant download bundles.</p>
      </div>
      <div class="action-bar">
        <a href="/marketplaces/new" class="btn btn-primary">Create marketplace</a>
        <a href="/extensions" class="btn btn-tertiary">Browse extensions</a>
      </div>
    </section>

    ${
      marketplaces.length === 0
        ? `
          <section class="empty-state">
            <h3>No marketplaces yet</h3>
            <p>Bundle your extensions into curated collections for teams and marketplaces.</p>
            <a href="/marketplaces/new" class="btn btn-primary">Start a marketplace</a>
          </section>
        `
        : `
          <section class="panel">
            <div class="panel-header">
              <h3 class="panel-title">Published marketplaces</h3>
              <span class="form-helper">${marketplaces.length} total</span>
            </div>
            <div class="card-grid" role="list">
              ${marketplaces
                .map((marketplace) => `
                  <div role="listitem">${renderMarketplaceCard(marketplace)}</div>
                `)
                .join('')}
            </div>
          </section>
        `
    }
  `;

  return layout('Marketplaces', content);
}

export function marketplaceDetailView(marketplace: MarketplaceWithExtensions): string {
  const extensionCount = marketplace.extensions.length;
  const configCount = marketplace.extensions.reduce((total, extension) => total + extension.configs.length, 0);

  const content = `
    <section class="page-header">
      <div>
        <p class="eyebrow">Marketplace detail</p>
        <h2>${escapeHtml(marketplace.name)}</h2>
        <p class="lead">Share a curated ecosystem of extensions across Claude Code and Gemini clients.</p>
        <div class="chip-group" style="margin-top: 18px;">
          <span class="badge status-info">v${escapeHtml(marketplace.version)}</span>
          <span class="badge">${extensionCount} ${pluralize(extensionCount, 'extension', 'extensions')}</span>
          <span class="badge">${configCount} ${pluralize(configCount, 'config', 'configs')}</span>
        </div>
      </div>
      <div class="action-bar">
        <a href="/marketplaces/${marketplace.id}/edit" class="btn btn-secondary">Edit</a>
        <button class="btn btn-primary" type="button" data-copy="${escapeHtml(
          `/api/marketplaces/${marketplace.id}/manifest`
        )}">Copy manifest path</button>
        <a href="/marketplaces" class="btn btn-tertiary">Back to list</a>
      </div>
    </section>

    <section class="panel">
      <div class="panel-header">
        <h3 class="panel-title">Overview</h3>
        <div class="action-bar">
          <button class="btn btn-ghost btn-sm" type="button" data-copy="${escapeHtml(
            `${marketplace.id}`
          )}">Copy ID</button>
        </div>
      </div>
      <div class="resource-grid">
        <article class="card">
          <h4>Owner</h4>
          <p>${escapeHtml(marketplace.owner_name)}${marketplace.owner_email ? ` · ${escapeHtml(marketplace.owner_email)}` : ''}</p>
        </article>
        <article class="card">
          <h4>Homepage</h4>
          <p>${marketplace.homepage ? `<a href="${escapeHtml(marketplace.homepage)}" class="link-muted">${escapeHtml(marketplace.homepage)}</a>` : '—'}</p>
        </article>
        <article class="card">
          <h4>Repository</h4>
          <p>${marketplace.repository ? `<a href="${escapeHtml(marketplace.repository)}" class="link-muted">${escapeHtml(marketplace.repository)}</a>` : '—'}</p>
        </article>
        <article class="card">
          <h4>Updated</h4>
          <p>${new Date(marketplace.updated_at ?? marketplace.created_at).toLocaleString()}</p>
        </article>
      </div>
      ${
        marketplace.description
          ? `
            <div class="divider"></div>
            <p style="margin: 0; color: var(--text-muted);">${escapeHtml(marketplace.description)}</p>
          `
          : ''
      }
    </section>

    <section class="panel">
      <div class="panel-header">
        <h3 class="panel-title">Extensions</h3>
        <span class="form-helper">${extensionCount} ${pluralize(extensionCount, 'item', 'items')}</span>
      </div>
      ${
        extensionCount === 0
          ? `
            <div class="empty-state">
              <h3>No extensions linked</h3>
              <p>Add extensions from the editor to populate this marketplace.</p>
              <a href="/marketplaces/${marketplace.id}/edit" class="btn btn-secondary">Manage extensions</a>
            </div>
          `
          : `
            <div class="card-grid" role="list">
              ${marketplace.extensions
                .map((extension) => `
                  <article class="card" role="listitem">
                    <h3 style="font-size: 1rem; margin-bottom: 4px;">${escapeHtml(extension.name)}</h3>
                    <p>${escapeHtml(extension.description ?? 'Bundled with ' + extension.configs.length + ' configs.')}</p>
                    <div class="chip-group" style="margin-top: 12px;">
                      <span class="badge">${extension.configs.length} ${pluralize(extension.configs.length, 'config', 'configs')}</span>
                      <span class="badge status-info">v${escapeHtml(extension.version)}</span>
                    </div>
                    <div class="action-bar" style="margin-top: 16px;">
                      <a href="/extensions/${extension.id}" class="btn btn-ghost btn-sm">Open extension</a>
                    </div>
                  </article>
                `)
                .join('')}
            </div>
          `
      }
    </section>

    <section class="panel">
      <div class="panel-header">
        <h3 class="panel-title">Download options</h3>
        <span class="form-helper">Install packages or copy integration URLs.</span>
      </div>
      <div class="card-grid" style="grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));">
        <article class="card">
          <h4>Claude Code marketplace</h4>
          <p>Use marketplace.json to provision plugins automatically.</p>
          <div class="action-bar" style="margin-top: 16px;">
            <button class="btn btn-primary" type="button" data-marketplace-copy="${marketplace.id}">Copy base URL</button>
            <a href="/api/marketplaces/${marketplace.id}/manifest?format=text" class="btn btn-secondary" target="_blank">View JSON</a>
            <a href="/plugins/marketplaces/${marketplace.id}/download?format=claude_code" class="btn btn-secondary">Download ZIP</a>
          </div>
        </article>
        <article class="card">
          <h4>Gemini collection</h4>
          <p>Download JSON definitions for each extension in the marketplace.</p>
          <div class="action-bar" style="margin-top: 16px;">
            <a href="/plugins/marketplaces/${marketplace.id}/gemini/definition" class="btn btn-primary">Download collection</a>
            <a href="/plugins/marketplaces/${marketplace.id}/download?format=gemini" class="btn btn-secondary">Download ZIP</a>
          </div>
        </article>
      </div>
    </section>

    <section class="panel" style="border: 1px solid rgba(248, 113, 113, 0.35);">
      <div class="panel-header">
        <h3 class="panel-title">Danger zone</h3>
        <span class="form-helper" style="color: #fecaca;">Deletes the marketplace and cached bundles.</span>
      </div>
      <button class="btn btn-danger" type="button" data-delete-marketplace data-marketplace-id="${marketplace.id}">Delete marketplace</button>
    </section>

    <script>
      (function initMarketplaceDetail() {
        if (window.__marketplaceDetailBound) return;
        window.__marketplaceDetailBound = true;
        const copyBase = document.querySelector('[data-marketplace-copy]');
        if (copyBase) {
          copyBase.addEventListener('click', () => {
            if (!(copyBase instanceof HTMLElement)) return;
            const manifestUrl = window.location.origin + '/api/marketplaces/${marketplace.id}/manifest';
            window.UI?.copyWithFeedback(manifestUrl, copyBase, 'Manifest URL copied');
          });
        }
        const deleteTrigger = document.querySelector('[data-delete-marketplace]');
        if (deleteTrigger) {
          deleteTrigger.addEventListener('click', async () => {
            if (!(deleteTrigger instanceof HTMLButtonElement)) return;
            if (!confirm('Delete this marketplace and generated files?')) return;
            window.UI?.setBusyButton(deleteTrigger, true);
            try {
              const response = await fetch('/api/marketplaces/${marketplace.id}', { method: 'DELETE' });
              if (!response.ok) {
                const error = await response.json().catch(() => ({ error: 'Failed to delete marketplace' }));
                throw new Error(error.error || 'Failed to delete marketplace');
              }
              window.UI?.showToast('Marketplace deleted', 'success');
              window.location.href = '/marketplaces';
            } catch (error) {
              window.UI?.showToast(error instanceof Error ? error.message : 'Unable to delete marketplace', 'error');
            } finally {
              window.UI?.setBusyButton(deleteTrigger, false);
            }
          });
        }
      })();
    </script>
  `;

  return layout(marketplace.name, content);
}

export function marketplaceCreateView(availableExtensions: ExtensionWithConfigs[]): string {
  const selectedIds = new Set<string>();
  const content = `
    <section class="page-header">
      <div>
        <p class="eyebrow">New marketplace</p>
        <h2>Create marketplace</h2>
        <p class="lead">Bundle extensions into a curated catalog with instant download endpoints.</p>
      </div>
      <div class="action-bar">
        <a href="/marketplaces" class="btn btn-tertiary">Cancel</a>
      </div>
    </section>

    <form id="create-marketplace-form" class="panel" novalidate>
      <div class="panel-header">
        <h3 class="panel-title">Metadata</h3>
        <span class="form-helper">Fields marked * are required.</span>
      </div>
      <div class="form-section">
        <div class="form-row">
          <div class="form-group">
            <label for="name">Name *</label>
            <input id="name" name="name" type="text" required placeholder="Claude + Gemini essentials" />
          </div>
          <div class="form-group">
            <label for="version">Version *</label>
            <input id="version" name="version" type="text" value="1.0.0" required />
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label for="owner_name">Owner name *</label>
            <input id="owner_name" name="owner_name" type="text" required placeholder="Acme AI" />
          </div>
          <div class="form-group">
            <label for="owner_email">Owner email</label>
            <input id="owner_email" name="owner_email" type="email" placeholder="team@example.com" />
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label for="homepage">Homepage URL</label>
            <input id="homepage" name="homepage" type="url" placeholder="https://example.com" />
          </div>
          <div class="form-group">
            <label for="repository">Repository URL</label>
            <input id="repository" name="repository" type="url" placeholder="https://github.com/acme/marketplace" />
          </div>
        </div>
        <div class="form-group">
          <label for="description">Description</label>
          <textarea id="description" name="description" rows="3" placeholder="What makes this marketplace special?"></textarea>
        </div>
      </div>

      <div class="divider"></div>
      <div class="panel-header" style="margin-bottom: 0;">
        <h3 class="panel-title">Select extensions</h3>
        <span class="form-helper" id="create-extension-count">0 selected</span>
      </div>
      ${renderExtensionSelection(availableExtensions, selectedIds, 'Create an extension first, then return to assemble a marketplace.')}

      <div class="divider"></div>
      <div class="action-bar" style="justify-content: flex-end;">
        <a href="/marketplaces" class="btn btn-secondary">Cancel</a>
        <button class="btn btn-primary" type="submit" data-submit>Create marketplace</button>
      </div>
    </form>

    <script>
      (function initMarketplaceCreate() {
        if (window.__marketplaceCreateBound) return;
        window.__marketplaceCreateBound = true;
        const form = document.getElementById('create-marketplace-form');
        const countLabel = document.getElementById('create-extension-count');

        function updateCount() {
          if (!(form instanceof HTMLFormElement) || !countLabel) return;
          const count = form.querySelectorAll('input[name="extension_ids"]:checked').length;
          countLabel.textContent = count + ' ' + (count === 1 ? 'selected' : 'selected');
        }

        function updateVisuals(target) {
          const label = target.closest('[data-extension-option]');
          if (!label) return;
          label.style.background = target.checked ? 'rgba(96, 165, 250, 0.12)' : 'rgba(15, 23, 42, 0.45)';
          label.style.borderColor = target.checked ? 'rgba(96, 165, 250, 0.45)' : 'rgba(148, 163, 184, 0.18)';
        }

        form?.querySelectorAll('input[name="extension_ids"]').forEach((input) => {
          if (!(input instanceof HTMLInputElement)) return;
          updateVisuals(input);
          input.addEventListener('change', (event) => {
            updateVisuals(event.target as HTMLInputElement);
            updateCount();
          });
        });

        updateCount();

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
              owner_name: (form.querySelector('#owner_name') as HTMLInputElement)?.value.trim(),
              owner_email: (form.querySelector('#owner_email') as HTMLInputElement)?.value.trim() || undefined,
              description: (form.querySelector('#description') as HTMLTextAreaElement)?.value.trim() || undefined,
              homepage: (form.querySelector('#homepage') as HTMLInputElement)?.value.trim() || undefined,
              repository: (form.querySelector('#repository') as HTMLInputElement)?.value.trim() || undefined,
              extension_ids: Array.from(form.querySelectorAll('input[name="extension_ids"]:checked')).map((input) => (
                input instanceof HTMLInputElement ? input.value : ''
              )).filter(Boolean),
            };

            const response = await fetch('/api/marketplaces', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
            });

            if (!response.ok) {
              const error = await response.json().catch(() => ({ error: 'Failed to create marketplace' }));
              throw new Error(error.error || 'Failed to create marketplace');
            }

            const data = await response.json();
            window.UI?.showToast('Marketplace created', 'success');
            window.location.href = '/marketplaces/' + data.marketplace.id;
          } catch (error) {
            window.UI?.showToast(error instanceof Error ? error.message : 'Unable to create marketplace', 'error');
          } finally {
            if (submitButton instanceof HTMLButtonElement) {
              window.UI?.setBusyButton(submitButton, false);
            }
          }
        });
      })();
    </script>
  `;

  return layout('Create Marketplace', content);
}

export function marketplaceEditView(
  marketplace: MarketplaceWithExtensions,
  availableExtensions: ExtensionWithConfigs[]
): string {
  const selectedIds = new Set(marketplace.extensions.map((extension) => extension.id));

  const content = `
    <section class="page-header">
      <div>
        <p class="eyebrow">Marketplace editor</p>
        <h2>Edit ${escapeHtml(marketplace.name)}</h2>
        <p class="lead">Adjust marketplace metadata and curate extensions in the collection.</p>
      </div>
      <div class="action-bar">
        <a href="/marketplaces/${marketplace.id}" class="btn btn-tertiary">Back to detail</a>
      </div>
    </section>

    <form id="marketplace-metadata-form" class="panel" novalidate>
      <div class="panel-header">
        <h3 class="panel-title">Metadata</h3>
        <span class="form-helper">Changes propagate to generated manifests immediately.</span>
      </div>
      <div class="form-section">
        <div class="form-row">
          <div class="form-group">
            <label for="name">Name *</label>
            <input id="name" name="name" type="text" required value="${escapeHtml(marketplace.name)}" />
          </div>
          <div class="form-group">
            <label for="version">Version *</label>
            <input id="version" name="version" type="text" required value="${escapeHtml(marketplace.version)}" />
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label for="owner_name">Owner name *</label>
            <input id="owner_name" name="owner_name" type="text" required value="${escapeHtml(marketplace.owner_name)}" />
          </div>
          <div class="form-group">
            <label for="owner_email">Owner email</label>
            <input id="owner_email" name="owner_email" type="email" value="${marketplace.owner_email ? escapeHtml(marketplace.owner_email) : ''}" />
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label for="homepage">Homepage URL</label>
            <input id="homepage" name="homepage" type="url" value="${marketplace.homepage ? escapeHtml(marketplace.homepage) : ''}" />
          </div>
          <div class="form-group">
            <label for="repository">Repository URL</label>
            <input id="repository" name="repository" type="url" value="${marketplace.repository ? escapeHtml(marketplace.repository) : ''}" />
          </div>
        </div>
        <div class="form-group">
          <label for="description">Description</label>
          <textarea id="description" name="description" rows="3">${marketplace.description ? escapeHtml(marketplace.description) : ''}</textarea>
        </div>
      </div>
      <div class="divider"></div>
      <div class="action-bar" style="justify-content: flex-end;">
        <a href="/marketplaces/${marketplace.id}" class="btn btn-secondary">Cancel</a>
        <button class="btn btn-primary" type="submit" data-submit>Save changes</button>
      </div>
    </form>

    <section class="panel" id="extension-management-panel">
      <div class="panel-header">
        <h3 class="panel-title">Manage extensions</h3>
        <span class="form-helper" id="edit-extension-count">${selectedIds.size} selected</span>
      </div>
      ${renderExtensionSelection(availableExtensions, selectedIds, 'No extensions available. Create one first to populate this marketplace.')}
    </section>

    <script>
      (function initMarketplaceEdit() {
        if (window.__marketplaceEditBound) return;
        window.__marketplaceEditBound = true;
        const form = document.getElementById('marketplace-metadata-form');
        const extensionPanel = document.getElementById('extension-management-panel');
        const countLabel = document.getElementById('edit-extension-count');

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
              owner_name: (form.querySelector('#owner_name') as HTMLInputElement)?.value.trim(),
              owner_email: (form.querySelector('#owner_email') as HTMLInputElement)?.value.trim() || undefined,
              homepage: (form.querySelector('#homepage') as HTMLInputElement)?.value.trim() || undefined,
              repository: (form.querySelector('#repository') as HTMLInputElement)?.value.trim() || undefined,
              description: (form.querySelector('#description') as HTMLTextAreaElement)?.value.trim() || undefined,
            };

            const response = await fetch('/api/marketplaces/${marketplace.id}', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
            });

            if (!response.ok) {
              const error = await response.json().catch(() => ({ error: 'Failed to update marketplace' }));
              throw new Error(error.error || 'Failed to update marketplace');
            }

            window.UI?.showToast('Marketplace updated', 'success');
            window.location.href = '/marketplaces/${marketplace.id}';
          } catch (error) {
            window.UI?.showToast(error instanceof Error ? error.message : 'Unable to update marketplace', 'error');
          } finally {
            if (submitButton instanceof HTMLButtonElement) {
              window.UI?.setBusyButton(submitButton, false);
            }
          }
        });

        function updateCount() {
          if (!extensionPanel || !countLabel) return;
          const count = extensionPanel.querySelectorAll('input[name="extension_ids"]:checked').length;
          countLabel.textContent = count + ' ' + (count === 1 ? 'selected' : 'selected');
        }

        function updateVisuals(target) {
          const label = target.closest('[data-extension-option]');
          if (!label) return;
          label.style.background = target.checked ? 'rgba(96, 165, 250, 0.12)' : 'rgba(15, 23, 42, 0.45)';
          label.style.borderColor = target.checked ? 'rgba(96, 165, 250, 0.45)' : 'rgba(148, 163, 184, 0.18)';
        }

        extensionPanel?.querySelectorAll('input[name="extension_ids"]').forEach((input) => {
          if (!(input instanceof HTMLInputElement)) return;
          updateVisuals(input);
          input.addEventListener('change', async () => {
            const extensionId = input.value;
            const isChecked = input.checked;
            const method = isChecked ? 'POST' : 'DELETE';
            try {
              const response = await fetch('/api/marketplaces/${marketplace.id}/extensions/' + extensionId, { method });
              if (!response.ok) {
                const error = await response.json().catch(() => ({ error: 'Failed to update marketplace membership' }));
                throw new Error(error.error || 'Failed to update marketplace membership');
              }
              updateVisuals(input);
              updateCount();
              window.UI?.showToast(
                isChecked ? 'Extension added to marketplace' : 'Extension removed from marketplace',
                'success'
              );
            } catch (error) {
              input.checked = !isChecked;
              updateVisuals(input);
              window.UI?.showToast(
                error instanceof Error ? error.message : 'Unable to update marketplace membership',
                'error'
              );
            }
          });
        });

        updateCount();
      })();
    </script>
  `;

  return layout('Edit Marketplace', content);
}
