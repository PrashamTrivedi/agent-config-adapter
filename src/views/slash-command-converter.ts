import { Config } from '../domain/types';
import { layout } from './layout';
import { icons } from './icons';

// Helper to escape HTML
function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (m: string) => {
    const escapeMap: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return escapeMap[m];
  });
}

// Main converter page - shows command selection with search
export function slashCommandConverterView(commands: Config[], searchQuery?: string): string {
  const content = `
    <div class="fade-in">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
        <h2 style="margin: 0;">🔄 Slash Command Converter</h2>
      </div>
      <p style="color: var(--text-secondary); margin-bottom: 20px;">
        Convert Claude Code slash commands for use in other AI agents (Claude Code Web, Codex, Gemini).
        Select a command below to analyze and convert it.
      </p>

      <div class="card" style="padding: 20px; margin-bottom: 30px;">
        <div class="form-group" style="margin-bottom: 0;">
          <label for="command-search">🔍 Search Commands</label>
          <div style="position: relative;">
            <input
              type="text"
              id="command-search"
              name="search"
              placeholder="Type to search commands..."
              value="${searchQuery || ''}"
              hx-get="/slash-commands/convert"
              hx-trigger="keyup changed delay:300ms"
              hx-target="#command-select-container"
              hx-swap="innerHTML"
              hx-indicator="#search-spinner"
              style="margin-bottom: 10px; padding-right: 40px;"
            />
            <span id="search-spinner" class="htmx-indicator" style="position: absolute; right: 12px; top: 12px;">
              <span class="spinner"></span>
            </span>
          </div>
        </div>

        <div id="command-select-container" class="slide-up">
          ${slashCommandConverterDropdownPartial(commands, searchQuery)}
        </div>
      </div>

      <!-- Dynamic form section (loaded via HTMX when command selected) -->
      <div id="converter-form-section" style="margin-top: 30px;">
        <!-- Form will be loaded here based on selected command -->
      </div>
    </div>
  `;

  return layout('Slash Command Converter', content);
}

// Partial for dropdown options (for HTMX updates)
export function slashCommandConverterDropdownPartial(commands: Config[], searchQuery?: string): string {
  // Auto-select if there's exactly one result from search
  const autoSelect = searchQuery && commands.length === 1;

  return `
    <div class="form-group">
      <label for="command-select">Select Slash Command</label>
      <select
        id="command-select"
        name="configId"
        hx-get="/slash-commands/converter-form"
        hx-target="#converter-form-section"
        hx-swap="innerHTML"
        hx-trigger="change">
        <option value="">-- Select a command to convert --</option>
        ${commands.map(c => `
          <option value="${c.id}" ${autoSelect ? 'selected' : ''}>${escapeHtml(c.name)}</option>
        `).join('')}
      </select>
      ${commands.length === 0 ? `
        <div class="status-indicator status-warning" style="margin-top: 10px;">
          <span class="status-dot"></span>
          ${searchQuery ? `No commands match "${escapeHtml(searchQuery)}"` : 'No slash commands available'}
        </div>
      ` : `
        <div class="status-indicator status-success" style="margin-top: 10px;">
          <span class="status-dot"></span>
          ${commands.length} command${commands.length === 1 ? '' : 's'} found
        </div>
      `}
    </div>

    ${autoSelect ? `
      <script>
        // Auto-trigger form load when single result is auto-selected
        (function() {
          const select = document.getElementById('command-select');
          if (select && select.value) {
            htmx.trigger(select, 'change');
          }
        })();
      </script>
    ` : ''}
  `;
}

