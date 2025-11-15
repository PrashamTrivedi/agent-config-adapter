import { Config, SkillWithFiles, SkillFile } from '../domain/types';
import { layout } from './layout';
import { icons } from './icons';

function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

/**
 * Skills List View
 */
export function skillsListView(skills: Config[]): string {
  const content = `
    <div class="fade-in">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px;">
        <div>
          <h2 style="margin: 0; display: flex; align-items: center; gap: 12px;">
            ${icons.star('icon')} Skills
          </h2>
          <p style="margin-top: 8px; color: var(--text-secondary);">
            Multi-file skills with companion resources
          </p>
        </div>
        <div>
          <a href="/skills/new" class="btn ripple">
            <span style="font-size: 1.1em;">+</span> Create New Skill
          </a>
          <a href="/" class="btn btn-secondary">← Home</a>
        </div>
      </div>

      ${
        skills.length === 0
          ? `
        <div class="no-results slide-up">
          <div style="margin-bottom: 10px;">
            ${icons.package('icon-lg')}
          </div>
          <h3 style="margin: 10px 0; color: var(--text-primary);">No skills yet</h3>
          <p style="margin-bottom: 20px;">Create your first multi-file skill to get started!</p>
          <a href="/skills/new" class="btn">Create Skill</a>
        </div>
      `
          : `
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(350px, 1fr)); gap: 20px; margin-top: 20px;">
          ${skills
            .map(
              (skill) => `
            <div class="card card-hover scale-in" style="position: relative;">
              <div style="margin-bottom: 12px;">
                <a href="/skills/${skill.id}" style="color: var(--text-primary); text-decoration: none; font-size: 1.1em; font-weight: 600; display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                  ${icons.file('icon')} ${escapeHtml(skill.name)}
                </a>
                <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                  <span class="badge">${skill.original_format}</span>
                  <span class="status-indicator status-info">
                    <span class="status-dot"></span>
                    Multi-file
                  </span>
                </div>
              </div>

              <div style="color: var(--text-secondary); font-size: 0.9em; margin-bottom: 16px;">
                <div style="margin-bottom: 4px; display: flex; align-items: center; gap: 6px;">
                  ${icons.calendar('icon')} Created ${new Date(skill.created_at).toLocaleDateString()}
                </div>
                <div style="display: flex; align-items: center; gap: 6px;">
                  ${icons.clock('icon')} Updated ${new Date(skill.updated_at).toLocaleDateString()}
                </div>
              </div>

              <div style="display: flex; gap: 8px; flex-wrap: wrap; padding-top: 12px; border-top: 1px solid var(--border-color);">
                <a href="/skills/${skill.id}" class="btn btn-secondary" style="flex: 1; text-align: center;">
                  View
                </a>
                <a href="/skills/${skill.id}/edit" class="btn btn-secondary" style="flex: 1; text-align: center;">
                  Edit
                </a>
                <a href="/api/skills/${skill.id}/download" class="btn btn-secondary" style="flex: 1; text-align: center; display: flex; align-items: center; justify-content: center; gap: 6px;" download>
                  ${icons.download('icon')} ZIP
                </a>
              </div>

              <button
                class="btn btn-danger"
                style="position: absolute; top: 12px; right: 12px; padding: 4px 10px; font-size: 0.85em; margin: 0;"
                hx-delete="/api/skills/${skill.id}"
                hx-confirm="Are you sure you want to delete this skill and all its files?"
                hx-target="closest .card"
                hx-swap="delete"
                data-success-message="Skill deleted successfully">
                ✕
              </button>
            </div>
          `
            )
            .join('')}
        </div>
      `
      }
    </div>
  `;

  return layout('Skills', content);
}

/**
 * Skill Detail View
 */
