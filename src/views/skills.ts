import { Config, SkillWithFiles, SkillFile } from '../domain/types';
import { layout } from './layout';

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
    <h2>Skills</h2>
    <div style="margin-bottom: 20px;">
      <a href="/skills/new" class="btn">Create New Skill</a>
      <a href="/" class="btn btn-secondary">Back to Home</a>
    </div>

    ${
      skills.length === 0
        ? `
      <p class="no-results">No skills yet. Create your first multi-file skill!</p>
    `
        : `
      <table class="table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Format</th>
            <th>Created</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${skills
            .map(
              (skill) => `
            <tr>
              <td><a href="/skills/${skill.id}">${escapeHtml(skill.name)}</a></td>
              <td><span class="badge">${skill.original_format}</span></td>
              <td>${new Date(skill.created_at).toLocaleDateString()}</td>
              <td>
                <a href="/skills/${skill.id}/edit" class="btn btn-sm">Edit</a>
                <a href="/api/skills/${skill.id}/download" class="btn btn-sm" download>Download ZIP</a>
                <button
                  class="btn btn-sm btn-danger"
                  hx-delete="/api/skills/${skill.id}"
                  hx-confirm="Are you sure you want to delete this skill and all its files?"
                  hx-target="closest tr"
                  hx-swap="delete">
                  Delete
                </button>
              </td>
            </tr>
          `
            )
            .join('')}
        </tbody>
      </table>
    `
    }
  `;

  return layout('Skills', content);
}

/**
 * Skill Detail View
 */
export function skillDetailView(skill: SkillWithFiles): string {
  const content = `
    <h2>${escapeHtml(skill.name)}</h2>
    <div style="margin-bottom: 20px;">
      <span class="badge">${skill.original_format}</span>
      <span class="badge" style="background: #10b981;">${skill.files.length} companion files</span>
    </div>

    <div style="margin-bottom: 20px;">
      <a href="/skills/${skill.id}/edit" class="btn">Edit</a>
      <a href="/api/skills/${skill.id}/download" class="btn" download="${skill.name}.zip">Download ZIP</a>
      <a href="/skills" class="btn btn-secondary">Back to List</a>
      <button
        class="btn btn-danger"
        hx-delete="/api/skills/${skill.id}"
        hx-confirm="Are you sure you want to delete this skill and all its files?"
        hx-swap="outerHTML"
        hx-target="body">
        Delete
      </button>
    </div>

    <h3>SKILL.md</h3>
    <pre style="background: #f5f5f5; padding: 15px; border-radius: 5px; max-height: 400px; overflow: auto;">${escapeHtml(skill.content)}</pre>

    ${
      skill.files.length > 0
        ? `
      <h3>Companion Files</h3>
      <table class="table">
        <thead>
          <tr>
            <th>File Path</th>
            <th>Size</th>
            <th>Type</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${skill.files
            .map(
              (file) => `
            <tr>
              <td><code>${escapeHtml(file.file_path)}</code></td>
              <td>${file.file_size ? Math.round(file.file_size / 1024) + ' KB' : 'Unknown'}</td>
              <td>${file.mime_type || 'Unknown'}</td>
              <td>
                <a href="/api/skills/${skill.id}/files/${file.id}" class="btn btn-sm" target="_blank">View</a>
                <button
                  class="btn btn-sm btn-danger"
                  hx-delete="/api/skills/${skill.id}/files/${file.id}"
                  hx-confirm="Delete this file?"
                  hx-target="closest tr"
                  hx-swap="delete">
                  Delete
                </button>
              </td>
            </tr>
          `
            )
            .join('')}
        </tbody>
      </table>
    `
        : ''
    }

    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
      <small style="color: var(--text-secondary);">
        Created: ${new Date(skill.created_at).toLocaleString()}<br>
        Updated: ${new Date(skill.updated_at).toLocaleString()}
      </small>
    </div>
  `;

  return layout(`Skill: ${skill.name}`, content);
}

/**
 * Create Skill Form
 */
export function skillCreateView(): string {
  const content = `
    <h2>Create New Skill</h2>

    <!-- Tab Navigation -->
    <div class="tabs">
      <button class="tab-btn active" onclick="switchTab('form')">Manual Entry</button>
      <button class="tab-btn" onclick="switchTab('upload')">Upload ZIP</button>
    </div>

    <!-- Manual Entry Tab -->
    <div id="tab-form" class="tab-content active">
      <form hx-post="/api/skills" hx-encoding="multipart/form-data">
        <div class="form-group">
          <label for="name">Skill Name *</label>
          <input type="text" id="name" name="name" required>
        </div>

        <div class="form-group">
          <label for="original_format">Format *</label>
          <select id="original_format" name="original_format" required>
            <option value="claude_code">Claude Code</option>
            <option value="gemini">Gemini</option>
            <option value="codex">Codex</option>
          </select>
        </div>

        <div class="form-group">
          <label for="content">SKILL.md Content *</label>
          <textarea
            id="content"
            name="content"
            rows="15"
            required
            placeholder="Enter your skill content here..."></textarea>
        </div>

        <div style="margin-bottom: 20px;">
          <button type="submit" class="btn">Create Skill</button>
          <a href="/skills" class="btn btn-secondary">Cancel</a>
        </div>
      </form>
    </div>

    <!-- ZIP Upload Tab -->
    <div id="tab-upload" class="tab-content" style="display: none;">
      <form hx-post="/api/skills/upload-zip" hx-encoding="multipart/form-data">
        <div class="form-group">
          <label for="zip-name">Skill Name *</label>
          <input type="text" id="zip-name" name="name" required>
        </div>

        <div class="form-group">
          <label for="zip-format">Format *</label>
          <select id="zip-format" name="original_format" required>
            <option value="claude_code">Claude Code</option>
            <option value="gemini">Gemini</option>
            <option value="codex">Codex</option>
          </select>
        </div>

        <div class="form-group">
          <label for="skill_zip">Upload ZIP File *</label>
          <input type="file" id="skill_zip" name="skill_zip" accept=".zip" required>
          <small style="color: var(--text-secondary); display: block; margin-top: 5px;">
            ZIP must contain SKILL.md at root level. Companion files will be preserved.
          </small>
        </div>

        <div style="margin-bottom: 20px;">
          <button type="submit" class="btn">Upload & Create</button>
          <a href="/skills" class="btn btn-secondary">Cancel</a>
        </div>
      </form>
    </div>

    <style>
      .tabs {
        display: flex;
        gap: 10px;
        margin-bottom: 20px;
        border-bottom: 2px solid #e5e7eb;
      }

      .tab-btn {
        padding: 10px 20px;
        border: none;
        background: transparent;
        cursor: pointer;
        font-size: 1rem;
        color: var(--text-secondary);
        border-bottom: 2px solid transparent;
        margin-bottom: -2px;
      }

      .tab-btn.active {
        color: var(--primary);
        border-bottom-color: var(--primary);
        font-weight: 500;
      }

      .tab-content {
        padding-top: 20px;
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
        });
        document.getElementById('tab-' + tab).style.display = 'block';
      }
    </script>
  `;

  return layout('Create Skill', content);
}

/**
 * Edit Skill Form (with multi-file editor)
 */
export function skillEditView(skill: SkillWithFiles): string {
  const content = `
    <h2>Edit Skill: ${escapeHtml(skill.name)}</h2>

    <form id="edit-form" hx-put="/api/skills/${skill.id}" hx-encoding="multipart/form-data">
      <div class="form-group">
        <label for="name">Skill Name *</label>
        <input type="text" id="name" name="name" value="${escapeHtml(skill.name)}" required>
      </div>

      <div class="form-group">
        <label for="original_format">Format *</label>
        <select id="original_format" name="original_format" required>
          <option value="claude_code" ${skill.original_format === 'claude_code' ? 'selected' : ''}>Claude Code</option>
          <option value="gemini" ${skill.original_format === 'gemini' ? 'selected' : ''}>Gemini</option>
          <option value="codex" ${skill.original_format === 'codex' ? 'selected' : ''}>Codex</option>
        </select>
      </div>

      <div class="form-group">
        <label for="content">SKILL.md Content *</label>
        <textarea
          id="content"
          name="content"
          rows="15"
          required>${escapeHtml(skill.content)}</textarea>
      </div>

      <div style="margin-bottom: 20px;">
        <button type="submit" class="btn">Save Changes</button>
        <a href="/skills/${skill.id}" class="btn btn-secondary">Cancel</a>
      </div>
    </form>

    <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">

    <h3>Companion Files</h3>
    <p style="color: var(--text-secondary); margin-bottom: 15px;">
      Add additional files that work alongside SKILL.md (e.g., FORMS.md, utils.js).
    </p>

    ${
      skill.files.length > 0
        ? `
      <table class="table" style="margin-bottom: 20px;">
        <thead>
          <tr>
            <th>File Path</th>
            <th>Size</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody id="files-list">
          ${skill.files
            .map(
              (file) => `
            <tr>
              <td><code>${escapeHtml(file.file_path)}</code></td>
              <td>${file.file_size ? Math.round(file.file_size / 1024) + ' KB' : 'Unknown'}</td>
              <td>
                <button
                  class="btn btn-sm btn-danger"
                  hx-delete="/api/skills/${skill.id}/files/${file.id}"
                  hx-confirm="Delete this file?"
                  hx-target="closest tr"
                  hx-swap="delete">
                  Delete
                </button>
              </td>
            </tr>
          `
            )
            .join('')}
        </tbody>
      </table>
    `
        : '<p style="color: var(--text-secondary); font-style: italic;">No companion files yet.</p>'
    }

    <form hx-post="/api/skills/${skill.id}/files" hx-encoding="multipart/form-data" hx-target="#files-list" hx-swap="beforeend">
      <div class="form-group">
        <label for="file_path">File Path *</label>
        <input
          type="text"
          id="file_path"
          name="file_path"
          placeholder="e.g., FORMS.md or utils/helper.js"
          required>
        <small style="color: var(--text-secondary); display: block; margin-top: 5px;">
          Use forward slashes for subdirectories.
        </small>
      </div>

      <div class="form-group">
        <label for="file_content">File Content *</label>
        <input type="file" id="file_content" name="file_content" required>
      </div>

      <button type="submit" class="btn">Add File</button>
    </form>
  `;

  return layout(`Edit Skill: ${skill.name}`, content);
}
