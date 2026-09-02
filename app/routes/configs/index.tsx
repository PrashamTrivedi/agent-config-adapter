import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { api, trackEvent } from '@/lib/api';
import type { Config } from '@/lib/types';
import { ConfigCard } from '@/components/config-card';
import { ButtonLink } from '@/components/ui/button-link';
import { EmptyState, PageHeader, Skeleton } from '@/components/ui/page';
import { Field, Input, Select } from '@/components/ui/field';

export const Route = createFileRoute('/configs/')({
  component: ConfigsPage,
});

function ConfigsPage() {
  const [type, setType] = useState('');
  const [format, setFormat] = useState('');
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['configs', type, format, search],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (type) params.set('type', type);
      if (format) params.set('format', format);
      if (search) params.set('search', search);
      const qs = params.toString();
      trackEvent('configs_browse');
      return api<{ configs: Config[] }>(`/api/configs${qs ? `?${qs}` : ''}`);
    },
  });

  const configs = data?.configs ?? [];

  return (
    <div>
      <PageHeader
        eyebrow="Catalog"
        title="Configurations"
        description="Slash commands, agent definitions, MCP configs, and workflows — ready to copy or convert."
        actions={
          <ButtonLink href="/configs/new">
            <Plus className="size-4" /> New config
          </ButtonLink>
        }
      />

      <div className="mb-8 grid gap-3 rounded-2xl border border-line bg-ink-2 p-4 sm:grid-cols-3">
        <Field label="Search">
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Find a config" />
        </Field>
        <Field label="Type">
          <Select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="">All types</option>
            <option value="slash_command">Slash command</option>
            <option value="agent_definition">Agent definition</option>
            <option value="mcp_config">MCP config</option>
            <option value="workflow">Workflow</option>
            <option value="skill">Skill</option>
          </Select>
        </Field>
        <Field label="Format">
          <Select value={format} onChange={(e) => setFormat(e.target.value)}>
            <option value="">All formats</option>
            <option value="claude_code">Claude Code</option>
            <option value="gemini">Gemini CLI</option>
            <option value="codex">Codex</option>
          </Select>
        </Field>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
      ) : configs.length === 0 ? (
        <EmptyState title="No configs yet" description="Try a different filter or add the first one." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {configs.map((config) => (
            <ConfigCard key={config.id} config={config} />
          ))}
        </div>
      )}
    </div>
  );
}
