import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useMutation, useQuery } from '@tanstack/react-query';
import { api, ApiError } from '@/lib/api';
import type { ExtensionWithConfigs } from '@/lib/types';
import { ConfigCard } from '@/components/config-card';
import { Button } from '@/components/ui/button';
import { ButtonLink } from '@/components/ui/button-link';
import { Card } from '@/components/ui/card';
import { EmptyState, PageHeader, Skeleton } from '@/components/ui/page';
import { useToast } from '@/components/ui/toast';
import { useRequireAuth } from '@/components/layout/shell';

export const Route = createFileRoute('/extensions/$id')({
  component: ExtensionDetailPage,
});

function ExtensionDetailPage() {
  const { id } = Route.useParams();
  const toast = useToast();
  const navigate = useNavigate();
  const { requireAuth, AuthGate } = useRequireAuth();
  const { data, isLoading } = useQuery({
    queryKey: ['extension', id],
    queryFn: () => api<{ extension: ExtensionWithConfigs }>(`/api/extensions/${id}`),
  });

  const remove = useMutation({
    mutationFn: () => api(`/api/extensions/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast('Extension deleted', 'success');
      navigate({ to: '/extensions' });
    },
    onError: (err) => {
      if (err instanceof ApiError && err.status === 401) requireAuth(() => undefined);
      else toast(err instanceof Error ? err.message : 'Delete failed', 'error');
    },
  });

  if (isLoading) return <Skeleton className="h-72" />;
  const extension = data?.extension;
  if (!extension) return <EmptyState title="Extension not found" />;

  return (
    <div className="space-y-6">
      <AuthGate />
      <PageHeader
        title={extension.name}
        description={extension.description || `Version ${extension.version}`}
        actions={
          <>
            <ButtonLink href={`/extensions/${id}/edit`} variant="secondary">
              Edit
            </ButtonLink>
            <Button variant="danger" onClick={() => requireAuth(() => remove.mutate())}>
              Delete
            </Button>
          </>
        }
      />
      <Card>
        <h2 className="mb-4 font-display text-lg font-semibold">Download & browse</h2>
        <div className="flex flex-wrap gap-2">
          <ButtonLink href={`/plugins/${id}/claude_code`} variant="secondary">
            Browse Claude Code files
          </ButtonLink>
          <ButtonLink href={`/plugins/${id}/gemini`} variant="secondary">
            Browse Gemini files
          </ButtonLink>
          <ButtonLink href={`/plugins/${id}/claude_code/download`} variant="secondary">
            Claude Code ZIP
          </ButtonLink>
          <ButtonLink href={`/plugins/${id}/gemini/definition`} variant="secondary">
            Gemini definition
          </ButtonLink>
        </div>
      </Card>
      <div>
        <h2 className="mb-4 font-display text-xl font-semibold">Included configs</h2>
        {extension.configs?.length ? (
          <div className="grid gap-4 md:grid-cols-2">
            {extension.configs.map((config) => (
              <ConfigCard key={config.id} config={config} />
            ))}
          </div>
        ) : (
          <EmptyState title="No configs in this extension" />
        )}
      </div>
    </div>
  );
}
