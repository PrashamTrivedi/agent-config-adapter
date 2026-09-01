import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import type { SkillWithFiles } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { ButtonLink } from '@/components/ui/button-link';
import { Card } from '@/components/ui/card';
import { Field, Input, Textarea } from '@/components/ui/field';
import { EmptyState, PageHeader, Skeleton } from '@/components/ui/page';
import { useToast } from '@/components/ui/toast';
import { useRequireAuth } from '@/components/layout/shell';

export const Route = createFileRoute('/skills/$id/edit')({
  component: EditSkillPage,
});

function EditSkillPage() {
  const { id } = Route.useParams();
  const toast = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { requireAuth, AuthGate } = useRequireAuth();
  const { data, isLoading } = useQuery({
    queryKey: ['skill', id],
    queryFn: () => api<{ skill: SkillWithFiles }>(`/api/skills/${id}`),
  });
  const [form, setForm] = useState({ name: '', content: '' });

  useEffect(() => {
    if (data?.skill) setForm({ name: data.skill.name, content: data.skill.content });
  }, [data]);

  const save = useMutation({
    mutationFn: () =>
      api(`/api/skills/${id}`, {
        method: 'PUT',
        body: JSON.stringify(form),
      }),
    onSuccess: () => {
      toast('Skill saved', 'success');
      navigate({ to: '/skills/$id', params: { id } });
    },
    onError: (err) => handleErr(err),
  });

  const upload = useMutation({
    mutationFn: async (fileList: FileList) => {
      const body = new FormData();
      Array.from(fileList).forEach((file) => body.append('files', file));
      return api(`/api/skills/${id}/files`, { method: 'POST', body });
    },
    onSuccess: () => {
      toast('Files uploaded', 'success');
      queryClient.invalidateQueries({ queryKey: ['skill', id] });
    },
    onError: (err) => handleErr(err),
  });

  function handleErr(err: unknown) {
    if (err instanceof ApiError && err.status === 401) requireAuth(() => undefined);
    else toast(err instanceof Error ? err.message : 'Request failed', 'error');
  }

  if (isLoading) return <Skeleton className="h-80" />;
  if (!data?.skill) return <EmptyState title="Skill not found" />;

  return (
    <div className="space-y-6">
      <AuthGate />
      <PageHeader title={`Edit ${data.skill.name}`} />
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
          <Field label="SKILL.md">
            <Textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} />
          </Field>
          <div className="flex gap-2">
            <Button type="submit" disabled={save.isPending}>
              {save.isPending ? 'Saving…' : 'Save skill'}
            </Button>
            <ButtonLink href={`/skills/${id}`} variant="secondary">
              Cancel
            </ButtonLink>
          </div>
        </form>
      </Card>
      <Card>
        <h2 className="mb-3 font-display text-lg font-semibold">Upload companion files</h2>
        <input
          type="file"
          multiple
          className="text-sm text-fog"
          onChange={(e) => {
            if (e.target.files?.length) requireAuth(() => upload.mutate(e.target.files!));
          }}
        />
      </Card>
    </div>
  );
}
