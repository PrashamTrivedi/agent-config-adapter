import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { api, handleWriteError } from '@/lib/api';
import type { Config } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { ButtonLink } from '@/components/ui/button-link';
import { Card } from '@/components/ui/card';
import { Field, Input, Select, Textarea } from '@/components/ui/field';
import { EmptyState, PageHeader, Skeleton } from '@/components/ui/page';
import { useToast } from '@/components/ui/toast';
import { useRequireAuth } from '@/components/layout/shell';

export const Route = createFileRoute('/configs/$id/edit')({
  component: EditConfigPage,
});

function EditConfigPage() {
  const { id } = Route.useParams();
  const toast = useToast();
  const navigate = useNavigate();
  const { requireAuth, AuthGate } = useRequireAuth();
  const { data, isLoading } = useQuery({
    queryKey: ['config', id],
    queryFn: () => api<{ config: Config }>(`/api/configs/${id}`),
  });
  const [form, setForm] = useState({ name: '', type: '', original_format: '', content: '' });

  useEffect(() => {
    if (data?.config) {
      setForm({
        name: data.config.name,
        type: data.config.type,
        original_format: data.config.original_format,
        content: data.config.content,
      });
    }
  }, [data]);

  const mutation = useMutation({
    mutationFn: () =>
      api(`/api/configs/${id}`, {
        method: 'PUT',
        body: JSON.stringify(form),
      }),
    onSuccess: () => {
      toast('Saved', 'success');
      navigate({ to: '/configs/$id', params: { id } });
    },
    onError: (err) =>
      handleWriteError(err, {
        onUnauthenticated: () => requireAuth(() => undefined),
        toast,
        fallback: 'Save failed',
      }),
  });

  if (isLoading) return <Skeleton className="h-80" />;
  if (!data?.config) return <EmptyState title="Config not found" />;

  return (
    <div>
      <AuthGate />
      <PageHeader title={`Edit ${data.config.name}`} />
      <Card>
        <form
          className="space-y-5"
          onSubmit={(e) => {
            e.preventDefault();
            requireAuth(() => mutation.mutate());
          }}
        >
          <Field label="Name">
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Type">
              <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                <option value="slash_command">Slash command</option>
                <option value="agent_definition">Agent definition</option>
                <option value="mcp_config">MCP config</option>
                <option value="workflow">Workflow</option>
              </Select>
            </Field>
            <Field label="Original format">
              <Select
                value={form.original_format}
                onChange={(e) => setForm({ ...form, original_format: e.target.value })}
              >
                <option value="claude_code">Claude Code</option>
                <option value="gemini">Gemini CLI</option>
                <option value="codex">Codex</option>
              </Select>
            </Field>
          </div>
          <Field label="Content">
            <Textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} />
          </Field>
          <div className="flex gap-2">
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Saving…' : 'Save'}
            </Button>
            <ButtonLink href={`/configs/${id}`} variant="secondary">
              Cancel
            </ButtonLink>
          </div>
        </form>
      </Card>
    </div>
  );
}
