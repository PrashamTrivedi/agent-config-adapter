import { createFileRoute } from '@tanstack/react-router';
import { useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page';
import { ButtonLink } from '@/components/ui/button-link';
import { trackEvent } from '@/lib/api';

export const Route = createFileRoute('/onboarding/ai-pilot-teams')({
  component: Page,
});

function Page() {
  useEffect(() => {
    trackEvent('onboarding_view', { onboardingICP: 'ai-pilot-teams' });
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="For AI pilot teams"
        title="Standardize the prompts that actually work"
        description="Pilot groups can share skills, convert them for the next tool, and avoid tribal knowledge living in chat logs."
      />
      <Card>
        <p className="text-fog">
          Start with the public catalog, then sign in to publish your own configs and issue API keys for MCP clients.
        </p>
      </Card>
      <ButtonLink href="/configs">Browse configs</ButtonLink>
    </div>
  );
}
