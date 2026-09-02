import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { api, handleWriteError } from '@/lib/api';
import type { Config, ExtensionWithConfigs } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { ButtonLink } from '@/components/ui/button-link';
import { Card } from '@/components/ui/card';
import { Field, Input, Textarea } from '@/components/ui/field';
import { EmptyState, PageHeader, Skeleton } from '@/components/ui/page';
import { useToast } from '@/components/ui/toast';
import { useRequireAuth } from '@/components/layout/shell';

export const Route = createFileRoute('/extensions/$id/edit')({
  component: EditExtensionPage,
});

function EditExtensionPage() {
  const { id } = Route.useParams();
  const toast = useToast();
  const navigate = useNavigate();
  const { requireAuth, AuthGate } = useRequireAuth();
  const { data, isLoading } = useQuery({
    queryKey: ['extension', id],
    queryFn: () => api<{ extension: ExtensionWithConfigs }>(`/api/extensions/${id}`),
  });
  const configsQuery = useQuery({
    queryKey: ['configs'],
    queryFn: () => api<{ configs: Config[] }>('/api/configs'),
  });
  const [form, setForm] = useState({
    name: '',
    description: '',
    author: '',
    version: '',
  });

  useEffect(() => {
    if (data?.extension) {
      setForm({
        name: data.extension.name,
        description: data.extension.description || '',
        author: data.extension.author || '',
        version: data.extension.version,
      });
    }
  }, [data]);

  const save = useMutation({
    mutationFn: () =>
      api(`/api/extensions/${id}`, {
        method: 'PUT',
        body: JSON.stringify(form),
      }),
    onSuccess: () => {
      toast('Saved', 'success');
      navigate({ to: '/extensions/$id', params: { id } });
    },
    onError: (err) =>
      handleWriteError(err, {
        onUnauthenticated: () => requireAuth(() => undefined),
        toast,
        fallback: 'Save failed',
      }),
  });

  if (isLoading) return <Skeleton className="h-72" />;
  if (!data?.extension) return <EmptyState title="Extension not found" />;

  return (
    <div>
      <AuthGate />
      <PageHeader title={`Edit ${data.extension.name}`} />
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
          <Field label="Description">
            <Textarea
              className="min-h-24"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Author">
              <Input value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} />
            </Field>
            <Field label="Version">
              <Input value={form.version} onChange={(e) => setForm({ ...form, version: e.target.value })} />
            </Field>
          </div>
          <p className="text-sm text-mist">
            {(configsQuery.data?.configs.length ?? 0)} configs available in the catalog. Membership is managed from the
            API if you need to add or remove items after create.
          </p>
          <div className="flex gap-2">
            <Button type="submit">Save</Button>
            <ButtonLink href={`/extensions/${id}`} variant="secondary">
              Cancel
            </ButtonLink>
          </div>
        </form>
      </Card>
    </div>
  );
}