// Dynamic form loaded when a command is selected
export function slashCommandConverterFormPartial(config: Config): string {
  // Parse analysis metadata
  const hasArguments = !!config.has_arguments;
  const argumentHint = config.argument_hint;
  const agentReferences = config.agent_references ? JSON.parse(config.agent_references) : [];
  const skillReferences = config.skill_references ? JSON.parse(config.skill_references) : [];

  return `
    <div class="converter-form card scale-in">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
        <h3 style="margin: 0;">${escapeHtml(config.name)}</h3>
        <span class="status-indicator ${hasArguments || agentReferences.length > 0 || skillReferences.length > 0 ? 'status-warning' : 'status-success'}">
          <span class="status-dot"></span>
          ${hasArguments || agentReferences.length > 0 || skillReferences.length > 0 ? 'Requires Processing' : 'Simple Command'}
        </span>
      </div>

      <!-- Copy Original Prompt Section - Primary Action -->
      <div class="card" style="margin-bottom: 20px; background: linear-gradient(135deg, rgba(6, 182, 212, 0.08) 0%, rgba(139, 92, 246, 0.08) 100%); border: 1px solid var(--border-accent);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <label style="font-weight: 600; display: flex; align-items: center; gap: 8px; margin: 0;">
            ${icons.clipboard('icon')} Original Prompt (Copy Verbatim)
          </label>
          <button
            class="btn ripple copy-btn"
            id="copy-original-btn"
            onclick="requireAuth(() => copyOriginalContent())"
            style="display: inline-flex; align-items: center; gap: 8px;">
            ${icons.clipboard('icon')} Copy Original
          </button>
        </div>
        <pre id="original-content" style="margin: 0; max-height: 250px; overflow-y: auto; font-size: 0.85em;">${escapeHtml(config.content)}</pre>
        <p style="margin: 10px 0 0 0; font-size: 0.85em; color: var(--text-tertiary);">
          Use this to copy the prompt as-is without any conversion or processing.
        </p>
      </div>

      <!-- Analysis info box (collapsible) - Collapsed by Default -->
      <details class="card" style="margin-bottom: 20px; background: rgba(88, 166, 255, 0.05); border-left: 4px solid var(--accent-primary);">
        <summary style="cursor: pointer; padding: 15px; font-weight: 600; list-style: none; user-select: none;">
          ${icons.barChart('icon')} Analysis Results
          <span style="float: right; font-size: 0.875em; color: var(--text-secondary);">▶</span>
        </summary>
        <div style="padding: 0 15px 15px 15px;">
          <ul style="margin-left: 20px; margin-top: 10px; line-height: 1.8;">
            <li><strong>Requires arguments:</strong> ${hasArguments ? '<span class="status-indicator status-warning">Yes</span>' : '<span class="status-indicator status-success">No</span>'}</li>
            ${agentReferences.length > 0 ? `
              <li><strong>Agent references:</strong> ${agentReferences.map((a: string) => `<span class="badge">${escapeHtml(a)}</span>`).join(' ')}</li>
            ` : ''}
            ${skillReferences.length > 0 ? `
              <li><strong>Skill references:</strong> ${skillReferences.map((s: string) => `<span class="badge">${escapeHtml(s)}</span>`).join(' ')}</li>
            ` : ''}
            ${!hasArguments && agentReferences.length === 0 && skillReferences.length === 0 ? `
              <li><strong>Status:</strong> <span class="status-indicator status-success"><span class="status-dot"></span> No special processing needed</span></li>
            ` : ''}
          </ul>

          <button
            type="button"
            id="refresh-analysis-btn"
            class="btn btn-secondary ripple"
            onclick="requireAuth(() => htmx.ajax('POST', '/api/configs/${config.id}/refresh-analysis', {target: '#refresh-status', swap: 'innerHTML', indicator: '#refresh-spinner'}))"
            data-success-message="Analysis refreshed successfully"
            style="margin-top: 15px;">
            🔄 Refresh Analysis
          </button>
          <span id="refresh-spinner" class="htmx-indicator" style="margin-left: 10px;">
            <span class="spinner"></span>
          </span>
          <span class="help-text" style="display: block; margin-top: 5px;">
            Re-detect arguments and references
          </span>

          <div id="refresh-status" style="margin-top: 10px;"></div>
        </div>
      </details>

      <form
        id="convert-form"
        hx-post="/api/slash-commands/${config.id}/convert"
        hx-target="#result-section"
        hx-swap="innerHTML transition:true"
        hx-indicator="#convert-progress"
        hx-ext="json-enc">

        <!-- Conditionally show argument input if has_arguments=true -->
        ${hasArguments ? `
          <div class="form-group">
            <label for="userArguments">Arguments <span style="color: var(--danger);">*</span></label>
            <input
              type="text"
              id="userArguments"
              name="userArguments"
              required
              placeholder="${argumentHint ? escapeHtml(argumentHint) : 'Enter arguments here...'}"
            />
            <span class="form-error-message"></span>
            ${argumentHint ? `
              <span class="help-text">
                💡 ${escapeHtml(argumentHint)}
              </span>
            ` : `
              <span class="help-text">
                This command requires arguments to function properly
              </span>
            `}
          </div>
        ` : ''}

        <div style="padding-top: 15px; border-top: 1px solid var(--border-color);">
          <button
            type="button"
            id="convert-btn"
            class="btn ripple"
            onclick="requireAuth(() => htmx.trigger('#convert-form', 'submit'))"
            data-loading-text="⏳ Converting...">
            ${icons.sparkles('icon')} Convert Command
          </button>
          <div id="convert-progress" class="htmx-indicator" style="margin-left: 10px; display: inline-flex; align-items: center; gap: 8px;">
            <span class="spinner"></span>
            <span>Analyzing and converting your command...</span>
          </div>
        </div>
      </form>

      <!-- Result section -->
      <div id="result-section" style="margin-top: 2rem">
        <!-- Results will be inserted here via HTMX -->
      </div>

      <script>
        // Copy original content function
        function copyOriginalContent() {
          const content = document.getElementById('original-content').textContent;
          const btn = document.getElementById('copy-original-btn');
          window.copyToClipboard(content, btn);
        }

        // Form validation
        const form = document.getElementById('convert-form');
        if (form) {
          form.addEventListener('submit', function(e) {
            if (!window.validateForm(form)) {
              e.preventDefault();
              window.showToast('Please fill in all required fields', 'error');
              return;
            }

            // Clear previous results and show loading state
            const resultSection = document.getElementById('result-section');
            resultSection.innerHTML = \`
              <div class="card scale-in" style="padding: 30px; text-align: center;">
                <div class="spinner spinner-large" style="margin: 0 auto 15px;"></div>
                <p style="color: var(--text-secondary); margin: 0;">
                  🔄 Converting your slash command...
                </p>
                <p style="color: var(--text-tertiary); font-size: 0.875em; margin-top: 5px;">
                  This may take a few seconds
                </p>
              </div>
            \`;

            // Scroll result section into view
            setTimeout(() => {
              resultSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }, 100);
          });
        }

        // Auto-reload form after analysis refresh to show updated metadata
        document.body.addEventListener('htmx:afterSwap', function(evt) {
          if (evt.detail.target.id === 'refresh-status' && evt.detail.xhr.status === 200) {
            window.showToast('Analysis refreshed! Reloading form...', 'success');
            setTimeout(() => {
              // Reload the form partial
              const configId = '${config.id}';
              htmx.ajax('GET', '/slash-commands/converter-form?configId=' + configId, {
                target: '#converter-form-section',
                swap: 'innerHTML'
              });
            }, 2000);
          }

          // Smooth scroll to results after successful conversion
          if (evt.detail.target.id === 'result-section' && evt.detail.xhr.status === 200) {
            setTimeout(() => {
              evt.detail.target.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }, 150);
          }
        });

        // Smooth toggle for details/summary
        const details = document.querySelector('details');
        if (details) {
          details.addEventListener('toggle', function() {
            const arrow = this.querySelector('summary span[style*="float: right"]');
            if (arrow) {
              arrow.textContent = this.open ? '▼' : '▶';
            }
          });
        }
      </script>
    </div>
  `;
}

