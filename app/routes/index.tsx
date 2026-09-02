import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowRight, Boxes, Repeat, Sparkles, Terminal } from 'lucide-react';
import { ButtonLink } from '@/components/ui/button-link';
import { Card } from '@/components/ui/card';
import { trackEvent } from '@/lib/api';
import { useEffect } from 'react';

export const Route = createFileRoute('/')({
  component: HomePage,
});

const features = [
  {
    to: '/skills',
    title: 'Skills',
    eyebrow: 'Most popular',
    icon: Sparkles,
    copy: 'Reusable prompt templates that teach your coding agent new capabilities — reviews, tests, refactors.',
  },
  {
    to: '/configs',
    title: 'Slash commands',
    eyebrow: 'Quick actions',
    icon: Terminal,
    copy: 'Type /review, /deploy, or /test. Works across Claude Code, Codex, and Gemini CLI.',
  },
  {
    to: '/slash-commands/convert',
    title: 'Converter',
    eyebrow: 'Cross-platform',
    icon: Repeat,
    copy: 'Take a Claude Code command and convert it for Gemini, Codex, and other coding agents.',
  },
  {
    to: '/extensions',
    title: 'Extensions',
    eyebrow: 'Bundles',
    icon: Boxes,
    copy: 'Curated collections of commands and skills you can download as a complete pack.',
  },
];

function HomePage() {
  useEffect(() => {
    trackEvent('landing');
  }, []);

  return (
    <div className="space-y-12">
      <section className="relative overflow-hidden rounded-3xl border border-line bg-ink-2 px-6 py-16 text-center sm:px-12">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.16),transparent_55%)]" />
        <p className="relative text-xs font-semibold uppercase tracking-[0.24em] text-cyan">Universal agent configs</p>
        <h1 className="relative mx-auto mt-4 max-w-3xl font-display text-4xl font-bold tracking-tight sm:text-6xl">
          Find working prompts for <span className="text-gradient">your coding agent</span>
        </h1>
        <p className="relative mx-auto mt-5 max-w-2xl text-lg text-fog">
          Discover slash commands, skills, and workflows for Claude Code, Gemini CLI, Codex, and the rest of your stack.
        </p>
        <div className="relative mt-8 flex flex-wrap justify-center gap-3">
          <ButtonLink href="/skills">
            Browse skills <ArrowRight className="size-4" />
          </ButtonLink>
          <ButtonLink href="/configs" variant="secondary">
            View all configs
          </ButtonLink>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        {features.map((feature) => {
          const Icon = feature.icon;
          return (
            <Link key={feature.to} to={feature.to} className="block">
              <Card className="h-full hover:-translate-y-0.5">
                <div className="mb-4 flex items-center gap-3">
                  <span className="flex size-11 items-center justify-center rounded-xl bg-cyan/10 text-cyan">
                    <Icon className="size-5" />
                  </span>
                  <div>
                    <p className="text-xs uppercase tracking-widest text-violet">{feature.eyebrow}</p>
                    <h2 className="font-display text-xl font-semibold">{feature.title}</h2>
                  </div>
                </div>
                <p className="text-sm leading-6 text-fog">{feature.copy}</p>
              </Card>
            </Link>
          );
        })}
      </section>

      <section className="rounded-3xl border border-line bg-ink-2/70 px-6 py-10 text-center">
        <h2 className="font-display text-2xl font-semibold">Works with your favorite agents</h2>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {[
            ['Claude Code', 'text-claude border-claude/30 bg-claude/10'],
            ['Gemini CLI', 'text-violet border-violet/30 bg-violet/10'],
            ['OpenAI Codex', 'text-cyan border-cyan/30 bg-cyan/10'],
            ['Jules, Lovable, v0…', 'text-fog border-line bg-ink-4'],
          ].map(([label, cls]) => (
            <span key={label} className={`rounded-full border px-4 py-2 text-sm font-semibold ${cls}`}>
              {label}
            </span>
          ))}
        </div>
      </section>
    </div>
  );
}
