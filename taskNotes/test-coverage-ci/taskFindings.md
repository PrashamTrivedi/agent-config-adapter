# Purpose

Set up GitHub Actions workflow for automated test coverage reporting on all branch pushes with PR comments and artifact storage.

## Original Ask

Update/create github action that runs on any branch push, runs the test with coverage and shows the report somewhere..... I leave it to you where to show it properly.

For each PR it must have a comment. But for push I leave it to you where to show it.

## Complexity and the reason behind it

**Complexity Score: 2/5**

**Reasoning:**
- GitHub Actions workflow creation is straightforward with established patterns
- Vitest coverage is already configured and working
- PR comment integration requires only github-script action (no external services)
- Artifact upload for push events is a built-in GitHub Actions feature
- No breaking changes or complex integration points
- Verification is simple: push code and check workflow execution

## Architectural changes required

**None required**

The solution is purely CI/CD infrastructure:
- Creates `.github/workflows/` directory structure
- No changes to application code or existing infrastructure
- Leverages existing vitest configuration and test setup

## Backend changes required

**None required**

All changes are in CI/CD configuration. The backend code remains unchanged.

## Frontend changes required

**None required**

No frontend components involved in this task.

## Implementation Plan

### 1. Create GitHub Actions Workflow File

Create `.github/workflows/test-coverage.yml` with:

**Trigger Configuration:**
- `push`: All branches (runs on every push)
- `pull_request`: All PRs (runs on PR creation and updates)
- **Note**: Workflow configured to skip on commits containing `[skip ci]` to prevent infinite loops from README updates

**Job Steps:**
1. Checkout code
2. Setup Node.js (version 20.x based on common Cloudflare Workers compatibility)
3. Install dependencies (`npm ci` for faster, reproducible builds)
4. Run tests with coverage (`npm test -- --run --coverage`)
5. Generate coverage summary (parse coverage-summary.json)

**Conditional Actions:**
- **For Pull Requests:**
  - Use `github-script` action to post coverage summary as PR comment
  - Include: overall coverage %, lines covered/total, branches covered/total
  - Update existing comment if workflow runs again (avoid spam)
  - Show file-by-file coverage breakdown for changed files

- **For Push Events (non-PR):**
  - Upload coverage reports as workflow artifacts
  - Upload both HTML report and JSON summary
  - Artifacts retained for 30 days (configurable)
  - Accessible via Actions tab → Workflow run → Artifacts section

- **For Main Branch Push Events (Additional):**
  - Extract total coverage percentage from `coverage/coverage-summary.json`
  - Generate shields.io badge URL with dynamic color
  - Update README.md to add/replace coverage badge
  - Badge placement: At the top of README after title (line 3)
  - Badge format: `![Coverage](https://img.shields.io/badge/Coverage-XX%25-{color})`
  - Badge link: Points to GitHub Actions artifacts page for this workflow
  - Commit changes back to main branch using GitHub Actions bot
  - Commit message includes `[skip ci]` to prevent workflow recursion

### 2. README Badge Implementation

**Badge Placement:**
```markdown
# Agent Config Adapter - MVP

![Coverage](https://img.shields.io/badge/Coverage-XX%25-green)

Universal adapter for AI coding agent configurations...
```

**Badge URL Generation:**
- Base URL: `https://img.shields.io/badge/`
- Format: `Coverage-{percentage}%25-{color}`
- Colors:
  - `brightgreen`: ≥80%
  - `yellow`: 60-79%
  - `orange`: 40-59%
  - `red`: <40%
- Link: `https://github.com/{owner}/{repo}/actions/workflows/test-coverage.yml`

**Update Logic:**
1. Check if README already contains a Coverage badge
2. If exists: Replace the entire badge line
3. If not exists: Insert badge on line 3 (after title, before blank line)
4. Use sed or awk for in-place replacement
5. Commit only if README actually changed (check git diff)

**Commit Configuration:**
```yaml
- name: Commit README changes
  run: |
    git config user.name "github-actions[bot]"
    git config user.email "github-actions[bot]@users.noreply.github.com"
    git add README.md
    git diff --staged --quiet || git commit -m "📊 chore: Update coverage badge [skip ci]"
    git push
```