// Success result display
export function slashCommandConversionResultPartial(
  convertedContent: string,
  analysis: {
    hasArguments: boolean | null;
    argumentHint?: string;
    agentReferences: string[] | null;
    skillReferences: string[] | null;
  }
): string {
  const agentRefs = analysis.agentReferences || [];
  const skillRefs = analysis.skillReferences || [];

  return `
    <div class="card scale-in" style="border-left: 4px solid #3fb950;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
        <h3 style="margin: 0; color: #3fb950; display: flex; align-items: center; gap: 8px;">
          ${icons.checkCircle('icon')} Conversion Complete
        </h3>
        <span class="status-indicator status-success">
          <span class="status-dot"></span>
          Ready to use
        </span>
      </div>

      <details class="card" style="margin-bottom: 20px; background: rgba(63, 185, 80, 0.05);">
        <summary style="cursor: pointer; padding: 15px; font-weight: 600; list-style: none; user-select: none;">
          ${icons.barChart('icon')} Processing Summary
          <span style="float: right; font-size: 0.875em; color: var(--text-secondary);">▶</span>
        </summary>
        <div style="padding: 0 15px 15px 15px;">
          <ul style="margin-left: 20px; margin-top: 10px; line-height: 1.8;">
            <li><strong>Arguments processed:</strong> ${analysis.hasArguments ? '<span class="status-indicator status-success">Yes</span>' : '<span class="status-indicator status-info">No</span>'}</li>
            <li><strong>Agent references:</strong> ${agentRefs.length > 0 ? agentRefs.map(ref => `<span class="badge">${ref}</span>`).join(' ') : '<span class="status-indicator status-info">None</span>'}</li>
            <li><strong>Skill references:</strong> ${skillRefs.length > 0 ? skillRefs.map(ref => `<span class="badge">${ref}</span>`).join(' ') : '<span class="status-indicator status-info">None</span>'}</li>
            <li><strong>Frontmatter removed:</strong> <span class="status-indicator status-success">Yes</span></li>
          </ul>
        </div>
      </details>

      <div class="converted-content">
        <label for="output-textarea" style="display: block; margin-bottom: 10px; font-weight: 600;">
          📝 Converted Command (Ready to Copy):
        </label>
        <textarea
          readonly
          id="output-textarea"
          class="output-textarea"
          rows="20"
          onclick="this.select()"
        >${escapeHtml(convertedContent)}</textarea>
        <button
          class="btn btn-secondary copy-btn ripple"
          onclick="requireAuth(() => copyOutput())"
          style="margin-top: 15px;">
          ${icons.clipboard('icon')} Copy to Clipboard
        </button>
      </div>
    </div>

    <script>
      function copyOutput() {
        const textarea = document.getElementById('output-textarea');
        window.copyToClipboard(textarea.value, event.target);
      }

      // Show success toast
      window.showToast('Conversion completed successfully!', 'success');

      // Smooth toggle for details/summary
      document.querySelector('details').addEventListener('toggle', function() {
        const arrow = this.querySelector('summary span[style*="float: right"]');
        if (arrow) {
          arrow.textContent = this.open ? '▼' : '▶';
        }
      });
    </script>
  `;
}

// Needs user input result display
export function slashCommandNeedsInputPartial(
  analysis: {
    hasArguments: boolean | null;
    argumentHint?: string;
    agentReferences: string[] | null;
    skillReferences: string[] | null;
  }
): string {
  return `
    <div class="card scale-in" style="border-left: 4px solid #d29922;">
      <div style="display: flex; align-items: flex-start; gap: 15px;">
        <div>${icons.warning('icon-lg')}</div>
        <div style="flex: 1;">
          <h3 style="margin: 0 0 10px 0; color: #d29922;">Arguments Required</h3>
          <p style="margin: 0 0 10px 0;">This command requires arguments. Please provide them in the form above and convert again.</p>
          ${analysis.argumentHint ? `
            <div class="status-indicator status-warning">
              <span class="status-dot"></span>
              Hint: ${escapeHtml(analysis.argumentHint)}
            </div>
          ` : ''}
        </div>
      </div>
    </div>
    <script>
      window.showToast('Please provide required arguments', 'warning');
      // Scroll to and focus the arguments input
      const argsInput = document.getElementById('userArguments');
      if (argsInput) {
        argsInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => argsInput.focus(), 500);
      }
    </script>
  `;
}
