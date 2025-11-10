import { Config, SkillWithFiles, SkillFile } from '../domain/types';
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

export function skillsListView(skills: Config[]): string {
  const content = `
    <section class="page-header">
      <div>
        <p class="eyebrow">Skill library</p>
        <h2>Skills</h2>
        <p class="lead">Craft reusable, multi-file skills and bundle them directly into extensions or marketplaces.</p>
      </div>
      <div class="action-bar">
        <a href="/skills/new" class="btn btn-primary">Create skill</a>
        <a href="/configs" class="btn btn-tertiary">View configs</a>
      </div>
    </section>

    ${skills.length === 0 ? `
      <section class="empty-state">
        <h3>No skills yet</h3>
        <p>Design your first multi-file skill to unlock advanced agent workflows.</p>
        <a href="/skills/new" class="btn btn-primary">Start building</a>
      </section>
    ` : `
      <section class="panel">
        <div class="toolbar">
          <h3 class="panel-title">Skill inventory</h3>
          <span class="form-helper" id="skill-table-helper">Click column headers to sort.</span>
        </div>
        <div class="divider"></div>
        <div class="table-wrapper" style="overflow-x: auto;">
          <table data-sortable aria-describedby="skill-table-helper">
            <thead>
              <tr>
                <th scope="col" data-sort><span>Name</span><span class="sort-indicator">↕</span></th>
                <th scope="col" data-sort><span>Format</span><span class="sort-indicator">↕</span></th>
                <th scope="col" data-sort><span>Created</span><span class="sort-indicator">↕</span></th>
                <th scope="col"><span>Actions</span></th>
              </tr>
            </thead>
            <tbody>
              ${skills
                .map((skill) => `
                  <tr>
                    <td>
                      <a href="/skills/${skill.id}" class="link-muted">${escapeHtml(skill.name)}</a>
                    </td>
                    <td><span class="badge">${skill.original_format}</span></td>
                    <td>${formatDate(skill.created_at)}</td>
                    <td>
                      <div class="action-bar" style="gap: 8px;">
                        <a href="/skills/${skill.id}/edit" class="btn btn-secondary btn-sm">Edit</a>
                        <a href="/api/skills/${skill.id}/download" class="btn btn-ghost btn-sm" download>Download ZIP</a>
                        <button
                          class="btn btn-danger btn-sm"
                          hx-delete="/api/skills/${skill.id}"
                          hx-confirm="Delete this skill and all files?"
                          hx-target="closest tr"
                          hx-swap="delete"
                          hx-on::after-request="window.UI && window.UI.showToast('Skill deleted', 'success')">
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                `)
                .join('')}
            </tbody>
          </table>
        </div>
      </section>
    `}

    <script>
      if (!window.__skillListBound) {
        window.__skillListBound = true;
        document.body.addEventListener('htmx:afterSwap', (event) => {
          if (event.detail.target && event.detail.target.matches('tr')) {
            window.UI?.showToast('Skill removed successfully', 'success');
          }
        });
      }
    </script>
  `;

  return layout('Skills', content);
}

