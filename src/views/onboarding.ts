import { icons } from './icons';

// ICP #1: No-Code/Low-Code AI Builders
export function noCodeBuildersPage(): string {
  return `
    <div class="fade-in">
      <!-- Hero Section -->
      <div class="card" style="background: linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-violet) 100%); color: white; margin-bottom: 32px; padding: 48px 40px; text-align: center;">
        <div style="display: inline-block; padding: 8px 16px; background: rgba(255, 255, 255, 0.2); border-radius: 20px; font-size: 0.85em; font-weight: 600; margin-bottom: 16px; text-transform: uppercase; letter-spacing: 1px;">
          For No-Code/Low-Code Builders
        </div>
        <h2 style="margin: 0 0 20px 0; font-size: 2.5em; color: white; border: none; padding: 0;">
          Ship AI Products Faster
        </h2>
        <p style="font-size: 1.2em; margin: 0 auto; max-width: 700px; line-height: 1.7; color: rgba(255, 255, 255, 0.95);">
          Get professional AI output without the prompt engineering headache. Use battle-tested configs that just work.
        </p>
      </div>

      <!-- Profile & Pain Section -->
      <div class="card slide-up" style="margin-bottom: 32px;">
        <h3 style="display: flex; align-items: center; gap: 10px; margin-bottom: 20px;">
          ${icons.user('icon')} Who This Is For
        </h3>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px;">
          <div>
            <h4 style="color: var(--accent-primary); margin-bottom: 12px;">Profile</h4>
            <p style="color: var(--text-secondary); line-height: 1.7;">
              Non-technical founders and makers building products with <strong>Replit, Loveable, Bolt, v0</strong>, and similar AI-assisted development tools. Solo founders or small teams (1-3 people) shipping AI-generated applications who want professional results without deep technical expertise.
            </p>
          </div>
          <div>
            <h4 style="color: var(--danger); margin-bottom: 12px;">Pain Points</h4>
            <p style="color: var(--text-secondary); line-height: 1.7;">
              Output quality is capped by prompt engineering skills. Spending hours tweaking prompts instead of building features. Starting from scratch every time instead of leveraging battle-tested templates. Can't use the same workflow across different AI tools.
            </p>
          </div>
        </div>
      </div>

      <!-- Jobs To Be Done Section -->
      <div class="card slide-up" style="margin-bottom: 32px;">
        <h3 style="display: flex; align-items: center; gap: 10px; margin-bottom: 20px;">
          ${icons.target('icon')} What You Can Do
        </h3>
        <div style="display: grid; gap: 16px;">
          <div class="card" style="background: var(--bg-tertiary); padding: 20px; border-left: 3px solid var(--accent-primary);">
            <h4 style="margin: 0 0 8px 0; color: var(--text-primary);">
              ${icons.sparkles('icon')} Use Proven Prompts & Commands
            </h4>
            <p style="margin: 0; color: var(--text-secondary); font-size: 0.95em;">
              When my AI outputs are mediocre, I want proven patterns that work, so I can ship professional quality without the learning curve.
            </p>
          </div>

          <div class="card" style="background: var(--bg-tertiary); padding: 20px; border-left: 3px solid var(--accent-primary);">
            <h4 style="margin: 0 0 8px 0; color: var(--text-primary);">
              ${icons.save('icon')} Save Reusable Workflows
            </h4>
            <p style="margin: 0; color: var(--text-secondary); font-size: 0.95em;">
              When I find a workflow that works, I want to save it for reuse, so I can apply proven patterns to future projects.
            </p>
          </div>

          <div class="card" style="background: var(--bg-tertiary); padding: 20px; border-left: 3px solid var(--accent-primary);">
            <h4 style="margin: 0 0 8px 0; color: var(--text-primary);">
              ${icons.refresh('icon')} Use Same Workflow Everywhere
            </h4>
            <p style="margin: 0; color: var(--text-secondary); font-size: 0.95em;">
              When I switch between different AI tools, I want the same workflows everywhere, so I maintain consistency across platforms.
            </p>
          </div>

          <div class="card" style="background: var(--bg-tertiary); padding: 20px; border-left: 3px solid var(--accent-primary);">
            <h4 style="margin: 0 0 8px 0; color: var(--text-primary);">
              ${icons.package('icon')} Build Your Personal Toolkit
            </h4>
            <p style="margin: 0; color: var(--text-secondary); font-size: 0.95em;">
              When I build my config library, I want to organize and install them easily, so I can set up new projects in seconds.
            </p>
          </div>

          <div class="card" style="background: var(--bg-tertiary); padding: 20px; border-left: 3px solid var(--accent-primary);">
            <h4 style="margin: 0 0 8px 0; color: var(--text-primary);">
              ${icons.download('icon')} Install Community Configs
            </h4>
            <p style="margin: 0; color: var(--text-secondary); font-size: 0.95em;">
              When I discover useful community configs, I want instant installation, so I can adopt best practices without experimentation.
            </p>
          </div>

          <div class="card" style="background: var(--bg-tertiary); padding: 20px; border-left: 3px solid var(--accent-primary);">
            <h4 style="margin: 0 0 8px 0; color: var(--text-primary);">
              ${icons.file('icon')} Rich Context for AI
            </h4>
            <p style="margin: 0; color: var(--text-secondary); font-size: 0.95em;">
              When I provide context to AI, I want to include files automatically, so I avoid manual copying and pasting.
            </p>
          </div>

          <div class="card" style="background: var(--bg-tertiary); padding: 20px; border-left: 3px solid var(--accent-primary);">
            <h4 style="margin: 0 0 8px 0; color: var(--text-primary);">
              ${icons.share('icon')} Share Your Success Patterns
            </h4>
            <p style="margin: 0; color: var(--text-secondary); font-size: 0.95em;">
              When I share my successful patterns, I want easy distribution, so I can help others and build my reputation.
            </p>
          </div>

          <div class="card" style="background: var(--bg-tertiary); padding: 20px; border-left: 3px solid var(--accent-primary);">
            <h4 style="margin: 0 0 8px 0; color: var(--text-primary);">
              ${icons.refresh('icon')} Cross-Platform Compatibility
            </h4>
            <p style="margin: 0; color: var(--text-secondary); font-size: 0.95em;">
              When I use different AI tools, I want my configs to work everywhere, so I can use the best tool for each task.
            </p>
          </div>
        </div>
      </div>

      <!-- How We Help Section -->
      <div class="card slide-up" style="margin-bottom: 32px; background: linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(6, 182, 212, 0.1) 100%); border: 2px solid var(--accent-violet);">
        <h3 style="display: flex; align-items: center; gap: 10px; margin-bottom: 20px; color: var(--accent-violet);">
          ${icons.zap('icon')} How We Help You Succeed
        </h3>
        <div style="display: grid; gap: 16px;">
          <div style="display: flex; gap: 12px; align-items: start;">
            <div style="color: var(--accent-violet); margin-top: 2px;">${icons.clock('icon')}</div>
            <div>
              <strong style="color: var(--text-primary);">Focus on Shipping Products</strong>
              <p style="margin: 4px 0 0 0; color: var(--text-secondary);">
                Skip the setup and maintenance—spend your time building features that matter
              </p>
            </div>
          </div>
          <div style="display: flex; gap: 12px; align-items: start;">
            <div style="color: var(--accent-violet); margin-top: 2px;">${icons.code('icon')}</div>
            <div>
              <strong style="color: var(--text-primary);">One Config Library, Works Everywhere</strong>
              <p style="margin: 4px 0 0 0; color: var(--text-secondary);">
                Your configs work perfectly across all platforms, every time
              </p>
            </div>
          </div>
          <div style="display: flex; gap: 12px; align-items: start;">
            <div style="color: var(--accent-violet); margin-top: 2px;">${icons.barChart('icon')}</div>
            <div>
              <strong style="color: var(--text-primary);">Battle-Tested Quality</strong>
              <p style="margin: 4px 0 0 0; color: var(--text-secondary);">
                Community-validated configs deliver consistent, professional results you can trust
              </p>
            </div>
          </div>
          <div style="display: flex; gap: 12px; align-items: start;">
            <div style="color: var(--accent-violet); margin-top: 2px;">${icons.share('icon')}</div>
            <div>
              <strong style="color: var(--text-primary);">Built-In Sharing & Discovery</strong>
              <p style="margin: 4px 0 0 0; color: var(--text-secondary);">
                Reach other builders, grow your audience, and discover what works
              </p>
            </div>
          </div>
          <div style="display: flex; gap: 12px; align-items: start;">
            <div style="color: var(--accent-violet); margin-top: 2px;">${icons.file('icon')}</div>
            <div>
              <strong style="color: var(--text-primary);">Files Stay Organized Automatically</strong>
              <p style="margin: 4px 0 0 0; color: var(--text-secondary);">
                All your files stay together and organized without the hassle
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Platform Features Section -->
      <div class="card slide-up" style="margin-bottom: 32px;">
        <h3 style="display: flex; align-items: center; gap: 10px; margin-bottom: 20px;">
          ${icons.star('icon')} Platform Features for You
        </h3>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 16px;">
          <div class="card" style="background: var(--bg-primary); padding: 16px; text-align: center;">
            <div style="color: var(--accent-primary); margin-bottom: 8px;">${icons.refresh('icon-lg')}</div>
            <h4 style="margin: 0 0 8px 0; font-size: 1em;">Cross-Platform Configs</h4>
            <p style="margin: 0; font-size: 0.9em; color: var(--text-secondary);">
              Use same workflows across Replit, Loveable, Bolt without rewriting
            </p>
          </div>
          <div class="card" style="background: var(--bg-primary); padding: 16px; text-align: center;">
            <div style="color: var(--accent-primary); margin-bottom: 8px;">${icons.star('icon-lg')}</div>
            <h4 style="margin: 0 0 8px 0; font-size: 1em;">Battle-Tested Library</h4>
            <p style="margin: 0; font-size: 0.9em; color: var(--text-secondary);">
              Access proven patterns from experienced developers
            </p>
          </div>
          <div class="card" style="background: var(--bg-primary); padding: 16px; text-align: center;">
            <div style="color: var(--accent-primary); margin-bottom: 8px;">${icons.store('icon-lg')}</div>
            <h4 style="margin: 0 0 8px 0; font-size: 1em;">Marketplace Discovery</h4>
            <p style="margin: 0; font-size: 0.9em; color: var(--text-secondary);">
              Discover and install configs from builder community
            </p>
          </div>
          <div class="card" style="background: var(--bg-primary); padding: 16px; text-align: center;">
            <div style="color: var(--accent-primary); margin-bottom: 8px;">${icons.file('icon-lg')}</div>
            <h4 style="margin: 0 0 8px 0; font-size: 1em;">Multi-File Skills</h4>
            <p style="margin: 0; font-size: 0.9em; color: var(--text-secondary);">
              Build sophisticated workflows with companion files
            </p>
          </div>
        </div>
      </div>

      <!-- CTA Section -->
      <div class="card slide-up" style="background: linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-violet) 100%); color: white; text-align: center; padding: 40px;">
        <h3 style="margin: 0 0 16px 0; color: white; border: none; font-size: 1.8em;">
          Ready to Build Faster?
        </h3>
        <p style="font-size: 1.1em; margin: 0 0 24px 0; color: rgba(255, 255, 255, 0.95);">
          Join our community of no-code/low-code builders shipping AI products
        </p>
        <div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">
          <a href="/subscriptions/form?return=/skills" class="btn ripple" style="background: white; color: var(--accent-primary); font-size: 1.1em; padding: 14px 28px;">
            ${icons.zap('icon')} Start Building Faster
          </a>
          <a href="/skills" class="btn ripple" style="background: rgba(255, 255, 255, 0.2); color: white; border: 2px solid white; font-size: 1.1em; padding: 14px 28px;">
            ${icons.star('icon')} Browse Proven Configs
          </a>
        </div>
      </div>

    </div>
  `;
}

