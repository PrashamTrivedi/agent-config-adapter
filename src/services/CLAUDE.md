# Services Layer

Business logic and service coordination. Shared by REST API and MCP server.

## Core Services

### ConfigService
- Config CRUD operations
- **Smart matching** for config references:
  - Exact name match preferred
  - Partial match fallback
- Used by REST routes and MCP tools

### ConversionService
- Format conversion orchestration
- AI-first with rule-based fallback
- Returns metadata: provider, model, tokens, cost, duration
- Caches conversions in KV

### SlashCommandAnalyzerService
- Pre-computes metadata on create/update
- Metadata fields:
  - `has_arguments`: Boolean
  - `argument_hint`: String
  - `agent_references`: Array of agent names
  - `skill_references`: Array of skill names
  - `analysis_version`: Number
- Lazy analysis fallback for existing configs

### SlashCommandConverterService
- AI-enhanced command conversion
- **Reference Inlining**: Fetches and inlines agent/skill content
- Uses SlashCommandAnalyzerService for metadata
- Handles missing references gracefully

### SkillsService
- Multi-file skill management
- Required SKILL.md + optional companion files
- Integration with SkillZipService

### SkillZipService
- ZIP upload/download
- Preserves directory structure
- Companion file management

### ExtensionService
- Bundles multiple configs
- Manifest generation
- Config associations

### MarketplaceService
- Groups extensions
- Marketplace manifest
- Bulk operations

### ManifestService
- Platform-specific manifests:
  - Claude Code: Full ZIP with manifest.json
  - Gemini: JSON definition (recommended)

### FileStorageService
- R2 file operations
- Upload/download companion files
- Binary file handling

### FileGenerationService
- Plugin file generation
- Converts configs to plugin format
- Lazy generation and caching

### ZipGenerationService
- Plugin bundling
- Extension/marketplace ZIPs

### SubscriptionService
- Email subscription management
- KV-based storage (EMAIL_SUBSCRIPTIONS namespace)
- Subscription verification for upload access
- GDPR-compliant delete operations
- Operations:
  - `subscribe(email, ipAddress)`: Create new subscription
  - `isSubscribed(email)`: Verify subscription status
  - `getSubscription(email)`: Retrieve subscription record
  - `listSubscriptions(cursor)`: Admin-only pagination
  - `deleteSubscription(email)`: GDPR compliance

### EmailService
- Custom email API integration
- Admin notifications for subscriptions and logins
- HTML email composition
- Email types:
  - Subscription notifications (to admin)
  - Welcome emails (to subscriber, optional)
  - Login notifications (to admin) - triggered on successful authentication
- Neural Lab design-themed email templates

### AnalyticsService
- Cloudflare Workers Analytics Engine integration
- UTM parameter extraction and persistence (first-touch attribution)
- Session tracking via CF-Ray header
- Event tracking methods:
  - `trackEvent()`: Generic event tracking
  - `trackPageView()`: Page view tracking
  - `trackFunnelStep()`: Funnel step tracking
  - `trackConfigInteraction()`: Config-specific events
  - `trackLoginPageView()`: Login page views with referrer/returnUrl
  - `trackLoginAttempt()`: Auth initiation (GitHub/Email OTP)
  - `trackLoginSuccess()`: Successful auth with user ID
  - `trackLoginFail()`: Failed auth with error type
  - `trackLoginAbandoned()`: Client-side beacon for abandoned logins
- 30-day cookie-based UTM persistence

## Service Patterns

- **Shared logic**: Services used by both REST API routes and MCP tools
- **Consistent behavior**: Same operations via REST or MCP
- **Separation**: Business logic isolated from HTTP/protocol layers
- **Coordination**: Services orchestrate infrastructure (DB, cache, AI, R2, Email Routing)