export function skillDetailView(skill: SkillWithFiles): string {
  const content = `
    <section class="page-header">
      <div>
        <p class="eyebrow">Skill detail</p>
        <h2>${escapeHtml(skill.name)}</h2>
        <p class="lead">Inspect core markdown content and companion files with quick previews and download options.</p>
        <div class="chip-group" style="margin-top: 16px;">
          <span class="badge">${skill.original_format}</span>
          <span class="badge status-info">${skill.files.length} companion ${skill.files.length === 1 ? 'file' : 'files'}</span>
          <span class="badge">Updated ${formatDate(skill.updated_at)}</span>
        </div>
      </div>
      <div class="action-bar">
        <a href="/skills/${skill.id}/edit" class="btn btn-secondary">Edit</a>
        <a href="/api/skills/${skill.id}/download" class="btn btn-primary" download="${escapeHtml(skill.name)}.zip" data-busy data-busy-label="Preparing">Download ZIP</a>
        <a href="/skills" class="btn btn-tertiary">Back to list</a>
      </div>
    </section>

    <section class="panel">
      <div class="tabs" role="tablist">
        <button class="tab-btn active" data-tab="skill-md" role="tab" aria-selected="true">SKILL.md</button>
        <button class="tab-btn" data-tab="companion" role="tab" aria-selected="false">Companion files</button>
      </div>
      <div id="tab-skill-md" class="tab-content active" role="tabpanel">
        <div class="toolbar" style="margin-bottom: 12px;">
          <h3 class="panel-title">Primary content</h3>
          <button class="btn btn-ghost btn-sm" type="button" data-copy-target="#skill-md-content">Copy</button>
        </div>
        <pre id="skill-md-content" style="max-height: 420px; overflow: auto;">${escapeHtml(skill.content)}</pre>
      </div>
      <div id="tab-companion" class="tab-content" role="tabpanel" hidden>
        ${skill.files.length === 0 ? `
          <div class="empty-state">
            <h3>No companion files</h3>
            <p>Add companion assets in the editor to enrich this skill.</p>
          </div>
        ` : `
          <div class="table-wrapper" style="overflow-x: auto;">
            <table data-sortable>
              <thead>
                <tr>
                  <th scope="col" data-sort><span>Path</span><span class="sort-indicator">↕</span></th>
                  <th scope="col" data-sort><span>Size</span><span class="sort-indicator">↕</span></th>
                  <th scope="col" data-sort><span>Type</span><span class="sort-indicator">↕</span></th>
                  <th scope="col"><span>Actions</span></th>
                </tr>
              </thead>
              <tbody>
                ${skill.files
                  .map((file) => renderCompanionRow(skill.id, file))
                  .join('')}
              </tbody>
            </table>
          </div>
        `}
      </div>
    </section>

    <section class="panel">
      <div class="panel-header">
        <h3 class="panel-title">Metadata</h3>
      </div>
      <div class="resource-grid">
        <article class="card">
          <h4>Created</h4>
          <p>${new Date(skill.created_at).toLocaleString()}</p>
        </article>
        <article class="card">
          <h4>Updated</h4>
          <p>${new Date(skill.updated_at).toLocaleString()}</p>
        </article>
      </div>
      <div class="divider"></div>
      <button
        class="btn btn-danger"
        hx-delete="/api/skills/${skill.id}"
        hx-confirm="Delete this skill and all associated files?"
        hx-target="body"
        hx-swap="outerHTML"
        data-busy
        data-busy-label="Deleting"
        hx-on::after-request="window.UI && window.UI.showToast('Skill deleted', 'success')">
        Delete skill
      </button>
    </section>

    <script>
      (function initSkillTabs() {
        if (window.__skillTabsBound) return;
        window.__skillTabsBound = true;
        document.addEventListener('click', (event) => {
          const trigger = event.target instanceof HTMLElement ? event.target.closest('.tab-btn') : null;
          if (!trigger || !trigger.dataset.tab) return;
          event.preventDefault();
          const tabId = trigger.dataset.tab;
          const tabs = Array.from(document.querySelectorAll('.tab-btn'));
          tabs.forEach((tab) => {
            tab.classList.toggle('active', tab === trigger);
            tab.setAttribute('aria-selected', tab === trigger ? 'true' : 'false');
          });
          const panels = Array.from(document.querySelectorAll('.tab-content'));
          panels.forEach((panel) => {
            const isActive = panel.id === 'tab-' + tabId;
            panel.classList.toggle('active', isActive);
            panel.toggleAttribute('hidden', !isActive);
          });
        });
      })();

      document.body.addEventListener('htmx:afterSwap', (event) => {
        if (event.detail.target && event.detail.target.closest('table')) {
          window.UI?.showToast('File operation completed', 'success');
        }
      });
    </script>
  `;

  return layout(`Skill: ${skill.name}`, content);
}

