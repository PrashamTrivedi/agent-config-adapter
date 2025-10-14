import { ExtensionWithConfigs, Config } from '../domain/types';
import { layout } from './layout';

export function extensionListView(extensions: ExtensionWithConfigs[]): string {
  const content = `
    <h2>All Extensions</h2>
    <a href="/extensions/new" class="btn">Create Extension</a>
    ${extensions.length === 0 ? '<p>No extensions yet. Create your first one!</p>' : `
      <ul class="config-list">
        ${extensions.map(ext => `
          <li>
            <a href="/extensions/${ext.id}" style="font-weight: 500;">
              ${escapeHtml(ext.name)}
            </a>
            <span class="badge">v${escapeHtml(ext.version)}</span>
            <span class="badge">${ext.configs.length} config${ext.configs.length !== 1 ? 's' : ''}</span>
            ${ext.author ? `<div style="font-size: 0.875em; margin-top: 5px; color: var(--text-secondary);">
              Author: ${escapeHtml(ext.author)}
            </div>` : ''}
            ${ext.description ? `<div style="font-size: 0.875em; margin-top: 5px; color: var(--text-secondary);">
              ${escapeHtml(ext.description)}
            </div>` : ''}
          </li>
        `).join('')}
      </ul>
    `}
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

    <h3>Download Manifest (Copy-Paste)</h3>
    <p style="color: var(--text-secondary); margin-bottom: 10px;">
      Open these URLs to get formatted JSON that you can copy and paste:
    </p>
    <div style="background: var(--bg-secondary); padding: 15px; border-radius: 6px; margin-bottom: 10px;">
      <strong>Gemini Format:</strong><br>
      <a href="/api/extensions/${extension.id}/manifest/gemini?text=true" target="_blank" style="color: var(--accent-primary); word-break: break-all;">
        /api/extensions/${extension.id}/manifest/gemini?text=true
      </a>
    </div>
    <div style="background: var(--bg-secondary); padding: 15px; border-radius: 6px; margin-bottom: 20px;">
      <strong>Claude Code Format:</strong><br>
      <a href="/api/extensions/${extension.id}/manifest/claude_code?text=true" target="_blank" style="color: var(--accent-primary); word-break: break-all;">
        /api/extensions/${extension.id}/manifest/claude_code?text=true
      </a>
    </div>

    <h3>Actions</h3>
    <div style="margin-top: 20px;">
      <a href="/extensions/${extension.id}/edit" class="btn">Edit</a>
      <a href="/extensions" class="btn btn-secondary">Back to List</a>
      <button
        class="btn btn-danger"
        hx-delete="/api/extensions/${extension.id}"
        hx-confirm="Are you sure you want to delete this extension?"
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
            <h4>Manifest Content</h4>
            <pre>\${JSON.stringify(data, null, 2)}</pre>
          \`;
        }
      });
    </script>
  `;
  return layout(extension.name, content);
}

export function extensionCreateView(availableConfigs: Config[]): string {
  const content = `
    <h2>Create Extension</h2>
    <form hx-post="/api/extensions" hx-target="body" hx-swap="outerHTML">
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
        ${availableConfigs.length === 0 ? '<p style="color: var(--text-secondary);">No configs available. <a href="/configs/new">Create a config first</a>.</p>' : `
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
      // Handle form submission
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

      // Highlight selected checkboxes
      document.querySelectorAll('input[type="checkbox"]').forEach(cb => {
        cb.addEventListener('change', function() {
          this.parentElement.style.background = this.checked ? 'var(--bg-tertiary)' : '';
        });
      });
    </script>
  `;
  return layout('Create Extension', content);
}

export function extensionEditView(extension: ExtensionWithConfigs, availableConfigs: Config[]): string {
  const selectedConfigIds = new Set(extension.configs.map(c => c.id));

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

    ${availableConfigs.length === 0 ? '<p style="color: var(--text-secondary);">No configs available.</p>' : `
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
