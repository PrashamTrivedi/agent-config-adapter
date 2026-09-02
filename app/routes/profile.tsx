import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { ApiKey } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { ButtonLink } from '@/components/ui/button-link';
import { Card } from '@/components/ui/card';
import { Dialog } from '@/components/ui/dialog';
import { Field, Input, Select } from '@/components/ui/field';
import { EmptyState, PageHeader, Skeleton } from '@/components/ui/page';
import { useToast } from '@/components/ui/toast';
import { CopyButton } from '@/components/ui/copy-button';
import { useSession } from '@/hooks/use-session';
import { formatDate } from '@/lib/utils';

export const Route = createFileRoute('/profile')({
  component: ProfilePage,
});

function ProfilePage() {
  const { data: session, isLoading } = useSession();
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [name, setName] = useState('CLI key');
  const [expires, setExpires] = useState('');

  useEffect(() => {
    if (!isLoading && !session?.user) {
      navigate({ to: '/auth/login', search: { return: '/profile' } });
    }
  }, [isLoading, session, navigate]);

  const keysQuery = useQuery({
    queryKey: ['api-keys'],
    enabled: !!session?.user,
    queryFn: () => api<{ keys: ApiKey[] }>('/api/profile/keys'),
  });

  const createKey = useMutation({
    mutationFn: () =>
      api<{ key: string }>('/api/profile/keys', {
        method: 'POST',
        body: JSON.stringify({
          name,
          expires_in_days: expires ? Number(expires) : null,
        }),
      }),
    onSuccess: (res) => {
      setCreatedKey(res.key);
      setCreateOpen(false);
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
    },
    onError: (err) => toast(err instanceof Error ? err.message : 'Failed', 'error'),
  });

  async function act(path: string, method: string, success: string) {
    try {
      await api(path, { method });
      toast(success, 'success');
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed', 'error');
    }
  }

  if (isLoading || !session?.user) return <Skeleton className="h-64" />;

  const user = session.user;
  const keys = keysQuery.data?.keys ?? [];

  return (
    <div className="space-y-6">
      <PageHeader title="Profile" description={user.email} />
      <Card className="flex items-center gap-4">
        {user.image ? (
          <img src={user.image} alt="" className="size-16 rounded-full border border-cyan/40" />
        ) : (
          <div className="flex size-16 items-center justify-center rounded-full bg-gradient-to-br from-cyan to-violet font-display text-2xl text-ink">
            {user.name?.[0] ?? '?'}
          </div>
        )}
        <div>
          <h2 className="font-display text-2xl font-semibold">{user.name}</h2>
          <p className="text-sm text-fog">{user.emailVerified ? 'Verified' : 'Unverified'}</p>
        </div>
        <ButtonLink href="/auth/logout" variant="secondary" className="ml-auto">
          Sign out
        </ButtonLink>
      </Card>
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-semibold">API keys</h2>
        <Button onClick={() => setCreateOpen(true)}>Create key</Button>
      </div>
      {keys.length === 0 ? (
        <EmptyState title="No API keys yet" description="Create one for the CLI or MCP clients." />
      ) : (
        <div className="space-y-3">
          {keys.map((key) => (
            <Card key={key.id} className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-semibold">{key.name}</p>
                <p className="font-mono text-xs text-mist">
                  {key.prefix}… · created {formatDate(key.created_at)}
                  {key.is_active ? '' : ' · revoked'}
                </p>
              </div>
              <div className="flex gap-2">
                {key.is_active ? (
                  <Button variant="secondary" size="sm" onClick={() => act(`/api/profile/keys/${key.id}/revoke`, 'POST', 'Revoked')}>
                    Revoke
                  </Button>
                ) : (
                  <Button variant="secondary" size="sm" onClick={() => act(`/api/profile/keys/${key.id}/reactivate`, 'POST', 'Reactivated')}>
                    Reactivate
                  </Button>
                )}
                <Button variant="danger" size="sm" onClick={() => act(`/api/profile/keys/${key.id}`, 'DELETE', 'Deleted')}>
                  Delete
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={createOpen} title="Create API key" onClose={() => setCreateOpen(false)}>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            createKey.mutate();
          }}
        >
          <Field label="Name">
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Expires">
            <Select value={expires} onChange={(e) => setExpires(e.target.value)}>
              <option value="">Never</option>
              <option value="30">30 days</option>
              <option value="90">90 days</option>
              <option value="365">1 year</option>
            </Select>
          </Field>
          <Button type="submit" disabled={createKey.isPending}>
            Create
          </Button>
        </form>
      </Dialog>

      <Dialog open={!!createdKey} title="Copy your key now" onClose={() => setCreatedKey(null)}>
        <p className="mb-3 text-sm text-fog">This secret is shown once.</p>
        <Input readOnly value={createdKey ?? ''} />
        <div className="mt-3">
          <CopyButton value={createdKey ?? ''} />
        </div>
      </Dialog>
    </div>
  );
}
