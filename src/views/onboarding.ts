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
          Stop tweaking prompts. Use proven configs from experienced developers to get professional-quality AI output without learning advanced prompt engineering.
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
              When you generate code with AI tools and get mediocre results, use proven slash commands and prompts from experienced developers to get professional-quality output without learning advanced prompt engineering.
            </p>
          </div>

          <div class="card" style="background: var(--bg-tertiary); padding: 20px; border-left: 3px solid var(--accent-primary);">
            <h4 style="margin: 0 0 8px 0; color: var(--text-primary);">
              ${icons.save('icon')} Save Reusable Workflows
            </h4>
            <p style="margin: 0; color: var(--text-secondary); font-size: 0.95em;">
              When you discover a great prompt or workflow that works, save it as a reusable skill with all companion files, so you can apply the same pattern to future projects without starting from scratch.
            </p>
          </div>

          <div class="card" style="background: var(--bg-tertiary); padding: 20px; border-left: 3px solid var(--accent-primary);">
            <h4 style="margin: 0 0 8px 0; color: var(--text-primary);">
              ${icons.refresh('icon')} Use Same Workflow Everywhere
            </h4>
            <p style="margin: 0; color: var(--text-secondary); font-size: 0.95em;">
              When you switch between different AI coding tools for different tasks, use the same custom commands and workflows everywhere to maintain consistency without rewriting configs for each platform.
            </p>
          </div>

          <div class="card" style="background: var(--bg-tertiary); padding: 20px; border-left: 3px solid var(--accent-primary);">
            <h4 style="margin: 0 0 8px 0; color: var(--text-primary);">
              ${icons.package('icon')} Build Your Personal Toolkit
            </h4>
            <p style="margin: 0; color: var(--text-secondary); font-size: 0.95em;">
              When you build a library of working configs that accelerate your shipping velocity, organize them into personal extensions with one-click installation to quickly set up new projects.
            </p>
          </div>

          <div class="card" style="background: var(--bg-tertiary); padding: 20px; border-left: 3px solid var(--accent-primary);">
            <h4 style="margin: 0 0 8px 0; color: var(--text-primary);">
              ${icons.download('icon')} Install Community Configs
            </h4>
            <p style="margin: 0; color: var(--text-secondary); font-size: 0.95em;">
              When you find useful configs shared by other builders, install them from curated marketplaces to adopt best practices without trial-and-error experimentation.
            </p>
          </div>

          <div class="card" style="background: var(--bg-tertiary); padding: 20px; border-left: 3px solid var(--accent-primary);">
            <h4 style="margin: 0 0 8px 0; color: var(--text-primary);">
              ${icons.file('icon')} Rich Context for AI
            </h4>
            <p style="margin: 0; color: var(--text-secondary); font-size: 0.95em;">
              When you iterate on your AI-generated code, use multi-file skills with reference files and examples to provide rich context to the AI without manually pasting files.
            </p>
          </div>

          <div class="card" style="background: var(--bg-tertiary); padding: 20px; border-left: 3px solid var(--accent-primary);">
            <h4 style="margin: 0 0 8px 0; color: var(--text-primary);">
              ${icons.share('icon')} Share Your Success Patterns
            </h4>
            <p style="margin: 0; color: var(--text-secondary); font-size: 0.95em;">
              When you share your successful patterns with the builder community, package your configs into distributable plugins to build reputation and help others while growing your audience.
            </p>
          </div>

          <div class="card" style="background: var(--bg-tertiary); padding: 20px; border-left: 3px solid var(--accent-primary);">
            <h4 style="margin: 0 0 8px 0; color: var(--text-primary);">
              ${icons.refresh('icon')} Cross-Platform Compatibility
            </h4>
            <p style="margin: 0; color: var(--text-secondary); font-size: 0.95em;">
              When you need your configs to work across Claude Code, Cursor, and Gemini, convert between formats with semantic accuracy to use the best tool for each task without maintaining duplicate configs.
            </p>
          </div>
        </div>
      </div>

      <!-- Why Us Section -->
      <div class="card slide-up" style="margin-bottom: 32px; background: linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(6, 182, 212, 0.1) 100%); border: 2px solid var(--accent-violet);">
        <h3 style="display: flex; align-items: center; gap: 10px; margin-bottom: 20px; color: var(--accent-violet);">
          ${icons.zap('icon')} Why You Can't Build This Yourself
        </h3>
        <div style="display: grid; gap: 16px;">
          <div style="display: flex; gap: 12px; align-items: start;">
            <div style="color: var(--accent-violet); margin-top: 2px;">${icons.clock('icon')}</div>
            <div>
              <strong style="color: var(--text-primary);">No Time to Build Infrastructure</strong>
              <p style="margin: 4px 0 0 0; color: var(--text-secondary);">
                You're shipping products, not building config management platforms
              </p>
            </div>
          </div>
          <div style="display: flex; gap: 12px; align-items: start;">
            <div style="color: var(--accent-violet); margin-top: 2px;">${icons.code('icon')}</div>
            <div>
              <strong style="color: var(--text-primary);">Limited Technical Depth</strong>
              <p style="margin: 4px 0 0 0; color: var(--text-secondary);">
                Don't understand format differences between Claude Code, Codex, Gemini
              </p>
            </div>
          </div>
          <div style="display: flex; gap: 12px; align-items: start;">
            <div style="color: var(--accent-violet); margin-top: 2px;">${icons.barChart('icon')}</div>
            <div>
              <strong style="color: var(--text-primary);">Quality Ceiling</strong>
              <p style="margin: 4px 0 0 0; color: var(--text-secondary);">
                Manual prompt tweaking can't match battle-tested, community-validated configs
              </p>
            </div>
          </div>
          <div style="display: flex; gap: 12px; align-items: start;">
            <div style="color: var(--accent-violet); margin-top: 2px;">${icons.share('icon')}</div>
            <div>
              <strong style="color: var(--text-primary);">No Distribution Channel</strong>
              <p style="margin: 4px 0 0 0; color: var(--text-secondary);">
                Can't reach other builders without marketplace infrastructure
              </p>
            </div>
          </div>
          <div style="display: flex; gap: 12px; align-items: start;">
            <div style="color: var(--accent-violet); margin-top: 2px;">${icons.file('icon')}</div>
            <div>
              <strong style="color: var(--text-primary);">File Management Complexity</strong>
              <p style="margin: 4px 0 0 0; color: var(--text-secondary);">
                Multi-file skills require R2 storage and companion file handling
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
            ${icons.mail('icon')} Get Early Access
          </a>
          <a href="/skills" class="btn ripple" style="background: rgba(255, 255, 255, 0.2); color: white; border: 2px solid white; font-size: 1.1em; padding: 14px 28px;">
            ${icons.star('icon')} Browse Skills
          </a>
        </div>
      </div>

      <!-- Pricing Mention -->
      <div class="card slide-up" style="background: var(--bg-secondary); border: 1px solid var(--border-dim); padding: 24px; text-align: center;">
        <h4 style="margin: 0 0 12px 0; color: var(--text-primary);">Flexible Pricing for Builders</h4>
        <p style="margin: 0 0 16px 0; color: var(--text-secondary);">
          <strong style="color: var(--accent-primary);">Free:</strong> Config conversions + marketplace access
        </p>
        <p style="margin: 0 0 16px 0; color: var(--text-secondary);">
          <strong style="color: var(--accent-primary);">Premium ($19-49/month):</strong> Unlimited skills, private extensions, priority conversion
        </p>
        <p style="margin: 0; color: var(--text-secondary);">
          <strong style="color: var(--accent-primary);">Creator Revenue Share:</strong> 70/30 split on paid marketplace extensions
        </p>
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
          Standardize AI coding across your engineering team without forcing everyone onto one platform. Manage quality and consistency when every dev uses different tools.
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
              When you roll out AI coding assistants to your engineering team, create organization-approved slash commands and MCP configs to ensure quality standards without restricting tool choice.
            </p>
          </div>

          <div class="card" style="background: var(--bg-tertiary); padding: 20px; border-left: 3px solid var(--accent-violet);">
            <h4 style="margin: 0 0 8px 0; color: var(--text-primary);">
              ${icons.database('icon')} Central Config Repository
            </h4>
            <p style="margin: 0; color: var(--text-secondary); font-size: 0.95em;">
              When you maintain best practices across 50+ developers using different AI tools, manage one central config repository that converts to all formats to avoid fragmented tooling and 3x maintenance overhead.
            </p>
          </div>

          <div class="card" style="background: var(--bg-tertiary); padding: 20px; border-left: 3px solid var(--accent-violet);">
            <h4 style="margin: 0 0 8px 0; color: var(--text-primary);">
              ${icons.refresh('icon')} Auto-Push Updates
            </h4>
            <p style="margin: 0; color: var(--text-secondary); font-size: 0.95em;">
              When you update organization-wide coding standards or security policies, invalidate caches and push updates to all formats automatically to ensure everyone uses current, compliant versions.
            </p>
          </div>

          <div class="card" style="background: var(--bg-tertiary); padding: 20px; border-left: 3px solid var(--accent-violet);">
            <h4 style="margin: 0 0 8px 0; color: var(--text-primary);">
              ${icons.userPlus('icon')} Fast Onboarding
            </h4>
            <p style="margin: 0; color: var(--text-secondary); font-size: 0.95em;">
              When you onboard new developers to AI-assisted workflows, provide curated extension packages with instant installation to reduce onboarding time from days to minutes with proven configs.
            </p>
          </div>

          <div class="card" style="background: var(--bg-tertiary); padding: 20px; border-left: 3px solid var(--accent-violet);">
            <h4 style="margin: 0 0 8px 0; color: var(--text-primary);">
              ${icons.package('icon')} Multi-Format Support
            </h4>
            <p style="margin: 0; color: var(--text-secondary); font-size: 0.95em;">
              When you need to support developers on Claude Code, Cursor, Gemini, and Codex, distribute configs through format-specific plugins (ZIP, JSON) to provide native installation experiences.
            </p>
          </div>

          <div class="card" style="background: var(--bg-tertiary); padding: 20px; border-left: 3px solid var(--accent-violet);">
            <h4 style="margin: 0 0 8px 0; color: var(--text-primary);">
              ${icons.file('icon')} Sophisticated Tooling Distribution
            </h4>
            <p style="margin: 0; color: var(--text-secondary); font-size: 0.95em;">
              When you create organization-specific workflows with multiple companion files, package them as multi-file skills with R2-backed storage to distribute without email attachments or wiki pages.
            </p>
          </div>

          <div class="card" style="background: var(--bg-tertiary); padding: 20px; border-left: 3px solid var(--accent-violet);">
            <h4 style="margin: 0 0 8px 0; color: var(--text-primary);">
              ${icons.checkCircle('icon')} Safe Adoption of Community Tools
            </h4>
            <p style="margin: 0; color: var(--text-secondary); font-size: 0.95em;">
              When you discover useful community configs that fit your standards, test conversions, preview manifests, and validate before distribution to safely adopt external tools without compatibility surprises.
            </p>
          </div>

          <div class="card" style="background: var(--bg-tertiary); padding: 20px; border-left: 3px solid var(--accent-violet);">
            <h4 style="margin: 0 0 8px 0; color: var(--text-primary);">
              ${icons.barChart('icon')} Track Adoption & ROI
            </h4>
            <p style="margin: 0; color: var(--text-secondary); font-size: 0.95em;">
              When you measure AI coding adoption and config usage across teams, track marketplace activity, downloads, and conversions to demonstrate ROI and optimize your AI tooling strategy.
            </p>
          </div>

          <div class="card" style="background: var(--bg-tertiary); padding: 20px; border-left: 3px solid var(--accent-violet);">
            <h4 style="margin: 0 0 8px 0; color: var(--text-primary);">
              ${icons.settings('icon')} Accurate MCP Conversion
            </h4>
            <p style="margin: 0; color: var(--text-secondary); font-size: 0.95em;">
              When you standardize MCP server configurations for your infrastructure, use rule-based conversion with field mapping (httpUrl, startup_timeout_ms) to ensure accurate structured data across different agent formats.
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

      <!-- Why Us Section -->
      <div class="card slide-up" style="margin-bottom: 32px; background: linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(6, 182, 212, 0.1) 100%); border: 2px solid var(--accent-violet);">
        <h3 style="display: flex; align-items: center; gap: 10px; margin-bottom: 20px; color: var(--accent-violet);">
          ${icons.zap('icon')} Why You Can't Build This Yourself
        </h3>
        <div style="display: grid; gap: 16px;">
          <div style="display: flex; gap: 12px; align-items: start;">
            <div style="color: var(--accent-violet); margin-top: 2px;">${icons.clock('icon')}</div>
            <div>
              <strong style="color: var(--text-primary);">6+ Months of Engineering</strong>
              <p style="margin: 4px 0 0 0; color: var(--text-secondary);">
                Building cross-platform conversion, caching, and distribution from scratch
              </p>
            </div>
          </div>
          <div style="display: flex; gap: 12px; align-items: start;">
            <div style="color: var(--accent-violet); margin-top: 2px;">${icons.wrench('icon')}</div>
            <div>
              <strong style="color: var(--text-primary);">Ongoing Maintenance Burden</strong>
              <p style="margin: 4px 0 0 0; color: var(--text-secondary);">
                Format specifications change, requiring constant adaptation
              </p>
            </div>
          </div>
          <div style="display: flex; gap: 12px; align-items: start;">
            <div style="color: var(--accent-violet); margin-top: 2px;">${icons.users('icon')}</div>
            <div>
              <strong style="color: var(--text-primary);">No Ecosystem</strong>
              <p style="margin: 4px 0 0 0; color: var(--text-secondary);">
                Can't leverage community configs without marketplace infrastructure
              </p>
            </div>
          </div>
          <div style="display: flex; gap: 12px; align-items: start;">
            <div style="color: var(--accent-violet); margin-top: 2px;">${icons.database('icon')}</div>
            <div>
              <strong style="color: var(--text-primary);">DIY Cache Invalidation</strong>
              <p style="margin: 4px 0 0 0; color: var(--text-secondary);">
                Complex logic for cache busting across multiple formats
              </p>
            </div>
          </div>
          <div style="display: flex; gap: 12px; align-items: start;">
            <div style="color: var(--accent-violet); margin-top: 2px;">${icons.cpu('icon')}</div>
            <div>
              <strong style="color: var(--text-primary);">Conversion Accuracy Risk</strong>
              <p style="margin: 4px 0 0 0; color: var(--text-secondary);">
                AI-enhanced conversion requires AI Gateway with fallback chains
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
            ${icons.mail('icon')} Request Demo
          </a>
          <a href="/extensions" class="btn ripple" style="background: rgba(255, 255, 255, 0.2); color: white; border: 2px solid white; font-size: 1.1em; padding: 14px 28px;">
            ${icons.package('icon')} Browse Extensions
          </a>
        </div>
      </div>

      <!-- Pricing Mention -->
      <div class="card slide-up" style="background: var(--bg-secondary); border: 1px solid var(--border-dim); padding: 24px; text-align: center;">
        <h4 style="margin: 0 0 12px 0; color: var(--text-primary);">Team Pricing</h4>
        <p style="margin: 0 0 16px 0; color: var(--text-secondary);">
          <strong style="color: var(--accent-violet);">Team Plan ($500-1K/month):</strong> 50-200 seats, private marketplaces, SSO integration
        </p>
        <p style="margin: 0 0 16px 0; color: var(--text-secondary);">
          <strong style="color: var(--accent-violet);">Usage-Based:</strong> Additional API calls beyond included quota
        </p>
        <p style="margin: 0; color: var(--text-secondary);">
          <strong style="color: var(--accent-violet);">Professional Services:</strong> Custom integration, training, config migration
        </p>
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
          Demonstrate governance, auditability, and best practices to leadership before broader rollout. Prove responsible AI usage with compliance-ready infrastructure.
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
              When you run an AI coding pilot with 10-20 developers, centrally manage approved configs, skills, and MCP servers to demonstrate governance and control to leadership before wider rollout.
            </p>
          </div>

          <div class="card" style="background: var(--bg-tertiary); padding: 20px; border-left: 3px solid #f59e0b;">
            <h4 style="margin: 0 0 8px 0; color: var(--text-primary);">
              ${icons.fileText('icon')} Auditable Config Distribution
            </h4>
            <p style="margin: 0; color: var(--text-secondary); font-size: 0.95em;">
              When you need to prove responsible AI usage to security/compliance teams, provide auditable config distribution with email-gated CUD operations to show who created, updated, or deleted configs and when.
            </p>
          </div>

          <div class="card" style="background: var(--bg-tertiary); padding: 20px; border-left: 3px solid #f59e0b;">
            <h4 style="margin: 0 0 8px 0; color: var(--text-primary);">
              ${icons.checkCircle('icon')} Ensure Quality Standards
            </h4>
            <p style="margin: 0; color: var(--text-secondary); font-size: 0.95em;">
              When you evaluate AI coding quality across pilot participants, distribute battle-tested slash commands with AI-enhanced conversion to ensure consistent, high-quality output that justifies broader adoption.
            </p>
          </div>

          <div class="card" style="background: var(--bg-tertiary); padding: 20px; border-left: 3px solid #f59e0b;">
            <h4 style="margin: 0 0 8px 0; color: var(--text-primary);">
              ${icons.barChart('icon')} Track & Report ROI
            </h4>
            <p style="margin: 0; color: var(--text-secondary); font-size: 0.95em;">
              When you present pilot results to VP/CTO for expansion approval, track marketplace downloads, conversion usage, and config adoption to demonstrate measurable productivity gains and ROI.
            </p>
          </div>

          <div class="card" style="background: var(--bg-tertiary); padding: 20px; border-left: 3px solid #f59e0b;">
            <h4 style="margin: 0 0 8px 0; color: var(--text-primary);">
              ${icons.lock('icon')} Enforce Security Policies
            </h4>
            <p style="margin: 0; color: var(--text-secondary); font-size: 0.95em;">
              When you enforce security policies during the pilot phase, curate approved extensions with multi-level marketplace hierarchy to prevent unapproved tool usage while enabling developer productivity.
            </p>
          </div>

          <div class="card" style="background: var(--bg-tertiary); padding: 20px; border-left: 3px solid #f59e0b;">
            <h4 style="margin: 0 0 8px 0; color: var(--text-primary);">
              ${icons.book('icon')} Document Best Practices
            </h4>
            <p style="margin: 0; color: var(--text-secondary); font-size: 0.95em;">
              When you document best practices for AI-assisted development, package proven workflows as distributable plugin collections to create repeatable, documented processes that meet compliance requirements.
            </p>
          </div>

          <div class="card" style="background: var(--bg-tertiary); padding: 20px; border-left: 3px solid #f59e0b;">
            <h4 style="margin: 0 0 8px 0; color: var(--text-primary);">
              ${icons.trendingUp('icon')} Production-Grade Infrastructure
            </h4>
            <p style="margin: 0; color: var(--text-secondary); font-size: 0.95em;">
              When you scale from pilot (20 devs) to department-wide (100+ devs), use production-grade infrastructure (D1, KV, R2, AI Gateway) to avoid migration pain and prove the platform scales to enterprise needs.
            </p>
          </div>

          <div class="card" style="background: var(--bg-tertiary); padding: 20px; border-left: 3px solid #f59e0b;">
            <h4 style="margin: 0 0 8px 0; color: var(--text-primary);">
              ${icons.users('icon')} Support Multi-Tool Evaluation
            </h4>
            <p style="margin: 0; color: var(--text-secondary); font-size: 0.95em;">
              When you support multiple AI tool preferences during evaluation, provide one config source that works across Claude Code, Cursor, Gemini to compare tool effectiveness without fragmenting your config management.
            </p>
          </div>

          <div class="card" style="background: var(--bg-tertiary); padding: 20px; border-left: 3px solid #f59e0b;">
            <h4 style="margin: 0 0 8px 0; color: var(--text-primary);">
              ${icons.settings('icon')} Enterprise Integration
            </h4>
            <p style="margin: 0; color: var(--text-secondary); font-size: 0.95em;">
              When you integrate with enterprise auth and internal systems, leverage extensible infrastructure with proper bindings support to customize the platform for your specific compliance and security needs.
            </p>
          </div>

          <div class="card" style="background: var(--bg-tertiary); padding: 20px; border-left: 3px solid #f59e0b;">
            <h4 style="margin: 0 0 8px 0; color: var(--text-primary);">
              ${icons.refresh('icon')} Fast Iteration
            </h4>
            <p style="margin: 0; color: var(--text-secondary); font-size: 0.95em;">
              When you update pilot configs based on feedback and learnings, invalidate cached conversions and regenerate plugin files to iterate quickly without manual cache clearing or distribution overhead.
            </p>
          </div>

          <div class="card" style="background: var(--bg-tertiary); padding: 20px; border-left: 3px solid #f59e0b;">
            <h4 style="margin: 0 0 8px 0; color: var(--text-primary);">
              ${icons.clipboardCheck('icon')} Demonstrate Control Systems
            </h4>
            <p style="margin: 0; color: var(--text-secondary); font-size: 0.95em;">
              When you demonstrate governance to leadership with specific examples, show curated marketplaces, version control, and update mechanisms to prove you have control systems that enable safe organization-wide rollout.
            </p>
          </div>

          <div class="card" style="background: var(--bg-tertiary); padding: 20px; border-left: 3px solid #f59e0b;">
            <h4 style="margin: 0 0 8px 0; color: var(--text-primary);">
              ${icons.code('icon')} Build Internal MCP Ecosystem
            </h4>
            <p style="margin: 0; color: var(--text-secondary); font-size: 0.95em;">
              When you build internal MCP server ecosystem for proprietary tools, store and convert MCP configs with rule-based accuracy (no AI guessing) to ensure critical infrastructure configs are transformed correctly.
            </p>
          </div>

          <div class="card" style="background: var(--bg-tertiary); padding: 20px; border-left: 3px solid #f59e0b;">
            <h4 style="margin: 0 0 8px 0; color: var(--text-primary);">
              ${icons.cpu('icon')} AI-Enhanced Conversion
            </h4>
            <p style="margin: 0; color: var(--text-secondary); font-size: 0.95em;">
              When you evaluate AI coding quality across pilot participants, distribute battle-tested slash commands with AI-enhanced conversion to ensure consistent, high-quality output that justifies broader adoption.
            </p>
          </div>
        </div>
      </div>

      <!-- Why Us Section -->
      <div class="card slide-up" style="margin-bottom: 32px; background: linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(217, 119, 6, 0.1) 100%); border: 2px solid #f59e0b;">
        <h3 style="display: flex; align-items: center; gap: 10px; margin-bottom: 20px; color: #f59e0b;">
          ${icons.zap('icon')} Why You Can't Build This Yourself
        </h3>
        <div style="display: grid; gap: 16px;">
          <div style="display: flex; gap: 12px; align-items: start;">
            <div style="color: #f59e0b; margin-top: 2px;">${icons.lock('icon')}</div>
            <div>
              <strong style="color: var(--text-primary);">Compliance/Security Requirements</strong>
              <p style="margin: 4px 0 0 0; color: var(--text-secondary);">
                Need auditable, email-gated access from day one
              </p>
            </div>
          </div>
          <div style="display: flex; gap: 12px; align-items: start;">
            <div style="color: #f59e0b; margin-top: 2px;">${icons.server('icon')}</div>
            <div>
              <strong style="color: var(--text-primary);">Enterprise Infrastructure</strong>
              <p style="margin: 4px 0 0 0; color: var(--text-secondary);">
                Production-grade stack (D1, KV, R2, AI Gateway) is expensive to build
              </p>
            </div>
          </div>
          <div style="display: flex; gap: 12px; align-items: start;">
            <div style="color: #f59e0b; margin-top: 2px;">${icons.shield('icon')}</div>
            <div>
              <strong style="color: var(--text-primary);">Governance Framework</strong>
              <p style="margin: 4px 0 0 0; color: var(--text-secondary);">
                Need marketplace curation, version control, and distribution tracking
              </p>
            </div>
          </div>
          <div style="display: flex; gap: 12px; align-items: start;">
            <div style="color: #f59e0b; margin-top: 2px;">${icons.alertTriangle('icon')}</div>
            <div>
              <strong style="color: var(--text-primary);">Risk Mitigation</strong>
              <p style="margin: 4px 0 0 0; color: var(--text-secondary);">
                Can't justify building custom platform when commercial solution exists
              </p>
            </div>
          </div>
          <div style="display: flex; gap: 12px; align-items: start;">
            <div style="color: #f59e0b; margin-top: 2px;">${icons.clock('icon')}</div>
            <div>
              <strong style="color: var(--text-primary);">Time to Value</strong>
              <p style="margin: 4px 0 0 0; color: var(--text-secondary);">
                Pilot duration (8-12 weeks) doesn't allow time to build and test infrastructure
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
            <h4 style="margin: 0 0 8px 0; font-size: 1em;">AI-Enhanced Conversion</h4>
            <p style="margin: 0; font-size: 0.9em; color: var(--text-secondary);">
              Provable quality for leadership presentations
            </p>
          </div>
          <div class="card" style="background: var(--bg-primary); padding: 16px; text-align: center;">
            <div style="color: #f59e0b; margin-bottom: 8px;">${icons.server('icon-lg')}</div>
            <h4 style="margin: 0 0 8px 0; font-size: 1em;">Production Infrastructure</h4>
            <p style="margin: 0; font-size: 0.9em; color: var(--text-secondary);">
              Enterprise-grade foundation that justifies procurement
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

      <!-- Pricing Mention -->
      <div class="card slide-up" style="background: var(--bg-secondary); border: 1px solid var(--border-dim); padding: 24px; text-align: center;">
        <h4 style="margin: 0 0 12px 0; color: var(--text-primary);">Enterprise Pricing</h4>
        <p style="margin: 0 0 16px 0; color: var(--text-secondary);">
          <strong style="color: #f59e0b;">Pilot Package ($2-5K):</strong> 8-12 week pilot with compliance documentation
        </p>
        <p style="margin: 0 0 16px 0; color: var(--text-secondary);">
          <strong style="color: #f59e0b;">Enterprise License ($10-25K/year):</strong> Dedicated instance, SLA, audit logs
        </p>
        <p style="margin: 0; color: var(--text-secondary);">
          <strong style="color: #f59e0b;">Success Package:</strong> Onboarding, best practice workshops, executive reporting
        </p>
      </div>
    </div>
  `;
}
