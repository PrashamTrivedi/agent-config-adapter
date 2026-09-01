import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, Trash2 } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import type { SkillWithFiles } from '@/lib/types';
import { FormatBadge } from '@/components/badges';
import { Button } from '@/components/ui/button';
import { ButtonLink } from '@/components/ui/button-link';
import { Card } from '@/components/ui/card';
import { CopyButton } from '@/components/ui/copy-button';
import { EmptyState, PageHeader, Skeleton } from '@/components/ui/page';
import { useToast } from '@/components/ui/toast';
import { useRequireAuth } from '@/components/layout/shell';
import { formatBytes, formatDate } from '@/lib/utils';

export const Route = createFileRoute('/skills/$id')({
  component: SkillDetailPage,
});

function SkillDetailPage() {
  const { id } = Route.useParams();
  const toast = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { requireAuth, AuthGate } = useRequireAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['skill', id],
    queryFn: () => api<{ skill: SkillWithFiles }>(`/api/skills/${id}`),
  });

  const remove = useMutation({
    mutationFn: () => api(`/api/skills/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast('Skill deleted', 'success');
      navigate({ to: '/skills' });
    },
    onError: (err) => handleErr(err),
  });

  const deleteFile = useMutation({
    mutationFn: (fileId: string) => api(`/api/skills/${id}/files/${fileId}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast('File removed', 'success');
      queryClient.invalidateQueries({ queryKey: ['skill', id] });
    },
    onError: (err) => handleErr(err),
  });

  function handleErr(err: unknown) {
    if (err instanceof ApiError && err.status === 401) requireAuth(() => undefined);
    else toast(err instanceof Error ? err.message : 'Request failed', 'error');
  }

  if (isLoading) return <Skeleton className="h-80" />;
  const skill = data?.skill;
  if (!skill) return <EmptyState title="Skill not found" />;

  return (
    <div className="space-y-6">
      <AuthGate />
      <PageHeader
        title={skill.name}
        description={`Updated ${formatDate(skill.updated_at)}`}
        actions={
          <>
            <ButtonLink href={`/api/skills/${id}/download`} variant="secondary">
              <Download className="size-4" /> Download ZIP
            </ButtonLink>
            <ButtonLink href={`/skills/${id}/edit`} variant="secondary">
              Edit
            </ButtonLink>
            <Button variant="danger" onClick={() => requireAuth(() => remove.mutate())}>
              Delete
            </Button>
          </>
        }
      />
      <FormatBadge format={skill.original_format} />
      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">SKILL.md</h2>
          <CopyButton value={skill.content} />
        </div>
        <pre className="overflow-x-auto rounded-xl border border-line bg-ink p-4 font-mono text-xs leading-6 text-fog">
          {skill.content}
        </pre>
      </Card>
      <Card>
        <h2 className="mb-4 font-display text-lg font-semibold">Companion files</h2>
        {skill.files?.length ? (
          <ul className="space-y-2">
            {skill.files.map((file) => (
              <li key={file.id} className="flex items-center justify-between rounded-xl border border-line bg-ink px-3 py-2">
                <div>
                  <p className="font-mono text-sm">{file.file_path}</p>
                  <p className="text-xs text-mist">{formatBytes(file.file_size)}</p>
                </div>
                <div className="flex gap-2">
                  <ButtonLink href={`/api/skills/${id}/files/${file.id}`} variant="secondary">
                    Download
                  </ButtonLink>
                  <Button variant="ghost" onClick={() => requireAuth(() => deleteFile.mutate(file.id))}>
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-fog">No companion files yet. Add them in the editor.</p>
        )}
      </Card>
    </div>
  );
}
