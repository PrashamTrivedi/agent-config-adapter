import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { api, ApiError } from '@/lib/api';
import type { Config, Extension } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { ButtonLink } from '@/components/ui/button-link';
import { Card } from '@/components/ui/card';
import { Field, Input, Textarea } from '@/components/ui/field';
import { PageHeader } from '@/components/ui/page';
import { useToast } from '@/components/ui/toast';
import { useRequireAuth } from '@/components/layout/shell';

export const Route = createFileRoute('/extensions/new')({
  component: NewExtensionPage,
});

function NewExtensionPage() {
  const toast = useToast();
  const navigate = useNavigate();
  const { requireAuth, AuthGate } = useRequireAuth();
  const { data } = useQuery({
    queryKey: ['configs'],
    queryFn: () => api<{ configs: Config[] }>('/api/configs'),
  });
  const [form, setForm] = useState({
    name: '',
    description: '',
    author: '',
    version: '1.0.0',
    config_ids: [] as string[],
  });

  const mutation = useMutation({
    mutationFn: () =>
      api<{ extension: Extension }>('/api/extensions', {
        method: 'POST',
        body: JSON.stringify(form),
      }),
    onSuccess: (res) => {
      toast('Extension created', 'success');
      navigate({ to: '/extensions/$id', params: { id: res.extension.id } });
    },
    onError: (err) => {
      if (err instanceof ApiError && err.status === 401) requireAuth(() => undefined);
      else toast(err instanceof Error ? err.message : 'Create failed', 'error');
    },
  });

  function toggle(id: string) {
    setForm((current) => ({
      ...current,
      config_ids: current.config_ids.includes(id)
        ? current.config_ids.filter((item) => item !== id)
        : [...current.config_ids, id],
    }));
  }

  return (
    <div>
      <AuthGate />
      <PageHeader title="New extension" />
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
          <div>
            <p className="mb-2 text-sm font-medium">Included configs</p>
            <div className="max-h-64 space-y-2 overflow-y-auto rounded-xl border border-line p-3">
              {(data?.configs ?? []).map((config) => (
                <label key={config.id} className="flex items-center gap-2 text-sm text-fog">
                  <input
                    type="checkbox"
                    checked={form.config_ids.includes(config.id)}
                    onChange={() => toggle(config.id)}
                  />
                  {config.name}
                </label>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={mutation.isPending}>
              Create extension
            </Button>
            <ButtonLink href="/extensions" variant="secondary">
              Cancel
            </ButtonLink>
          </div>
        </form>
      </Card>
    </div>
  );
}
