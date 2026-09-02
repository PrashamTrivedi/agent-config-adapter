import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { api } from '@/lib/api';
import type { Extension } from '@/lib/types';
import { ButtonLink } from '@/components/ui/button-link';
import { Card } from '@/components/ui/card';
import { EmptyState, PageHeader, Skeleton } from '@/components/ui/page';

export const Route = createFileRoute('/extensions/')({
  component: ExtensionsPage,
});

function ExtensionsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['extensions'],
    queryFn: () => api<{ extensions: Extension[] }>('/api/extensions'),
  });

  return (
    <div>
      <PageHeader
        eyebrow="Bundles"
        title="Extensions"
        description="Packs of commands and skills you can download for Claude Code or Gemini CLI."
        actions={
          <ButtonLink href="/extensions/new">
            <Plus className="size-4" /> New extension
          </ButtonLink>
        }
      />
      {isLoading ? (
        <Skeleton className="h-40" />
      ) : !data?.extensions.length ? (
        <EmptyState title="No extensions yet" />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {data.extensions.map((ext) => (
            <Link key={ext.id} to="/extensions/$id" params={{ id: ext.id }} className="block">
              <Card className="h-full hover:-translate-y-0.5">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-display text-lg font-semibold">{ext.name}</h3>
                  <span className="text-xs text-mist">v{ext.version}</span>
                </div>
                <p className="mt-2 line-clamp-2 text-sm text-fog">{ext.description || 'No description'}</p>
                {ext.author ? <p className="mt-3 text-xs text-mist">by {ext.author}</p> : null}
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
