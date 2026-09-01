import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useMutation, useQuery } from '@tanstack/react-query';
import { api, handleWriteError } from '@/lib/api';
import type { MarketplaceWithExtensions } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { ButtonLink } from '@/components/ui/button-link';
import { Card } from '@/components/ui/card';
import { EmptyState, PageHeader, Skeleton } from '@/components/ui/page';
import { useToast } from '@/components/ui/toast';
import { useRequireAuth } from '@/components/layout/shell';

export const Route = createFileRoute('/marketplaces/$id')({
  component: MarketplaceDetailPage,
});

function MarketplaceDetailPage() {
  const { id } = Route.useParams();
  const toast = useToast();
  const navigate = useNavigate();
  const { requireAuth, AuthGate } = useRequireAuth();
  const { data, isLoading } = useQuery({
    queryKey: ['marketplace', id],
    queryFn: () => api<{ marketplace: MarketplaceWithExtensions }>(`/api/marketplaces/${id}`),
  });

  const remove = useMutation({
    mutationFn: () => api(`/api/marketplaces/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast('Marketplace deleted', 'success');
      navigate({ to: '/marketplaces' });
    },
    onError: (err) =>
      handleWriteError(err, {
        onUnauthenticated: () => requireAuth(() => undefined),
        toast,
        fallback: 'Delete failed',
      }),
  });

  if (isLoading) return <Skeleton className="h-72" />;
  const marketplace = data?.marketplace;
  if (!marketplace) return <EmptyState title="Marketplace not found" />;

  return (
    <div className="space-y-6">
      <AuthGate />
      <PageHeader
        title={marketplace.name}
        description={marketplace.description || `Owned by ${marketplace.owner_name}`}
        actions={
          <>
            <ButtonLink href={`/marketplaces/${id}/edit`} variant="secondary">
              Edit
            </ButtonLink>
            <Button variant="danger" onClick={() => requireAuth(() => remove.mutate())}>
              Delete
            </Button>
          </>
        }
      />
      <Card>
        <div className="flex flex-wrap gap-2">
          <ButtonLink href={`/api/marketplaces/${id}/manifest`} variant="secondary">
            Manifest JSON
          </ButtonLink>
          <ButtonLink href={`/plugins/marketplaces/${id}/download`} variant="secondary">
            Download ZIP
          </ButtonLink>
        </div>
      </Card>
      <div className="grid gap-4 md:grid-cols-2">
        {(marketplace.extensions ?? []).map((ext) => (
          <Link key={ext.id} to="/extensions/$id" params={{ id: ext.id }} className="block">
            <Card className="hover:-translate-y-0.5">
              <h3 className="font-display text-lg font-semibold">{ext.name}</h3>
              <p className="mt-2 text-sm text-fog">{ext.description || 'No description'}</p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
