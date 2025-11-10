import { Config } from '../domain/types';
import { layout } from './layout';

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (m: string) => {
    const escapeMap: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };
    return escapeMap[m];
  });
}

export function slashCommandConverterView(commands: Config[], searchQuery?: string): string {
  const content = `
    <section class="page-header">
      <div>
        <p class="eyebrow">Conversion toolkit</p>
        <h2>Slash command converter</h2>
        <p class="lead">Search commands, review analysis, and convert between Claude Code, Codex, and Gemini formats.</p>
      </div>
      <div class="action-bar">
        <a href="/configs" class="btn btn-tertiary">Back to configs</a>
      </div>
    </section>

    <section class="panel" id="command-search-panel">
      <div class="panel-header">
        <h3 class="panel-title">Find a slash command</h3>
        <span class="form-helper">Type to filter commands instantly.</span>
      </div>
      <div class="form-section">
        <div class="form-group">
          <label for="command-search">Search commands</label>
          <input
            type="search"
            id="command-search"
            name="search"
            placeholder="Search by name"
            value="${escapeHtml(searchQuery || '')}"
            hx-get="/slash-commands/convert"
            hx-trigger="keyup changed delay:400ms"
            hx-target="#command-select-container"
            hx-include="this"
            aria-label="Search slash commands" />
        </div>
      </div>
      <div id="command-select-container">
        ${slashCommandConverterDropdownPartial(commands, searchQuery)}
      </div>
    </section>

    <div id="converter-form-section"></div>

    <script>
      (function initConverterPage() {
        if (window.__converterInitBound) return;
        window.__converterInitBound = true;
        document.addEventListener('htmx:afterSwap', (event) => {
          if (event.detail?.target?.id === 'result-section' && event.detail?.xhr?.status === 200) {
            window.UI?.showToast('Conversion complete', 'success');
          }
        });
      })();
    </script>
  `;

  return layout('Slash Command Converter', content);
}

export function slashCommandConverterDropdownPartial(commands: Config[], searchQuery?: string): string {
  const autoSelect = Boolean(searchQuery) && commands.length === 1;
  return `
    <div class="form-group">
      <label for="command-select">Select a command</label>
      <select
        id="command-select"
        name="configId"
        aria-label="Select slash command"
        hx-get="/slash-commands/converter-form"
        hx-target="#converter-form-section"
        hx-swap="innerHTML"
        hx-trigger="change">
        <option value="">${commands.length ? 'Choose a command to convert' : 'No commands found'}</option>
        ${commands.map((command) => `
          <option value="${command.id}" ${autoSelect ? 'selected' : ''}>${escapeHtml(command.name)}</option>
        `).join('')}
      </select>
      <span class="form-helper">${commands.length} command${commands.length === 1 ? '' : 's'} available.</span>
    </div>
    ${autoSelect ? `
      <script>
        (function autoSelectCommand() {
          const select = document.getElementById('command-select');
          if (select && select instanceof HTMLSelectElement && select.value) {
            htmx.trigger(select, 'change');
          }
        })();
      </script>
    ` : ''}
  `;
}

