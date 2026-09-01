import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { McpInfo } from '@/lib/types';
import { Card } from '@/components/ui/card';
import { CopyButton } from '@/components/ui/copy-button';
import { PageHeader, Skeleton } from '@/components/ui/page';
import { useSession } from '@/hooks/use-session';

export const Route = createFileRoute('/mcp/info')({
  component: McpInfoPage,
});

function McpInfoPage() {
  const { data: session } = useSession();
  const { data, isLoading } = useQuery({
    queryKey: ['mcp-info', session?.user?.id],
    queryFn: () => api<McpInfo>('/api/mcp/info'),
  });

  if (isLoading || !data) return <Skeleton className="h-80" />;
  const config = JSON.stringify(data.usage.example_client_config, null, 2);

  return (
    <div className="space-y-6">
      <PageHeader
        title="MCP Server"
        description="Connect Claude, Cursor, or any MCP client to this catalog over streamable HTTP."
      />
      <Card className={session?.user ? 'border-teal/40' : 'border-amber/40'}>
        <p className="text-sm font-semibold">{data.access}</p>
        <p className="mt-1 text-sm text-fog">{data.documentation.access_level}</p>
      </Card>
      <div className="grid gap-4 sm:grid-cols-2">
        {[
          ['Name', data.name],
          ['Version', data.version],
          ['Transport', data.transport],
          ['Endpoint', data.endpoint],
        ].map(([label, value]) => (
          <Card key={label}>
            <p className="text-xs uppercase tracking-widest text-mist">{label}</p>
            <p className="mt-1 font-mono text-sm">{value}</p>
          </Card>
        ))}
      </div>
      <Card>
        <h2 className="mb-3 font-display text-lg font-semibold">Tools</h2>
        <ul className="space-y-2 font-mono text-sm text-cyan">
          {data.capabilities.tools.map((tool) => (
            <li key={tool} className="rounded-lg bg-ink px-3 py-2">
              {tool}
            </li>
          ))}
        </ul>
      </Card>
      <Card>
        <h2 className="mb-3 font-display text-lg font-semibold">Resources</h2>
        <ul className="space-y-2 font-mono text-sm text-cyan">
          {data.capabilities.resources.map((item) => (
            <li key={item} className="rounded-lg bg-ink px-3 py-2">
              {item}
            </li>
          ))}
        </ul>
      </Card>
      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">Client config</h2>
          <CopyButton value={config} />
        </div>
        <pre className="overflow-x-auto rounded-xl border border-line bg-ink p-4 font-mono text-xs text-fog">{config}</pre>
      </Card>
    </div>
  );
}
