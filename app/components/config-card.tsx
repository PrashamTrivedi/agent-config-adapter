import { Link } from '@tanstack/react-router';
import { Card } from '@/components/ui/card';
import { FormatBadge, TypeBadge } from '@/components/badges';
import { formatDate, parseJsonArray } from '@/lib/utils';
import type { Config } from '@/lib/types';

export function ConfigCard({ config, href }: { config: Config; href?: string }) {
  const phases = parseJsonArray<{ title: string }>(config.workflow_phases);
  const to = href ?? (config.type === 'skill' ? `/skills/${config.id}` : `/configs/${config.id}`);

  return (
    <Link to={to} className="block">
      <Card className="h-full hover:-translate-y-0.5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-display text-lg font-semibold text-snow">{config.name}</h3>
          <FormatBadge format={config.original_format} />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <TypeBadge type={config.type} />
          {config.owner_name ? <span className="text-xs text-mist">by {config.owner_name}</span> : null}
        </div>
        {config.type === 'workflow' && config.workflow_description ? (
          <p className="mt-3 line-clamp-2 text-sm text-fog">{config.workflow_description}</p>
        ) : null}
        {phases.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {phases.slice(0, 4).map((phase) => (
              <span key={phase.title} className="rounded-full bg-ink-4 px-2 py-0.5 text-[11px] text-fog">
                {phase.title}
              </span>
            ))}
          </div>
        ) : null}
        <p className="mt-4 text-xs text-mist">Created {formatDate(config.created_at)}</p>
      </Card>
    </Link>
  );
}
