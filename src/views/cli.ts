import { icons } from './icons';

export function cliPage(): string {
  return `
    <div class="fade-in" style="max-width: 900px; margin: 0 auto;">

      <!-- Hero -->
      <div class="card slide-up" style="margin-bottom: 32px; background: linear-gradient(135deg, rgba(20, 184, 166, 0.15) 0%, rgba(6, 182, 212, 0.10) 100%); border: 1px solid var(--success); text-align: center; padding: 48px 32px;">
        <div style="padding: 14px; background: rgba(20, 184, 166, 0.2); border-radius: 16px; display: inline-flex; margin-bottom: 20px; color: var(--success);">
          ${icons.terminal('icon-lg')}
        </div>
        <h2 style="font-size: 2.2em; margin: 0 0 12px 0; background: linear-gradient(135deg, var(--success), var(--accent-primary)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; line-height: 1.2; border: none; padding: 0;">
          Sync Your Configs with the CLI
        </h2>
        <p style="font-size: 1.15em; color: var(--text-secondary); max-width: 600px; margin: 0 auto; line-height: 1.6;">
          Push your local <code>.claude/</code> commands, agents, and skills to the server with a single command.
          No more fragile MCP-based sync.
        </p>
      </div>

      <!-- Install -->
      <div class="card slide-up" style="margin-bottom: 24px;">
        <h3 style="margin: 0 0 16px 0; display: flex; align-items: center; gap: 8px;">
          ${icons.download('icon')} Installation
        </h3>
        <p style="color: var(--text-secondary); margin-bottom: 16px;">
          Download the <code>aca</code> binary for your platform from
          <a href="https://github.com/PrashamTrivedi/agent-config-adapter/releases" target="_blank" rel="noopener noreferrer" style="color: var(--accent-primary);">GitHub Releases</a>
          and place it in your <code>PATH</code>:
        </p>
        <div style="position: relative;">
          <pre style="margin: 0;"># macOS (Apple Silicon)
curl -L -o aca https://github.com/PrashamTrivedi/agent-config-adapter/releases/latest/download/aca-darwin-arm64
chmod +x aca && mv aca /usr/local/bin/</pre>
        </div>
        <p style="color: var(--text-tertiary); font-size: 0.9em; margin-top: 12px;">
          Also available: <code>aca-darwin-x64</code>, <code>aca-linux-x64</code>.
          Or run from source with <code>bun run cli/src/index.ts</code>.
        </p>
      </div>

      <!-- Quick Start -->
      <div class="card slide-up" style="margin-bottom: 24px;">
        <h3 style="margin: 0 0 16px 0; display: flex; align-items: center; gap: 8px;">
          ${icons.zap('icon')} Quick Start
        </h3>
        <div style="display: grid; gap: 20px;">

          <!-- Step 1 -->
          <div style="display: flex; gap: 16px; align-items: start;">
            <div style="min-width: 36px; height: 36px; border-radius: 50%; background: linear-gradient(135deg, var(--accent-primary), var(--accent-violet)); display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.95em; color: white;">1</div>
            <div style="flex: 1;">
              <h4 style="margin: 0 0 8px 0; color: var(--text-primary);">Authenticate</h4>
              <p style="margin: 0 0 8px 0; color: var(--text-secondary); font-size: 0.95em;">
                Log in with the API key from your <a href="/profile" style="color: var(--accent-primary);">profile page</a>.
              </p>
              <pre style="margin: 0;">aca login</pre>
            </div>
          </div>

          <!-- Step 2 -->
          <div style="display: flex; gap: 16px; align-items: start;">
            <div style="min-width: 36px; height: 36px; border-radius: 50%; background: linear-gradient(135deg, var(--accent-primary), var(--accent-violet)); display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.95em; color: white;">2</div>
            <div style="flex: 1;">
              <h4 style="margin: 0 0 8px 0; color: var(--text-primary);">Preview changes</h4>
              <p style="margin: 0 0 8px 0; color: var(--text-secondary); font-size: 0.95em;">
                See what would be synced without making any changes.
              </p>
              <pre style="margin: 0;">aca sync --global --dry-run</pre>
            </div>
          </div>

          <!-- Step 3 -->
          <div style="display: flex; gap: 16px; align-items: start;">
            <div style="min-width: 36px; height: 36px; border-radius: 50%; background: linear-gradient(135deg, var(--accent-primary), var(--accent-violet)); display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.95em; color: white;">3</div>
            <div style="flex: 1;">
              <h4 style="margin: 0 0 8px 0; color: var(--text-primary);">Sync for real</h4>
              <p style="margin: 0 0 8px 0; color: var(--text-secondary); font-size: 0.95em;">
                Push your local configs to the server.
              </p>
              <pre style="margin: 0;">aca sync --global</pre>
            </div>
          </div>

        </div>
      </div>

      <!-- Commands Reference -->
      <div class="card slide-up" style="margin-bottom: 24px;">
        <h3 style="margin: 0 0 16px 0; display: flex; align-items: center; gap: 8px;">
          ${icons.book('icon')} Commands Reference
        </h3>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 16px;">

          <!-- sync -->
          <div class="card" style="background: var(--bg-primary); padding: 20px; border: 1px solid var(--border-dim);">
            <h4 style="margin: 0 0 8px 0; color: var(--accent-primary); font-family: 'JetBrains Mono', monospace; font-size: 1em;">aca sync</h4>
            <p style="margin: 0 0 12px 0; font-size: 0.9em; color: var(--text-secondary);">
              Sync local configs to the remote server.
            </p>
            <div style="font-family: 'JetBrains Mono', monospace; font-size: 0.8em; color: var(--text-tertiary); display: flex; flex-direction: column; gap: 4px;">
              <span><code>--global</code> Sync ~/.claude/</span>
              <span><code>--project</code> Sync ./.claude/</span>
              <span><code>--dry-run</code> Preview only</span>
              <span><code>--types &lt;t&gt;</code> Filter types</span>
              <span><code>--delete</code> Remove orphans</span>
              <span><code>--verbose</code> Detailed output</span>
            </div>
          </div>

          <!-- login -->
          <div class="card" style="background: var(--bg-primary); padding: 20px; border: 1px solid var(--border-dim);">
            <h4 style="margin: 0 0 8px 0; color: var(--accent-primary); font-family: 'JetBrains Mono', monospace; font-size: 1em;">aca login</h4>
            <p style="margin: 0 0 12px 0; font-size: 0.9em; color: var(--text-secondary);">
              Authenticate with the server using your API key.
            </p>
            <div style="font-family: 'JetBrains Mono', monospace; font-size: 0.8em; color: var(--text-tertiary); display: flex; flex-direction: column; gap: 4px;">
              <span><code>--server &lt;url&gt;</code> Custom server</span>
            </div>
          </div>

          <!-- status -->
          <div class="card" style="background: var(--bg-primary); padding: 20px; border: 1px solid var(--border-dim);">
            <h4 style="margin: 0 0 8px 0; color: var(--accent-primary); font-family: 'JetBrains Mono', monospace; font-size: 1em;">aca status</h4>
            <p style="margin: 0 0 12px 0; font-size: 0.9em; color: var(--text-secondary);">
              Show current authentication and sync status.
            </p>
            <div style="font-family: 'JetBrains Mono', monospace; font-size: 0.8em; color: var(--text-tertiary); display: flex; flex-direction: column; gap: 4px;">
              <span>No additional flags</span>
            </div>
          </div>

        </div>
      </div>

      <!-- CTA -->
      <div class="card slide-up" style="text-align: center; background: linear-gradient(135deg, rgba(6, 182, 212, 0.08) 0%, rgba(139, 92, 246, 0.08) 100%); border: 1px solid var(--border-accent); padding: 32px;">
        <h3 style="margin: 0 0 8px 0; color: var(--text-primary);">Ready to get started?</h3>
        <p style="margin: 0 0 20px 0; color: var(--text-secondary);">
          You'll need an API key. Sign in and grab one from your profile.
        </p>
        <a href="/profile" class="btn ripple" style="padding: 14px 28px; font-size: 1.05em;">
          ${icons.key('icon')} Get Your API Key
        </a>
      </div>

    </div>
  `;
}