export function skillCreateView(): string {
  const content = `
    <section class="page-header">
      <div>
        <p class="eyebrow">Create</p>
        <h2>New skill</h2>
        <p class="lead">Start from scratch or upload a packaged skill archive. Inline validation keeps everything consistent.</p>
      </div>
      <div class="action-bar">
        <a href="/skills" class="btn btn-tertiary">Cancel</a>
      </div>
    </section>

    <section class="panel">
      <div class="tabs" role="tablist">
        <button class="tab-btn active" data-tab="form" role="tab" aria-selected="true">Manual entry</button>
        <button class="tab-btn" data-tab="upload" role="tab" aria-selected="false">Upload ZIP</button>
      </div>

      <div id="tab-form" class="tab-content active" role="tabpanel">
        <form id="skill-create-form" hx-post="/api/skills" hx-encoding="multipart/form-data">
          <div class="form-row">
            <div class="form-group">
              <label for="name">Skill name *</label>
              <input type="text" id="name" name="name" required placeholder="e.g. Marketplace sync" />
            </div>
            <div class="form-group">
              <label for="original_format">Format *</label>
              <select id="original_format" name="original_format" required>
                <option value="claude_code">Claude Code</option>
                <option value="gemini">Gemini</option>
                <option value="codex">Codex</option>
              </select>
            </div>
          </div>
          <div class="form-group">
            <label for="content">SKILL.md *</label>
            <textarea id="content" name="content" rows="16" required placeholder="# Skill\nDescribe the behaviour..."></textarea>
            <span class="form-helper">Supports markdown with fenced code blocks.</span>
          </div>
          <div class="action-bar">
            <button type="submit" class="btn btn-primary" data-busy data-busy-label="Creating">Create skill</button>
            <a href="/skills" class="btn btn-secondary">Back</a>
          </div>
        </form>
      </div>

      <div id="tab-upload" class="tab-content" role="tabpanel" hidden>
        <form id="skill-upload-form" hx-post="/api/skills/upload" hx-encoding="multipart/form-data">
          <div class="upload-zone" id="skill-dropzone" style="border: 2px dashed rgba(96, 165, 250, 0.35); border-radius: var(--radius-lg); padding: 36px; text-align: center;">
            <p style="font-size: 1rem; margin-bottom: 8px;">Drop your ZIP here or click to browse</p>
            <p class="form-helper">Archive must include SKILL.md at the root.</p>
            <input type="file" id="skill-archive" name="file" accept=".zip" required style="display: none;" />
            <button type="button" class="btn btn-secondary" id="skill-browse">Browse files</button>
          </div>
          <div class="action-bar" style="margin-top: 24px;">
            <button type="submit" class="btn btn-primary" data-busy data-busy-label="Uploading">Upload skill</button>
          </div>
        </form>
      </div>
    </section>

    <script>
      (function initSkillCreate() {
        if (window.__skillCreateBound) return;
        window.__skillCreateBound = true;

        document.addEventListener('click', (event) => {
          const tab = event.target instanceof HTMLElement ? event.target.closest('.tab-btn') : null;
          if (tab && tab.dataset.tab) {
            event.preventDefault();
            const tabId = tab.dataset.tab;
            document.querySelectorAll('.tab-btn').forEach((btn) => {
              btn.classList.toggle('active', btn === tab);
              btn.setAttribute('aria-selected', btn === tab ? 'true' : 'false');
            });
            document.querySelectorAll('.tab-content').forEach((panel) => {
              const isActive = panel.id === 'tab-' + tabId;
              panel.classList.toggle('active', isActive);
              panel.toggleAttribute('hidden', !isActive);
            });
          }
        });

        const manualForm = document.getElementById('skill-create-form');
        manualForm?.addEventListener('submit', (event) => {
          if (!window.UI?.validateForm(manualForm)) {
            event.preventDefault();
            return;
          }
          const submit = manualForm.querySelector('[data-busy]');
          if (submit) {
            window.UI?.setBusyButton(submit, true);
          }
        });

        const uploadForm = document.getElementById('skill-upload-form');
        const dropzone = document.getElementById('skill-dropzone');
        const fileInput = document.getElementById('skill-archive');
        const browseButton = document.getElementById('skill-browse');
        browseButton?.addEventListener('click', () => fileInput?.click());

        ['dragenter', 'dragover'].forEach((eventName) => {
          dropzone?.addEventListener(eventName, (event) => {
            event.preventDefault();
            dropzone.classList.add('is-dragging');
          });
        });
        ['dragleave', 'drop'].forEach((eventName) => {
          dropzone?.addEventListener(eventName, () => dropzone.classList.remove('is-dragging'));
        });
        dropzone?.addEventListener('drop', (event) => {
          event.preventDefault();
          const files = event.dataTransfer?.files;
          if (files && files.length > 0 && fileInput) {
            fileInput.files = files;
            window.UI?.showToast('Archive ready for upload', 'info');
          }
        });
        uploadForm?.addEventListener('submit', (event) => {
          if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
            event.preventDefault();
            window.UI?.showToast('Attach a ZIP archive before uploading', 'warning');
            return;
          }
          const submit = uploadForm.querySelector('[data-busy]');
          if (submit) {
            window.UI?.setBusyButton(submit, true);
          }
        });

        document.body.addEventListener('htmx:afterSwap', (evt) => {
          if (evt.detail.target && evt.detail.target.tagName === 'BODY') {
            try {
              const response = JSON.parse(evt.detail.xhr.responseText);
              if (response?.skill?.id) {
                window.location.href = '/skills/' + response.skill.id;
              }
            } catch (error) {
              // Allow rendered HTML to display validation feedback
            }
          }
        });
      })();
    </script>
  `;

  return layout('Create Skill', content);
}

