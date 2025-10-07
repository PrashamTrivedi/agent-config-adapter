import type { AgentConfig } from '@domain/config';

const statusClasses = {
  success:
    'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-500/10 dark:text-emerald-200',
  error:
    'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900/60 dark:bg-rose-500/10 dark:text-rose-200',
};

const renderStatus = (message?: string): string => {
  if (!message) return '';
  const tone = message.toLowerCase().startsWith('error') ? 'error' : 'success';
  return `
    <div
      role="status"
      class="mb-8 rounded-xl border px-4 py-3 text-sm font-medium shadow-sm ${statusClasses[tone]}"
    >
      ${message}
    </div>
  `;
};

const renderConfigsTable = (configs: AgentConfig[]): string => {
  if (configs.length === 0) {
    return `
      <div class="rounded-2xl border border-dashed border-slate-300 bg-white/70 p-10 text-center text-sm text-slate-500 shadow-sm dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-400">
        <p class="font-medium text-slate-600 dark:text-slate-300">No configs yet</p>
        <p class="mt-2 text-slate-500 dark:text-slate-400">Add your first Claude command or agent definition using the form below to see conversions appear instantly.</p>
      </div>
    `;
  }

  return `
    <div class="overflow-hidden rounded-2xl border border-slate-200 bg-white/80 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
      <table class="min-w-full divide-y divide-slate-200 text-left text-sm text-slate-600 dark:divide-slate-800 dark:text-slate-300">
        <thead class="bg-slate-50/80 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-900/70 dark:text-slate-400">
          <tr>
            <th class="px-6 py-4">Name</th>
            <th class="px-6 py-4">Type</th>
            <th class="px-6 py-4">Original Format</th>
            <th class="px-6 py-4">Created</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100/70 dark:divide-slate-800">
          ${configs
            .map(
              (config) => `
                <tr class="transition hover:bg-slate-50/80 dark:hover:bg-slate-800/60">
                  <td class="px-6 py-4 font-medium text-slate-900 dark:text-slate-100">
                    <a class="inline-flex items-center gap-2 text-slate-900 transition hover:text-slate-600 dark:text-slate-100 dark:hover:text-slate-300" href="/configs/${config.id}">
                      ${config.name}
                      <svg class="h-4 w-4 text-slate-400" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M7.5 5h7m0 0v7m0-7L6 13.5" />
                      </svg>
                    </a>
                  </td>
                  <td class="px-6 py-4 capitalize">${config.type.replace(/_/g, ' ')}</td>
                  <td class="px-6 py-4 capitalize">${config.originalFormat.replace(/_/g, ' ')}</td>
                  <td class="px-6 py-4 text-slate-500 dark:text-slate-400">${new Date(config.createdAt).toLocaleString()}</td>
                </tr>
              `
            )
            .join('')}
        </tbody>
      </table>
    </div>
  `;
};

export const homeView = (configs: AgentConfig[], message?: string): string => `
  ${renderStatus(message)}
  <div class="grid gap-10 xl:grid-cols-[2fr,1fr]">
    <section class="space-y-6">
      <div class="flex items-center justify-between">
        <h2 class="text-lg font-semibold text-slate-900 dark:text-white">Configurations</h2>
        <span class="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-300">${configs.length} stored</span>
      </div>
      ${renderConfigsTable(configs)}
    </section>
    <section>
      <div class="rounded-2xl border border-slate-200 bg-white/80 p-6 shadow-lg ring-1 ring-black/5 dark:border-slate-800 dark:bg-slate-900/80">
        <h2 class="text-lg font-semibold text-slate-900 dark:text-white">Add configuration</h2>
        <p class="mt-1 text-sm text-slate-600 dark:text-slate-400">We default to Claude Code formatting, but you can drop in any supported agent config.</p>
        <form class="mt-6 space-y-5" hx-post="/configs" hx-target="#page-root" hx-swap="innerHTML">
          <div class="space-y-4">
            <label class="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Name
              <input
                type="text"
                name="name"
                required
                class="mt-1 w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200 dark:border-slate-700 dark:bg-slate-950/60 dark:text-white dark:focus:border-slate-500 dark:focus:ring-slate-700/60"
              />
            </label>
            <div class="grid gap-4 sm:grid-cols-2">
              <label class="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Type
                <select
                  name="type"
                  class="mt-1 w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200 dark:border-slate-700 dark:bg-slate-950/60 dark:text-white dark:focus:border-slate-500 dark:focus:ring-slate-700/60"
                >
                  <option value="slash_command">Slash Command</option>
                  <option value="agent_definition">Agent Definition</option>
                  <option value="mcp_config">MCP Config</option>
                </select>
              </label>
              <label class="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Original Format
                <select
                  name="originalFormat"
                  class="mt-1 w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200 dark:border-slate-700 dark:bg-slate-950/60 dark:text-white dark:focus:border-slate-500 dark:focus:ring-slate-700/60"
                >
                  <option value="claude_code">Claude Code</option>
                  <option value="codex_agents">Codex Agents</option>
                  <option value="jules_manifest">Jules Manifest</option>
                </select>
              </label>
            </div>
          </div>
          <label class="block text-sm font-medium text-slate-700 dark:text-slate-300">
            Content
            <textarea
              name="content"
              rows="6"
              required
              placeholder="/my-command\nDescription or steps..."
              class="mt-1 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-mono text-sm text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200 dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-100 dark:focus:border-slate-500 dark:focus:ring-slate-700/60"
            ></textarea>
          </label>
          <button
            type="submit"
            class="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-900/10 transition hover:bg-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
          >
            Save configuration
          </button>
        </form>
      </div>
    </section>
  </div>
`;
