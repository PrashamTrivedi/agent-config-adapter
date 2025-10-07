export const layout = (title: string, body: string): string => `<!DOCTYPE html>
<html lang="en" class="h-full">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="color-scheme" content="dark light" />
    <title>${title}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      rel="stylesheet"
      href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
    />
    <script>
      window.tailwind = window.tailwind || {};
      window.tailwind.config = {
        darkMode: 'media',
        theme: {
          extend: {
            fontFamily: {
              sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
            },
            colors: {
              surface: {
                light: '#f8fafc',
                dark: '#0f172a',
              },
            },
          },
        },
      };
    </script>
    <script src="https://cdn.tailwindcss.com?plugins=typography"></script>
    <script src="https://unpkg.com/htmx.org@1.9.12" integrity="sha384-fZLrVXqkuWBM/sKllVq+ZSVqe1SEjCtzcGjhkKfHfQwJauCM9xvYkwdY0GE3sxu1" crossorigin="anonymous"></script>
  </head>
  <body class="h-full bg-surface-light text-slate-900 antialiased transition-colors dark:bg-surface-dark dark:text-slate-100">
    <main class="min-h-full bg-white/60 backdrop-blur-sm dark:bg-slate-900/50" hx-boost="true">
      <div class="mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-10 lg:px-12">
        <header class="mb-10 flex flex-col gap-4 border-b border-slate-200 pb-6 dark:border-slate-800 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p class="text-sm font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Dashboard</p>
            <h1 class="mt-2 text-3xl font-semibold text-slate-900 dark:text-white">Agent Config Adapter</h1>
            <p class="mt-1 max-w-2xl text-sm text-slate-600 dark:text-slate-300">Centralize your Claude commands, agent definitions, and MCP configs, then export them instantly for every agent in your stack.</p>
          </div>
          <div class="flex gap-3 text-sm text-slate-500 dark:text-slate-400">
            <span class="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-1.5 dark:border-slate-700">
              <span class="h-2 w-2 rounded-full bg-emerald-500"></span>
              Ready to adapt
            </span>
          </div>
        </header>
        <div id="page-root" class="flex-1 pb-12">
          ${body}
        </div>
        <footer class="mt-auto border-t border-slate-200 pt-6 text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
          Crafted for multi-agent workflows · Tailwind-powered · Respects your system theme
        </footer>
      </div>
    </main>
  </body>
</html>`;
