import { MarketplaceWithExtensions, ExtensionWithConfigs } from '../domain/types';
import { layout } from './layout';
import { icons } from './icons';

export function marketplaceListView(marketplaces: MarketplaceWithExtensions[]): string {
  const content = `
    <div class="fade-in">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px;">
        <div>
          <h2 style="margin: 0; display: flex; align-items: center; gap: 12px;">
            ${icons.store('icon')} Marketplaces
          </h2>
          <p style="margin-top: 8px; color: var(--text-secondary);">
            Curated collections of extensions for distribution
          </p>
        </div>
        <div style="display: flex; gap: 10px;">
          <button onclick="requireEmail(() => window.location.href='/marketplaces/new')" class="btn ripple">
            ${icons.plus('icon')} Create Marketplace
          </button>
          <a href="/" class="btn btn-secondary">← Home</a>
        </div>
      </div>

      ${marketplaces.length === 0 ? `
        <div class="no-results slide-up">
          <div style="margin-bottom: 10px;">
            ${icons.store('icon-lg')}
          </div>
          <h3 style="margin: 10px 0; color: var(--text-primary);">No marketplaces yet</h3>
          <p style="margin-bottom: 20px;">Create your first marketplace to distribute extension collections!</p>
          <button onclick="requireEmail(() => window.location.href='/marketplaces/new')" class="btn">Create Marketplace</button>
        </div>
      ` : `
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(380px, 1fr)); gap: 24px; margin-top: 20px;">
          ${marketplaces.map(market => `
            <div class="card card-hover scale-in" style="background: linear-gradient(135deg, var(--bg-secondary) 0%, var(--bg-tertiary) 100%);">
              <div style="margin-bottom: 16px;">
                <a href="/marketplaces/${market.id}" style="color: var(--text-primary); text-decoration: none; font-size: 1.2em; font-weight: 600; display: flex; align-items: center; gap: 8px; margin-bottom: 10px;">
                  ${icons.store('icon')} ${escapeHtml(market.name)}
                </a>
                <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 12px;">
                  <span class="badge">v${escapeHtml(market.version)}</span>
                  <span class="status-indicator status-success">
                    <span class="status-dot"></span>
                    ${market.extensions.length} extension${market.extensions.length !== 1 ? 's' : ''}
                  </span>
                </div>
                ${market.description ? `
                  <p style="color: var(--text-secondary); font-size: 0.9em; line-height: 1.5; margin: 0;">
                    ${escapeHtml(market.description)}
                  </p>
                ` : ''}
              </div>

              <div style="padding-top: 12px; border-top: 1px solid var(--border-color);">
                <div style="color: var(--text-secondary); font-size: 0.85em; display: flex; align-items: center; gap: 6px;">
                  ${icons.user('icon')}
                  <span>${escapeHtml(market.owner_name)}</span>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      `}
    </div>
  `;
  return layout('Marketplaces', content);
}

export function marketplaceDetailView(marketplace: MarketplaceWithExtensions, origin?: string): string {
  const totalConfigs = marketplace.extensions.reduce((sum, ext) => sum + ext.configs.length, 0);
  const baseUrl = origin || '';

  const content = `
    <div class="fade-in">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px;">
        <div style="flex: 1;">
          <h2 style="margin: 0; display: flex; align-items: center; gap: 12px;">
            ${icons.store('icon')} ${escapeHtml(marketplace.name)}
          </h2>
          <div style="display: flex; gap: 10px; margin-top: 12px; flex-wrap: wrap;">
            <span class="badge">v${escapeHtml(marketplace.version)}</span>
            <span class="status-indicator status-success">
              <span class="status-dot"></span>
              ${marketplace.extensions.length} extension${marketplace.extensions.length !== 1 ? 's' : ''}
            </span>
            <span class="status-indicator status-info">
              <span class="status-dot"></span>
              ${totalConfigs} total config${totalConfigs !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
        <div style="display: flex; gap: 10px; flex-wrap: wrap;">
          <button onclick="requireEmail(() => window.location.href='/marketplaces/${marketplace.id}/edit')" class="btn ripple" style="display: flex; align-items: center; gap: 8px;">
            ${icons.edit('icon')} Edit
          </button>
          <a href="/marketplaces" class="btn btn-secondary">← Back</a>
        </div>
      </div>

      ${marketplace.description ? `
        <div class="card slide-up" style="margin-bottom: 24px;">
          <h3 style="margin: 0 0 12px 0; display: flex; align-items: center; gap: 8px;">
            ${icons.file('icon')} Description
          </h3>
          <p style="margin: 0; color: var(--text-secondary); line-height: 1.6;">${escapeHtml(marketplace.description)}</p>
        </div>
      ` : ''}

      <!-- Metadata -->
      <div class="card slide-up" style="margin-bottom: 24px;">
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px;">
          <div>
            <h4 style="margin: 0 0 8px 0; color: var(--text-secondary); font-size: 0.9em; display: flex; align-items: center; gap: 6px;">
              ${icons.user('icon')} Owner
            </h4>
            <div style="color: var(--text-primary);">
              ${escapeHtml(marketplace.owner_name)}
              ${marketplace.owner_email ? `<br><span style="color: var(--text-secondary); font-size: 0.9em;">${escapeHtml(marketplace.owner_email)}</span>` : ''}
            </div>
          </div>
          ${marketplace.homepage || marketplace.repository ? `
            <div>
              <h4 style="margin: 0 0 8px 0; color: var(--text-secondary); font-size: 0.9em; display: flex; align-items: center; gap: 6px;">
                ${icons.info('icon')} Links
              </h4>
              <div style="display: flex; flex-direction: column; gap: 6px;">
                ${marketplace.homepage ? `<a href="${escapeHtml(marketplace.homepage)}" target="_blank" style="color: var(--accent-primary); display: flex; align-items: center; gap: 6px;">${icons.target('icon')} Homepage</a>` : ''}
                ${marketplace.repository ? `<a href="${escapeHtml(marketplace.repository)}" target="_blank" style="color: var(--accent-primary); display: flex; align-items: center; gap: 6px;">${icons.package('icon')} Repository</a>` : ''}
              </div>
            </div>
          ` : ''}
        </div>
      </div>

      <!-- Extensions Grid -->
      <div class="card slide-up" style="margin-bottom: 24px;">
        <h3 style="margin: 0 0 16px 0; display: flex; align-items: center; gap: 8px;">
          ${icons.package('icon')} Extensions (${marketplace.extensions.length})
        </h3>
        ${marketplace.extensions.length === 0 ? `
          <div style="text-align: center; padding: 40px; background: var(--bg-tertiary); border-radius: 6px;">
            <div style="margin-bottom: 12px;">
              ${icons.package('icon-lg')}
            </div>
            <p style="color: var(--text-secondary); margin: 0;">No extensions in this marketplace yet</p>
          </div>
        ` : `
          <div style="display: grid; gap: 12px;">
            ${marketplace.extensions.map(ext => `
              <div class="card" style="background: var(--bg-primary); display: flex; justify-content: space-between; align-items: flex-start; padding: 16px;">
                <div style="flex: 1;">
                  <a href="/extensions/${ext.id}" style="color: var(--accent-primary); font-weight: 600; font-size: 1.05em; text-decoration: none; display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                    ${icons.package('icon')} ${escapeHtml(ext.name)}
                  </a>
                  <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 8px;">
                    <span class="badge">v${escapeHtml(ext.version)}</span>
                    <span class="status-indicator status-info" style="font-size: 0.85em;">
                      <span class="status-dot"></span>
                      ${ext.configs.length} config${ext.configs.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  ${ext.description ? `
                    <p style="font-size: 0.9em; color: var(--text-secondary); margin: 0; line-height: 1.5;">
                      ${escapeHtml(ext.description)}
                    </p>
                  ` : ''}
                </div>
              </div>
            `).join('')}
          </div>
        `}
      </div>

      <!-- Download Options -->
      <div class="card slide-up" style="margin-bottom: 24px;">
        <h3 style="margin: 0 0 20px 0; display: flex; align-items: center; gap: 10px;">${icons.download('icon')} Download Marketplace</h3>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 20px;">
          <!-- Claude Code -->
          <div class="card card-hover" style="background: rgba(37, 99, 235, 0.05); border: 2px solid rgba(37, 99, 235, 0.2);">
            <h4 style="margin: 0 0 8px 0; color: var(--accent-primary); display: flex; align-items: center; gap: 8px;"><span>●</span> Claude Code Marketplace</h4>
            <p style="font-size: 0.875em; color: var(--text-secondary); margin: 0 0 16px 0;">
              marketplace.json with plugin references
            </p>
            <div style="display: flex; flex-direction: column; gap: 10px;">
              <button
                onclick="copyMarketplaceUrl()"
                class="btn ripple copy-btn"
                style="width: 100%; text-align: center;">
                ${icons.clipboard('icon')} Copy Marketplace URL
              </button>
              <a href="/api/marketplaces/${marketplace.id}/manifest?format=text" target="_blank" class="btn btn-secondary" style="width: 100%; text-align: center;">
                ${icons.file('icon')} View JSON
              </a>
              <a href="/plugins/marketplaces/${marketplace.id}/download?format=claude_code" class="btn btn-secondary" style="width: 100%; text-align: center;">
                ${icons.package('icon')} Download All Plugins (ZIP)
              </a>
            </div>
          </div>

          <!-- Gemini -->
          <div class="card card-hover" style="background: rgba(234, 179, 8, 0.05); border: 2px solid rgba(234, 179, 8, 0.2);">
            <h4 style="margin: 0 0 8px 0; color: #eab308; display: flex; align-items: center; gap: 8px;"><span>●</span> Gemini Marketplace</h4>
            <p style="font-size: 0.875em; color: var(--text-secondary); margin: 0 0 16px 0;">
              Collection of JSON definitions for all extensions
            </p>
            <div style="display: flex; flex-direction: column; gap: 10px;">
              <a href="/plugins/marketplaces/${marketplace.id}/gemini/definition" class="btn ripple" style="width: 100%; text-align: center; background: #eab308; display: inline-flex; align-items: center; justify-content: center; gap: 6px;">
                ${icons.file('icon')} Download JSON Collection
              </a>
              <details style="margin-top: 8px;">
                <summary style="cursor: pointer; font-size: 0.875em; color: var(--text-secondary); user-select: none; padding: 8px; border-radius: 4px; background: var(--bg-tertiary);">
                  ${icons.settings('icon')} Advanced: Full Plugin Files
                </summary>
                <div style="padding-top: 10px;">
                  <a href="/plugins/marketplaces/${marketplace.id}/download?format=gemini" class="btn btn-secondary" style="width: 100%; text-align: center; font-size: 0.9em;">
                    ${icons.package('icon')} Download All Plugins (ZIP)
                  </a>
                </div>
              </details>
            </div>
          </div>
        </div>
      </div>

      <!-- Installation Instructions -->
      <div class="card slide-up" style="margin-bottom: 24px;">
        <h3 style="margin: 0 0 20px 0; display: flex; align-items: center; gap: 10px;">${icons.book('icon')} Installation Instructions</h3>

        <details open class="card" style="background: rgba(37, 99, 235, 0.05); border: 1px solid rgba(37, 99, 235, 0.2); margin-bottom: 16px; padding: 16px;">
          <summary style="cursor: pointer; font-weight: 600; color: var(--accent-primary); user-select: none; display: flex; align-items: center; gap: 8px;">
            <span style="color: var(--accent-primary);">●</span>
            <span>Claude Code Setup</span>
          </summary>
          <div style="padding: 16px 0 0 0;">
            <p style="margin-bottom: 12px; font-weight: 500;">Add to Claude Code settings:</p>
            <pre style="background: var(--bg-primary); padding: 16px; border-radius: 6px; overflow-x: auto; font-size: 0.875em; border: 1px solid var(--border-color);"><code>{
  "marketplaces": [
    "${baseUrl}/api/marketplaces/${marketplace.id}/manifest"
  ]
}</code></pre>
            <div style="background: rgba(88, 166, 255, 0.1); padding: 12px; border-radius: 6px; margin-top: 12px; border-left: 3px solid var(--accent-primary);">
              <p style="margin: 0; font-size: 0.9em; color: var(--text-secondary); display: flex; align-items: center; gap: 6px;">
                ${icons.sparkles('icon')} Claude Code will automatically discover and load all ${marketplace.extensions.length} plugin(s)
              </p>
            </div>
          </div>
        </details>

        <details class="card" style="background: rgba(234, 179, 8, 0.05); border: 1px solid rgba(234, 179, 8, 0.2); padding: 16px;">
          <summary style="cursor: pointer; font-weight: 600; color: #eab308; user-select: none; display: flex; align-items: center; gap: 8px;">
            <span style="color: #eab308;">●</span>
            <span>Gemini CLI Setup</span>
          </summary>
          <div style="padding: 16px 0 0 0;">
            <p style="margin-bottom: 12px; font-weight: 500;">Download and install all extensions:</p>
            <ol style="font-size: 0.9em; line-height: 1.8; padding-left: 20px; color: var(--text-secondary);">
              <li>Click "Download JSON Collection" above</li>
              <li>Extract JSON files to your extensions directory</li>
              <li>Run: <code style="background: var(--bg-primary); padding: 2px 6px; border-radius: 3px;">gemini extension install /path/to/extensions/*.json</code></li>
            </ol>
            <div style="background: rgba(234, 179, 8, 0.1); padding: 12px; border-radius: 6px; margin-top: 12px; border-left: 3px solid #eab308;">
              <p style="margin: 0; font-size: 0.9em; color: var(--text-secondary);">
                ${icons.barChart('icon')} This marketplace contains ${marketplace.extensions.length} extension(s) with ${totalConfigs} total config(s)
              </p>
            </div>
          </div>
        </details>
      </div>

      <!-- Danger Zone -->
      <div class="card" style="border-color: var(--danger); background: rgba(248, 81, 73, 0.05); margin-bottom: 24px;">
        <h3 style="margin: 0 0 12px 0; color: var(--danger); display: flex; align-items: center; gap: 10px;">${icons.warning('icon')} Danger Zone</h3>
        <p style="margin-bottom: 16px; color: var(--text-secondary);">
          Deleting this marketplace will only remove the marketplace record. Extensions will not be affected.
        </p>
        <button
          class="btn btn-danger ripple"
          onclick="requireEmail(() => htmx.trigger(this, 'click-confirmed'))"
          hx-delete="/api/marketplaces/${marketplace.id}"
          hx-trigger="click-confirmed"
          hx-confirm="Are you sure you want to delete this marketplace?"
          hx-target="body"
          hx-swap="outerHTML"
          data-success-message="Marketplace deleted successfully">
          ${icons.trash('icon')} Delete Marketplace
        </button>
      </div>
    </div>

    <script>
      function copyMarketplaceUrl() {
        const url = window.location.origin + '/api/marketplaces/${marketplace.id}/manifest';
        copyToClipboard(url);
      }
    </script>
  `;
  return layout(marketplace.name, content);
}

export function marketplaceCreateView(availableExtensions: ExtensionWithConfigs[]): string {
  const content = `
    <h2>Create Marketplace</h2>
    <form hx-post="/api/marketplaces" hx-target="body" hx-swap="outerHTML">
      <div class="form-group">
        <label for="name">Name *</label>
        <input type="text" id="name" name="name" required>
      </div>

      <div class="form-group">
        <label for="version">Version *</label>
        <input type="text" id="version" name="version" value="1.0.0" required>
      </div>

      <div class="form-group">
        <label for="owner_name">Owner Name *</label>
        <input type="text" id="owner_name" name="owner_name" required>
      </div>

      <div class="form-group">
        <label for="owner_email">Owner Email</label>
        <input type="email" id="owner_email" name="owner_email">
      </div>

      <div class="form-group">
        <label for="description">Description</label>
        <textarea id="description" name="description" style="min-height: 100px;"></textarea>
      </div>

      <div class="form-group">
        <label for="homepage">Homepage URL</label>
        <input type="url" id="homepage" name="homepage" placeholder="https://example.com">
      </div>

      <div class="form-group">
        <label for="repository">Repository URL</label>
        <input type="url" id="repository" name="repository" placeholder="https://github.com/user/repo">
      </div>

      <div class="form-group">
        <label>Select Extensions</label>
        ${availableExtensions.length === 0 ? '<p style="color: var(--text-secondary);">No extensions available. <a href="/extensions/new">Create an extension first</a>.</p>' : `
          <div style="max-height: 300px; overflow-y: auto; border: 1px solid var(--border-color); border-radius: 6px; padding: 10px; background: var(--bg-secondary);">
            ${availableExtensions.map(ext => `
              <label style="display: block; padding: 8px; cursor: pointer; border-radius: 4px; transition: background 0.2s;">
                <input type="checkbox" name="extension_ids" value="${ext.id}" style="width: auto; margin-right: 8px;">
                <span style="font-weight: 500;">${escapeHtml(ext.name)}</span>
                <span class="badge">v${escapeHtml(ext.version)}</span>
                <span class="badge">${ext.configs.length} config${ext.configs.length !== 1 ? 's' : ''}</span>
                ${ext.description ? `<div style="font-size: 0.875em; margin-top: 3px; color: var(--text-secondary); margin-left: 20px;">
                  ${escapeHtml(ext.description)}
                </div>` : ''}
              </label>
            `).join('')}
          </div>
        `}
      </div>

      <button type="submit" class="btn">Create Marketplace</button>
      <a href="/marketplaces" class="btn btn-secondary">Cancel</a>
    </form>

    <script>
      // Handle form submission
      document.body.addEventListener('htmx:afterSwap', function(evt) {
        const response = evt.detail.xhr.responseText;
        try {
          const data = JSON.parse(response);
          if (data.marketplace) {
            window.location.href = '/marketplaces/' + data.marketplace.id;
          }
        } catch(e) {
          // Response is HTML, let it render
        }
      });

      // Highlight selected checkboxes
      document.querySelectorAll('input[type="checkbox"]').forEach(cb => {
        cb.addEventListener('change', function() {
          this.parentElement.style.background = this.checked ? 'var(--bg-tertiary)' : '';
        });
      });
    </script>
  `;
  return layout('Create Marketplace', content);
}

export function marketplaceEditView(marketplace: MarketplaceWithExtensions, availableExtensions: ExtensionWithConfigs[]): string {
  const selectedExtensionIds = new Set(marketplace.extensions.map(e => e.id));

  const content = `
    <h2>Edit Marketplace</h2>
    <form hx-put="/api/marketplaces/${marketplace.id}" hx-target="body" hx-swap="outerHTML">
      <div class="form-group">
        <label for="name">Name *</label>
        <input type="text" id="name" name="name" value="${escapeHtml(marketplace.name)}" required>
      </div>

      <div class="form-group">
        <label for="version">Version *</label>
        <input type="text" id="version" name="version" value="${escapeHtml(marketplace.version)}" required>
      </div>

      <div class="form-group">
        <label for="owner_name">Owner Name *</label>
        <input type="text" id="owner_name" name="owner_name" value="${escapeHtml(marketplace.owner_name)}" required>
      </div>

      <div class="form-group">
        <label for="owner_email">Owner Email</label>
        <input type="email" id="owner_email" name="owner_email" value="${marketplace.owner_email ? escapeHtml(marketplace.owner_email) : ''}">
      </div>

      <div class="form-group">
        <label for="description">Description</label>
        <textarea id="description" name="description" style="min-height: 100px;">${marketplace.description ? escapeHtml(marketplace.description) : ''}</textarea>
      </div>

      <div class="form-group">
        <label for="homepage">Homepage URL</label>
        <input type="url" id="homepage" name="homepage" value="${marketplace.homepage ? escapeHtml(marketplace.homepage) : ''}" placeholder="https://example.com">
      </div>

      <div class="form-group">
        <label for="repository">Repository URL</label>
        <input type="url" id="repository" name="repository" value="${marketplace.repository ? escapeHtml(marketplace.repository) : ''}" placeholder="https://github.com/user/repo">
      </div>

      <button type="submit" class="btn">Update Marketplace</button>
      <a href="/marketplaces/${marketplace.id}" class="btn btn-secondary">Cancel</a>
    </form>

    <h3 style="margin-top: 30px;">Manage Extensions</h3>
    <p style="color: var(--text-secondary); margin-bottom: 15px;">
      Add or remove extensions from this marketplace. Changes are applied immediately.
    </p>

    ${availableExtensions.length === 0 ? '<p style="color: var(--text-secondary);">No extensions available.</p>' : `
      <div style="max-height: 400px; overflow-y: auto; border: 1px solid var(--border-color); border-radius: 6px; padding: 10px; background: var(--bg-secondary);">
        ${availableExtensions.map(ext => {
          const isSelected = selectedExtensionIds.has(ext.id);
          return `
            <div style="display: flex; align-items: center; padding: 8px; border-radius: 4px; margin-bottom: 5px; background: ${isSelected ? 'var(--bg-tertiary)' : 'transparent'};">
              <label style="flex: 1; cursor: pointer; display: flex; align-items: center;">
                <input
                  type="checkbox"
                  data-extension-id="${ext.id}"
                  ${isSelected ? 'checked' : ''}
                  style="width: auto; margin-right: 8px;"
                  hx-post="/api/marketplaces/${marketplace.id}/extensions/${ext.id}"
                  hx-trigger="change"
                  hx-swap="none">
                <span style="font-weight: 500;">${escapeHtml(ext.name)}</span>
                <span class="badge">v${escapeHtml(ext.version)}</span>
                <span class="badge">${ext.configs.length} config${ext.configs.length !== 1 ? 's' : ''}</span>
              </label>
            </div>
          `;
        }).join('')}
      </div>
    `}

    <script>
      // Handle metadata form submission
      document.body.addEventListener('htmx:afterSwap', function(evt) {
        const response = evt.detail.xhr.responseText;
        try {
          const data = JSON.parse(response);
          if (data.marketplace) {
            window.location.href = '/marketplaces/' + data.marketplace.id;
          }
        } catch(e) {
          // Response is HTML, let it render
        }
      });

      // Handle extension checkbox changes
      document.querySelectorAll('input[type="checkbox"][data-extension-id]').forEach(cb => {
        cb.addEventListener('change', async function(e) {
          const extensionId = this.getAttribute('data-extension-id');
          const isChecked = this.checked;
          const method = isChecked ? 'POST' : 'DELETE';

          try {
            const response = await fetch('/api/marketplaces/${marketplace.id}/extensions/' + extensionId, {
              method: method,
              headers: { 'Content-Type': 'application/json' }
            });

            if (response.ok) {
              // Update visual feedback
              this.parentElement.parentElement.style.background = isChecked ? 'var(--bg-tertiary)' : 'transparent';
            } else {
              // Revert checkbox on error
              this.checked = !isChecked;
              alert('Failed to update extension association');
            }
          } catch (error) {
            this.checked = !isChecked;
            alert('Error updating extension association');
          }
        });
      });
    </script>
  `;
  return layout('Edit Marketplace', content);
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
