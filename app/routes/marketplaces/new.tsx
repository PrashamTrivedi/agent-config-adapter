import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { api, ApiError } from '@/lib/api';
import type { Extension, Marketplace } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { ButtonLink } from '@/components/ui/button-link';
import { Card } from '@/components/ui/card';
import { Field, Input, Textarea } from '@/components/ui/field';
import { PageHeader } from '@/components/ui/page';
import { useToast } from '@/components/ui/toast';
import { useRequireAuth } from '@/components/layout/shell';

export const Route = createFileRoute('/marketplaces/new')({
  component: NewMarketplacePage,
});

function NewMarketplacePage() {
  const toast = useToast();
  const navigate = useNavigate();
  const { requireAuth, AuthGate } = useRequireAuth();
  const { data } = useQuery({
    queryKey: ['extensions'],
    queryFn: () => api<{ extensions: Extension[] }>('/api/extensions'),
  });
  const [form, setForm] = useState({
    name: '',
    description: '',
    owner_name: '',
    version: '1.0.0',
    homepage: '',
    repository: '',
    extension_ids: [] as string[],
  });

  const mutation = useMutation({
    mutationFn: () =>
      api<{ marketplace: Marketplace }>('/api/marketplaces', {
        method: 'POST',
        body: JSON.stringify(form),
      }),
    onSuccess: (res) => {
      toast('Marketplace created', 'success');
      navigate({ to: '/marketplaces/$id', params: { id: res.marketplace.id } });
    },
    onError: (err) => {
      if (err instanceof ApiError && err.status === 401) requireAuth(() => undefined);
      else toast(err instanceof Error ? err.message : 'Create failed', 'error');
    },
  });

  return (
    <div>
      <AuthGate />
      <PageHeader title="New marketplace" />
      <Card>
        <form
          className="space-y-5"
          onSubmit={(e) => {
            e.preventDefault();
            requireAuth(() => mutation.mutate());
          }}
        >
          <Field label="Name">
            <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="Owner name">
            <Input
              required
              value={form.owner_name}
              onChange={(e) => setForm({ ...form, owner_name: e.target.value })}
            />
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
          <div>
            <p className="mb-2 text-sm font-medium">Extensions</p>
            <div className="max-h-56 space-y-2 overflow-y-auto rounded-xl border border-line p-3">
              {(data?.extensions ?? []).map((ext) => (
                <label key={ext.id} className="flex items-center gap-2 text-sm text-fog">
                  <input
                    type="checkbox"
                    checked={form.extension_ids.includes(ext.id)}
                    onChange={() =>
                      setForm((current) => ({
                        ...current,
                        extension_ids: current.extension_ids.includes(ext.id)
                          ? current.extension_ids.filter((id) => id !== ext.id)
                          : [...current.extension_ids, ext.id],
                      }))
                    }
                  />
                  {ext.name}
                </label>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="submit">Create marketplace</Button>
            <ButtonLink href="/marketplaces" variant="secondary">
              Cancel
            </ButtonLink>
          </div>
        </form>
      </Card>
    </div>
  );
}