export function skillDetailView(skill: SkillWithFiles): string {
  const content = `
    <div class="fade-in">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px;">
        <div style="flex: 1;">
          <h2 style="margin: 0; display: flex; align-items: center; gap: 12px;">
            ${icons.file('icon')} ${escapeHtml(skill.name)}
          </h2>
          <div style="display: flex; gap: 10px; margin-top: 12px; flex-wrap: wrap;">
            <span class="badge">${skill.original_format}</span>
            <span class="status-indicator status-${skill.files.length > 0 ? 'success' : 'info'}">
              <span class="status-dot"></span>
              ${skill.files.length} companion file${skill.files.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
        <div style="display: flex; gap: 10px; flex-wrap: wrap;">
          <a href="/skills/${skill.id}/edit" class="btn ripple" style="display: flex; align-items: center; gap: 8px;">
            ${icons.edit('icon')} Edit
          </a>
          <a href="/api/skills/${skill.id}/download" class="btn ripple" download="${skill.name}.zip" style="display: flex; align-items: center; gap: 8px;">
            ${icons.download('icon')} Download ZIP
          </a>
          <a href="/skills" class="btn btn-secondary">← Back</a>
        </div>
      </div>

      <!-- Main Content Section -->
      <div class="card slide-up" style="margin-bottom: 24px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
          <h3 style="margin: 0; display: flex; align-items: center; gap: 10px;">
            ${icons.file('icon')} SKILL.md
          </h3>
          <button
            class="btn btn-secondary"
            style="padding: 6px 12px; font-size: 0.9em; display: inline-flex; align-items: center; gap: 6px;"
            onclick="copyToClipboard(\`${escapeHtml(skill.content).replace(/`/g, '\\`')}\`, this)">
            ${icons.clipboard('icon')} Copy Content
          </button>
        </div>
        <pre style="max-height: 500px; overflow: auto; margin: 0;">${escapeHtml(skill.content)}</pre>
      </div>

      ${
        skill.files.length > 0
          ? `
        <!-- Companion Files Section -->
        <div class="card slide-up" style="margin-bottom: 24px;">
          <h3 style="margin: 0 0 16px 0; display: flex; align-items: center; gap: 10px;">
            ${icons.package('icon')} Companion Files
          </h3>
          <div style="display: grid; gap: 12px;">
            ${skill.files
              .map(
                (file) => `
              <div class="card" style="background: var(--bg-primary); display: flex; justify-content: space-between; align-items: center; padding: 12px;">
                <div style="flex: 1;">
                  <div style="font-family: 'Courier New', monospace; color: var(--accent-primary); margin-bottom: 4px; display: flex; align-items: center; gap: 8px;">
                    ${icons.file('icon')} ${escapeHtml(file.file_path)}
                  </div>
                  <div style="font-size: 0.85em; color: var(--text-secondary); display: flex; gap: 16px;">
                    <span style="display: flex; align-items: center; gap: 6px;">${icons.barChart('icon')} ${file.file_size ? Math.round(file.file_size / 1024) + ' KB' : 'Unknown'}</span>
                    <span style="display: flex; align-items: center; gap: 6px;">${icons.tag('icon')} ${file.mime_type || 'Unknown'}</span>
                  </div>
                </div>
                <div style="display: flex; gap: 8px;">
                  <a href="/api/skills/${skill.id}/files/${file.id}" class="btn btn-secondary" style="padding: 6px 12px; font-size: 0.9em; display: inline-flex; align-items: center; gap: 6px;" target="_blank">
                    ${icons.eye('icon')} View
                  </a>
                  <button
                    class="btn btn-danger"
                    style="padding: 6px 12px; font-size: 0.9em; display: inline-flex; align-items: center; gap: 6px;"
                    hx-delete="/api/skills/${skill.id}/files/${file.id}"
                    hx-confirm="Delete this file?"
                    hx-target="closest .card"
                    hx-swap="delete"
                    data-success-message="File deleted successfully">
                    ${icons.trash('icon')}
                  </button>
                </div>
              </div>
            `
              )
              .join('')}
          </div>
        </div>
      `
          : `
        <div class="card slide-up" style="text-align: center; padding: 40px; margin-bottom: 24px;">
          <div style="margin-bottom: 12px;">
            ${icons.package('icon-lg')}
          </div>
          <h3 style="color: var(--text-primary); margin-bottom: 8px;">No companion files</h3>
          <p style="color: var(--text-secondary); margin-bottom: 20px;">
            Add companion files to enhance this skill
          </p>
          <a href="/skills/${skill.id}/edit" class="btn">Add Files</a>
        </div>
      `
      }

      <!-- Danger Zone -->
      <div class="card" style="border-color: var(--danger); background: rgba(248, 81, 73, 0.05); margin-bottom: 24px;">
        <h3 style="margin: 0 0 12px 0; color: var(--danger); display: flex; align-items: center; gap: 10px;">
          ${icons.warning('icon')} Danger Zone
        </h3>
        <p style="margin-bottom: 16px; color: var(--text-secondary);">
          Deleting this skill will remove all associated files. This action cannot be undone.
        </p>
        <button
          class="btn btn-danger ripple"
          style="display: inline-flex; align-items: center; gap: 8px;"
          hx-delete="/api/skills/${skill.id}"
          hx-confirm="Are you sure you want to permanently delete this skill and all its files? This cannot be undone."
          hx-swap="outerHTML"
          hx-target="body"
          data-success-message="Skill deleted successfully">
          ${icons.trash('icon')} Delete Skill
        </button>
      </div>

      <!-- Metadata Footer -->
      <div style="padding: 20px; background: var(--bg-secondary); border-radius: 6px; border: 1px solid var(--border-color);">
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; font-size: 0.9em;">
          <div>
            <div style="color: var(--text-secondary); margin-bottom: 4px; display: flex; align-items: center; gap: 6px;">
              ${icons.calendar('icon')} Created
            </div>
            <div style="color: var(--text-primary);">${new Date(skill.created_at).toLocaleString()}</div>
          </div>
          <div>
            <div style="color: var(--text-secondary); margin-bottom: 4px; display: flex; align-items: center; gap: 6px;">
              ${icons.clock('icon')} Last Updated
            </div>
            <div style="color: var(--text-primary);">${new Date(skill.updated_at).toLocaleString()}</div>
          </div>
          <div>
            <div style="color: var(--text-secondary); margin-bottom: 4px;">🆔 Skill ID</div>
            <div style="color: var(--text-primary); font-family: 'Courier New', monospace; font-size: 0.85em;">${skill.id}</div>
          </div>
        </div>
      </div>
    </div>
  `;

  return layout(`Skill: ${skill.name}`, content);
}

