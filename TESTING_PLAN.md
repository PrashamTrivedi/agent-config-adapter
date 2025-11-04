# Testing Coverage Improvement Plan

## Current State
- Overall Coverage: 53.72%
- Target: 80%+

## Priority 1: Skills Features (NEW - Critical)

### routes/skills.ts (Currently 17.8%)
**Missing Tests:**
- [ ] GET /api/skills/:id/files (list companion files)
- [ ] POST /api/skills/:id/files (upload companion file)
- [ ] GET /api/skills/:id/files/:fileId (download file)
- [ ] DELETE /api/skills/:id/files/:fileId (delete file)
- [ ] POST /api/skills/upload-zip (ZIP upload)
- [ ] GET /api/skills/:id/download (ZIP download)
- [ ] PUT /api/skills/:id (update skill)
- [ ] DELETE /api/skills/:id (delete skill)
- [ ] GET /skills/new (UI route)
- [ ] GET /skills/:id/edit (UI route)

**Estimated Tests Needed:** 15-20 tests

### services/skills-service.ts (Currently 22.36%)
**Missing Tests:**
- [ ] updateSkill()
- [ ] uploadCompanionFile() - single file
- [ ] uploadCompanionFiles() - multiple files
- [ ] getCompanionFile()
- [ ] deleteCompanionFile()
- [ ] listCompanionFiles()
- [ ] uploadFromZip() - valid ZIP
- [ ] uploadFromZip() - invalid ZIP (no SKILL.md)
- [ ] uploadFromZip() - oversized files
- [ ] downloadAsZip() - with companion files
- [ ] downloadAsZip() - binary files preserved
- [ ] File path validation (duplicates, special chars)
- [ ] Cascade delete verification

**Estimated Tests Needed:** 20-25 tests

## Priority 2: Existing 0% Coverage Modules

### services/file-storage-service.ts (0%)
**Status:** Critical infrastructure - MUST test
**Tests Needed:** 10-15 tests

### services/manifest-service.ts (0%)
**Status:** Business logic - MUST test
**Tests Needed:** 15-20 tests

## Priority 3: Review Exclusions

### Remove from vitest.config.ts exclusions:
```typescript
// THESE SHOULD BE TESTED:
'src/services/file-generation-service.ts', // We just fixed bugs here!
'src/services/zip-generation-service.ts',  // Critical functionality
```

### Keep excluded (acceptable):
```typescript
'src/infrastructure/ai-converter.ts', // Fallback tested, external API
'src/routes/plugins.ts',               // Download routes, integration tested
'src/routes/files.ts',                 // Download routes, integration tested
```

## Priority 4: Improve MCP Coverage (27.45% → 60%)

Add integration tests for:
- [ ] Tool invocations
- [ ] Resource access
- [ ] Prompt templates
- [ ] Error handling

## Estimated Total Work

- **New tests to write:** 60-80 tests
- **Estimated time:** 4-6 hours
- **Expected final coverage:** 75-85%

## Implementation Strategy

1. **Phase 1 (Immediate):** Skills routes + service tests (30-40 tests)
2. **Phase 2 (Short-term):** 0% coverage modules (25-30 tests)
3. **Phase 3 (Medium-term):** Remove exclusions, test those modules
4. **Phase 4 (Optional):** MCP integration tests

## Notes

- Views (UI rendering) can remain at low coverage - acceptable for server-rendered HTML
- Adapters already have good coverage (92.27%)
- Focus on business logic and critical paths