### 3. Coverage Report Format

**PR Comment Template:**
```markdown
## 📊 Test Coverage Report

| Metric | Coverage | Covered | Total |
|--------|----------|---------|-------|
| Statements | XX.XX% | XXX | XXX |
| Branches | XX.XX% | XXX | XXX |
| Functions | XX.XX% | XXX | XXX |
| Lines | XX.XX% | XXX | XXX |

**Status:** ✅ Coverage meets requirements / ⚠️ Coverage below threshold

<details>
<summary>📁 Coverage by File (Click to expand)</summary>

| File | Statements | Branches | Functions | Lines |
|------|------------|----------|-----------|-------|
| ... | ... | ... | ... | ... |

</details>

---
*Updated: YYYY-MM-DD HH:MM:SS UTC*
*Workflow: [View Details](link-to-workflow-run)*
```

**Artifact Structure:**
- `coverage-report.zip` containing:
  - HTML report (from `coverage/` directory)
  - `coverage-summary.json` (machine-readable)
  - `coverage.txt` (text summary for quick viewing)

### 4. Optional Enhancements (Future)

**Coverage Thresholds:**
- Can add minimum coverage requirements in vitest.config.ts
- Fail workflow if coverage drops below threshold
- Currently not implemented but easy to add later

**Coverage Trends:**
- Store historical coverage data
- Show coverage trend over time
- Requires additional storage/action

## Acceptance Criteria

N/A (Complexity score < 3)

## Validation

### Manual Testing Steps

1. **Create the workflow file and push to a feature branch:**
   ```bash
   git checkout -b test/coverage-ci
   git add .github/workflows/test-coverage.yml
   git commit -m "✨ feat: Add GitHub Actions workflow for test coverage"
   git push origin test/coverage-ci
   ```

2. **Verify push event workflow:**
   - Navigate to GitHub Actions tab
   - Confirm workflow runs automatically
   - Check that workflow completes successfully
   - Verify artifacts are uploaded (coverage report downloadable)
   - Download and inspect HTML coverage report

3. **Verify README badge update on main:**
   - Merge the PR or push directly to main
   - Wait for workflow to complete
   - Check that README.md has been updated with coverage badge
   - Verify badge shows correct percentage and color
   - Click badge to confirm it links to Actions page
   - Confirm workflow didn't trigger recursively (check for `[skip ci]` in commit)

4. **Create a Pull Request:**
   ```bash
   gh pr create --title "Add test coverage CI" --body "Test coverage workflow"
   ```

5. **Verify PR event workflow:**
   - Confirm workflow runs on PR
   - Check PR conversation tab for coverage comment
   - Verify comment includes:
     - Coverage percentages table
     - File-by-file breakdown (expandable)
     - Timestamp and workflow link
   - Make a dummy code change and push
   - Confirm comment is updated (not duplicated)

6. **Test Edge Cases:**
   - Push to main branch (should upload artifacts + update badge)
   - Push to feature branch (should upload artifacts, no badge update)
   - Create PR from fork (if applicable - may need workflow_run trigger)
   - Verify workflow handles test failures gracefully
   - Test badge color changes as coverage changes

### Expected Results

- ✅ Workflow runs on every push to any branch
- ✅ Tests execute with coverage successfully
- ✅ Coverage reports generated correctly
- ✅ PR comments appear with formatted coverage table
- ✅ PR comments update on subsequent pushes (no duplicates)
- ✅ Artifacts uploaded for all pushes
- ✅ Artifacts downloadable and contain HTML + JSON reports
- ✅ **Main branch: README badge updated automatically**
- ✅ **Badge shows correct coverage percentage and color**
- ✅ **Badge links to GitHub Actions workflow**
- ✅ **No infinite workflow loops (verified by `[skip ci]`)**
- ✅ Workflow completes within reasonable time (< 5 minutes)

### Commands to Verify

```bash
# Check workflow status
gh workflow view test-coverage.yml

# List recent workflow runs
gh run list --workflow=test-coverage.yml

# View specific run details
gh run view <run-id>

# Download artifacts from a run
gh run download <run-id>

# Check PR comments
gh pr view <pr-number> --comments
```
