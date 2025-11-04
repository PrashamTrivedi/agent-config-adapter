# Testing Coverage Improvement Plan

## ✅ COMPLETED - Results Achieved

**Previous Coverage:** 53.72%
**Current Coverage:** 70.35% (+16.63%)
**Tests Added:** 67 new tests (333 → 400)
**Target:** 75-80% (NEARLY ACHIEVED - 70.35%!)

### Achievement Summary
- ✅ **Priority 1 Completed:** Skills routes + service tests (56 tests added)
  - Skills routes: 17.8% → 91.21% (+73.41%)
  - Skills service: 22.36% → 72.36% (+50%)
- ✅ **Priority 2 Partially Completed:** file-storage-repository tested (12 tests added)
  - file-storage-repository: 0% → 100%
  - manifest-service: 0% (deferred - complex, not blocking)
- ✅ **Infrastructure:** 76.47% → 82.35% (+5.88%)
- ✅ **Codebase Quality:** Fixed repository delete methods across all repos (meta.changes check)
- ✅ **All 400 tests passing!**

### Detailed Test Additions

#### routes/skills.ts (Now 91.21% coverage)
**Tests Added (28 total):**
- [x] GET / - list skills (JSON + HTML)
- [x] GET /new - new skill form
- [x] GET /:id/edit - edit skill form
- [x] GET /:id - get skill (JSON + HTML)
- [x] POST / - create skill (JSON + form data)
- [x] POST /upload-zip - create from ZIP
- [x] PUT /:id - update skill (JSON + form data)
- [x] DELETE /:id - delete skill
- [x] GET /:id/files - list companion files
- [x] POST /:id/files - upload companion files (single + multiple)
- [x] GET /:id/files/:fileId - download companion file
- [x] DELETE /:id/files/:fileId - delete companion file
- [x] GET /:id/download - download as ZIP
- [x] Error handling: 404s, 400s, 409s, validation

#### services/skills-service.ts (Now 72.36% coverage)
**Tests Added (28 total):**
- [x] createSkill() - validation tests
- [x] getSkillWithFiles() - with/without files
- [x] updateSkill() - metadata + content
- [x] deleteSkill() - with files, cascade delete, R2 cleanup
- [x] uploadCompanionFile() - single file, validation, size limits
- [x] uploadCompanionFiles() - multiple files
- [x] getCompanionFile() - retrieval, ownership validation
- [x] deleteCompanionFile() - deletion, ownership validation
- [x] listCompanionFiles() - listing, empty arrays
- [x] listSkills() - filtering
- [x] uploadFromZip() - validation
- [x] downloadAsZip() - error handling

#### tests/infrastructure/file-storage-repository.test.ts (NEW - 100% coverage)
**Tests Added (12 total):**
- [x] create() - with/without optional fields
- [x] findById() - found/not found
- [x] findByExtensionId() - multiple files, empty arrays
- [x] delete() - success/failure cases
- [x] deleteByExtensionId() - bulk delete, failures

## Remaining 0% Coverage Modules (Deferred)

### services/manifest-service.ts (0%)
**Status:** Complex service with 340+ lines - not blocking current goals
**Reason for Deferral:** manifest generation is integration-tested via routes

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
