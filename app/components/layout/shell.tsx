import { Link, useNavigate, useRouterState } from '@tanstack/react-router';
import {
  Boxes,
  Command,
  Home,
  LogIn,
  Menu,
  Repeat,
  Server,
  Sparkles,
  Store,
  Terminal,
  User,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useSession } from '@/hooks/use-session';
import { Button } from '@/components/ui/button';
import { ButtonLink } from '@/components/ui/button-link';

const links = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/skills', label: 'Skills', icon: Sparkles },
  { to: '/configs', label: 'Configs', icon: Command },
  { to: '/slash-commands/convert', label: 'Converter', icon: Repeat },
  { to: '/extensions', label: 'Extensions', icon: Boxes },
  { to: '/marketplaces', label: 'Marketplaces', icon: Store },
  { to: '/mcp/info', label: 'MCP', icon: Server },
  { to: '/cli', label: 'CLI', icon: Terminal },
];

function Logo() {
  return (
    <Link to="/" className="flex items-center gap-3">
      <span className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan to-violet text-ink shadow-[0_0_24px_rgba(34,211,238,0.25)]">
        <Sparkles className="size-5" />
      </span>
      <span className="font-display text-lg font-semibold tracking-tight">
        Agent Config <span className="text-gradient">Adapter</span>
      </span>
    </Link>
  );
}

export function Header() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-line/80 glass">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Logo />
        <nav className="hidden items-center gap-1 lg:flex">
          {links.map((link) => {
            const active = pathname === link.to || (link.to !== '/' && pathname.startsWith(link.to));
            const Icon = link.icon;
            return (
              <Link
                key={link.to}
                to={link.to}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-fog transition hover:bg-ink-4 hover:text-snow',
                  active && 'bg-ink-4 text-cyan ring-1 ring-cyan/30'
                )}
              >
                <Icon className="size-3.5" />
                {link.label}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-2">
          {session?.user ? (
            <Link
              to="/profile"
              className="hidden items-center gap-2 rounded-full border border-line bg-ink-3 px-2 py-1 pr-3 text-sm text-snow sm:inline-flex"
            >
              {session.user.image ? (
                <img src={session.user.image} alt="" className="size-7 rounded-full" />
              ) : (
                <span className="flex size-7 items-center justify-center rounded-full bg-ink-4">
                  <User className="size-3.5" />
                </span>
              )}
              {session.user.name?.split(' ')[0] || 'Profile'}
            </Link>
          ) : (
            <ButtonLink href="/auth/login" variant="secondary" className="hidden sm:inline-flex">
              <LogIn className="size-3.5" />
              Sign in
            </ButtonLink>
          )}
          <Button variant="ghost" className="lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu">
            <Menu className="size-5" />
          </Button>
        </div>
      </div>
      {open ? (
        <div className="fixed inset-0 z-[60] bg-ink/80 lg:hidden" onClick={() => setOpen(false)}>
          <div
            className="absolute right-0 top-0 h-full w-80 max-w-[85vw] border-l border-line bg-ink-2 p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-6 flex items-center justify-between">
              <p className="font-display font-semibold">Menu</p>
              <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
                <X className="size-4" />
              </Button>
            </div>
            <div className="flex flex-col gap-1">
              {links.map((link) => {
                const Icon = link.icon;
                return (
                  <Link
                    key={link.to}
                    to={link.to}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-2 rounded-xl px-3 py-3 text-fog hover:bg-ink-4 hover:text-snow"
                  >
                    <Icon className="size-4" />
                    {link.label}
                  </Link>
                );
              })}
              <Link
                to={session?.user ? '/profile' : '/auth/login'}
                onClick={() => setOpen(false)}
                className="mt-3 flex items-center gap-2 rounded-xl px-3 py-3 text-cyan"
              >
                <User className="size-4" />
                {session?.user ? 'Profile' : 'Sign in'}
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}

export function Footer() {
  return (
    <footer className="mt-16 border-t border-line bg-ink-2/80">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4 sm:px-6">
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-cyan">Product</p>
          <div className="flex flex-col gap-2 text-sm text-fog">
            <Link to="/configs">Configs</Link>
            <Link to="/skills">Skills</Link>
            <Link to="/extensions">Extensions</Link>
            <Link to="/marketplaces">Marketplaces</Link>
            <Link to="/slash-commands/convert">Converter</Link>
            <Link to="/mcp/info">MCP Server</Link>
            <Link to="/cli">CLI Tool</Link>
          </div>
        </div>
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-cyan">Resources</p>
          <div className="flex flex-col gap-2 text-sm text-fog">
            <a href="https://github.com/PrashamTrivedi/agent-config-adapter" target="_blank" rel="noreferrer">
              Documentation
            </a>
            <a href="https://github.com/PrashamTrivedi/agent-config-adapter/issues" target="_blank" rel="noreferrer">
              Community
            </a>
            <a href="https://github.com/PrashamTrivedi/agent-config-adapter" target="_blank" rel="noreferrer">
              GitHub
            </a>
          </div>
        </div>
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-cyan">For teams</p>
          <div className="flex flex-col gap-2 text-sm text-fog">
            <Link to="/onboarding/no-code-builders">No-code builders</Link>
            <Link to="/onboarding/multi-tool-orgs">Multi-tool orgs</Link>
            <Link to="/onboarding/ai-pilot-teams">AI pilot teams</Link>
          </div>
        </div>
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-cyan">Stay in the loop</p>
          <p className="mb-3 text-sm text-fog">Get notified when uploads and new agent formats launch.</p>
          <ButtonLink href="/subscriptions/form" variant="secondary">
            Get updates
          </ButtonLink>
        </div>
      </div>
      <div className="border-t border-line">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 text-xs text-mist sm:px-6">
          <p>© {new Date().getFullYear()} Agent Config Adapter</p>
          <p>Claude Code · Gemini CLI · Codex</p>
        </div>
      </div>
    </footer>
  );
}

export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-grid min-h-screen">
      <Header />
      <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">{children}</main>
      <Footer />
    </div>
  );
}

export function useRequireAuth() {
  const { data: session } = useSession();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  function requireAuth(action: () => void) {
    if (session?.user) {
      action();
      return;
    }
    setOpen(true);
  }

  function AuthGate() {
    if (!open) return null;
    return (
      <div className="fixed inset-0 z-[70] flex items-center justify-center bg-ink/70 p-4 backdrop-blur-sm">
        <div className="w-full max-w-md rounded-2xl border border-line bg-ink-2 p-6">
          <h2 className="font-display text-xl font-semibold">Sign in required</h2>
          <p className="mt-2 text-sm text-fog">
            Create, edit, and manage configs from your account. Browsing stays open to everyone.
          </p>
          <div className="mt-6 flex gap-2">
            <Button
              className="flex-1"
              onClick={() =>
                navigate({
                  to: '/auth/login',
                  search: { return: window.location.pathname },
                })
              }
            >
              Sign in
            </Button>
            <Button variant="secondary" className="flex-1" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return { requireAuth, AuthGate, user: session?.user ?? null };
}