export function slashCommandConverterFormPartial(config: Config): string {
  const hasArguments = Boolean(config.has_arguments);
  const argumentHint = config.argument_hint;
  const agentReferences = config.agent_references ? JSON.parse(config.agent_references) : [];
  const skillReferences = config.skill_references ? JSON.parse(config.skill_references) : [];

  return `
    <section class="panel fade-in">
      <div class="panel-header">
        <h3 class="panel-title">${escapeHtml(config.name)}</h3>
        <div class="action-bar">
          <button class="btn btn-ghost btn-sm" type="button" data-copy="${escapeHtml(config.id)}">Copy ID</button>
          <button
            class="btn btn-secondary btn-sm"
            type="button"
            hx-post="/api/configs/${config.id}/refresh-analysis"
            hx-target="#analysis-refresh-status"
            hx-swap="innerHTML">
            Refresh analysis
          </button>
        </div>
      </div>
      <div class="resource-grid">
        <article class="card">
          <h4>Arguments required</h4>
          <p>${hasArguments ? 'Yes' : 'No'}</p>
        </article>
        <article class="card">
          <h4>Agent references</h4>
          <p>${agentReferences.length ? escapeHtml(agentReferences.join(', ')) : 'None detected'}</p>
        </article>
        <article class="card">
          <h4>Skill references</h4>
          <p>${skillReferences.length ? escapeHtml(skillReferences.join(', ')) : 'None detected'}</p>
        </article>
      </div>
      <div id="analysis-refresh-status" style="min-height: 20px; color: var(--text-muted);"></div>
      <div class="divider"></div>
      <form
        class="form-section"
        hx-post="/api/slash-commands/${config.id}/convert"
        hx-target="#result-section"
        hx-swap="innerHTML"
        hx-ext="json-enc">
        ${hasArguments ? `
          <div class="form-group">
            <label for="userArguments">Arguments *</label>
            <input
              id="userArguments"
              name="userArguments"
              type="text"
              required
              placeholder="${escapeHtml(argumentHint || 'Comma separated arguments')}" />
            <span class="form-helper">${argumentHint ? escapeHtml(argumentHint) : 'Provide command arguments for accurate conversion.'}</span>
          </div>
        ` : ''}
        <div class="action-bar" style="justify-content: flex-end;">
          <button class="btn btn-primary" type="submit">Convert command</button>
        </div>
      </form>
      <div id="result-section" style="margin-top: 18px;"></div>
    </section>

    <script>
      (function initRefreshListener() {
        if (window.__converterRefreshBound) return;
        window.__converterRefreshBound = true;
        document.addEventListener('htmx:afterSwap', (event) => {
          if (event.detail?.target?.id === 'analysis-refresh-status') {
            window.UI?.showToast('Analysis refreshed. Reloading…', 'info');
            const commandId = '${config.id}';
            setTimeout(() => {
              htmx.ajax('GET', '/slash-commands/converter-form?configId=' + commandId, { target: '#converter-form-section', swap: 'innerHTML' });
            }, 1200);
          }
        });
      })();
    </script>
  `;
}

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
    <section class="panel fade-in">
      <div class="panel-header">
        <h3 class="panel-title">Conversion complete</h3>
        <span class="badge status-success">Ready to copy</span>
      </div>
      <div class="resource-grid">
        <article class="card">
          <h4>Arguments processed</h4>
          <p>${analysis.hasArguments ? 'Yes' : 'No'}</p>
        </article>
        <article class="card">
          <h4>Agent references</h4>
          <p>${agentRefs.length ? escapeHtml(agentRefs.join(', ')) : 'None'}</p>
        </article>
        <article class="card">
          <h4>Skill references</h4>
          <p>${skillRefs.length ? escapeHtml(skillRefs.join(', ')) : 'None'}</p>
        </article>
      </div>
      <div class="divider"></div>
      <div class="form-group">
        <label for="converted-output">Converted command</label>
        <textarea id="converted-output" readonly rows="12" style="width: 100%; border-radius: var(--radius-md); background: rgba(15, 23, 42, 0.6); border: 1px solid rgba(148, 163, 184, 0.25); color: var(--text-primary);">${escapeHtml(convertedContent)}</textarea>
        <div class="action-bar" style="justify-content: flex-end; margin-top: 12px;">
          <button class="btn btn-secondary" type="button" data-copy-target="#converted-output">Copy to clipboard</button>
        </div>
      </div>
    </section>
  `;
}

export function slashCommandNeedsInputPartial(
  analysis: {
    hasArguments: boolean | null;
    argumentHint?: string;
    agentReferences: string[] | null;
    skillReferences: string[] | null;
  }
): string {
  return `
    <section class="panel" style="border: 1px solid rgba(251, 191, 36, 0.35);">
      <div class="panel-header">
        <h3 class="panel-title">Arguments required</h3>
        <span class="badge status-warning">Action needed</span>
      </div>
      <p style="margin: 0; color: var(--text-muted);">Provide arguments in the form above and run the conversion again.</p>
      ${analysis.argumentHint ? `<p style="margin: 12px 0 0; color: var(--text-muted);"><strong>Hint:</strong> ${escapeHtml(analysis.argumentHint)}</p>` : ''}
    </section>
  `;
}