// ICP #2: Multi-Tool Engineering Organizations
export function multiToolOrgsPage(): string {
  return `
    <div class="fade-in">
      <!-- Hero Section -->
      <div class="card" style="background: linear-gradient(135deg, var(--accent-violet) 0%, var(--accent-primary) 100%); color: white; margin-bottom: 32px; padding: 48px 40px; text-align: center;">
        <div style="display: inline-block; padding: 8px 16px; background: rgba(255, 255, 255, 0.2); border-radius: 20px; font-size: 0.85em; font-weight: 600; margin-bottom: 16px; text-transform: uppercase; letter-spacing: 1px;">
          For Multi-Tool Organizations
        </div>
        <h2 style="margin: 0 0 20px 0; font-size: 2.5em; color: white; border: none; padding: 0;">
          One Config Library. Any AI Tool.
        </h2>
        <p style="font-size: 1.2em; margin: 0 auto; max-width: 700px; line-height: 1.7; color: rgba(255, 255, 255, 0.95);">
          Let your team use their favorite AI tools. You get consistency, quality, and control—without the chaos.
        </p>
      </div>

      <!-- Profile & Pain Section -->
      <div class="card slide-up" style="margin-bottom: 32px;">
        <h3 style="display: flex; align-items: center; gap: 10px; margin-bottom: 20px;">
          ${icons.users('icon')} Who This Is For
        </h3>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px;">
          <div>
            <h4 style="color: var(--accent-violet); margin-bottom: 12px;">Profile</h4>
            <p style="color: var(--text-secondary); line-height: 1.7;">
              Platform/DevOps teams at <strong>50-200 person companies</strong> where developers use different AI coding tools (Claude Code, Cursor, Gemini, Codex). Engineering teams that can't mandate one tool without developer revolt but need some standardization and consistency.
            </p>
          </div>
          <div>
            <h4 style="color: var(--danger); margin-bottom: 12px;">Pain Points</h4>
            <p style="color: var(--text-secondary); line-height: 1.7;">
              Need standardization across AI tools without forcing everyone onto one platform. Can't ensure quality/consistency when every dev uses different prompts. Leadership asking "are we doing AI coding right?" No central management for approved configs and workflows.
            </p>
          </div>
        </div>
      </div>

      <!-- Jobs To Be Done Section -->
      <div class="card slide-up" style="margin-bottom: 32px;">
        <h3 style="display: flex; align-items: center; gap: 10px; margin-bottom: 20px;">
          ${icons.target('icon')} What You Can Do
        </h3>
        <div style="display: grid; gap: 16px;">
          <div class="card" style="background: var(--bg-tertiary); padding: 20px; border-left: 3px solid var(--accent-violet);">
            <h4 style="margin: 0 0 8px 0; color: var(--text-primary);">
              ${icons.shield('icon')} Standardize Without Restricting
            </h4>
            <p style="margin: 0; color: var(--text-secondary); font-size: 0.95em;">
              When rolling out AI coding assistants, set organization-approved standards without restricting tool choice.
            </p>
          </div>

          <div class="card" style="background: var(--bg-tertiary); padding: 20px; border-left: 3px solid var(--accent-violet);">
            <h4 style="margin: 0 0 8px 0; color: var(--text-primary);">
              ${icons.database('icon')} Central Config Repository
            </h4>
            <p style="margin: 0; color: var(--text-secondary); font-size: 0.95em;">
              When maintaining best practices across 50+ developers, manage one central source to avoid fragmentation and 3x maintenance overhead.
            </p>
          </div>

          <div class="card" style="background: var(--bg-tertiary); padding: 20px; border-left: 3px solid var(--accent-violet);">
            <h4 style="margin: 0 0 8px 0; color: var(--text-primary);">
              ${icons.refresh('icon')} Auto-Push Updates
            </h4>
            <p style="margin: 0; color: var(--text-secondary); font-size: 0.95em;">
              When updating organization-wide standards or security policies, push updates instantly to ensure everyone stays current and compliant.
            </p>
          </div>

          <div class="card" style="background: var(--bg-tertiary); padding: 20px; border-left: 3px solid var(--accent-violet);">
            <h4 style="margin: 0 0 8px 0; color: var(--text-primary);">
              ${icons.userPlus('icon')} Fast Onboarding
            </h4>
            <p style="margin: 0; color: var(--text-secondary); font-size: 0.95em;">
              When onboarding new developers, provide curated packages with instant installation to reduce setup time from days to minutes.
            </p>
          </div>

          <div class="card" style="background: var(--bg-tertiary); padding: 20px; border-left: 3px solid var(--accent-violet);">
            <h4 style="margin: 0 0 8px 0; color: var(--text-primary);">
              ${icons.package('icon')} Support Any Tool
            </h4>
            <p style="margin: 0; color: var(--text-secondary); font-size: 0.95em;">
              When supporting developers on different AI tools, distribute configs that work natively everywhere without manual conversion.
            </p>
          </div>

          <div class="card" style="background: var(--bg-tertiary); padding: 20px; border-left: 3px solid var(--accent-violet);">
            <h4 style="margin: 0 0 8px 0; color: var(--text-primary);">
              ${icons.file('icon')} Distribute Complex Workflows
            </h4>
            <p style="margin: 0; color: var(--text-secondary); font-size: 0.95em;">
              When creating organization-specific workflows with multiple files, distribute them seamlessly without email attachments or wiki pages.
            </p>
          </div>

          <div class="card" style="background: var(--bg-tertiary); padding: 20px; border-left: 3px solid var(--accent-violet);">
            <h4 style="margin: 0 0 8px 0; color: var(--text-primary);">
              ${icons.checkCircle('icon')} Safe Adoption of Community Tools
            </h4>
            <p style="margin: 0; color: var(--text-secondary); font-size: 0.95em;">
              When discovering useful community configs, validate and preview before distribution to safely adopt external tools without surprises.
            </p>
          </div>

          <div class="card" style="background: var(--bg-tertiary); padding: 20px; border-left: 3px solid var(--accent-violet);">
            <h4 style="margin: 0 0 8px 0; color: var(--text-primary);">
              ${icons.barChart('icon')} Track Adoption & ROI
            </h4>
            <p style="margin: 0; color: var(--text-secondary); font-size: 0.95em;">
              When measuring AI coding adoption across teams, track usage and engagement to demonstrate ROI and optimize your tooling strategy.
            </p>
          </div>

          <div class="card" style="background: var(--bg-tertiary); padding: 20px; border-left: 3px solid var(--accent-violet);">
            <h4 style="margin: 0 0 8px 0; color: var(--text-primary);">
              ${icons.lock('icon')} Private Marketplaces
            </h4>
            <p style="margin: 0; color: var(--text-secondary); font-size: 0.95em;">
              When you integrate organization-approved AI tools with your development workflow, create private marketplaces with vetted extensions to provide developer autonomy within governance guardrails.
            </p>
          </div>
        </div>
      </div>

      <!-- How We Help Section -->
      <div class="card slide-up" style="margin-bottom: 32px; background: linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(6, 182, 212, 0.1) 100%); border: 2px solid var(--accent-violet);">
        <h3 style="display: flex; align-items: center; gap: 10px; margin-bottom: 20px; color: var(--accent-violet);">
          ${icons.zap('icon')} How We Help You Succeed
        </h3>
        <div style="display: grid; gap: 16px;">
          <div style="display: flex; gap: 12px; align-items: start;">
            <div style="color: var(--accent-violet); margin-top: 2px;">${icons.clock('icon')}</div>
            <div>
              <strong style="color: var(--text-primary);">Enterprise-Ready From Day One</strong>
              <p style="margin: 4px 0 0 0; color: var(--text-secondary);">
                Battle-tested platform built for teams—ship faster without the infrastructure headaches
              </p>
            </div>
          </div>
          <div style="display: flex; gap: 12px; align-items: start;">
            <div style="color: var(--accent-violet); margin-top: 2px;">${icons.wrench('icon')}</div>
            <div>
              <strong style="color: var(--text-primary);">Zero Maintenance Overhead</strong>
              <p style="margin: 4px 0 0 0; color: var(--text-secondary);">
                Updates and changes happen automatically—your team stays productive without interruptions
              </p>
            </div>
          </div>
          <div style="display: flex; gap: 12px; align-items: start;">
            <div style="color: var(--accent-violet); margin-top: 2px;">${icons.users('icon')}</div>
            <div>
              <strong style="color: var(--text-primary);">Instant Ecosystem Access</strong>
              <p style="margin: 4px 0 0 0; color: var(--text-secondary);">
                Tap into community configs and best practices without building from scratch
              </p>
            </div>
          </div>
          <div style="display: flex; gap: 12px; align-items: start;">
            <div style="color: var(--accent-violet); margin-top: 2px;">${icons.database('icon')}</div>
            <div>
              <strong style="color: var(--text-primary);">Updates Reach Everyone Instantly</strong>
              <p style="margin: 4px 0 0 0; color: var(--text-secondary);">
                Changes propagate automatically—no manual distribution or version mismatches
              </p>
            </div>
          </div>
          <div style="display: flex; gap: 12px; align-items: start;">
            <div style="color: var(--accent-violet); margin-top: 2px;">${icons.cpu('icon')}</div>
            <div>
              <strong style="color: var(--text-primary);">Configs That Work Reliably, Every Time</strong>
              <p style="margin: 4px 0 0 0; color: var(--text-secondary);">
                Your configs work perfectly across all tools with zero compatibility issues
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Platform Features Section -->
      <div class="card slide-up" style="margin-bottom: 32px;">
        <h3 style="display: flex; align-items: center; gap: 10px; margin-bottom: 20px;">
          ${icons.star('icon')} Platform Features for Your Team
        </h3>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 16px;">
          <div class="card" style="background: var(--bg-primary); padding: 16px; text-align: center;">
            <div style="color: var(--accent-violet); margin-bottom: 8px;">${icons.refresh('icon-lg')}</div>
            <h4 style="margin: 0 0 8px 0; font-size: 1em;">Cross-Platform Conversion</h4>
            <p style="margin: 0; font-size: 0.9em; color: var(--text-secondary);">
              Support team members on different tools without fragmentation
            </p>
          </div>
          <div class="card" style="background: var(--bg-primary); padding: 16px; text-align: center;">
            <div style="color: var(--accent-violet); margin-bottom: 8px;">${icons.star('icon-lg')}</div>
            <h4 style="margin: 0 0 8px 0; font-size: 1em;">Battle-Tested Library</h4>
            <p style="margin: 0; font-size: 0.9em; color: var(--text-secondary);">
              Distribute organization-approved best practices
            </p>
          </div>
          <div class="card" style="background: var(--bg-primary); padding: 16px; text-align: center;">
            <div style="color: var(--accent-violet); margin-bottom: 8px;">${icons.lock('icon-lg')}</div>
            <h4 style="margin: 0 0 8px 0; font-size: 1em;">Private Marketplaces</h4>
            <p style="margin: 0; font-size: 0.9em; color: var(--text-secondary);">
              Create private marketplaces for organizational distribution
            </p>
          </div>
          <div class="card" style="background: var(--bg-primary); padding: 16px; text-align: center;">
            <div style="color: var(--accent-violet); margin-bottom: 8px;">${icons.file('icon-lg')}</div>
            <h4 style="margin: 0 0 8px 0; font-size: 1em;">Multi-File Skills</h4>
            <p style="margin: 0; font-size: 0.9em; color: var(--text-secondary);">
              Distribute complex tooling without infrastructure setup
            </p>
          </div>
        </div>
      </div>

      <!-- CTA Section -->
      <div class="card slide-up" style="background: linear-gradient(135deg, var(--accent-violet) 0%, var(--accent-primary) 100%); color: white; text-align: center; padding: 40px;">
        <h3 style="margin: 0 0 16px 0; color: white; border: none; font-size: 1.8em;">
          Ready to Standardize Your Team?
        </h3>
        <p style="font-size: 1.1em; margin: 0 0 24px 0; color: rgba(255, 255, 255, 0.95);">
          Join engineering teams using centralized config management
        </p>
        <div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">
          <a href="/subscriptions/form?return=/extensions" class="btn ripple" style="background: white; color: var(--accent-violet); font-size: 1.1em; padding: 14px 28px;">
            ${icons.users('icon')} See How Teams Standardize
          </a>
          <a href="/extensions" class="btn ripple" style="background: rgba(255, 255, 255, 0.2); color: white; border: 2px solid white; font-size: 1.1em; padding: 14px 28px;">
            ${icons.package('icon')} Browse Extensions
          </a>
        </div>
      </div>

    </div>
  `;
}

