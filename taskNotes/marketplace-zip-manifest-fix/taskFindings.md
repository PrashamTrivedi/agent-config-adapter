# Marketplace ZIP Missing marketplace.json Manifest

## Purpose

Fix marketplace ZIP downloads for Claude Code format by including the required `marketplace.json` manifest file at the root of the ZIP archive.

## Original Ask

Export marketplace to zip for claudecode completely misses the marketplace json manifest, thus breaking the imports

## Complexity and the reason behind it

**Complexity Score: 1/5**

**Reasoning:**
- Simple bug fix in existing service
- Just need to add manifest generation to ZIP creation
- ManifestService already has the method to generate marketplace manifest
- Only one file needs modification: `src/services/zip-generation-service.ts`
- No new routes, no UI changes, no database changes
- Straightforward implementation with clear fix

**Why not 0.5/5:**
- Need to ensure proper relative paths in manifest
- Need to test both single plugin and multi-plugin marketplaces
- Need to validate ZIP structure and manifest format

## Architectural changes required

None required. All necessary services and methods already exist.

## Backend changes required

### Bug Analysis

**Current Behavior (src/services/zip-generation-service.ts:64-98):**
```typescript
async generateMarketplaceZip(
  marketplace: { id: string; name: string; extensions: ExtensionWithConfigs[] },
  format: 'claude_code' | 'gemini'
): Promise<Uint8Array> {
  const fileMap: Record<string, Uint8Array> = {};

  // Process each extension
  for (const extension of marketplace.extensions) {
    // ... generates plugin files ...
    // Adds files to: plugins/{plugin-name}/*
  }

  // Generate ZIP
  return zipSync(fileMap, { level: 6 });
}
```

**Problem**: The method only adds individual plugin files to the ZIP but never includes the marketplace manifest.

**Result**: ZIP contains:
```
plugins/
  plugin-1/
    .claude-plugin/plugin.json
    commands/...
  plugin-2/
    .claude-plugin/plugin.json
    commands/...
```

**Missing**: `marketplace.json` at root level

**Why it breaks imports**: Claude Code requires `marketplace.json` at the root to discover and load the plugins. Without it, the ZIP is just a collection of unrelated plugin directories.

### Implementation Fix

**File to modify**: `src/services/zip-generation-service.ts`

**Changes needed**:

1. Import ManifestService at the top:
```typescript
import { ManifestService } from './manifest-service';
```

2. Add manifestService to class properties:
```typescript
export class ZipGenerationService {
  private fileGenService: FileGenerationService;
  private r2: R2Bucket;
  private manifestService: ManifestService;

  constructor(env: ZipGenerationServiceEnv) {
    this.fileGenService = new FileGenerationService(env);
    this.r2 = env.EXTENSION_FILES;
    this.manifestService = new ManifestService();
  }
  // ...
}
```

3. Update `generateMarketplaceZip()` method to include manifest:
```typescript
async generateMarketplaceZip(
  marketplace: { id: string; name: string; extensions: ExtensionWithConfigs[] },
  format: 'claude_code' | 'gemini'
): Promise<Uint8Array> {
  const fileMap: Record<string, Uint8Array> = {};

  // Process each extension
  for (const extension of marketplace.extensions) {
    // ... existing plugin file generation code ...
  }

  // ADD THIS: Generate marketplace manifest for Claude Code format
  if (format === 'claude_code') {
    // Generate marketplace manifest
    const manifest = await this.manifestService.generateClaudeCodeMarketplaceManifest(
      marketplace as any // Cast to MarketplaceWithExtensions type
    );

    // Add marketplace.json to root of ZIP
    fileMap['marketplace.json'] = strToU8(JSON.stringify(manifest, null, 2));
  }

  // Generate ZIP
  const zipped = zipSync(fileMap, {
    level: 6,
  });

  return zipped;
}
```

