import { cn } from '@/lib/utils';

export function EmptyState({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('rounded-2xl border border-dashed border-line bg-ink-2/50 px-6 py-16 text-center', className)}>
      <h3 className="font-display text-lg font-semibold text-snow">{title}</h3>
      {description ? <p className="mx-auto mt-2 max-w-md text-sm text-fog">{description}</p> : null}
      {action ? <div className="mt-6 flex justify-center">{action}</div> : null}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-xl bg-ink-4', className)} />;
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow ? (
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-cyan">{eyebrow}</p>
        ) : null}
        <h1 className="font-display text-3xl font-semibold tracking-tight text-snow sm:text-4xl">{title}</h1>
        {description ? <p className="mt-2 max-w-2xl text-fog">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}
