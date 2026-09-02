import { createFileRoute } from '@tanstack/react-router';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { api } from '@/lib/api';
import type { Config } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CopyButton } from '@/components/ui/copy-button';
import { Field, Input, Select, Textarea } from '@/components/ui/field';
import { PageHeader } from '@/components/ui/page';
import { useToast } from '@/components/ui/toast';

export const Route = createFileRoute('/slash-commands/convert')({
  component: ConverterPage,
});

function ConverterPage() {
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [configId, setConfigId] = useState('');
  const [userArguments, setUserArguments] = useState('');
  const [output, setOutput] = useState('');

  const { data } = useQuery({
    queryKey: ['slash-commands', search],
    queryFn: () => {
      const qs = search ? `?search=${encodeURIComponent(search)}` : '';
      return api<{ configs: Config[] }>(`/api/slash-commands${qs}`);
    },
  });

  const selected = useMemo(
    () => data?.configs.find((item) => item.id === configId),
    [data, configId]
  );

  const convert = useMutation({
    mutationFn: () =>
      api<{ convertedContent: string; needsUserInput?: boolean; message?: string }>(
        `/api/slash-commands/${configId}/convert`,
        {
          method: 'POST',
          body: JSON.stringify({ userArguments }),
        }
      ),
    onSuccess: (res) => {
      setOutput(res.convertedContent);
      if (res.needsUserInput) toast(res.message || 'This command needs arguments', 'info');
      else toast('Converted', 'success');
    },
    onError: async (err) => {
      toast(err instanceof Error ? err.message : 'Conversion failed', 'error');
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Cross-platform"
        title="Slash command converter"
        description="Convert a stored slash command into another agent’s format, with optional arguments."
      />
      <Card className="space-y-4">
        <Field label="Search commands">
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Filter by name" />
        </Field>
        <Field label="Command">
          <Select value={configId} onChange={(e) => setConfigId(e.target.value)}>
            <option value="">Select a slash command</option>
            {(data?.configs ?? []).map((config) => (
              <option key={config.id} value={config.id}>
                {config.name}
              </option>
            ))}
          </Select>
        </Field>
        {selected?.has_arguments ? (
          <Field label="Arguments" hint={selected.argument_hint || 'This command expects user arguments.'}>
            <Input value={userArguments} onChange={(e) => setUserArguments(e.target.value)} />
          </Field>
        ) : null}
        <Button
          type="button"
          disabled={!configId || convert.isPending}
          onClick={() => convert.mutate()}
        >
          {convert.isPending ? 'Converting…' : 'Convert'}
        </Button>
      </Card>
      {output ? (
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">Result</h2>
            <CopyButton value={output} />
          </div>
          <Textarea readOnly value={output} className="min-h-72" />
        </Card>
      ) : null}
    </div>
  );
}
