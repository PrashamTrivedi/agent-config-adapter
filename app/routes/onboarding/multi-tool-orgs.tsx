import { createFileRoute } from '@tanstack/react-router';
import { useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page';
import { ButtonLink } from '@/components/ui/button-link';
import { trackEvent } from '@/lib/api';

export const Route = createFileRoute('/onboarding/multi-tool-orgs')({
  component: Page,
});

function Page() {
  useEffect(() => {
    trackEvent('onboarding_view', { onboardingICP: 'multi-tool-orgs' });
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="For multi-tool organizations"
        title="One catalog across every coding agent"
        description="Keep Claude Code, Gemini CLI, and Codex configs in sync without maintaining three copies."
      />
      <Card>
        <p className="text-fog">
          Convert commands once, publish extensions, and let teams pull the format they actually run — including via MCP
          and the CLI.
        </p>
      </Card>
      <ButtonLink href="/extensions">Browse extensions</ButtonLink>
    </div>
  );
}
