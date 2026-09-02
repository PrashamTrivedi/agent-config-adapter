import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { api, trackEvent } from '@/lib/api';
import type { Config } from '@/lib/types';
import { ConfigCard } from '@/components/config-card';
import { ButtonLink } from '@/components/ui/button-link';
import { EmptyState, PageHeader, Skeleton } from '@/components/ui/page';

export const Route = createFileRoute('/skills/')({
  component: SkillsPage,
});

function SkillsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['skills'],
    queryFn: () => {
      trackEvent('page_view', { path: '/skills' });
      return api<{ skills: Config[] }>('/api/skills');
    },
  });

  return (
    <div>
      <PageHeader
        eyebrow="Prompts"
        title="Skills"
        description="Multi-file prompt packs with SKILL.md and companion files."
        actions={
          <ButtonLink href="/skills/new">
            <Plus className="size-4" /> New skill
          </ButtonLink>
        }
      />
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-36" />
          <Skeleton className="h-36" />
        </div>
      ) : !data?.skills.length ? (
        <EmptyState title="No skills yet" />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {data.skills.map((skill) => (
            <ConfigCard key={skill.id} config={skill} href={`/skills/${skill.id}`} />
          ))}
        </div>
      )}
    </div>
  );
}
