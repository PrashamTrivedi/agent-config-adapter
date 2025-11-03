# Marketplace ZIP Download Bug - Triage Report

**ISSUE**: Claude Code web client fails to download marketplace ZIP files with error "Failed to download configuration ZIP" despite endpoint returning HTTP 200 with valid ZIP data

**INVESTIGATION FINDINGS**:

## 1. Server-Side Behavior (Working Correctly)

### Endpoint Analysis
- **Route**: `/plugins/marketplaces/:marketplaceId/download?format=claude_code`
- **Implementation**: `/root/Code/agent-config-adapter/src/routes/plugins.ts` (lines 70-102)
- **Status**: HTTP 200 with proper response headers
- **Content-Type**: `application/zip`
- **Content-Disposition**: `attachment; filename="essential-dev-marketplace-claude_code-marketplace.zip"`
- **Content-Length**: 16922 bytes

### Testing Results
All curl tests return valid ZIP files:
```bash
# Standard GET request
curl -i "https://agent-config.prashamhtrivedi.app/plugins/marketplaces/4dZG8mU9zwUDwq7aqmKjF/download?format=claude_code"
# Returns: HTTP/2 200, application/zip, valid ZIP content

# With Accept: application/json header
curl -i -H "Accept: application/json" "..."
# Returns: HTTP/2 200, application/zip (correct - returns ZIP, not JSON error)

# With browser User-Agent
curl -i -H "User-Agent: Mozilla/5.0" "..."
# Returns: HTTP/2 200, application/zip

# With Origin header (CORS test)
curl -i -H "Origin: https://claude.ai" "..."
# Returns: HTTP/2 200, application/zip
```

### ZIP Content Validation
The downloaded ZIP file contains valid marketplace structure:
- `marketplace.json` at root
- `plugins/essential-dev-items/*` directory with all plugin files
- Proper ZIP compression and format

## 2. Server Configuration

### CORS Status
- **No explicit CORS middleware** in the Hono application
- **No CORS headers** in response (Access-Control-Allow-Origin missing)
- **OPTIONS preflight** returns 404 (no handler configured)
- **Regular requests still work** - Cloudflare may be adding CORS headers automatically

### Cloudflare Workers Details
- Using Hono framework
- Deployed to Cloudflare Workers
- No rate limiting or security restrictions detected
- Logs enabled in `wrangler.jsonc`

## 3. Response Headers Analysis
```
HTTP/2 200
date: Mon, 03 Nov 2025 11:56:31 GMT
content-type: application/zip
content-length: 16922
content-disposition: attachment; filename="essential-dev-marketplace-claude_code-marketplace.zip"
vary: accept-encoding
server: cloudflare
```

**Missing Headers**:
- No `Access-Control-Allow-Origin` header
- No `Access-Control-Allow-Methods` header
- No `Access-Control-Allow-Headers` header

## 4. Code Analysis

### Route Implementation (plugins.ts:70-102)
```typescript
pluginsRouter.get('/marketplaces/:marketplaceId/download', async (c) => {
  const marketplaceId = c.req.param('marketplaceId');
  const format = (c.req.query('format') || 'claude_code') as 'claude_code' | 'gemini';

  // ... validation and marketplace retrieval ...

  const zipData = await zipService.generateMarketplaceZip(marketplace, format);
  const filename = zipService.getZipFilename(marketplace.name, format, 'marketplace');

  return new Response(zipData, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
});
```

**Observations**:
- Returns raw `Response` object (not using Hono's context methods)
- Only sets Content-Type and Content-Disposition headers
- No CORS headers added

### Main App Configuration (index.ts)
- No CORS middleware configured
- No global error handlers that might modify responses
- Routes mounted directly without middleware wrapper

## 5. Root Cause Analysis

**CAUSE**: Missing CORS headers preventing browser-based download from Claude Code web client

### Why curl works but browser doesn't:
1. **curl bypasses CORS**: Command-line tools don't enforce CORS policies
2. **Browser enforces CORS**: Web applications (like Claude Code web) require CORS headers for cross-origin requests
3. **Cloudflare's automatic CORS**: May not be enabled or may not apply to Workers

### Specific Issue:
When Claude Code web client (running on `claude.ai` domain) attempts to download from `agent-config.prashamhtrivedi.app`:
1. Browser sends preflight OPTIONS request → Gets 404
2. Browser proceeds with GET anyway (simple request)
3. Response lacks `Access-Control-Allow-Origin` header
4. Browser blocks the response from being read by JavaScript
5. Claude Code web reports "Failed to download"

## 6. Additional Considerations

### Content-Type Confusion
The route doesn't check `Accept` header but always returns ZIP:
- Request with `Accept: application/json` still gets ZIP
- This is actually correct behavior (intentional file download)
- But Claude Code may expect JSON error responses on failure

### Cloudflare Workers CORS
- Cloudflare Workers do NOT automatically add CORS headers
- Must be explicitly configured in application code
- Unlike some Cloudflare features, Workers require manual CORS handling

**FIX**: Add CORS headers to the marketplace download endpoint

### Recommended Solution:
```typescript
return new Response(zipData, {
  headers: {
    'Content-Type': 'application/zip',
    'Content-Disposition': `attachment; filename="${filename}"`,
    'Access-Control-Allow-Origin': '*',  // Or specific domain
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Max-Age': '86400',
  },
});
```

### Alternative: Global CORS Middleware
Add Hono CORS middleware to handle all routes:
```typescript
import { cors } from 'hono/cors';

app.use('/plugins/*', cors({
  origin: '*',  // Or ['https://claude.ai']
  allowMethods: ['GET', 'POST', 'OPTIONS'],
}));
```

**PREVENTION**: 
1. Always add CORS headers for public APIs accessed from browsers
2. Test with browser DevTools Network tab, not just curl
3. Add OPTIONS handlers for preflight requests
4. Consider using Hono's CORS middleware for consistency

**TESTING RECOMMENDATION**:
After fix, verify with:
```bash
# Test OPTIONS preflight
curl -X OPTIONS -i "https://agent-config.prashamhtrivedi.app/plugins/marketplaces/.../download"

# Test with Origin header
curl -i -H "Origin: https://claude.ai" "https://agent-config.prashamhtrivedi.app/plugins/marketplaces/.../download?format=claude_code"

# Verify Access-Control-Allow-Origin header is present
```
