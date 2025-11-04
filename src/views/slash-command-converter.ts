import { Config } from '../domain/types';
import { layout } from './layout';

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
    <h2>Slash Command Converter</h2>
    <p style="color: var(--text-secondary); margin-bottom: 20px;">
      Convert Claude Code slash commands for use in other AI agents (Claude Code Web, Codex, Gemini).
      Select a command below to analyze and convert it.
    </p>

    <div class="form-group">
      <label for="command-search">Search Commands</label>
      <input
        type="text"
        id="command-search"
        name="search"
        placeholder="Search by name..."
        value="${searchQuery || ''}"
        hx-get="/slash-commands/convert"
        hx-trigger="keyup changed delay:500ms"
        hx-target="#command-select-container"
        hx-swap="innerHTML"
        style="margin-bottom: 10px;"
      />
    </div>

    <div id="command-select-container">
      ${slashCommandConverterDropdownPartial(commands, searchQuery)}
    </div>

    <!-- Dynamic form section (loaded via HTMX when command selected) -->
    <div id="converter-form-section" style="margin-top: 30px;">
      <!-- Form will be loaded here based on selected command -->
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
        <small class="help-text" style="color: var(--text-secondary);">
          ${searchQuery ? `No commands match "${escapeHtml(searchQuery)}"` : 'No slash commands available'}
        </small>
      ` : `
        <small class="help-text" style="color: var(--text-secondary);">
          ${commands.length} command${commands.length === 1 ? '' : 's'} available
        </small>
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
  const hasArguments = config.has_arguments === 1 || config.has_arguments === true;
  const argumentHint = config.argument_hint;
  const agentReferences = config.agent_references ? JSON.parse(config.agent_references) : [];
  const skillReferences = config.skill_references ? JSON.parse(config.skill_references) : [];

  return `
    <div class="converter-form">
      <h3>${escapeHtml(config.name)}</h3>

      <!-- Analysis info box -->
      <div class="analysis-info">
        <p><strong>Analysis Results:</strong></p>
        <ul style="margin-left: 20px; margin-top: 10px;">
          <li>Requires arguments: ${hasArguments ? 'Yes' : 'No'}</li>
          ${agentReferences.length > 0 ? `
            <li>Agent references detected: ${agentReferences.map((a: string) => escapeHtml(a)).join(', ')}</li>
          ` : ''}
          ${skillReferences.length > 0 ? `
            <li>Skill references detected: ${skillReferences.map((s: string) => escapeHtml(s)).join(', ')}</li>
          ` : ''}
          ${!hasArguments && agentReferences.length === 0 && skillReferences.length === 0 ? `
            <li>No special processing needed - simple command</li>
          ` : ''}
        </ul>

        <button
          class="btn btn-secondary"
          hx-post="/api/configs/${config.id}/refresh-analysis"
          hx-target="#refresh-status"
          hx-swap="innerHTML"
          style="margin-top: 10px;">
          🔄 Refresh Analysis
        </button>
        <span style="font-size: 0.875em; color: var(--text-secondary); margin-left: 10px;">
          (Re-detect arguments and references)
        </span>

        <div id="refresh-status" style="margin-top: 10px;"></div>
      </div>

      <form
        hx-post="/api/slash-commands/${config.id}/convert"
        hx-target="#result-section"
        hx-swap="innerHTML"
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
            ${argumentHint ? `
              <small class="help-text">
                Hint: ${escapeHtml(argumentHint)}
              </small>
            ` : `
              <small class="help-text">
                This command requires arguments to function properly
              </small>
            `}
          </div>
        ` : ''}

        <button type="submit" class="btn">Convert Command</button>
      </form>

      <!-- Result section -->
      <div id="result-section" style="margin-top: 2rem">
        <!-- Results will be inserted here via HTMX -->
      </div>

      <script>
        // Auto-reload form after analysis refresh to show updated metadata
        document.body.addEventListener('htmx:afterSwap', function(evt) {
          if (evt.detail.target.id === 'refresh-status' && evt.detail.xhr.status === 200) {
            setTimeout(() => {
              // Reload the form partial
              const configId = '${config.id}';
              htmx.ajax('GET', '/slash-commands/converter-form?configId=' + configId, {
                target: '#converter-form-section',
                swap: 'innerHTML'
              });
            }, 2000);
          }
        });
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
    <div class="result-success">
      <h3>✓ Conversion Complete</h3>

      <div class="analysis-info" style="margin-top: 15px;">
        <p><strong>Processing Summary:</strong></p>
        <ul style="margin-left: 20px; margin-top: 10px;">
          <li>Arguments processed: ${analysis.hasArguments ? 'Yes' : 'No'}</li>
          <li>Agent references: ${agentRefs.length > 0 ? agentRefs.join(', ') : 'None'}</li>
          <li>Skill references: ${skillRefs.length > 0 ? skillRefs.join(', ') : 'None'}</li>
          <li>Frontmatter removed: Yes</li>
        </ul>
      </div>

      <div class="converted-content">
        <label for="output-textarea"><strong>Converted Command (Ready to Copy):</strong></label>
        <textarea
          readonly
          id="output-textarea"
          class="output-textarea"
          rows="20"
          onclick="this.select()"
        >${escapeHtml(convertedContent)}</textarea>
        <button
          class="btn btn-secondary"
          onclick="copyToClipboard()"
          style="margin-top: 10px;">
          📋 Copy to Clipboard
        </button>
      </div>
    </div>

    <script>
      function copyToClipboard() {
        const textarea = document.getElementById('output-textarea');
        textarea.select();
        document.execCommand('copy');

        // Show feedback
        const btn = event.target;
        const originalText = btn.textContent;
        btn.textContent = '✓ Copied!';
        btn.style.background = '#238636';

        setTimeout(() => {
          btn.textContent = originalText;
          btn.style.background = '';
        }, 2000);
      }
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
    <div class="result-needs-input">
      <p class="warning">⚠️ This command requires arguments. Please provide them in the form above and convert again.</p>
      ${analysis.argumentHint ? `
        <p><strong>Hint:</strong> ${escapeHtml(analysis.argumentHint)}</p>
      ` : ''}
    </div>
  `;
}
