import type { ConfigWithConversions } from '@domain/config';

const renderConversion = (format: string, value: string): string => `
  <article class="rounded-2xl border border-slate-200 bg-white/80 shadow-md ring-1 ring-black/5 transition hover:-translate-y-1 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900/80 dark:ring-white/10">
    <header class="border-b border-slate-100 px-6 py-4 dark:border-slate-800">
      <h3 class="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">${format}</h3>
    </header>
    <div class="px-6 py-5">
      <pre class="overflow-x-auto rounded-xl bg-slate-950/95 px-4 py-4 text-xs text-slate-100 shadow-inner dark:bg-slate-950"><code>${value.replace(/[&<>]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[char] ?? char))}</code></pre>
    </div>
  </article>
`;

export const detailView = (config: ConfigWithConversions): string => `
  <section class="mb-10 flex flex-col gap-6 rounded-3xl border border-slate-200 bg-white/70 p-8 shadow-lg dark:border-slate-800 dark:bg-slate-900/70">
    <div class="flex items-center justify-between gap-4">
      <div class="space-y-3">
        <a class="inline-flex items-center text-sm font-medium text-slate-500 transition hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200" href="/">
          <svg class="mr-2 h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12.5 5 7.5 10l5 5" />
          </svg>
          Back to list
        </a>
        <h2 class="text-2xl font-semibold text-slate-900 dark:text-white">${config.name}</h2>
        <dl class="grid gap-4 text-sm text-slate-600 dark:text-slate-300 sm:grid-cols-3">
          <div>
            <dt class="font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Type</dt>
            <dd class="mt-1 capitalize text-slate-900 dark:text-slate-100">${config.type.replace(/_/g, ' ')}</dd>
          </div>
          <div>
            <dt class="font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Original format</dt>
            <dd class="mt-1 capitalize text-slate-900 dark:text-slate-100">${config.originalFormat.replace(/_/g, ' ')}</dd>
          </div>
          <div>
            <dt class="font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Created</dt>
            <dd class="mt-1 text-slate-600 dark:text-slate-300">${new Date(config.createdAt).toLocaleString()}</dd>
          </div>
        </dl>
      </div>
      <div class="hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-100 to-slate-50 px-6 py-5 text-right text-xs font-medium uppercase tracking-wide text-slate-500 shadow-inner dark:border-slate-700 dark:from-slate-800 dark:to-slate-900 lg:block">
        <p>Conversions ready</p>
        <p class="mt-2 text-3xl font-semibold text-slate-900 dark:text-white">${Object.keys(config.conversions).length}</p>
      </div>
    </div>
  </section>
  <section class="space-y-6">
    <div class="flex items-center justify-between">
      <h2 class="text-lg font-semibold text-slate-900 dark:text-white">Converted formats</h2>
      <span class="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">${Object.keys(config.conversions).length} variants</span>
    </div>
    <div class="grid gap-6 lg:grid-cols-2">
      ${Object.entries(config.conversions)
        .map(([format, value]) => renderConversion(format, value))
        .join('')}
    </div>
  </section>
`;
