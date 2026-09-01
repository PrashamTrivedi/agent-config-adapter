import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { api, trackEvent } from '@/lib/api';
import type { ExtensionWithConfigs, PluginFile } from '@/lib/types';
import { ButtonLink } from '@/components/ui/button-link';
import { Card } from '@/components/ui/card';
import { CopyButton } from '@/components/ui/copy-button';
import { EmptyState, PageHeader, Skeleton } from '@/components/ui/page';
import { formatBytes, formatLabel } from '@/lib/utils';
import { useEffect } from 'react';

export const Route = createFileRoute('/plugins/$extensionId/$format')({
  component: PluginBrowserPage,
});

function PluginBrowserPage() {
  const { extensionId, format } = Route.useParams();
  const { data, isLoading } = useQuery({
    queryKey: ['plugin', extensionId, format],
    queryFn: () =>
      api<{ extension: ExtensionWithConfigs; format: string; files: PluginFile[] }>(
        `/plugins/${extensionId}/${format}`
      ),
  });

  useEffect(() => {
    trackEvent('plugin_browse', { configFormat: format });
  }, [format]);

  if (isLoading) return <Skeleton className="h-72" />;
  if (!data) return <EmptyState title="Plugin not found" />;

  const pluginUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/plugins/${extensionId}/${format}`;

  return (
    <div className="space-y-6">
      <PageHeader
        title={data.extension.name}
        description={`${formatLabel(format)} plugin files`}
        actions={
          <>
            <ButtonLink href={`/plugins/${extensionId}/${format}/download`} variant="secondary">
              Download ZIP
            </ButtonLink>
            {format === 'gemini' ? (
              <ButtonLink href={`/plugins/${extensionId}/gemini/definition`} variant="secondary">
                Gemini definition
              </ButtonLink>
            ) : null}
            <ButtonLink href={`/extensions/${extensionId}`} variant="secondary">
              Back
            </ButtonLink>
          </>
        }
      />
      <Card className="flex items-center justify-between gap-3">
        <p className="font-mono text-xs text-fog">{pluginUrl}</p>
        <CopyButton value={pluginUrl} />
      </Card>
      <Card>
        <h2 className="mb-4 font-display text-lg font-semibold">{data.files.length} files</h2>
        <ul className="space-y-2">
          {data.files.map((file) => (
            <li key={file.path} className="flex items-center justify-between rounded-xl border border-line bg-ink px-3 py-2">
              <span className="font-mono text-sm">{file.path}</span>
              <span className="text-xs text-mist">{formatBytes(file.size)}</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
