import type { ReactNode } from 'react';
import {
  Outlet,
  createRootRouteWithContext,
  HeadContent,
  Scripts,
} from '@tanstack/react-router';
import { ToastProvider } from '@/components/ui/toast';
import { Shell } from '@/components/layout/shell';
import type { RouterContext } from '@/router';
import appCss from '@/styles.css?url';

export const Route = createRootRouteWithContext<RouterContext>()({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      {
        title: 'Agent Config Adapter',
      },
      {
        name: 'description',
        content: 'Find, convert, and share working prompts and configs for Claude Code, Gemini CLI, and Codex.',
      },
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossOrigin: 'anonymous' },
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&family=Syne:wght@600;700&display=swap',
      },
    ],
  }),
  component: RootComponent,
  notFoundComponent: () => (
    <Shell>
      <div className="py-24 text-center">
        <p className="text-sm uppercase tracking-[0.2em] text-cyan">404</p>
        <h1 className="mt-3 font-display text-4xl font-semibold">Page not found</h1>
        <p className="mt-3 text-fog">That route doesn’t exist yet. Try the catalog instead.</p>
      </div>
    </Shell>
  ),
});

function RootComponent() {
  return (
    <RootDocument>
      <ToastProvider>
        <Shell>
          <Outlet />
        </Shell>
      </ToastProvider>
    </RootDocument>
  );
}

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body className="bg-ink text-snow antialiased">
        {children}
        <Scripts />
      </body>
    </html>
  );
}
