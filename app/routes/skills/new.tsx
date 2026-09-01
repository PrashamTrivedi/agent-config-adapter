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

export const Route = createFileRoute('/skills/new')({
  component: NewSkillPage,
});

function NewSkillPage() {
  const toast = useToast();
  const navigate = useNavigate();
  const { requireAuth, AuthGate } = useRequireAuth();
  const [form, setForm] = useState({
    name: '',
    original_format: 'claude_code',
    content: '',
  });

  const mutation = useMutation({
    mutationFn: () =>
      api<{ skill: Config }>('/api/skills', {
        method: 'POST',
        body: JSON.stringify({ ...form, type: 'skill' }),
      }),
    onSuccess: (data) => {
      toast('Skill created', 'success');
      navigate({ to: '/skills/$id', params: { id: data.skill.id } });
    },
    onError: (err) => {
      if (err instanceof ApiError && err.status === 401) requireAuth(() => undefined);
      else toast(err instanceof Error ? err.message : 'Create failed', 'error');
    },
  });

  return (
    <div>
      <AuthGate />
      <PageHeader title="New skill" description="SKILL.md is required. Companion files can be added after create." />
      <Card>
        <form
          className="space-y-5"
          onSubmit={(e) => {
            e.preventDefault();
            requireAuth(() => mutation.mutate());
          }}
        >
          <Field label="Name">
            <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="Format">
            <Select
              value={form.original_format}
              onChange={(e) => setForm({ ...form, original_format: e.target.value })}
            >
              <option value="claude_code">Claude Code</option>
              <option value="gemini">Gemini CLI</option>
              <option value="codex">Codex</option>
            </Select>
          </Field>
          <Field label="SKILL.md content">
            <Textarea required value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} />
          </Field>
          <div className="flex gap-2">
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Creating…' : 'Create skill'}
            </Button>
            <ButtonLink href="/skills" variant="secondary">
              Cancel
            </ButtonLink>
          </div>
        </form>
      </Card>
    </div>
  );
}
