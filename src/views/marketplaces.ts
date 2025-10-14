import { MarketplaceWithExtensions, ExtensionWithConfigs } from '../domain/types';
import { layout } from './layout';

export function marketplaceListView(marketplaces: MarketplaceWithExtensions[]): string {
  const content = `
    <h2>All Marketplaces</h2>
    <a href="/marketplaces/new" class="btn">Create Marketplace</a>
    ${marketplaces.length === 0 ? '<p>No marketplaces yet. Create your first one!</p>' : `
      <ul class="config-list">
        ${marketplaces.map(market => `
          <li>
            <a href="/marketplaces/${market.id}" style="font-weight: 500;">
              ${escapeHtml(market.name)}
            </a>
            <span class="badge">v${escapeHtml(market.version)}</span>
            <span class="badge">${market.extensions.length} extension${market.extensions.length !== 1 ? 's' : ''}</span>
            <div style="font-size: 0.875em; margin-top: 5px; color: var(--text-secondary);">
              Owner: ${escapeHtml(market.owner_name)}
            </div>
            ${market.description ? `<div style="font-size: 0.875em; margin-top: 5px; color: var(--text-secondary);">
              ${escapeHtml(market.description)}
            </div>` : ''}
          </li>
        `).join('')}
      </ul>
    `}
  `;
  return layout('Marketplaces', content);
}

export function marketplaceDetailView(marketplace: MarketplaceWithExtensions): string {
  const totalConfigs = marketplace.extensions.reduce((sum, ext) => sum + ext.configs.length, 0);

  const content = `
    <h2>${escapeHtml(marketplace.name)}</h2>
    <div style="margin-bottom: 20px;">
      <span class="badge">v${escapeHtml(marketplace.version)}</span>
      <span class="badge">${marketplace.extensions.length} extension${marketplace.extensions.length !== 1 ? 's' : ''}</span>
      <span class="badge">${totalConfigs} total config${totalConfigs !== 1 ? 's' : ''}</span>
    </div>

    ${marketplace.description ? `
      <h3>Description</h3>
      <p>${escapeHtml(marketplace.description)}</p>
    ` : ''}

    <h3>Owner</h3>
    <p>
      ${escapeHtml(marketplace.owner_name)}
      ${marketplace.owner_email ? ` &lt;${escapeHtml(marketplace.owner_email)}&gt;` : ''}
    </p>

    ${marketplace.homepage || marketplace.repository ? `
      <h3>Links</h3>
      <p>
        ${marketplace.homepage ? `<a href="${escapeHtml(marketplace.homepage)}" target="_blank" style="color: var(--accent-primary); margin-right: 15px;">Homepage</a>` : ''}
        ${marketplace.repository ? `<a href="${escapeHtml(marketplace.repository)}" target="_blank" style="color: var(--accent-primary);">Repository</a>` : ''}
      </p>
    ` : ''}

    <h3>Extensions</h3>
    ${marketplace.extensions.length === 0 ? '<p>No extensions in this marketplace yet.</p>' : `
      <ul class="config-list">
        ${marketplace.extensions.map(ext => `
          <li>
            <a href="/extensions/${ext.id}" style="font-weight: 500;">
              ${escapeHtml(ext.name)}
            </a>
            <span class="badge">v${escapeHtml(ext.version)}</span>
            <span class="badge">${ext.configs.length} config${ext.configs.length !== 1 ? 's' : ''}</span>
            ${ext.description ? `<div style="font-size: 0.875em; margin-top: 5px; color: var(--text-secondary);">
              ${escapeHtml(ext.description)}
            </div>` : ''}
          </li>
        `).join('')}
      </ul>
    `}

    <h3>Marketplace Manifest Preview</h3>
    <div style="margin-bottom: 20px;">
      <button class="btn" hx-get="/api/marketplaces/${marketplace.id}/manifest" hx-target="#manifest-preview">
        View Claude Code Manifest
      </button>
    </div>

    <div id="manifest-preview"></div>

    <h3>Download Manifest (Copy-Paste)</h3>
    <p style="color: var(--text-secondary); margin-bottom: 10px;">
      Open this URL to get formatted marketplace.json that you can copy and paste into Claude Code:
    </p>
    <div style="background: var(--bg-secondary); padding: 15px; border-radius: 6px; margin-bottom: 20px;">
      <strong>Claude Code Marketplace Format:</strong><br>
      <a href="/api/marketplaces/${marketplace.id}/manifest?format=text" target="_blank" style="color: var(--accent-primary); word-break: break-all;">
        /api/marketplaces/${marketplace.id}/manifest?format=text
      </a>
    </div>

    <h3>Actions</h3>
    <div style="margin-top: 20px;">
      <a href="/marketplaces/${marketplace.id}/edit" class="btn">Edit</a>
      <a href="/marketplaces" class="btn btn-secondary">Back to List</a>
      <button
        class="btn btn-danger"
        hx-delete="/api/marketplaces/${marketplace.id}"
        hx-confirm="Are you sure you want to delete this marketplace?"
        hx-target="body"
        hx-swap="outerHTML">
        Delete
      </button>
    </div>

    <script>
      // Handle manifest preview display
      document.body.addEventListener('htmx:afterSwap', function(evt) {
        if (evt.detail.target.id === 'manifest-preview') {
          const data = JSON.parse(evt.detail.xhr.responseText);
          evt.detail.target.innerHTML = \`
            <h4>Manifest Content (marketplace.json)</h4>
            <pre>\${JSON.stringify(data, null, 2)}</pre>
          \`;
        }
      });
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