/**
 * Create Skill Form
 */
export function skillCreateView(): string {
  const content = `
    <div class="fade-in">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px;">
        <div>
          <h2 style="margin: 0; display: flex; align-items: center; gap: 12px;">
            ${icons.star('icon')} Create New Skill
          </h2>
          <p style="margin-top: 8px; color: var(--text-secondary);">
            Choose how you want to create your skill
          </p>
        </div>
        <a href="/skills" class="btn btn-secondary">← Back to Skills</a>
      </div>

      <!-- Tab Navigation -->
      <div class="tabs slide-up">
        <button class="tab-btn active" onclick="switchTab('form')" style="display: inline-flex; align-items: center; gap: 8px;">
          ${icons.edit('icon')} Manual Entry
        </button>
        <button class="tab-btn" onclick="switchTab('upload')" style="display: inline-flex; align-items: center; gap: 8px;">
          ${icons.upload('icon')} Upload ZIP
        </button>
      </div>

      <!-- Manual Entry Tab -->
      <div id="tab-form" class="tab-content active card scale-in">
        <form hx-post="/api/skills" hx-encoding="multipart/form-data">
          <div class="form-group">
            <label for="name">Skill Name *</label>
            <input
              type="text"
              id="name"
              name="name"
              required
              placeholder="My Awesome Skill">
            <span class="help-text">Give your skill a descriptive name</span>
          </div>

          <div class="form-group">
            <label for="original_format">Format *</label>
            <select id="original_format" name="original_format" required>
              <option value="claude_code">Claude Code</option>
              <option value="gemini">Gemini</option>
              <option value="codex">Codex</option>
            </select>
            <span class="help-text">Choose the target agent format</span>
          </div>

          <div class="form-group">
            <label for="content">SKILL.md Content *</label>
            <textarea
              id="content"
              name="content"
              rows="15"
              required
              placeholder="Enter your skill content here...&#10;&#10;This will be the main SKILL.md file."></textarea>
            <span class="help-text">You can add companion files after creating the skill</span>
          </div>

          <div style="display: flex; gap: 10px; padding-top: 20px; border-top: 1px solid var(--border-color);">
            <button type="submit" class="btn ripple" data-success-message="Skill created successfully">
              ${icons.check('icon')} Create Skill
            </button>
            <a href="/skills" class="btn btn-secondary">Cancel</a>
          </div>
        </form>
      </div>

      <!-- ZIP Upload Tab -->
      <div id="tab-upload" class="tab-content card scale-in" style="display: none;">
        <!-- Email Subscription Notice -->
        <div style="background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: 6px; padding: 14px 18px; margin-bottom: 20px; display: flex; align-items: center; gap: 12px;">
          <div style="font-size: 1.3em;">⚡</div>
          <div style="flex: 1;">
            <strong style="color: var(--text-primary);">Upload Access Required</strong>
            <p style="margin: 4px 0 0 0; color: var(--text-secondary); font-size: 0.9em;">
              Enter your email below to unlock uploads. <strong>Full user authentication coming soon!</strong>
              <a href="/subscriptions/form?return=/skills/new" style="color: var(--accent-primary); text-decoration: underline;">Subscribe here</a>
            </p>
          </div>
        </div>

        <div style="background: rgba(88, 166, 255, 0.1); border: 1px solid rgba(88, 166, 255, 0.3); padding: 16px; border-radius: 6px; margin-bottom: 20px;">
          <h4 style="margin: 0 0 8px 0; color: var(--accent-primary); display: flex; align-items: center; gap: 10px;">
            ${icons.package('icon')} ZIP Upload Requirements
          </h4>
          <ul style="margin: 0; padding-left: 20px; color: var(--text-secondary);">
            <li>ZIP must contain <code>SKILL.md</code> at the root level</li>
            <li>Companion files will be automatically detected and stored</li>
            <li>Directory structure will be preserved</li>
          </ul>
        </div>

        <form
          hx-post="/api/skills/upload-zip"
          hx-encoding="multipart/form-data"
          hx-on::before-request="this.setAttribute('hx-headers', JSON.stringify({'X-Subscriber-Email': document.getElementById('zip-subscriber-email').value}))">
          <div class="form-group">
            <label for="zip-subscriber-email">Your Email *</label>
            <input
              type="email"
              id="zip-subscriber-email"
              name="subscriber_email"
              required
              placeholder="you@example.com">
            <span class="help-text">
              Required for upload access.
              <a href="/subscriptions/form?return=/skills/new" style="color: var(--accent-primary); text-decoration: underline;">Subscribe here</a> if you don't have access.
            </span>
          </div>

          <div class="form-group">
            <label for="zip-name">Skill Name *</label>
            <input
              type="text"
              id="zip-name"
              name="name"
              required
              placeholder="My Awesome Skill">
            <span class="help-text">This will be the display name for your skill</span>
          </div>

          <div class="form-group">
            <label for="zip-format">Format *</label>
            <select id="zip-format" name="original_format" required>
              <option value="claude_code">Claude Code</option>
              <option value="gemini">Gemini</option>
              <option value="codex">Codex</option>
            </select>
            <span class="help-text">Choose the target agent format</span>
          </div>

          <div class="form-group">
            <label for="skill_zip">Upload ZIP File *</label>
            <div style="position: relative;">
              <input type="file" id="skill_zip" name="skill_zip" accept=".zip" required>
              <div class="progress-bar indeterminate htmx-indicator" style="margin-top: 10px;">
                <div class="progress-bar-fill"></div>
              </div>
            </div>
            <span class="help-text" style="display: flex; align-items: center; gap: 6px;">
              ${icons.download('icon')} Select a ZIP file containing SKILL.md and optional companion files
            </span>
          </div>

          <div style="display: flex; gap: 10px; padding-top: 20px; border-top: 1px solid var(--border-color);">
            <button type="submit" class="btn ripple" data-success-message="Skill uploaded and created successfully" style="display: inline-flex; align-items: center; gap: 8px;">
              ${icons.upload('icon')} Upload & Create
            </button>
            <a href="/skills" class="btn btn-secondary">Cancel</a>
          </div>
        </form>
      </div>

      <style>
        .tabs {
          display: flex;
          gap: 10px;
          margin-bottom: 24px;
          border-bottom: 2px solid var(--border-color);
        }

        .tab-btn {
          padding: 12px 24px;
          border: none;
          background: transparent;
          cursor: pointer;
          font-size: 1rem;
          color: var(--text-secondary);
          border-bottom: 3px solid transparent;
          margin-bottom: -2px;
          transition: all 0.2s ease;
          font-weight: 500;
        }

        .tab-btn:hover {
          color: var(--text-primary);
          background: var(--bg-tertiary);
        }

        .tab-btn.active {
          color: var(--accent-primary);
          border-bottom-color: var(--accent-primary);
        }

        .tab-content {
          padding-top: 0;
        }
      </style>

      <script>
        function switchTab(tab) {
          // Update tab buttons
          document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
          });
          event.target.classList.add('active');

          // Update tab content
          document.querySelectorAll('.tab-content').forEach(content => {
            content.style.display = 'none';
            content.classList.remove('scale-in');
          });

          const targetTab = document.getElementById('tab-' + tab);
          targetTab.style.display = 'block';
          // Trigger reflow to restart animation
          void targetTab.offsetWidth;
          targetTab.classList.add('scale-in');
        }

        // Auto-populate email from localStorage
        document.addEventListener('DOMContentLoaded', function() {
          const storedEmail = localStorage.getItem('subscriberEmail')
          if (storedEmail) {
            const emailInput = document.getElementById('zip-subscriber-email')
            if (emailInput) {
              emailInput.value = storedEmail
            }
          }
        })
      </script>
    </div>
  `;

  return layout('Create Skill', content);
}

