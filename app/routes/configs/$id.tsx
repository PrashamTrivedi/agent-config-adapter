import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { api, handleWriteError } from '@/lib/api';
import type { Config } from '@/lib/types';
import { FormatBadge, TypeBadge } from '@/components/badges';
import { Button } from '@/components/ui/button';
import { ButtonLink } from '@/components/ui/button-link';
import { Card } from '@/components/ui/card';
import { CopyButton } from '@/components/ui/copy-button';
import { EmptyState, PageHeader, Skeleton } from '@/components/ui/page';
import { Select } from '@/components/ui/field';
import { useToast } from '@/components/ui/toast';
import { useRequireAuth } from '@/components/layout/shell';
import { formatDate, parseJsonArray } from '@/lib/utils';

export const Route = createFileRoute('/configs/$id')({
  component: ConfigDetailPage,
});

function ConfigDetailPage() {
  const { id } = Route.useParams();
  const toast = useToast();
  const navigate = useNavigate();
  const { requireAuth, AuthGate } = useRequireAuth();
  const [target, setTarget] = useState('gemini');
  const [converted, setConverted] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['config', id],
    queryFn: () => api<{ config: Config }>(`/api/configs/${id}`),
  });

  const convert = useMutation({
    mutationFn: () => api<{ content: string }>(`/api/configs/${id}/format/${target}`),
    onSuccess: (res) => setConverted(res.content),
    onError: (err) => toast(err instanceof Error ? err.message : 'Conversion failed', 'error'),
  });

  const invalidate = useMutation({
    mutationFn: () => api(`/api/configs/${id}/invalidate`, { method: 'POST' }),
    onSuccess: () => toast('Cache invalidated', 'success'),
    onError: (err) => handleErr(err),
  });

  const remove = useMutation({
    mutationFn: () => api(`/api/configs/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast('Config deleted', 'success');
      navigate({ to: '/configs' });
    },
    onError: (err) => handleErr(err),
  });

  function handleErr(err: unknown) {
    handleWriteError(err, {
      onUnauthenticated: () => requireAuth(() => undefined),
      toast,
    });
  }

  if (isLoading) return <Skeleton className="h-80" />;
  const config = data?.config;
  if (!config) return <EmptyState title="Config not found" />;

  const phases = parseJsonArray<{ title: string; detail?: string }>(config.workflow_phases);

  return (
    <div className="space-y-6">
      <AuthGate />
      <PageHeader
        title={config.name}
        description={`Updated ${formatDate(config.updated_at)}`}
        actions={
          <>
            <ButtonLink href={`/configs/${id}/edit`} variant="secondary">
              Edit
            </ButtonLink>
            <Button variant="danger" onClick={() => requireAuth(() => remove.mutate())}>
              Delete
            </Button>
          </>
        }
      />
      <div className="flex flex-wrap gap-2">
        <TypeBadge type={config.type} />
        <FormatBadge format={config.original_format} />
        {config.owner_name ? <span className="text-sm text-mist">by {config.owner_name}</span> : null}
      </div>

      {config.workflow_description ? (
        <Card>
          <h2 className="mb-2 font-display text-lg font-semibold">Workflow</h2>
          <p className="text-sm text-fog">{config.workflow_description}</p>
          {phases.length > 0 ? (
            <ol className="mt-4 space-y-2 text-sm text-fog">
              {phases.map((phase) => (
                <li key={phase.title}>
                  <strong className="text-snow">{phase.title}</strong>
                  {phase.detail ? ` — ${phase.detail}` : ''}
                </li>
              ))}
            </ol>
          ) : null}
        </Card>
      ) : null}

      <Card>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="font-display text-lg font-semibold">Source</h2>
          <CopyButton value={config.content} />
        </div>
        <pre className="overflow-x-auto rounded-xl border border-line bg-ink p-4 font-mono text-xs leading-6 text-fog">
          {config.content}
        </pre>
      </Card>

      <Card>
        <h2 className="mb-4 font-display text-lg font-semibold">Convert</h2>
        <div className="flex flex-wrap items-end gap-3">
          <Select value={target} onChange={(e) => setTarget(e.target.value)} className="max-w-xs">
            <option value="claude_code">Claude Code</option>
            <option value="gemini">Gemini CLI</option>
            <option value="codex">Codex</option>
          </Select>
          <Button type="button" onClick={() => convert.mutate()} disabled={convert.isPending}>
            {convert.isPending ? 'Converting…' : 'Convert'}
          </Button>
          <Button variant="secondary" type="button" onClick={() => requireAuth(() => invalidate.mutate())}>
            Invalidate cache
          </Button>
        </div>
        {converted ? (
          <div className="mt-4">
            <div className="mb-2 flex justify-end">
              <CopyButton value={converted} />
            </div>
            <pre className="overflow-x-auto rounded-xl border border-line bg-ink p-4 font-mono text-xs leading-6 text-fog">
              {converted}
            </pre>
          </div>
        ) : null}
      </Card>
    </div>
  );
}
