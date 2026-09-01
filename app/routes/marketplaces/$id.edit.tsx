import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import type { MarketplaceWithExtensions } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { ButtonLink } from '@/components/ui/button-link';
import { Card } from '@/components/ui/card';
import { Field, Input, Textarea } from '@/components/ui/field';
import { EmptyState, PageHeader, Skeleton } from '@/components/ui/page';
import { useToast } from '@/components/ui/toast';
import { useRequireAuth } from '@/components/layout/shell';

export const Route = createFileRoute('/marketplaces/$id/edit')({
  component: EditMarketplacePage,
});

function EditMarketplacePage() {
  const { id } = Route.useParams();
  const toast = useToast();
  const navigate = useNavigate();
  const { requireAuth, AuthGate } = useRequireAuth();
  const { data, isLoading } = useQuery({
    queryKey: ['marketplace', id],
    queryFn: () => api<{ marketplace: MarketplaceWithExtensions }>(`/api/marketplaces/${id}`),
  });
  const [form, setForm] = useState({ name: '', description: '', owner_name: '', version: '' });

  useEffect(() => {
    if (data?.marketplace) {
      setForm({
        name: data.marketplace.name,
        description: data.marketplace.description || '',
        owner_name: data.marketplace.owner_name,
        version: data.marketplace.version,
      });
    }
  }, [data]);

  const save = useMutation({
    mutationFn: () =>
      api(`/api/marketplaces/${id}`, {
        method: 'PUT',
        body: JSON.stringify(form),
      }),
    onSuccess: () => {
      toast('Saved', 'success');
      navigate({ to: '/marketplaces/$id', params: { id } });
    },
    onError: (err) => {
      if (err instanceof ApiError && err.status === 401) requireAuth(() => undefined);
      else toast(err instanceof Error ? err.message : 'Save failed', 'error');
    },
  });

  if (isLoading) return <Skeleton className="h-72" />;
  if (!data?.marketplace) return <EmptyState title="Marketplace not found" />;

  return (
    <div>
      <AuthGate />
      <PageHeader title={`Edit ${data.marketplace.name}`} />
      <Card>
        <form
          className="space-y-5"
          onSubmit={(e) => {
            e.preventDefault();
            requireAuth(() => save.mutate());
          }}
        >
          <Field label="Name">
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="Owner name">
            <Input value={form.owner_name} onChange={(e) => setForm({ ...form, owner_name: e.target.value })} />
          </Field>
          <Field label="Description">
            <Textarea
              className="min-h-24"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </Field>
          <Field label="Version">
            <Input value={form.version} onChange={(e) => setForm({ ...form, version: e.target.value })} />
          </Field>
          <div className="flex gap-2">
            <Button type="submit">Save</Button>
            <ButtonLink href={`/marketplaces/${id}`} variant="secondary">
              Cancel
            </ButtonLink>
          </div>
        </form>
      </Card>
    </div>
  );
}