// ICP #3: AI Pilot/Adoption Teams
export function aiPilotTeamsPage(): string {
  return `
    <div class="fade-in">
      <!-- Hero Section -->
      <div class="card" style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; margin-bottom: 32px; padding: 48px 40px; text-align: center;">
        <div style="display: inline-block; padding: 8px 16px; background: rgba(255, 255, 255, 0.2); border-radius: 20px; font-size: 0.85em; font-weight: 600; margin-bottom: 16px; text-transform: uppercase; letter-spacing: 1px;">
          For AI Pilot Teams
        </div>
        <h2 style="margin: 0 0 20px 0; font-size: 2.5em; color: white; border: none; padding: 0;">
          Ship Your Pilot with Governance Built In
        </h2>
        <p style="font-size: 1.2em; margin: 0 auto; max-width: 700px; line-height: 1.7; color: rgba(255, 255, 255, 0.95);">
          Show leadership you're ready to scale. Built-in governance, compliance, and security from day one.
        </p>
      </div>

      <!-- Profile & Pain Section -->
      <div class="card slide-up" style="margin-bottom: 32px;">
        <h3 style="display: flex; align-items: center; gap: 10px; margin-bottom: 20px;">
          ${icons.briefcase('icon')} Who This Is For
        </h3>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px;">
          <div>
            <h4 style="color: #f59e0b; margin-bottom: 12px;">Profile</h4>
            <p style="color: var(--text-secondary); line-height: 1.7;">
              Teams running AI coding pilots at <strong>100-500+ person engineering organizations</strong> with security/compliance requirements. Need to demonstrate governance, auditability, and best practices to leadership before broader rollout.
            </p>
          </div>
          <div>
            <h4 style="color: var(--danger); margin-bottom: 12px;">Pain Points</h4>
            <p style="color: var(--text-secondary); line-height: 1.7;">
              Leadership asking "how do we ensure quality, security, and consistency?" Need auditable documentation and governance framework to prove responsible AI usage. Can't roll out AI coding widely without demonstrating control and compliance.
            </p>
          </div>
        </div>
      </div>

      <!-- Jobs To Be Done Section -->
      <div class="card slide-up" style="margin-bottom: 32px;">
        <h3 style="display: flex; align-items: center; gap: 10px; margin-bottom: 20px;">
          ${icons.target('icon')} What You Can Do
        </h3>
        <div style="display: grid; gap: 16px;">
          <div class="card" style="background: var(--bg-tertiary); padding: 20px; border-left: 3px solid #f59e0b;">
            <h4 style="margin: 0 0 8px 0; color: var(--text-primary);">
              ${icons.shield('icon')} Demonstrate Governance
            </h4>
            <p style="margin: 0; color: var(--text-secondary); font-size: 0.95em;">
              When running an AI coding pilot with 10-20 developers, centrally manage approved tools and standards to demonstrate control to leadership before wider rollout.
            </p>
          </div>

          <div class="card" style="background: var(--bg-tertiary); padding: 20px; border-left: 3px solid #f59e0b;">
            <h4 style="margin: 0 0 8px 0; color: var(--text-primary);">
              ${icons.fileText('icon')} Auditable Config Distribution
            </h4>
            <p style="margin: 0; color: var(--text-secondary); font-size: 0.95em;">
              When proving responsible AI usage to security/compliance teams, provide auditable distribution logs showing who created, updated, or deleted configs and when.
            </p>
          </div>

          <div class="card" style="background: var(--bg-tertiary); padding: 20px; border-left: 3px solid #f59e0b;">
            <h4 style="margin: 0 0 8px 0; color: var(--text-primary);">
              ${icons.checkCircle('icon')} Ensure Quality Standards
            </h4>
            <p style="margin: 0; color: var(--text-secondary); font-size: 0.95em;">
              When evaluating AI coding quality across pilot participants, distribute battle-tested configs to ensure consistent, high-quality output that justifies broader adoption.
            </p>
          </div>

          <div class="card" style="background: var(--bg-tertiary); padding: 20px; border-left: 3px solid #f59e0b;">
            <h4 style="margin: 0 0 8px 0; color: var(--text-primary);">
              ${icons.barChart('icon')} Track & Report ROI
            </h4>
            <p style="margin: 0; color: var(--text-secondary); font-size: 0.95em;">
              When presenting pilot results to VP/CTO for expansion approval, track usage and adoption metrics to demonstrate measurable productivity gains and ROI.
            </p>
          </div>

          <div class="card" style="background: var(--bg-tertiary); padding: 20px; border-left: 3px solid #f59e0b;">
            <h4 style="margin: 0 0 8px 0; color: var(--text-primary);">
              ${icons.lock('icon')} Enforce Security Policies
            </h4>
            <p style="margin: 0; color: var(--text-secondary); font-size: 0.95em;">
              When enforcing security policies during the pilot phase, curate approved tools and configs to prevent unapproved usage while enabling developer productivity.
            </p>
          </div>

          <div class="card" style="background: var(--bg-tertiary); padding: 20px; border-left: 3px solid #f59e0b;">
            <h4 style="margin: 0 0 8px 0; color: var(--text-primary);">
              ${icons.book('icon')} Document Best Practices
            </h4>
            <p style="margin: 0; color: var(--text-secondary); font-size: 0.95em;">
              When documenting best practices for AI-assisted development, package proven workflows to create repeatable, documented processes that meet compliance requirements.
            </p>
          </div>

          <div class="card" style="background: var(--bg-tertiary); padding: 20px; border-left: 3px solid #f59e0b;">
            <h4 style="margin: 0 0 8px 0; color: var(--text-primary);">
              ${icons.trendingUp('icon')} Built to Scale
            </h4>
            <p style="margin: 0; color: var(--text-secondary); font-size: 0.95em;">
              When scaling from pilot (20 devs) to department-wide (100+ devs), rely on proven infrastructure to avoid migration pain and scale seamlessly to enterprise needs.
            </p>
          </div>

          <div class="card" style="background: var(--bg-tertiary); padding: 20px; border-left: 3px solid #f59e0b;">
            <h4 style="margin: 0 0 8px 0; color: var(--text-primary);">
              ${icons.users('icon')} Support Multi-Tool Evaluation
            </h4>
            <p style="margin: 0; color: var(--text-secondary); font-size: 0.95em;">
              When supporting multiple AI tool preferences during evaluation, provide one config source that works everywhere to compare tool effectiveness without fragmentation.
            </p>
          </div>

          <div class="card" style="background: var(--bg-tertiary); padding: 20px; border-left: 3px solid #f59e0b;">
            <h4 style="margin: 0 0 8px 0; color: var(--text-primary);">
              ${icons.settings('icon')} Enterprise Integration
            </h4>
            <p style="margin: 0; color: var(--text-secondary); font-size: 0.95em;">
              When integrating with enterprise auth and internal systems, customize the platform for your specific compliance and security needs.
            </p>
          </div>

          <div class="card" style="background: var(--bg-tertiary); padding: 20px; border-left: 3px solid #f59e0b;">
            <h4 style="margin: 0 0 8px 0; color: var(--text-primary);">
              ${icons.refresh('icon')} Fast Iteration
            </h4>
            <p style="margin: 0; color: var(--text-secondary); font-size: 0.95em;">
              When updating pilot configs based on feedback and learnings, changes propagate instantly to iterate quickly without manual distribution overhead.
            </p>
          </div>

          <div class="card" style="background: var(--bg-tertiary); padding: 20px; border-left: 3px solid #f59e0b;">
            <h4 style="margin: 0 0 8px 0; color: var(--text-primary);">
              ${icons.clipboardCheck('icon')} Demonstrate Control Systems
            </h4>
            <p style="margin: 0; color: var(--text-secondary); font-size: 0.95em;">
              When demonstrating governance to leadership with specific examples, show curated collections, version control, and update mechanisms to prove you have control systems for safe organization-wide rollout.
            </p>
          </div>

          <div class="card" style="background: var(--bg-tertiary); padding: 20px; border-left: 3px solid #f59e0b;">
            <h4 style="margin: 0 0 8px 0; color: var(--text-primary);">
              ${icons.code('icon')} Build Internal Tool Ecosystem
            </h4>
            <p style="margin: 0; color: var(--text-secondary); font-size: 0.95em;">
              When building internal tool ecosystem for proprietary systems, store and manage configs reliably to ensure critical infrastructure is configured correctly.
            </p>
          </div>

        </div>
      </div>

      <!-- How We Help Section -->
      <div class="card slide-up" style="margin-bottom: 32px; background: linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(217, 119, 6, 0.1) 100%); border: 2px solid #f59e0b;">
        <h3 style="display: flex; align-items: center; gap: 10px; margin-bottom: 20px; color: #f59e0b;">
          ${icons.zap('icon')} How We Help You Succeed
        </h3>
        <div style="display: grid; gap: 16px;">
          <div style="display: flex; gap: 12px; align-items: start;">
            <div style="color: #f59e0b; margin-top: 2px;">${icons.lock('icon')}</div>
            <div>
              <strong style="color: var(--text-primary);">Compliance-Ready From Day One</strong>
              <p style="margin: 4px 0 0 0; color: var(--text-secondary);">
                Auditable access logs and controls built in—meet governance requirements without extra work
              </p>
            </div>
          </div>
          <div style="display: flex; gap: 12px; align-items: start;">
            <div style="color: #f59e0b; margin-top: 2px;">${icons.server('icon')}</div>
            <div>
              <strong style="color: var(--text-primary);">Built for Enterprise Security</strong>
              <p style="margin: 4px 0 0 0; color: var(--text-secondary);">
                Production-ready platform that scales—avoid build costs and complexity
              </p>
            </div>
          </div>
          <div style="display: flex; gap: 12px; align-items: start;">
            <div style="color: #f59e0b; margin-top: 2px;">${icons.shield('icon')}</div>
            <div>
              <strong style="color: var(--text-primary);">Governance That Leadership Trusts</strong>
              <p style="margin: 4px 0 0 0; color: var(--text-secondary);">
                Curation, version control, and distribution tracking—prove you're in control
              </p>
            </div>
          </div>
          <div style="display: flex; gap: 12px; align-items: start;">
            <div style="color: #f59e0b; margin-top: 2px;">${icons.checkCircle('icon')}</div>
            <div>
              <strong style="color: var(--text-primary);">Proven Solution, Lower Risk</strong>
              <p style="margin: 4px 0 0 0; color: var(--text-secondary);">
                Battle-tested platform—focus on pilot success, not infrastructure headaches
              </p>
            </div>
          </div>
          <div style="display: flex; gap: 12px; align-items: start;">
            <div style="color: #f59e0b; margin-top: 2px;">${icons.clock('icon')}</div>
            <div>
              <strong style="color: var(--text-primary);">Scale From Pilot to Production Seamlessly</strong>
              <p style="margin: 4px 0 0 0; color: var(--text-secondary);">
                Launch your pilot within days, not months—ready to scale when you are
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Platform Features Section -->
      <div class="card slide-up" style="margin-bottom: 32px;">
        <h3 style="display: flex; align-items: center; gap: 10px; margin-bottom: 20px;">
          ${icons.star('icon')} Platform Features for Your Pilot
        </h3>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 16px;">
          <div class="card" style="background: var(--bg-primary); padding: 16px; text-align: center;">
            <div style="color: #f59e0b; margin-bottom: 8px;">${icons.refresh('icon-lg')}</div>
            <h4 style="margin: 0 0 8px 0; font-size: 1em;">Cross-Platform Conversion</h4>
            <p style="margin: 0; font-size: 0.9em; color: var(--text-secondary);">
              Evaluate multiple AI tools during pilot with unified config management
            </p>
          </div>
          <div class="card" style="background: var(--bg-primary); padding: 16px; text-align: center;">
            <div style="color: #f59e0b; margin-bottom: 8px;">${icons.star('icon-lg')}</div>
            <h4 style="margin: 0 0 8px 0; font-size: 1em;">Battle-Tested Library</h4>
            <p style="margin: 0; font-size: 0.9em; color: var(--text-secondary);">
              Demonstrate quality standards to leadership
            </p>
          </div>
          <div class="card" style="background: var(--bg-primary); padding: 16px; text-align: center;">
            <div style="color: #f59e0b; margin-bottom: 8px;">${icons.lock('icon-lg')}</div>
            <h4 style="margin: 0 0 8px 0; font-size: 1em;">Marketplace Curation</h4>
            <p style="margin: 0; font-size: 0.9em; color: var(--text-secondary);">
              Curate approved extensions with governance controls
            </p>
          </div>
          <div class="card" style="background: var(--bg-primary); padding: 16px; text-align: center;">
            <div style="color: #f59e0b; margin-bottom: 8px;">${icons.file('icon-lg')}</div>
            <h4 style="margin: 0 0 8px 0; font-size: 1em;">Multi-File Skills</h4>
            <p style="margin: 0; font-size: 0.9em; color: var(--text-secondary);">
              Package documented best practices for compliance
            </p>
          </div>
          <div class="card" style="background: var(--bg-primary); padding: 16px; text-align: center;">
            <div style="color: #f59e0b; margin-bottom: 8px;">${icons.mail('icon-lg')}</div>
            <h4 style="margin: 0 0 8px 0; font-size: 1em;">Email-Gated CUD</h4>
            <p style="margin: 0; font-size: 0.9em; color: var(--text-secondary);">
              Auditable access log for compliance requirements
            </p>
          </div>
          <div class="card" style="background: var(--bg-primary); padding: 16px; text-align: center;">
            <div style="color: #f59e0b; margin-bottom: 8px;">${icons.cpu('icon-lg')}</div>
            <h4 style="margin: 0 0 8px 0; font-size: 1em;">Reliable Conversion</h4>
            <p style="margin: 0; font-size: 0.9em; color: var(--text-secondary);">
              Consistent quality for leadership presentations
            </p>
          </div>
          <div class="card" style="background: var(--bg-primary); padding: 16px; text-align: center;">
            <div style="color: #f59e0b; margin-bottom: 8px;">${icons.server('icon-lg')}</div>
            <h4 style="margin: 0 0 8px 0; font-size: 1em;">Scalable Infrastructure</h4>
            <p style="margin: 0; font-size: 0.9em; color: var(--text-secondary);">
              Enterprise-grade foundation that grows with you
            </p>
          </div>
        </div>
      </div>

      <!-- CTA Section -->
      <div class="card slide-up" style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; text-align: center; padding: 40px;">
        <h3 style="margin: 0 0 16px 0; color: white; border: none; font-size: 1.8em;">
          Ready to Launch Your Pilot?
        </h3>
        <p style="font-size: 1.1em; margin: 0 0 24px 0; color: rgba(255, 255, 255, 0.95);">
          Start your AI coding pilot with governance and compliance built in
        </p>
        <div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">
          <a href="/subscriptions/form?return=/marketplaces" class="btn ripple" style="background: white; color: #f59e0b; font-size: 1.1em; padding: 14px 28px;">
            ${icons.mail('icon')} Schedule Consultation
          </a>
          <a href="/marketplaces" class="btn ripple" style="background: rgba(255, 255, 255, 0.2); color: white; border: 2px solid white; font-size: 1.1em; padding: 14px 28px;">
            ${icons.store('icon')} Browse Marketplaces
          </a>
        </div>
      </div>

    </div>
  `;
}
