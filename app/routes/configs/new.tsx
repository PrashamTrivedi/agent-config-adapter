import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { api, ApiError } from '@/lib/api';
import type { Config } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { ButtonLink } from '@/components/ui/button-link';
import { Card } from '@/components/ui/card';
import { Field, Input, Select, Textarea } from '@/components/ui/field';
import { PageHeader } from '@/components/ui/page';
import { useToast } from '@/components/ui/toast';
import { useRequireAuth } from '@/components/layout/shell';

export const Route = createFileRoute('/configs/new')({
  component: NewConfigPage,
});

function NewConfigPage() {
  const toast = useToast();
  const navigate = useNavigate();
  const { requireAuth, AuthGate } = useRequireAuth();
  const [form, setForm] = useState({
    name: '',
    type: 'slash_command',
    original_format: 'claude_code',
    content: '',
  });

  const mutation = useMutation({
    mutationFn: () =>
      api<{ config: Config }>('/api/configs', {
        method: 'POST',
        body: JSON.stringify(form),
      }),
    onSuccess: (data) => {
      toast('Config created', 'success');
      navigate({ to: '/configs/$id', params: { id: data.config.id } });
    },
    onError: (err) => {
      if (err instanceof ApiError && err.status === 401) {
        requireAuth(() => undefined);
        return;
      }
      toast(err instanceof Error ? err.message : 'Create failed', 'error');
    },
  });

  return (
    <div>
      <AuthGate />
      <PageHeader title="New configuration" description="Paste a slash command, workflow, or MCP config." />
      <Card>
        <form
          className="space-y-5"
          onSubmit={(e) => {
            e.preventDefault();
            requireAuth(() => mutation.mutate());
          }}
        >
          <Field label="Name" htmlFor="name">
            <Input
              id="name"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Type">
              <Select
                value={form.type}
                onChange={(e) => {
                  if (e.target.value === 'skill') {
                    navigate({ to: '/skills/new' });
                    return;
                  }
                  setForm({ ...form, type: e.target.value });
                }}
              >
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
            <Textarea
              required
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              placeholder="Paste the configuration source…"
            />
          </Field>
          <div className="flex gap-2">
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Creating…' : 'Create config'}
            </Button>
            <ButtonLink href="/configs" variant="secondary">
              Cancel
            </ButtonLink>
          </div>
        </form>
      </Card>
    </div>
  );
}