/**
 * Edit Skill Form (with multi-file editor)
 */
export function skillEditView(skill: SkillWithFiles): string {
  const content = `
    <div class="fade-in">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px;">
        <div>
          <h2 style="margin: 0; display: flex; align-items: center; gap: 12px;">
            ${icons.edit('icon')} Edit Skill
          </h2>
          <p style="margin-top: 8px; color: var(--text-secondary);">
            ${escapeHtml(skill.name)}
          </p>
        </div>
        <div style="display: flex; gap: 10px;">
          <a href="/skills/${skill.id}" class="btn btn-secondary">← Back to Skill</a>
          <a href="/skills" class="btn btn-secondary">All Skills</a>
        </div>
      </div>

      <!-- Main Metadata Form -->
      <div class="card slide-up" style="margin-bottom: 24px;">
        <h3 style="margin: 0 0 20px 0; display: flex; align-items: center; gap: 10px;">
          ${icons.file('icon')} Skill Metadata
        </h3>
        <form id="edit-form" hx-put="/api/skills/${skill.id}" hx-encoding="multipart/form-data">
          <div class="form-group">
            <label for="name">Skill Name *</label>
            <input
              type="text"
              id="name"
              name="name"
              value="${escapeHtml(skill.name)}"
              required
              placeholder="My Awesome Skill">
            <span class="help-text">The display name for this skill</span>
          </div>

          <div class="form-group">
            <label for="original_format">Format *</label>
            <select id="original_format" name="original_format" required>
              <option value="claude_code" ${skill.original_format === 'claude_code' ? 'selected' : ''}>Claude Code</option>
              <option value="gemini" ${skill.original_format === 'gemini' ? 'selected' : ''}>Gemini</option>
              <option value="codex" ${skill.original_format === 'codex' ? 'selected' : ''}>Codex</option>
            </select>
            <span class="help-text">Target agent format for this skill</span>
          </div>

          <div class="form-group">
            <label for="content">SKILL.md Content *</label>
            <textarea
              id="content"
              name="content"
              rows="15"
              required
              placeholder="Enter your skill content...">${escapeHtml(skill.content)}</textarea>
            <span class="help-text">The main skill definition file</span>
          </div>

          <div style="display: flex; gap: 10px; padding-top: 20px; border-top: 1px solid var(--border-color);">
            <button type="submit" class="btn ripple" data-success-message="Skill updated successfully">
              ${icons.check('icon')} Save Changes
            </button>
            <a href="/skills/${skill.id}" class="btn btn-secondary">Cancel</a>
          </div>
        </form>
      </div>

      <!-- Companion Files Section -->
      <div class="card slide-up" style="margin-bottom: 24px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
          <div>
            <h3 style="margin: 0; display: flex; align-items: center; gap: 10px;">
              ${icons.package('icon')} Companion Files
            </h3>
            <p style="margin: 8px 0 0 0; color: var(--text-secondary); font-size: 0.9em;">
              Additional files that work alongside SKILL.md (e.g., FORMS.md, utils.js)
            </p>
          </div>
          <span class="status-indicator status-${skill.files.length > 0 ? 'success' : 'info'}">
            <span class="status-dot"></span>
            ${skill.files.length} file${skill.files.length !== 1 ? 's' : ''}
          </span>
        </div>

        ${
          skill.files.length > 0
            ? `
          <div id="files-list" style="display: grid; gap: 12px; margin-bottom: 24px;">
            ${skill.files
              .map(
                (file) => `
              <div class="card" style="background: var(--bg-primary); display: flex; justify-content: space-between; align-items: center; padding: 12px;">
                <div style="flex: 1;">
                  <div style="font-family: 'Courier New', monospace; color: var(--accent-primary); margin-bottom: 4px; display: flex; align-items: center; gap: 8px;">
                    ${icons.file('icon')} ${escapeHtml(file.file_path)}
                  </div>
                  <div style="font-size: 0.85em; color: var(--text-secondary); display: flex; align-items: center; gap: 6px;">
                    ${icons.barChart('icon')} ${file.file_size ? Math.round(file.file_size / 1024) + ' KB' : 'Unknown'}
                  </div>
                </div>
                <button
                  class="btn btn-danger"
                  style="padding: 6px 12px; font-size: 0.9em; display: inline-flex; align-items: center; gap: 6px;"
                  hx-delete="/api/skills/${skill.id}/files/${file.id}"
                  hx-confirm="Delete this file?"
                  hx-target="closest .card"
                  hx-swap="delete"
                  data-success-message="File deleted successfully">
                  ${icons.trash('icon')} Delete
                </button>
              </div>
            `
              )
              .join('')}
          </div>
        `
            : `
          <div id="files-list" style="text-align: center; padding: 30px; background: var(--bg-tertiary); border-radius: 6px; margin-bottom: 24px;">
            <div style="margin-bottom: 8px;">${icons.folder('icon-lg')}</div>
            <p style="color: var(--text-secondary); margin: 0;">No companion files yet</p>
          </div>
        `
        }

        <!-- Add File Form -->
        <div style="background: var(--bg-tertiary); padding: 20px; border-radius: 6px; border: 2px dashed var(--border-color);">
          <h4 style="margin: 0 0 16px 0; color: var(--text-primary); display: flex; align-items: center; gap: 8px;">
            ${icons.plus('icon')} Add New File
          </h4>
          <form hx-post="/api/skills/${skill.id}/files" hx-encoding="multipart/form-data" hx-target="#files-list" hx-swap="beforeend">
            <div class="form-group">
              <label for="file_path">File Path *</label>
              <input
                type="text"
                id="file_path"
                name="file_path"
                placeholder="e.g., FORMS.md or utils/helper.js"
                required>
              <span class="help-text" style="display: flex; align-items: center; gap: 6px;">
                ${icons.folder('icon')} Use forward slashes for subdirectories
              </span>
            </div>

            <div class="form-group">
              <label for="file_content">File Content *</label>
              <input type="file" id="file_content" name="file_content" required>
              <span class="help-text" style="display: flex; align-items: center; gap: 6px;">
                ${icons.paperclip('icon')} Select the file to upload
              </span>
            </div>

            <button type="submit" class="btn ripple" data-success-message="File added successfully">
              <span style="font-size: 1.1em;">+</span> Add File
            </button>
          </form>
        </div>
      </div>
    </div>
  `;

  return layout(`Edit Skill: ${skill.name}`, content);
}
