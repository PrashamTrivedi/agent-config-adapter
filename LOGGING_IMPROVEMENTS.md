# Logging and Error Reporting Improvements

## Overview

Enhanced the marketplace download endpoints with comprehensive logging and detailed error responses to improve debuggability and provide better feedback to clients (including Claude Code hooks).

## Changes Made

### 1. Marketplace ZIP Download Endpoint
**File**: [src/routes/plugins.ts:73-187](src/routes/plugins.ts#L73-L187)

#### Added Logging
- Request start with marketplace ID, format, and timestamp
- Database fetch confirmation with marketplace details
- Extension count and extension names
- ZIP generation progress tracking
- Success metrics (file size, duration)
- Detailed error logging with stack traces

#### Enhanced Error Responses
```json
{
  "error": "Failed to generate marketplace ZIP",
  "message": "Specific error message",
  "details": {
    "marketplace_id": "...",
    "format": "claude_code",
    "step": "zip_generation",
    "timestamp": "ISO timestamp",
    "duration_ms": 123
  },
  "troubleshooting": {
    "check_logs": "Review server logs for detailed error information",
    "verify_extensions": "Ensure all extensions in marketplace have valid configs",
    "check_r2": "Verify R2 bucket (EXTENSION_FILES) is accessible"
  }
}
```

### 2. Marketplace Gemini Definition Endpoint
**File**: [src/routes/plugins.ts:37-136](src/routes/plugins.ts#L37-L136)

Similar comprehensive logging and error responses for the Gemini definition endpoint.

### 3. ZIP Generation Service
**File**: [src/services/zip-generation-service.ts:67-191](src/services/zip-generation-service.ts#L67-L191)

#### Added Logging
- Marketplace ZIP generation start
- Per-extension processing (with progress counters)
- File generation status checks
- File list retrieval
- Per-file R2 upload progress
- Extension-specific error handling with detailed context
- Completion metrics

#### Error Handling
Now throws specific errors identifying which extension failed:
```
Failed to process extension "Extension Name" (extension-id): original error message
```

### 4. File Generation Service
**File**: [src/services/file-generation-service.ts:35-118](src/services/file-generation-service.ts#L35-L118)

#### Added Logging
- File generation start with config breakdown
- Generated files list
- Per-file R2 upload progress with size
- Upload success/failure per file
- Final completion summary

### 5. CORS Preflight Handler
**File**: [src/routes/plugins.ts:22-32](src/routes/plugins.ts#L22-L32)

Added OPTIONS handler to properly respond to CORS preflight requests.

## Log Format

All logs use a consistent prefix format for easy filtering:
- `[Marketplace Download]` - Main download endpoint
- `[Marketplace Gemini]` - Gemini definition endpoint
- `[ZipGeneration]` - ZIP generation service
- `[FileGeneration]` - File generation service

## How to Use

### Viewing Logs in Development
```bash
npm run dev
# Logs will appear in the terminal
```

### Viewing Logs in Production
```bash
# Tail logs from deployed worker
wrangler tail

# Filter for specific operations
wrangler tail | grep "Marketplace Download"
wrangler tail | grep "ZipGeneration"
```

### Example Log Output

```
[Marketplace Download] Starting download request {
  marketplaceId: '4dZG8mU9zwUDwq7aqmKjF',
  format: 'claude_code',
  timestamp: '2025-11-03T13:45:00.000Z'
}

[Marketplace Download] Step 1: Fetching marketplace from database {
  marketplaceId: '4dZG8mU9zwUDwq7aqmKjF'
}

[Marketplace Download] Marketplace fetched successfully {
  marketplaceId: '4dZG8mU9zwUDwq7aqmKjF',
  name: 'My Marketplace',
  extensionCount: 3,
  extensions: [
    { id: 'ext-1', name: 'Extension 1' },
    { id: 'ext-2', name: 'Extension 2' },
    { id: 'ext-3', name: 'Extension 3' }
  ]
}

[Marketplace Download] Step 2: Generating ZIP archive {
  format: 'claude_code',
  extensionCount: 3
}

[ZipGeneration] Starting marketplace ZIP generation {
  marketplaceId: '4dZG8mU9zwUDwq7aqmKjF',
  marketplaceName: 'My Marketplace',
  format: 'claude_code',
  extensionCount: 3
}

[ZipGeneration] Processing extension 1/3 {
  extensionId: 'ext-1',
  extensionName: 'Extension 1',
  configCount: 5
}

[ZipGeneration] Checking for generated files {
  extensionId: 'ext-1',
  hasFiles: false
}

[ZipGeneration] Generating files for extension {
  extensionId: 'ext-1'
}

[FileGeneration] Starting file generation {
  extensionId: 'ext-1',
  extensionName: 'Extension 1',
  format: 'claude_code',
  configCount: 5,
  configTypes: { slash_command: 3, mcp_config: 2 }
}

[FileGeneration] Files generated in memory {
  extensionId: 'ext-1',
  format: 'claude_code',
  fileCount: 6,
  filePaths: ['.claude-plugin/plugin.json', 'commands/cmd1.md', ...]
}

[FileGeneration] Uploading file 1/6 to R2 {
  extensionId: 'ext-1',
  filePath: '.claude-plugin/plugin.json',
  r2Key: 'extensions/ext-1/claude_code/.claude-plugin/plugin.json',
  sizeBytes: 1234
}

[FileGeneration] File uploaded successfully {
  filePath: '.claude-plugin/plugin.json',
  r2Key: 'extensions/ext-1/claude_code/.claude-plugin/plugin.json'
}

...

[Marketplace Download] ZIP generated successfully {
  filename: 'my-marketplace-claude_code-marketplace.zip',
  sizeBytes: 45678,
  durationMs: 1234
}
```

## Response Headers

All successful responses now include:
- `X-Response-Time` - Duration in milliseconds
- Standard CORS headers

## Benefits

1. **Better Debugging**: Detailed logs help identify exactly where failures occur
2. **Progress Tracking**: See which extension is being processed
3. **Performance Metrics**: Track generation time and file sizes
4. **Client Feedback**: Detailed error responses help Claude Code hooks understand what went wrong
5. **Troubleshooting Guidance**: Error responses include actionable suggestions

## Testing

All existing tests pass with the new logging:
```bash
npm test -- --run
# ✓ 315 tests passed
```

The logging doesn't affect test behavior - it only adds observability.
