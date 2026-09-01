import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { api, trackEvent } from '@/lib/api';
import type { Marketplace } from '@/lib/types';
import { ButtonLink } from '@/components/ui/button-link';
import { Card } from '@/components/ui/card';
import { EmptyState, PageHeader, Skeleton } from '@/components/ui/page';

export const Route = createFileRoute('/marketplaces/')({
  component: MarketplacesPage,
});

function MarketplacesPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['marketplaces'],
    queryFn: () => {
      trackEvent('marketplace_browse');
      return api<{ marketplaces: Marketplace[] }>('/api/marketplaces');
    },
  });

  return (
    <div>
      <PageHeader
        eyebrow="Collections"
        title="Marketplaces"
        description="Groups of extensions you can install as a set."
        actions={
          <ButtonLink href="/marketplaces/new">
            <Plus className="size-4" /> New marketplace
          </ButtonLink>
        }
      />
      {isLoading ? (
        <Skeleton className="h-40" />
      ) : !data?.marketplaces.length ? (
        <EmptyState title="No marketplaces yet" />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {data.marketplaces.map((item) => (
            <Link key={item.id} to="/marketplaces/$id" params={{ id: item.id }} className="block">
              <Card className="h-full hover:-translate-y-0.5">
                <h3 className="font-display text-lg font-semibold">{item.name}</h3>
                <p className="mt-2 line-clamp-2 text-sm text-fog">{item.description || 'No description'}</p>
                <p className="mt-3 text-xs text-mist">
                  {item.owner_name} · v{item.version}
                </p>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
