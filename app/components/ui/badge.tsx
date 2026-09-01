import { cn } from '@/lib/utils';

export function Badge({
  children,
  className,
  tone = 'cyan',
}: {
  children: React.ReactNode;
  className?: string;
  tone?: 'cyan' | 'violet' | 'amber' | 'teal' | 'claude' | 'fog';
}) {
  const tones = {
    cyan: 'bg-cyan/10 text-cyan border-cyan/30',
    violet: 'bg-violet/10 text-violet border-violet/30',
    amber: 'bg-amber/10 text-amber border-amber/30',
    teal: 'bg-teal/10 text-teal border-teal/30',
    claude: 'bg-claude/10 text-claude border-claude/30',
    fog: 'bg-ink-4 text-fog border-line',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide',
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
