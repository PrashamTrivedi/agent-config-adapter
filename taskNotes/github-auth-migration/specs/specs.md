# GitHub Auth Migration - Specs Breakdown

This document breaks down the implementation into manageable phases with clear dependencies.

## Phase Dependency Graph

```
Phase 1 (Database) ─────┐
                        ├──► Phase 2 (Better Auth) ──► Phase 3 (Profile/API Keys)
                        │                                        │
                        │                                        ▼
                        │                             Phase 4 (MCP OAuth)
                        │                                        │
                        ▼                                        ▼
              Phase 5 (Ownership) ◄─────────────────────────────┘
                        │
                        ▼
              Phase 6 (Migration & Cleanup)
                        │
                        ▼
              Phase 7 (Frontend Auth)
```

## Phases Overview

| Phase | Name | Estimated Files | Dependencies |
|-------|------|-----------------|--------------|
| 1 | Database Schema | 2 migrations | None |
| 2 | Better Auth Setup | 5 files | Phase 1 |
| 3 | Profile & API Keys | 4 files | Phase 2 |
| 4 | MCP OAuth | 6 files | Phase 3 |
| 5 | Ownership Enforcement | 8 files | Phase 2, 4 |
| 6 | Migration & Cleanup | 3 files | All previous |
| 7 | Frontend Auth | 7 files | Phase 2, 3 |

## Spec Files

1. [spec-01-database.md](./spec-01-database.md) - Database migrations
2. [spec-02-better-auth.md](./spec-02-better-auth.md) - Better Auth integration
3. [spec-03-profile-api-keys.md](./spec-03-profile-api-keys.md) - Profile page & API key management
4. [spec-04-mcp-oauth.md](./spec-04-mcp-oauth.md) - MCP OAuth 2.0 with PKCE
5. [spec-05-ownership.md](./spec-05-ownership.md) - Ownership enforcement
6. [spec-06-migration.md](./spec-06-migration.md) - Data migration & cleanup
7. [spec-07-frontend-auth.md](./spec-07-frontend-auth.md) - Frontend auth migration

## Critical Path

The critical path for MVP functionality:
1. Database migrations (required for everything)
2. Better Auth (enables web login)
3. Session middleware (enables protected routes)
4. Ownership enforcement (secures CUD operations)

MCP OAuth and Profile page can be implemented in parallel after Better Auth is working.

## Risk Areas

1. **Better Auth D1 Adapter** - Custom adapter may have edge cases
2. **MCP OAuth Complexity** - PKCE + JWT + refresh rotation
3. **Data Migration** - Needs careful handling of orphaned data
4. **UI State Management** - Login state across HTMX partials
