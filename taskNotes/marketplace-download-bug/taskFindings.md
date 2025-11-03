# Purpose

Fix CORS issue preventing Claude Code web client from downloading marketplace and extension ZIP files

## Original Ask

Triage this, currently claude code web cannot download the zip from same marketplace.

Read the additional settings.json to get the URL

Here is the error:
Failed with non-blocking status code: ERROR: Failed to download configuration ZIP from: https://agent-config.prashamhtrivedi.app/plugins/marketplaces/4dZG8mU9zwUDwq7aqmKjF/download?format=claude_code

## Complexity and the reason behind it

**Complexity: 1/5**

**Reasoning:**
- Simple fix requiring only adding CORS headers to existing response objects
- Well-defined problem with clear solution from triage report
- Affects only 2 routes (marketplace download and extension download)
- No business logic changes required
- Testing is straightforward with curl and browser DevTools
- Low risk of introducing regressions

## Architectural changes required

None required. The existing architecture is sound. This is purely a configuration/header issue.

## Backend changes required

### 1. Add CORS headers to Marketplace Download endpoint
**File:** [src/routes/plugins.ts:93-98](src/routes/plugins.ts#L93-L98)

**Current code:**
```typescript
return new Response(zipData, {
  headers: {
    'Content-Type': 'application/zip',
    'Content-Disposition': `attachment; filename="${filename}"`,
  },
});
```

**Change to:**
```typescript
return new Response(zipData, {
  headers: {
    'Content-Type': 'application/zip',
    'Content-Disposition': `attachment; filename="${filename}"`,
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Max-Age': '86400',
  },
});
```

### 2. Add CORS headers to Extension Download endpoint
**File:** [src/routes/plugins.ts:166-171](src/routes/plugins.ts#L166-L171)

**Current code:**
```typescript
return new Response(zipData, {
  headers: {
    'Content-Type': 'application/zip',
    'Content-Disposition': `attachment; filename="${filename}"`,
  },
});
```

**Change to:**
```typescript
return new Response(zipData, {
  headers: {
    'Content-Type': 'application/zip',
    'Content-Disposition': `attachment; filename="${filename}"`,
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Max-Age': '86400',
  },
});
```

### 3. Add CORS headers to Gemini Definition Download endpoints (preventive)
**Files:**
- [src/routes/plugins.ts:58-63](src/routes/plugins.ts#L58-L63) - Marketplace Gemini definition
- [src/routes/plugins.ts:131-136](src/routes/plugins.ts#L131-L136) - Extension Gemini definition

These JSON downloads may also be accessed from browsers, so should include CORS headers:

```typescript
return new Response(JSON.stringify(...), {
  headers: {
    'Content-Type': 'application/json',
    'Content-Disposition': `attachment; filename="${filename}"`,
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Max-Age': '86400',
  },
});
```

### Alternative: Global CORS Middleware (Optional Enhancement)

Instead of adding headers to each route, we could use Hono's CORS middleware for all plugin routes.

**File:** [src/index.ts](src/index.ts#L62-L63)

**Add after line 20:**
```typescript
import { cors } from 'hono/cors';

// Add CORS for all plugin routes (before mounting routes)
app.use('/plugins/*', cors({
  origin: '*',  // Or ['https://claude.ai', 'https://gemini.google.com'] for specific domains
  allowMethods: ['GET', 'POST', 'OPTIONS'],
  maxAge: 86400,
}));
```

**Recommendation:** Start with the simple approach (add headers directly to routes) since it's:
- More explicit and easier to debug
- No new dependencies
- Works immediately
- Can migrate to middleware later if needed

## Frontend changes required

None required. This is a backend-only fix.

## Validation

### Manual Testing Steps

#### 1. Test Marketplace Download with CORS
```bash
# Test OPTIONS preflight (should return 200 with CORS headers)
curl -X OPTIONS -i "https://agent-config.prashamhtrivedi.app/plugins/marketplaces/4dZG8mU9zwUDwq7aqmKjF/download?format=claude_code"

# Test GET with Origin header (should include Access-Control-Allow-Origin)
curl -i -H "Origin: https://claude.ai" "https://agent-config.prashamhtrivedi.app/plugins/marketplaces/4dZG8mU9zwUDwq7aqmKjF/download?format=claude_code"

# Verify response headers include:
# - Access-Control-Allow-Origin: *
# - Access-Control-Allow-Methods: GET, OPTIONS
# - Access-Control-Max-Age: 86400
```

#### 2. Test Extension Download with CORS
```bash
# Get a sample extension ID first
curl -s "https://agent-config.prashamhtrivedi.app/api/extensions" | jq -r '.[0].id'

# Test download with Origin header
curl -i -H "Origin: https://claude.ai" "https://agent-config.prashamhtrivedi.app/plugins/{extensionId}/claude_code/download"
```

#### 3. Test in Browser DevTools
1. Open https://claude.ai (or Claude Code web)
2. Open DevTools → Network tab
3. Attempt to download marketplace ZIP
4. Check Network tab for:
   - Status: 200 OK
   - Response headers include `Access-Control-Allow-Origin: *`
   - Download succeeds without CORS errors

#### 4. Test in Claude Code Web
1. Configure marketplace URL in settings:
   ```json
   {
     "marketplaces": [
       "https://agent-config.prashamhtrivedi.app/api/marketplaces/4dZG8mU9zwUDwq7aqmKjF/manifest"
     ]
   }
   ```
2. Try to download the marketplace
3. Verify no "Failed to download" error
4. Confirm ZIP file downloads successfully

### Expected Behavior

**Before Fix:**
- Browser blocks response due to missing CORS headers
- Claude Code web shows "Failed to download configuration ZIP" error
- curl works fine (bypasses CORS)

**After Fix:**
- Browser allows response (CORS headers present)
- Claude Code web successfully downloads ZIP
- curl continues to work
- No errors in browser console

### Test Coverage

No new tests required since this is a configuration change. The existing integration tests already verify:
- ZIP generation works correctly
- Endpoint returns valid ZIP files
- Content-Type and Content-Disposition headers are correct

The CORS headers are purely for browser compatibility and don't affect the core functionality that's already tested.

### Deployment Validation

After deploying to production:
1. Test live endpoint with curl CORS headers
2. Test from Claude Code web client
3. Monitor Cloudflare logs for any CORS-related errors
4. Verify no impact on existing API consumers

### Rollback Plan

If issues occur:
1. Remove CORS headers from responses
2. Redeploy previous version
3. Investigate specific browser/client compatibility issues

Very low risk since we're only adding headers, not changing logic.
