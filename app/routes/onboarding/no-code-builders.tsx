import { createFileRoute } from '@tanstack/react-router';
import { useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page';
import { ButtonLink } from '@/components/ui/button-link';
import { trackEvent } from '@/lib/api';

export const Route = createFileRoute('/onboarding/no-code-builders')({
  component: Page,
});

function Page() {
  useEffect(() => {
    trackEvent('onboarding_view', { onboardingICP: 'no-code-builders' });
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="For no-code / low-code builders"
        title="Ship AI products faster"
        description="Use battle-tested prompts instead of reinventing them in Replit, Lovable, Bolt, or v0."
      />
      <Card>
        <h2 className="font-display text-xl font-semibold">Who this is for</h2>
        <p className="mt-3 text-fog">
          Non-technical founders and small teams shipping with AI-assisted builders who want professional output without
          becoming prompt engineers.
        </p>
      </Card>
      <Card>
        <h2 className="font-display text-xl font-semibold">What you can do</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-fog">
          <li>Grab proven slash commands and skills</li>
          <li>Convert a workflow between Claude, Gemini, and Codex</li>
          <li>Download an extension pack instead of assembling files by hand</li>
        </ul>
      </Card>
      <ButtonLink href="/skills">Browse skills</ButtonLink>
    </div>
  );
}