export function skillEditView(skill: SkillWithFiles): string {
  const content = `
    <section class="page-header">
      <div>
        <p class="eyebrow">Edit</p>
        <h2>Edit skill</h2>
        <p class="lead">Update markdown, manage companion files, and keep a close eye on unsaved changes.</p>
      </div>
      <div class="action-bar">
        <a href="/skills/${skill.id}" class="btn btn-tertiary">Back to detail</a>
      </div>
    </section>

    <section class="panel">
      <form id="skill-edit-form" hx-put="/api/skills/${skill.id}" hx-encoding="multipart/form-data">
        <div class="form-row">
          <div class="form-group">
            <label for="name">Skill name *</label>
            <input type="text" id="name" name="name" value="${escapeHtml(skill.name)}" required />
          </div>
          <div class="form-group">
            <label for="original_format">Format *</label>
            <select id="original_format" name="original_format" required>
              <option value="claude_code" ${skill.original_format === 'claude_code' ? 'selected' : ''}>Claude Code</option>
              <option value="gemini" ${skill.original_format === 'gemini' ? 'selected' : ''}>Gemini</option>
              <option value="codex" ${skill.original_format === 'codex' ? 'selected' : ''}>Codex</option>
            </select>
          </div>
        </div>
        <div class="form-group">
          <label for="content">SKILL.md *</label>
          <textarea id="content" name="content" rows="18" required>${escapeHtml(skill.content)}</textarea>
        </div>
        <div class="form-group">
          <label for="companion_files">Upload companion files</label>
          <input type="file" id="companion_files" name="files" multiple />
          <span class="form-helper">Existing files remain unless removed from the list below.</span>
        </div>
        <div class="action-bar">
          <button type="submit" class="btn btn-primary" data-busy data-busy-label="Saving">Save changes</button>
          <a href="/skills/${skill.id}" class="btn btn-secondary">Cancel</a>
        </div>
      </form>
    </section>

    ${skill.files.length > 0 ? `
      <section class="panel">
        <div class="panel-header">
          <h3 class="panel-title">Existing companion files</h3>
        </div>
        <div class="table-wrapper" style="overflow-x: auto;">
          <table data-sortable>
            <thead>
              <tr>
                <th scope="col" data-sort><span>Path</span><span class="sort-indicator">↕</span></th>
                <th scope="col"><span>Size</span></th>
                <th scope="col"><span>Type</span></th>
                <th scope="col"><span>Actions</span></th>
              </tr>
            </thead>
            <tbody>
              ${skill.files.map((file) => renderCompanionRow(skill.id, file)).join('')}
            </tbody>
          </table>
        </div>
      </section>
    ` : ''}

    <script>
      (function initSkillEdit() {
        if (window.__skillEditBound) return;
        window.__skillEditBound = true;
        const form = document.getElementById('skill-edit-form');
        form?.addEventListener('submit', (event) => {
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
              if (response?.skill?.id) {
                window.UI?.showToast('Skill updated', 'success');
                window.location.href = '/skills/${skill.id}';
              }
            } catch (error) {
              // Allow server-rendered HTML to display
            }
          }
        });
      })();
    </script>
  `;

  return layout(`Edit Skill: ${skill.name}`, content);
}

function renderCompanionRow(skillId: string, file: SkillFile): string {
  const size = file.file_size ? `${Math.max(1, Math.round(file.file_size / 1024))} KB` : 'Unknown';
  const type = file.mime_type || 'Unknown';
  return `
    <tr>
      <td><code>${escapeHtml(file.file_path)}</code></td>
      <td>${size}</td>
      <td>${escapeHtml(type)}</td>
      <td>
        <div class="action-bar" style="gap: 8px;">
          <a href="/api/skills/${skillId}/files/${file.id}" class="btn btn-ghost btn-sm" target="_blank">View</a>
          <button
            class="btn btn-danger btn-sm"
            hx-delete="/api/skills/${skillId}/files/${file.id}"
            hx-confirm="Delete this file?"
            hx-target="closest tr"
            hx-swap="delete"
            hx-on::after-request="window.UI && window.UI.showToast('File removed', 'success')">
            Remove
          </button>
        </div>
      </td>
    </tr>
  `;
}
