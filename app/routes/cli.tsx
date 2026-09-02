import { createFileRoute } from '@tanstack/react-router';
import { Card } from '@/components/ui/card';
import { CopyButton } from '@/components/ui/copy-button';
import { PageHeader } from '@/components/ui/page';

export const Route = createFileRoute('/cli')({
  component: CliPage,
});

const install = `# macOS (Apple Silicon)
curl -L -o aca https://github.com/PrashamTrivedi/agent-config-adapter/releases/latest/download/aca-darwin-arm64
chmod +x aca && mv aca /usr/local/bin/`;

function CliPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Local sync"
        title="CLI"
        description="Push local .claude/ commands, agents, and skills to the server with a single binary."
      />
      <Card>
        <h2 className="mb-3 font-display text-lg font-semibold">Install</h2>
        <div className="mb-3 flex justify-end">
          <CopyButton value={install} />
        </div>
        <pre className="overflow-x-auto rounded-xl border border-line bg-ink p-4 font-mono text-xs text-fog">{install}</pre>
        <p className="mt-3 text-sm text-mist">Also available: aca-darwin-x64, aca-linux-x64.</p>
      </Card>
      <Card className="space-y-4">
        <h2 className="font-display text-lg font-semibold">Quick start</h2>
        {[
          ['1', 'Authenticate', 'aca login', 'Use an API key from your profile.'],
          ['2', 'Preview', 'aca sync --global --dry-run', 'See what would change.'],
          ['3', 'Sync', 'aca sync --global', 'Push local configs to the server.'],
        ].map(([step, title, command, copy]) => (
          <div key={step} className="flex gap-4">
            <span className="flex size-9 items-center justify-center rounded-full bg-gradient-to-br from-cyan to-violet text-sm font-bold text-ink">
              {step}
            </span>
            <div className="flex-1">
              <h3 className="font-semibold">{title}</h3>
              <p className="text-sm text-fog">{copy}</p>
              <pre className="mt-2 rounded-lg bg-ink px-3 py-2 font-mono text-xs text-cyan">{command}</pre>
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}
