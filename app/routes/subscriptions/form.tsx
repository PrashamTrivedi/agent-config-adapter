import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Field, Input, Select } from '@/components/ui/field';
import { PageHeader } from '@/components/ui/page';
import { useToast } from '@/components/ui/toast';

type Search = { return?: string };

export const Route = createFileRoute('/subscriptions/form')({
  validateSearch: (search: Record<string, unknown>): Search => ({
    return: typeof search.return === 'string' ? search.return : undefined,
  }),
  component: SubscribePage,
});

function SubscribePage() {
  const { return: returnUrl } = Route.useSearch();
  const toast = useToast();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [source, setSource] = useState('');
  const [other, setOther] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await api('/api/subscriptions/subscribe', {
        method: 'POST',
        body: JSON.stringify({
          email,
          referral_source: source || undefined,
          referral_other: source === 'other' ? other : undefined,
        }),
      });
      toast('You’re on the list', 'success');
      if (returnUrl) navigate({ to: returnUrl });
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not subscribe', 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader
        title="Get early access"
        description="We’ll notify you when uploads, editing, and new agent formats land."
      />
      <Card>
        <form className="space-y-4" onSubmit={onSubmit}>
          <Field label="Email">
            <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Field label="How did you find us?">
            <Select value={source} onChange={(e) => setSource(e.target.value)}>
              <option value="">Select an option…</option>
              <option value="prasham">Straight from Prasham</option>
              <option value="reddit">Reddit</option>
              <option value="x">X / Twitter</option>
              <option value="friend">A friend</option>
              <option value="other">Other</option>
            </Select>
          </Field>
          {source === 'other' ? (
            <Field label="Tell us more">
              <Input value={other} onChange={(e) => setOther(e.target.value)} />
            </Field>
          ) : null}
          <Button type="submit" disabled={busy}>
            {busy ? 'Submitting…' : 'Notify me'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