**Key Points**:
- Only add manifest for Claude Code format (Gemini doesn't use marketplace.json in ZIPs)
- Use `generateClaudeCodeMarketplaceManifest()` which sets relative paths (`./plugins/{name}`)
- Add manifest at root level as `marketplace.json`
- Pretty-print JSON with 2-space indentation for readability

### Expected Result

**After fix, ZIP structure for Claude Code:**
```
marketplace.json          ← NEW: Marketplace manifest
plugins/
  plugin-1/
    .claude-plugin/plugin.json
    commands/...
  plugin-2/
    .claude-plugin/plugin.json
    commands/...
```

**marketplace.json content:**
```json
{
  "name": "dev-toolkit",
  "version": "1.0.0",
  "description": "Development toolkit marketplace",
  "owner": {
    "name": "Owner Name"
  },
  "plugins": [
    {
      "name": "plugin-1",
      "version": "1.0.0",
      "source": "./plugins/plugin-1"
    },
    {
      "name": "plugin-2",
      "version": "1.0.0",
      "source": "./plugins/plugin-2"
    }
  ]
}
```

## Frontend changes required

None required. This is a pure backend bug fix.

## Validation

### Build Validation
```bash
# Ensure TypeScript compiles
npx tsc --noEmit

# Run existing tests
npm test

# Expected: All tests pass, no type errors
```

### Manual Testing

**Setup**:
1. Start local dev server: `npm run dev`
2. Ensure sample marketplace data is loaded

**Test 1: Download Marketplace ZIP for Claude Code**
```bash
# Download marketplace ZIP
curl -O "http://localhost:8787/plugins/marketplaces/dev-toolkit-market/download?format=claude_code"

# Verify ZIP contents
unzip -l dev-toolkit-market-claude_code-marketplace.zip

# Expected output should include:
# - marketplace.json (at root)
# - plugins/plugin-1/.claude-plugin/plugin.json
# - plugins/plugin-1/commands/...
# - plugins/plugin-2/.claude-plugin/plugin.json
# - plugins/plugin-2/commands/...
```

**Test 2: Verify marketplace.json Content**
```bash
# Extract and view marketplace.json
unzip -p dev-toolkit-market-claude_code-marketplace.zip marketplace.json | jq .

# Expected structure:
# {
#   "name": "...",
#   "version": "...",
#   "plugins": [
#     {
#       "name": "...",
#       "source": "./plugins/plugin-name",
#       ...
#     }
#   ]
# }
```

**Test 3: Verify Plugin Sources are Relative Paths**
```bash
# Check that plugin sources use relative paths
unzip -p dev-toolkit-market-claude_code-marketplace.zip marketplace.json | \
  jq '.plugins[].source'

# Expected: All sources should be "./plugins/{plugin-name}"
# NOT HTTP URLs or absolute paths
```

**Test 4: Verify Gemini Format is Unchanged**
```bash
# Download Gemini marketplace ZIP (should NOT have marketplace.json in ZIP)
curl -O "http://localhost:8787/plugins/marketplaces/dev-toolkit-market/download?format=gemini"

# Verify contents
unzip -l dev-toolkit-market-gemini-marketplace.zip

# Expected: Only plugin directories, NO marketplace.json
# (Gemini uses separate JSON definition download endpoint, not ZIP manifest)
```

**Test 5: Test with Single Plugin Marketplace**
```bash
# Create test marketplace with single plugin
curl -X POST http://localhost:8787/api/marketplaces \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Single Plugin Test",
    "version": "1.0.0",
    "owner_name": "Test Owner"
  }'

# Add extension to marketplace (get IDs from previous API calls)
curl -X POST "http://localhost:8787/api/marketplaces/{MARKETPLACE_ID}/extensions" \
  -H "Content-Type: application/json" \
  -d '{
    "extension_ids": ["{EXTENSION_ID}"]
  }'

# Download and verify
curl -O "http://localhost:8787/plugins/marketplaces/{MARKETPLACE_ID}/download?format=claude_code"
unzip -l single-plugin-test-claude_code-marketplace.zip

# Expected: marketplace.json exists with single plugin entry
```

**Test 6: Test with Multi-Plugin Marketplace**
```bash
# Use existing multi-plugin marketplace or create one
curl -O "http://localhost:8787/plugins/marketplaces/{MULTI_PLUGIN_ID}/download?format=claude_code"
unzip -l *-marketplace.zip

# Verify:
# - marketplace.json exists
# - All plugin directories present
# - marketplace.json lists all plugins
```

**Test 7: Claude Code Import Test (If Claude Code Available)**
```bash
# Extract marketplace ZIP
unzip dev-toolkit-market-claude_code-marketplace.zip -d /tmp/test-marketplace

# Try importing in Claude Code
# 1. Copy to ~/.claude/marketplaces/test-marketplace/
# 2. Restart Claude Code
# 3. Verify plugins are discovered and loaded

# OR add to settings:
# {
#   "marketplaces": [
#     "file:///tmp/test-marketplace"
#   ]
# }
```

### Validation Checklist

**Pre-implementation**:
- [x] Understand current bug
- [x] Identify fix location
- [x] Review existing ManifestService methods
- [x] Confirm no architectural changes needed

**Implementation**:
- [ ] Import ManifestService
- [ ] Add to class properties
- [ ] Update generateMarketplaceZip() method
- [ ] Add marketplace.json only for claude_code format
- [ ] Use correct manifest generation method
- [ ] Add at root level of ZIP

**Testing**:
- [ ] TypeScript compilation passes
- [ ] All existing tests pass
- [ ] ZIP contains marketplace.json for Claude Code
- [ ] marketplace.json has correct structure
- [ ] Plugin sources are relative paths
- [ ] Gemini format unchanged (no marketplace.json)
- [ ] Single plugin marketplace works
- [ ] Multi-plugin marketplace works
- [ ] All plugin files still present in ZIP

**Edge Cases**:
- [ ] Marketplace with no extensions (should still work)
- [ ] Marketplace with extensions but no configs (should work)
- [ ] Large marketplaces (10+ plugins) (should work)
- [ ] Extension names with special characters (sanitization works)

## Success Criteria

✅ Marketplace ZIP for Claude Code format includes `marketplace.json` at root
✅ `marketplace.json` contains correct plugin references with relative paths
✅ All plugin files still included in ZIP structure
✅ Gemini format unaffected (still uses separate JSON download endpoint)
✅ TypeScript compilation passes
✅ All tests pass
✅ No breaking changes to existing functionality
✅ Claude Code can successfully import marketplace from ZIP

## Notes

### Why Only Claude Code Format?

Gemini CLI uses a different approach for marketplace distribution:
- **Gemini**: Downloads JSON collection via separate endpoint (`/plugins/marketplaces/:id/gemini/definition`)
- **Claude Code**: Uses marketplace manifest inside ZIP for offline/local installation

### Relative vs HTTP URL Sources

In the ZIP, we use relative paths (`./plugins/plugin-name`) because:
- ZIP is self-contained for offline installation
- User extracts to local filesystem
- Claude Code resolves relative paths from ZIP location
- HTTP URLs would only work while server is accessible

For HTTP marketplace manifests (separate endpoint), we use HTTP URLs because Claude Code fetches files remotely.

### Future Enhancements

Consider for future:
1. Add marketplace README.md to ZIP with installation instructions
2. Add LICENSE file if marketplace has license info
3. Add CHANGELOG.md with version history
4. Support for marketplace-level assets (logos, screenshots)
