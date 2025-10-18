# Backend Test Plan - Agent Config Adapter

**Document Version:** 1.0
**Last Updated:** 2025-10-18
**Status:** Initial Plan
**Current Coverage:** ~0.6% (36 tests for ~6,312 lines of code)

---

## Executive Summary

This document outlines a comprehensive testing strategy for the Agent Config Adapter backend. Currently, only the MCPConfigAdapter has test coverage (36 tests). This plan provides a phased approach to achieve comprehensive backend test coverage across all layers: adapters, services, infrastructure, routes, and MCP server.

**Key Objectives:**
- Achieve >80% code coverage for critical business logic
- Establish consistent test patterns and conventions
- Create reusable test fixtures and mocks
- Enable CI/CD integration with automated testing
- Prevent regressions during feature development

---

## Current State Analysis

### Test Coverage Summary

| Layer | Files | Current Tests | Lines of Code | Coverage |
|-------|-------|--------------|---------------|----------|
| Adapters | 3 | 36 (MCP only) | ~340 | ~10% |
| Services | 8 | 0 | ~950 | 0% |
| Infrastructure | 5+ | 0 | ~400+ | 0% |
| Routes | 5 | 0 | 1,194 | 0% |
| MCP Server | 2 | 0 | ~600+ | 0% |
| **TOTAL** | **27** | **36** | **~6,312** | **~0.6%** |

### Existing Test Infrastructure

**Tools in Use:**
- Vitest 1.6.1 (test framework)
- Chai 4.5.0 (assertions)
- Miniflare 4.20251004.0 (Cloudflare Workers environment)
- @modelcontextprotocol/sdk 1.20.0 (MCP testing)

**Test Patterns from Existing Tests:**
- Nested describe blocks for organization
- Shared test data at suite scope
- Chai-style expect assertions
- Comprehensive format coverage (all 3 formats tested)
- Bidirectional conversion testing
- Edge case and error case coverage

---

## Phase 1: Foundation Setup (Priority: Critical)

**Goal:** Establish test infrastructure and patterns

### 1.1 Test Configuration

**Tasks:**
- [ ] Create `vitest.config.ts` with Cloudflare Workers support
- [ ] Configure test environment variables
- [ ] Set up test database migrations for local D1
- [ ] Configure code coverage reporting (c8/istanbul)
- [ ] Add test scripts to package.json

**File:** `vitest.config.ts`
```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'miniflare',
    environmentOptions: {
      bindings: {
        // Mock bindings for tests
      },
    },
    coverage: {
      provider: 'c8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        '*.config.ts',
      ],
    },
  },
});
```

**Estimated Effort:** 4 hours

### 1.2 Test Fixtures and Helpers

**Tasks:**
- [ ] Create sample config fixtures (slash commands, agents, MCP)
- [ ] Create sample extension fixtures
- [ ] Create sample marketplace fixtures
- [ ] Build mock factory for D1, KV, R2 bindings
- [ ] Build test utilities for common assertions

**Files to Create:**
```
tests/
├── fixtures/
│   ├── sample-configs.ts       # All config types with variations
│   ├── sample-extensions.ts    # Extension test data
│   ├── sample-marketplaces.ts  # Marketplace test data
│   └── sample-conversions.ts   # Expected conversion results
├── helpers/
│   ├── test-utils.ts           # Common test utilities
│   ├── mock-factory.ts         # Factory for creating mocks
│   └── db-helpers.ts           # Database test helpers
└── setup.ts                    # Global test setup
```

**Sample Fixture Structure:**
```typescript
// tests/fixtures/sample-configs.ts
export const sampleSlashCommandClaudeCode = {
  id: 'test-cmd-1',
  type: 'slash_command',
  source_format: 'claude_code',
  content: '---\ntitle: Test Command\n---\nTest content',
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
};

export const sampleMCPConfigClaudeCode = {
  id: 'test-mcp-1',
  type: 'mcp_config',
  source_format: 'claude_code',
  content: JSON.stringify({
    mcpServers: {
      'test-server': {
        type: 'stdio',
        command: 'node',
        args: ['server.js'],
      },
    },
  }),
};
```

**Mock Factory Example:**
```typescript
// tests/helpers/mock-factory.ts
export function createMockD1Database() {
  const store = new Map();
  return {
    prepare: (query: string) => ({
      bind: (...params: any[]) => ({
        first: async () => store.get(params[0]),
        all: async () => ({ results: Array.from(store.values()) }),
        run: async () => ({ success: true }),
      }),
    }),
  };
}

export function createMockKVNamespace() {
  const cache = new Map();
  return {
    get: async (key: string) => cache.get(key),
    put: async (key: string, value: string) => cache.set(key, value),
    delete: async (key: string) => cache.delete(key),
  };
}

export function createMockR2Bucket() {
  const files = new Map();
  return {
    get: async (key: string) => files.get(key),
    put: async (key: string, value: any) => files.set(key, value),
    delete: async (key: string) => files.delete(key),
  };
}
```

**Estimated Effort:** 8 hours

---

## Phase 2: Adapter Tests (Priority: High)

**Goal:** Complete adapter layer testing (currently 10% coverage)

### 2.1 SlashCommandAdapter Tests

**File:** `tests/adapters/slash-command-adapter.test.ts`

**Test Cases:**
- [ ] **Validation Tests** (9 tests)
  - Validate Claude Code markdown format
  - Validate Codex format with sections
  - Validate Gemini TOML format
  - Reject invalid formats
  - Handle missing required fields
  - Handle malformed content

- [ ] **Conversion Tests - Claude Code** (6 tests)
  - Convert Claude Code → Codex
  - Convert Claude Code → Gemini
  - Preserve title and description
  - Handle multi-line prompts
  - Handle special characters in content
  - Handle empty optional fields

- [ ] **Conversion Tests - Codex** (6 tests)
  - Convert Codex → Claude Code
  - Convert Codex → Gemini
  - Parse section-based format
  - Handle missing sections
  - Preserve formatting
  - Handle special characters

- [ ] **Conversion Tests - Gemini** (6 tests)
  - Convert Gemini → Claude Code
  - Convert Gemini → Codex
  - Parse TOML format correctly
  - Handle TOML special characters
  - Preserve metadata
  - Handle nested structures

- [ ] **Edge Cases** (6 tests)
  - Very long command content
  - Unicode and emoji characters
  - Commands with no arguments
  - Commands with complex nested structures
  - Malformed but parseable content
  - Empty content handling

**Total Tests:** 33 tests
**Estimated Effort:** 6 hours

### 2.2 Adapter Factory Tests

**File:** `tests/adapters/index.test.ts`

**Test Cases:**
- [ ] **Factory Pattern** (6 tests)
  - Get adapter by config type
  - Return correct adapter instance
  - Handle unknown config types
  - Cache adapter instances
  - Support all config types
  - Throw on unsupported types

- [ ] **AI-Enhanced Selection** (3 tests)
  - Select AI-enhanced for slash commands
  - Select rule-based for MCP configs
  - Default behavior for agent definitions

**Total Tests:** 9 tests
**Estimated Effort:** 2 hours

---

## Phase 3: Service Layer Tests (Priority: Critical)

**Goal:** Test core business logic (currently 0% coverage)

### 3.1 ConfigService Tests

**File:** `tests/services/config-service.test.ts`

**Test Cases:**
- [ ] **CRUD Operations** (10 tests)
  - Create config with valid data
  - Create config generates unique ID
  - Read config by ID
  - Read returns null for missing ID
  - Update config with partial data
  - Update preserves unchanged fields
  - Delete config by ID
  - Delete returns false for missing ID
  - List all configs
  - List returns empty array when no configs

- [ ] **Validation** (6 tests)
  - Reject missing required fields
  - Reject invalid config types
  - Reject invalid source formats
  - Validate content is non-empty
  - Validate type matches content structure
  - Handle validation errors gracefully

- [ ] **Cache Invalidation** (4 tests)
  - Invalidate cache on update
  - Invalidate cache on delete
  - Skip invalidation if cache service unavailable
  - Handle cache errors gracefully

**Total Tests:** 20 tests
**Estimated Effort:** 5 hours

### 3.2 ConversionService Tests

**File:** `tests/services/conversion-service.test.ts`

**Test Cases:**
- [ ] **Core Conversion Flow** (12 tests)
  - Convert with AI when available
  - Fall back to rule-based on AI failure
  - Use cache when available
  - Populate cache after conversion
  - Return source content when formats match
  - Track metadata: cached=true when from cache
  - Track metadata: usedAI=true when AI succeeds
  - Track metadata: fallbackUsed=true when AI fails
  - Handle unsupported format gracefully
  - Handle missing adapter gracefully
  - Chain multiple conversions if needed
  - Preserve semantic meaning across conversions

- [ ] **Cache Management** (6 tests)
  - Check cache before conversion
  - Save to cache after conversion
  - Use correct cache key format
  - Handle cache read errors
  - Handle cache write errors
  - Invalidate specific format conversions

- [ ] **AI Integration** (6 tests)
  - Use AI for slash commands
  - Skip AI for MCP configs
  - Handle AI service unavailable
  - Handle AI timeout
  - Handle AI invalid response
  - Fall back on any AI error

**Total Tests:** 24 tests
**Estimated Effort:** 6 hours

### 3.3 ExtensionService Tests

**File:** `tests/services/extension-service.test.ts`

**Test Cases:**
- [ ] **Extension CRUD** (10 tests)
  - Create extension with metadata
  - Create generates unique ID
  - Read extension by ID
  - Read with configs populated
  - Read without configs
  - Update extension metadata
  - Delete extension
  - Delete cascades to associations
  - List all extensions
  - List with filters

- [ ] **Config Associations** (8 tests)
  - Add single config to extension
  - Add multiple configs in batch
  - Remove config from extension
  - Handle duplicate additions
  - Handle invalid config IDs
  - List configs for extension
  - Maintain association order
  - Handle transaction failures

- [ ] **Cache Management** (3 tests)
  - Invalidate extension cache on update
  - Invalidate on config association changes
  - Handle cache errors

**Total Tests:** 21 tests
**Estimated Effort:** 5 hours

### 3.4 MarketplaceService Tests

**File:** `tests/services/marketplace-service.test.ts`

**Test Cases:**
- [ ] **Marketplace CRUD** (10 tests)
  - Create marketplace with metadata
  - Create generates unique ID
  - Read marketplace by ID
  - Read with extensions populated
  - Read without extensions
  - Update marketplace metadata
  - Delete marketplace
  - Delete cascades to associations
  - List all marketplaces
  - List with filters

- [ ] **Extension Associations** (8 tests)
  - Add single extension to marketplace
  - Add multiple extensions in batch
  - Remove extension from marketplace
  - Handle duplicate additions
  - Handle invalid extension IDs
  - List extensions for marketplace
  - Maintain association order
  - Handle transaction failures

- [ ] **Cache Management** (3 tests)
  - Invalidate marketplace cache on update
  - Invalidate on extension changes
  - Handle cache errors

**Total Tests:** 21 tests
**Estimated Effort:** 5 hours

### 3.5 ManifestService Tests

**File:** `tests/services/manifest-service.test.ts`

**Test Cases:**
- [ ] **Claude Code Manifest** (8 tests)
  - Generate plugin manifest for extension
  - Include slash commands in manifest
  - Include agents in manifest
  - Include MCP configs in manifest
  - Format manifest correctly
  - Handle extension with no configs
  - Handle mixed config types
  - Include metadata fields

- [ ] **Gemini Manifest** (8 tests)
  - Generate Gemini extension manifest
  - Format as JSON definition
  - Include all config conversions
  - Handle conversion errors gracefully
  - Include extension metadata
  - Validate JSON structure
  - Handle empty extensions
  - Support manifest variations

- [ ] **Marketplace Manifest** (6 tests)
  - Aggregate multiple extension manifests
  - Format for Claude Code marketplace
  - Include all extensions
  - Handle missing extensions
  - Consolidate duplicate MCP servers
  - Format marketplace metadata

**Total Tests:** 22 tests
**Estimated Effort:** 5 hours

### 3.6 FileGenerationService Tests

**File:** `tests/services/file-generation-service.test.ts`

**Test Cases:**
- [ ] **Claude Code Files** (12 tests)
  - Generate .claude-plugin/plugin.json
  - Generate command files (commands/*.md)
  - Generate agent files (agents/*.md)
  - Generate consolidated MCP config
  - Sanitize file names correctly
  - Handle special characters in names
  - Upload to R2 bucket
  - Track uploaded files
  - Handle upload failures
  - Overwrite existing files
  - Delete old files on regeneration
  - Create proper directory structure

- [ ] **Gemini Files** (8 tests)
  - Generate gemini.json definition
  - Generate GEMINI.md documentation
  - Include all configs in JSON
  - Format JSON correctly
  - Include usage instructions in GEMINI.md
  - Upload to R2 bucket
  - Handle conversion errors
  - Track generated files

- [ ] **File Operations** (6 tests)
  - List files for extension/format
  - Retrieve individual file
  - Delete all files for extension
  - Clear cache on invalidation
  - Handle R2 errors gracefully
  - Return file metadata correctly

**Total Tests:** 26 tests
**Estimated Effort:** 6 hours

### 3.7 ZipGenerationService Tests

**File:** `tests/services/zip-generation-service.test.ts`

**Test Cases:**
- [ ] **Plugin ZIP** (8 tests)
  - Create ZIP for Claude Code plugin
  - Create ZIP for Gemini plugin
  - Include all extension files
  - Maintain directory structure
  - Set correct file permissions
  - Handle large files
  - Stream ZIP to response
  - Handle missing files

- [ ] **Marketplace ZIP** (6 tests)
  - Aggregate multiple plugin ZIPs
  - Create nested directory structure
  - Include all marketplace extensions
  - Handle format filtering
  - Support both Claude Code and Gemini
  - Stream large marketplace ZIPs

- [ ] **Error Handling** (3 tests)
  - Handle file generation errors
  - Handle ZIP creation errors
  - Provide partial results on errors

**Total Tests:** 17 tests
**Estimated Effort:** 4 hours

---

## Phase 4: Infrastructure Tests (Priority: High)

**Goal:** Test data persistence and external integrations (currently 0% coverage)

### 4.1 ConfigRepository Tests

**File:** `tests/infrastructure/config-repository.test.ts`

**Test Cases:**
- [ ] **Create Operations** (6 tests)
  - Insert config with generated ID
  - Set created_at timestamp
  - Set updated_at timestamp
  - Return created config with ID
  - Handle duplicate IDs (retry)
  - Validate required fields

- [ ] **Read Operations** (6 tests)
  - Find config by ID
  - Return null for missing ID
  - Find all configs
  - Return empty array when no results
  - Return configs with correct types
  - Handle malformed data

- [ ] **Update Operations** (6 tests)
  - Update all fields
  - Update partial fields
  - Preserve unchanged fields
  - Update updated_at timestamp
  - Preserve created_at timestamp
  - Return updated config

- [ ] **Delete Operations** (3 tests)
  - Delete config by ID
  - Return true on successful delete
  - Return false for missing ID

- [ ] **Query Execution** (3 tests)
  - Parameterize queries correctly
  - Handle D1 errors
  - Handle database timeouts

**Total Tests:** 24 tests
**Estimated Effort:** 5 hours

### 4.2 ExtensionRepository Tests

**File:** `tests/infrastructure/extension-repository.test.ts`

**Test Cases:**
- [ ] **Extension CRUD** (12 tests)
  - Create extension with metadata
  - Read extension by ID
  - Update extension
  - Delete extension
  - List all extensions
  - Handle timestamps correctly

- [ ] **Extension-Config Relations** (8 tests)
  - Add config to extension
  - Remove config from extension
  - List configs for extension
  - Handle many-to-many relationships
  - Maintain association order
  - Prevent duplicate associations
  - Handle orphaned associations
  - Cascade delete on extension removal

**Total Tests:** 20 tests
**Estimated Effort:** 5 hours

### 4.3 MarketplaceRepository Tests

**File:** `tests/infrastructure/marketplace-repository.test.ts`

**Test Cases:**
- [ ] **Marketplace CRUD** (12 tests)
  - Create marketplace with metadata
  - Read marketplace by ID
  - Update marketplace
  - Delete marketplace
  - List all marketplaces
  - Handle timestamps correctly

- [ ] **Marketplace-Extension Relations** (8 tests)
  - Add extension to marketplace
  - Remove extension from marketplace
  - List extensions for marketplace
  - Handle many-to-many relationships
  - Maintain association order
  - Prevent duplicate associations
  - Handle orphaned associations
  - Cascade delete on marketplace removal

**Total Tests:** 20 tests
**Estimated Effort:** 5 hours

### 4.4 CacheService Tests

**File:** `tests/infrastructure/cache-service.test.ts`

**Test Cases:**
- [ ] **Cache Operations** (9 tests)
  - Generate correct cache keys
  - Store value in KV
  - Retrieve value from KV
  - Return null for missing key
  - Delete single cache entry
  - Delete all format variations
  - Handle KV errors gracefully
  - Respect TTL settings
  - Handle large cached values

- [ ] **Invalidation** (6 tests)
  - Invalidate specific format
  - Invalidate all formats for config
  - Invalidate extension cache
  - Invalidate marketplace cache
  - Handle partial invalidation failures
  - Track invalidation operations

**Total Tests:** 15 tests
**Estimated Effort:** 3 hours

### 4.5 AIConverterService Tests

**File:** `tests/infrastructure/ai-converter-service.test.ts`

**Test Cases:**
- [ ] **OpenAI Integration** (9 tests)
  - Build conversion prompt correctly
  - Include source format in prompt
  - Include target format in prompt
  - Include format specifications
  - Call OpenAI via AI Gateway
  - Parse successful response
  - Handle OpenAI errors
  - Handle timeout errors
  - Handle rate limit errors

- [ ] **Format Specifications** (6 tests)
  - Provide Claude Code spec for slash commands
  - Provide Codex spec for slash commands
  - Provide Gemini spec for slash commands
  - Include examples in prompts
  - Validate response format
  - Handle unsupported types

- [ ] **Error Handling** (6 tests)
  - Throw on network errors
  - Throw on invalid API key
  - Throw on malformed response
  - Throw on empty response
  - Handle partial responses
  - Log errors for debugging

**Total Tests:** 21 tests
**Estimated Effort:** 5 hours

### 4.6 FileStorageService Tests

**File:** `tests/infrastructure/file-storage-service.test.ts`

**Test Cases:**
- [ ] **R2 Operations** (9 tests)
  - Upload file to R2
  - Retrieve file from R2
  - Delete file from R2
  - List files by prefix
  - Handle large files
  - Stream file content
  - Set correct content types
  - Handle R2 errors
  - Handle missing files

- [ ] **File Metadata** (6 tests)
  - Store file metadata in D1
  - Retrieve file metadata
  - Update metadata
  - Delete metadata on file removal
  - Track file versions
  - Handle metadata sync errors

**Total Tests:** 15 tests
**Estimated Effort:** 4 hours

---

## Phase 5: Route Handler Tests (Priority: Medium)

**Goal:** Test HTTP API endpoints (currently 0% coverage)

### 5.1 Config Routes Tests

**File:** `tests/routes/configs.test.ts`

**Test Cases:**
- [ ] **GET /api/configs** (6 tests)
  - List all configs (JSON)
  - Return empty array when no configs
  - Return configs with correct schema
  - Handle database errors
  - Content negotiation (Accept header)
  - Return HTML when requested

- [ ] **GET /api/configs/:id** (6 tests)
  - Get single config by ID (JSON)
  - Return 404 for missing ID
  - Return config with correct schema
  - Handle malformed IDs
  - Content negotiation
  - Return HTML form when requested

- [ ] **GET /api/configs/:id/format/:format** (9 tests)
  - Convert config to target format
  - Return converted content
  - Return conversion metadata
  - Cache converted result
  - Handle invalid format
  - Handle conversion errors
  - Return 404 for missing config
  - Support all format combinations
  - Include cache status in response

- [ ] **POST /api/configs** (9 tests)
  - Create config with JSON body
  - Create config with form data
  - Return created config with ID
  - Validate required fields
  - Return 400 on validation errors
  - Handle database errors
  - Support all config types
  - Set timestamps correctly
  - Return 201 status code

- [ ] **PUT /api/configs/:id** (9 tests)
  - Update config with JSON body
  - Update config with form data
  - Update partial fields
  - Preserve unchanged fields
  - Return updated config
  - Return 404 for missing ID
  - Validate updates
  - Return 400 on validation errors
  - Invalidate cache on update

- [ ] **DELETE /api/configs/:id** (6 tests)
  - Delete config by ID
  - Return 204 status code
  - Return 404 for missing ID
  - Invalidate cache on delete
  - Handle database errors
  - Clean up associations

- [ ] **POST /api/configs/:id/invalidate** (6 tests)
  - Invalidate all cached conversions
  - Return success response
  - Return 404 for missing config
  - Handle cache errors gracefully
  - Support format-specific invalidation
  - Track invalidation operations

**Total Tests:** 51 tests
**Estimated Effort:** 8 hours

### 5.2 Extension Routes Tests

**File:** `tests/routes/extensions.test.ts`

**Test Cases:**
- [ ] **GET /api/extensions** (6 tests)
  - List all extensions
  - Include config counts
  - Support pagination
  - Filter by criteria
  - Handle empty results
  - Return correct schema

- [ ] **GET /api/extensions/:id** (6 tests)
  - Get extension by ID
  - Include associated configs
  - Return 404 for missing ID
  - Handle database errors
  - Support config expansion
  - Return correct schema

- [ ] **GET /api/extensions/:id/manifest/:format** (9 tests)
  - Generate Claude Code manifest
  - Generate Gemini manifest
  - Return correct content-type
  - Cache generated manifest
  - Handle format-specific logic
  - Return 404 for missing extension
  - Handle generation errors
  - Include all configs
  - Validate manifest structure

- [ ] **POST /api/extensions** (6 tests)
  - Create extension with metadata
  - Return created extension
  - Validate required fields
  - Return 400 on errors
  - Set timestamps
  - Return 201 status

- [ ] **PUT /api/extensions/:id** (6 tests)
  - Update extension metadata
  - Preserve unchanged fields
  - Return updated extension
  - Return 404 for missing ID
  - Validate updates
  - Invalidate cache

- [ ] **DELETE /api/extensions/:id** (6 tests)
  - Delete extension
  - Cascade delete associations
  - Return 204 status
  - Return 404 for missing ID
  - Clean up files in R2
  - Handle errors

- [ ] **GET /api/extensions/:id/configs** (6 tests)
  - List configs for extension
  - Return in association order
  - Return empty array
  - Return 404 for missing extension
  - Include config metadata
  - Handle errors

- [ ] **POST /api/extensions/:id/configs** (9 tests)
  - Add multiple configs (batch)
  - Add single config
  - Validate config IDs
  - Prevent duplicates
  - Return updated associations
  - Return 404 for missing extension
  - Return 400 for invalid configs
  - Handle transaction errors
  - Invalidate extension cache

- [ ] **DELETE /api/extensions/:id/configs/:configId** (6 tests)
  - Remove config from extension
  - Return 204 status
  - Return 404 for missing extension
  - Return 404 for missing config
  - Handle non-existent associations
  - Invalidate cache

- [ ] **POST /api/extensions/:id/invalidate** (6 tests)
  - Invalidate extension cache
  - Clear generated files
  - Return success response
  - Return 404 for missing extension
  - Handle errors
  - Track operations

**Total Tests:** 66 tests
**Estimated Effort:** 10 hours

### 5.3 Marketplace Routes Tests

**File:** `tests/routes/marketplaces.test.ts`

**Test Cases:**
- [ ] **GET /api/marketplaces** (6 tests)
  - List all marketplaces
  - Include extension counts
  - Support pagination
  - Filter by criteria
  - Handle empty results
  - Return correct schema

- [ ] **GET /api/marketplaces/:id** (6 tests)
  - Get marketplace by ID
  - Include associated extensions
  - Return 404 for missing ID
  - Handle database errors
  - Support extension expansion
  - Return correct schema

- [ ] **GET /api/marketplaces/:id/manifest** (6 tests)
  - Generate marketplace manifest
  - Aggregate extension manifests
  - Return Claude Code format
  - Cache generated manifest
  - Return 404 for missing marketplace
  - Handle generation errors

- [ ] **POST /api/marketplaces** (6 tests)
  - Create marketplace with metadata
  - Return created marketplace
  - Validate required fields
  - Return 400 on errors
  - Set timestamps
  - Return 201 status

- [ ] **PUT /api/marketplaces/:id** (6 tests)
  - Update marketplace metadata
  - Preserve unchanged fields
  - Return updated marketplace
  - Return 404 for missing ID
  - Validate updates
  - Invalidate cache

- [ ] **DELETE /api/marketplaces/:id** (6 tests)
  - Delete marketplace
  - Cascade delete associations
  - Return 204 status
  - Return 404 for missing ID
  - Clean up cached data
  - Handle errors

- [ ] **POST /api/marketplaces/:id/extensions** (9 tests)
  - Add multiple extensions (batch)
  - Add single extension
  - Validate extension IDs
  - Prevent duplicates
  - Return updated associations
  - Return 404 for missing marketplace
  - Return 400 for invalid extensions
  - Handle transaction errors
  - Invalidate marketplace cache

- [ ] **DELETE /api/marketplaces/:id/extensions/:extensionId** (6 tests)
  - Remove extension from marketplace
  - Return 204 status
  - Return 404 for missing marketplace
  - Return 404 for missing extension
  - Handle non-existent associations
  - Invalidate cache

- [ ] **POST /api/marketplaces/:id/invalidate** (6 tests)
  - Invalidate marketplace cache
  - Clear generated manifests
  - Return success response
  - Return 404 for missing marketplace
  - Handle errors
  - Track operations

**Total Tests:** 57 tests
**Estimated Effort:** 9 hours

### 5.4 Plugin Routes Tests

**File:** `tests/routes/plugins.test.ts`

**Test Cases:**
- [ ] **GET /plugins/:extensionId/:format** (9 tests)
  - Browse Claude Code plugin files
  - Browse Gemini plugin files
  - Return file listing HTML
  - Show directory structure
  - Return 404 for missing extension
  - Return 404 for unsupported format
  - Generate files on first request
  - Cache file listings
  - Handle generation errors

- [ ] **GET /plugins/:extensionId/:format/download** (9 tests)
  - Download Claude Code ZIP
  - Download Gemini ZIP
  - Return correct content-type (application/zip)
  - Set correct filename header
  - Stream ZIP content
  - Return 404 for missing extension
  - Return 404 for unsupported format
  - Handle large ZIPs
  - Handle generation errors

- [ ] **GET /plugins/:extensionId/gemini/definition** (6 tests)
  - Download Gemini JSON definition
  - Return correct content-type (application/json)
  - Set correct filename header
  - Include all configs
  - Return 404 for missing extension
  - Handle conversion errors

- [ ] **GET /plugins/:extensionId/:format/*** (9 tests)
  - Serve individual plugin file
  - Return correct content-type
  - Handle nested directories
  - Return 404 for missing file
  - Return 404 for missing extension
  - Stream file content
  - Support all file types
  - Handle large files
  - Cache file responses

- [ ] **POST /plugins/:extensionId/:format/invalidate** (6 tests)
  - Invalidate plugin cache
  - Regenerate plugin files
  - Delete old files from R2
  - Return success response
  - Return 404 for missing extension
  - Handle errors

- [ ] **GET /plugins/marketplaces/:marketplaceId/gemini/definition** (6 tests)
  - Download marketplace Gemini JSON
  - Include all extensions
  - Return correct content-type
  - Return 404 for missing marketplace
  - Handle conversion errors
  - Cache result

- [ ] **GET /plugins/marketplaces/:marketplaceId/download** (9 tests)
  - Download marketplace ZIP
  - Support format query parameter
  - Include all extensions
  - Create nested structure
  - Return correct content-type
  - Set correct filename
  - Return 404 for missing marketplace
  - Handle large ZIPs
  - Handle errors

**Total Tests:** 54 tests
**Estimated Effort:** 9 hours

### 5.5 File Routes Tests

**File:** `tests/routes/files.test.ts`

**Test Cases:**
- [ ] **GET /files/:extensionId/:format/*** (12 tests)
  - Serve markdown files
  - Serve JSON files
  - Serve TOML files
  - Return correct MIME types
  - Handle nested paths
  - Return 404 for missing files
  - Return 404 for missing extension
  - Stream file content
  - Support caching headers
  - Handle large files
  - Support byte-range requests
  - Handle R2 errors

**Total Tests:** 12 tests
**Estimated Effort:** 3 hours

---

## Phase 6: MCP Server Tests (Priority: Medium)

**Goal:** Test MCP server implementation (currently 0% coverage)

### 6.1 MCP Server Tests

**File:** `tests/mcp/server.test.ts`

**Test Cases:**
- [ ] **Tool: create_config** (9 tests)
  - Create slash command
  - Create MCP config
  - Create agent definition
  - Return created config
  - Validate required arguments
  - Handle validation errors
  - Generate unique ID
  - Set timestamps
  - Return proper MCP response format

- [ ] **Tool: update_config** (9 tests)
  - Update config content
  - Update config type
  - Update partial fields
  - Return updated config
  - Return error for missing config
  - Validate arguments
  - Invalidate cache
  - Update timestamps
  - Return proper MCP response format

- [ ] **Tool: delete_config** (6 tests)
  - Delete config by ID
  - Return success response
  - Return error for missing config
  - Invalidate cache
  - Clean up associations
  - Return proper MCP response format

- [ ] **Tool: get_config** (6 tests)
  - Get config by ID
  - Return full config object
  - Return error for missing config
  - Include metadata
  - Handle database errors
  - Return proper MCP response format

- [ ] **Tool: convert_config** (12 tests)
  - Convert to target format
  - Return converted content
  - Include conversion metadata
  - Cache result
  - Handle same source/target
  - Return error for missing config
  - Support all format pairs
  - Use AI when available
  - Fall back to rule-based
  - Handle conversion errors
  - Track metadata correctly
  - Return proper MCP response format

- [ ] **Tool: invalidate_cache** (6 tests)
  - Invalidate all cached conversions
  - Invalidate specific format
  - Return success response
  - Return error for missing config
  - Handle cache errors
  - Return proper MCP response format

- [ ] **Resource: config://list** (6 tests)
  - List all configs
  - Return configs in MCP format
  - Include metadata
  - Handle empty results
  - Handle database errors
  - Return proper MCP response format

- [ ] **Prompt: migrate_config_format** (6 tests)
  - Generate migration prompt
  - Include source config
  - Include target format
  - Provide conversion context
  - Handle missing config
  - Return proper MCP response format

- [ ] **Prompt: batch_convert** (6 tests)
  - Generate batch convert prompt
  - List eligible configs
  - Include format options
  - Provide batch context
  - Handle empty config list
  - Return proper MCP response format

- [ ] **Prompt: sync_config_versions** (6 tests)
  - Generate sync prompt
  - Compare config versions
  - Suggest sync strategy
  - Provide conflict resolution
  - Handle missing configs
  - Return proper MCP response format

- [ ] **Error Handling** (9 tests)
  - Handle invalid tool names
  - Handle missing required arguments
  - Handle invalid argument types
  - Return proper error format
  - Include error details
  - Handle Zod validation errors
  - Handle database errors
  - Handle service errors
  - Log errors appropriately

- [ ] **JSON-RPC Protocol** (6 tests)
  - Parse JSON-RPC requests
  - Validate request structure
  - Return proper response format
  - Handle malformed requests
  - Support batch requests
  - Handle protocol errors

**Total Tests:** 87 tests
**Estimated Effort:** 12 hours

### 6.2 MCP Transport Tests

**File:** `tests/mcp/transport.test.ts`

**Test Cases:**
- [ ] **HTTP Transport** (9 tests)
  - Accept POST requests
  - Parse JSON body
  - Return JSON response
  - Set correct content-type
  - Handle streaming responses
  - Support HTTP headers
  - Handle connection errors
  - Support keep-alive
  - Handle timeouts

- [ ] **Message Serialization** (6 tests)
  - Serialize requests correctly
  - Deserialize responses correctly
  - Handle large messages
  - Handle binary data
  - Handle special characters
  - Validate JSON structure

- [ ] **Error Handling** (6 tests)
  - Handle malformed JSON
  - Handle incomplete messages
  - Return proper error responses
  - Handle transport errors
  - Log transport errors
  - Recover from errors

**Total Tests:** 21 tests
**Estimated Effort:** 4 hours

---

## Phase 7: Integration Tests (Priority: Low)

**Goal:** Test end-to-end workflows

### 7.1 Conversion Workflow Tests

**File:** `tests/integration/conversion-workflow.test.ts`

**Test Cases:**
- [ ] **Complete Conversion Flow** (12 tests)
  - Create config → Convert → Cache → Retrieve
  - AI conversion with fallback
  - Cache hit on second conversion
  - Invalidation clears cache
  - Multiple format conversions
  - Conversion chain (A→B→C)
  - Round-trip conversions preserve meaning
  - Handle conversion errors gracefully
  - Track metadata throughout flow
  - Cache expiration and refresh
  - Concurrent conversions
  - Rate limiting and throttling

**Total Tests:** 12 tests
**Estimated Effort:** 4 hours

### 7.2 Extension Workflow Tests

**File:** `tests/integration/extension-workflow.test.ts`

**Test Cases:**
- [ ] **Extension Lifecycle** (12 tests)
  - Create extension → Add configs → Generate files → Download
  - Generate manifest for multiple formats
  - Update extension → Invalidate → Regenerate
  - Delete extension → Clean up files
  - Add configs in batch
  - Remove configs → Update manifest
  - Large extension with many configs
  - Extension with mixed config types
  - Concurrent operations on extension
  - File generation error recovery
  - Cache management throughout lifecycle
  - Marketplace integration

**Total Tests:** 12 tests
**Estimated Effort:** 4 hours

### 7.3 MCP Workflow Tests

**File:** `tests/integration/mcp-workflow.test.ts`

**Test Cases:**
- [ ] **MCP Tool Chains** (12 tests)
  - Create → Convert → Update workflow
  - Batch convert using prompt
  - Migrate format using prompt
  - Sync versions using prompt
  - List → Get → Convert workflow
  - Error handling across tool calls
  - Cache behavior in tool chains
  - Concurrent tool invocations
  - Resource access in workflows
  - Prompt-driven automation
  - Integration with external MCP clients
  - Performance under load

**Total Tests:** 12 tests
**Estimated Effort:** 4 hours

---

## Testing Standards and Best Practices

### Code Organization

```typescript
// Standard test file structure
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createMockD1Database, createMockKVNamespace } from '../helpers/mock-factory';
import { sampleSlashCommandClaudeCode } from '../fixtures/sample-configs';

describe('ServiceName', () => {
  let service: ServiceName;
  let mockDB: D1Database;
  let mockKV: KVNamespace;

  beforeEach(() => {
    // Setup mocks and test instances
    mockDB = createMockD1Database();
    mockKV = createMockKVNamespace();
    service = new ServiceName(mockDB, mockKV);
  });

  afterEach(() => {
    // Cleanup if needed
  });

  describe('methodName', () => {
    it('should do something specific', async () => {
      // Arrange
      const input = sampleSlashCommandClaudeCode;

      // Act
      const result = await service.methodName(input);

      // Assert
      expect(result).toBeDefined();
      expect(result.id).toBe(input.id);
    });

    it('should handle error case', async () => {
      // Arrange
      const invalidInput = { /* ... */ };

      // Act & Assert
      await expect(service.methodName(invalidInput)).rejects.toThrow();
    });
  });
});
```

### Naming Conventions

- Test files: `*.test.ts`
- Test suites: Describe the class/module being tested
- Test cases: Use "should" statements describing expected behavior
- Mock objects: Prefix with "mock" (e.g., `mockDB`, `mockKV`)
- Sample data: Prefix with "sample" (e.g., `sampleConfig`)

### Assertion Patterns

```typescript
// Existence checks
expect(result).toBeDefined();
expect(result).not.toBeNull();

// Value equality
expect(result.id).toBe('expected-id');
expect(result).toEqual(expectedObject);

// Type checks
expect(typeof result).toBe('string');
expect(Array.isArray(result)).toBe(true);

// Array/Object checks
expect(result).toHaveLength(3);
expect(result).toHaveProperty('key');
expect(result).toMatchObject({ key: 'value' });

// Error handling
await expect(async () => {
  await service.method();
}).rejects.toThrow('Expected error');

// Async assertions
const result = await service.asyncMethod();
expect(result).toBeDefined();
```

### Mock Patterns

```typescript
// Simple mock
const mockService = {
  method: async (arg: string) => 'result',
};

// Mock with state
const createStatefulMock = () => {
  const state = new Map();
  return {
    get: async (key: string) => state.get(key),
    set: async (key: string, value: any) => state.set(key, value),
  };
};

// Mock with call tracking
let callCount = 0;
const mockWithTracking = {
  method: async () => {
    callCount++;
    return 'result';
  },
};
```

### Test Data Management

```typescript
// Use fixtures for complex data
import { sampleSlashCommandClaudeCode } from '../fixtures/sample-configs';

// Use factories for variations
function createTestConfig(overrides?: Partial<Config>): Config {
  return {
    id: 'test-id',
    type: 'slash_command',
    source_format: 'claude_code',
    content: 'test content',
    ...overrides,
  };
}

// Use builders for complex objects
class ConfigBuilder {
  private config: Partial<Config> = {};

  withId(id: string) {
    this.config.id = id;
    return this;
  }

  withType(type: ConfigType) {
    this.config.type = type;
    return this;
  }

  build(): Config {
    return this.config as Config;
  }
}
```

---

## Testing Metrics and Goals

### Coverage Targets

| Layer | Target Coverage | Priority | Deadline |
|-------|----------------|----------|----------|
| Adapters | 90% | High | Week 2 |
| Services | 85% | Critical | Week 3 |
| Infrastructure | 80% | High | Week 4 |
| Routes | 75% | Medium | Week 5 |
| MCP Server | 80% | Medium | Week 6 |
| **Overall** | **80%+** | Critical | Week 6 |

### Success Criteria

- [ ] All new code requires tests before merge
- [ ] No decrease in coverage percentage
- [ ] All tests pass in CI/CD pipeline
- [ ] Test execution time < 5 minutes
- [ ] Zero flaky tests
- [ ] Code coverage report generated on each PR
- [ ] Integration tests pass against local environment
- [ ] MCP server tests validate protocol compliance

---

## Implementation Timeline

### Week 1: Foundation
- Setup test configuration (4 hours)
- Create fixtures and helpers (8 hours)
- Write adapter tests (8 hours)
- **Deliverable:** Test infrastructure + adapter coverage

### Week 2: Core Services
- ConfigService tests (5 hours)
- ConversionService tests (6 hours)
- ExtensionService tests (5 hours)
- MarketplaceService tests (5 hours)
- **Deliverable:** Service layer coverage

### Week 3: Advanced Services
- ManifestService tests (5 hours)
- FileGenerationService tests (6 hours)
- ZipGenerationService tests (4 hours)
- **Deliverable:** Complete service layer coverage

### Week 4: Infrastructure
- Repository tests (15 hours)
- CacheService tests (3 hours)
- AIConverterService tests (5 hours)
- FileStorageService tests (4 hours)
- **Deliverable:** Infrastructure layer coverage

### Week 5: Routes
- Config routes tests (8 hours)
- Extension routes tests (10 hours)
- Marketplace routes tests (9 hours)
- Plugin routes tests (9 hours)
- File routes tests (3 hours)
- **Deliverable:** API layer coverage

### Week 6: MCP & Integration
- MCP server tests (12 hours)
- MCP transport tests (4 hours)
- Integration tests (12 hours)
- **Deliverable:** Complete test suite

### Total Estimated Effort: 160 hours (4 weeks @ 40 hours/week)

---

## Continuous Integration Setup

### GitHub Actions Workflow

```yaml
# .github/workflows/test.yml
name: Test Suite

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Run linter
        run: npm run lint

      - name: Setup test database
        run: |
          npx wrangler d1 execute agent-config-adapter --local --file=./migrations/0001_create_configs_table.sql
          npx wrangler d1 execute agent-config-adapter --local --file=./migrations/0002_add_updated_at.sql
          npx wrangler d1 execute agent-config-adapter --local --file=./migrations/0003_replace_jules_with_gemini.sql

      - name: Run tests
        run: npm test

      - name: Generate coverage report
        run: npm run test:coverage

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json

      - name: Comment coverage on PR
        uses: romeovs/lcov-reporter-action@v0.3.1
        with:
          lcov-file: ./coverage/lcov.info
          github-token: ${{ secrets.GITHUB_TOKEN }}
```

---

## Maintenance and Updates

### Regular Review Process

1. **Weekly**: Review test failures and flaky tests
2. **Bi-weekly**: Update test fixtures with new features
3. **Monthly**: Analyze coverage reports and fill gaps
4. **Quarterly**: Refactor test code for maintainability

### When to Update Tests

- [ ] When adding new features (tests first!)
- [ ] When fixing bugs (add regression tests)
- [ ] When refactoring code (ensure tests still pass)
- [ ] When updating dependencies (check for breaking changes)
- [ ] When changing business logic (update assertions)

### Test Debt Management

Keep a running list of test gaps:
- [ ] Performance tests for large datasets
- [ ] Security tests for input validation
- [ ] Load tests for concurrent requests
- [ ] E2E tests with real Cloudflare Workers environment
- [ ] Contract tests for MCP protocol compliance

---

## Appendix A: Test Checklist

Use this checklist when writing new tests:

- [ ] Test happy path scenarios
- [ ] Test error cases and edge cases
- [ ] Test with boundary values (empty, null, max size)
- [ ] Test with invalid input
- [ ] Test async behavior and promises
- [ ] Test error messages and status codes
- [ ] Test side effects (database writes, cache updates)
- [ ] Test idempotency where applicable
- [ ] Test concurrency if relevant
- [ ] Test with realistic data sizes
- [ ] Add descriptive test names
- [ ] Use appropriate assertions
- [ ] Clean up test data in afterEach
- [ ] Avoid test interdependencies
- [ ] Run tests in isolation

---

## Appendix B: Resources

### Documentation
- Vitest: https://vitest.dev/
- Cloudflare Workers: https://developers.cloudflare.com/workers/
- Miniflare: https://miniflare.dev/
- MCP Protocol: https://modelcontextprotocol.io/

### Tools
- Coverage visualization: https://codecov.io/
- Test reporting: https://github.com/romeovs/lcov-reporter-action
- Mocking: https://vitest.dev/guide/mocking.html

---

## Appendix C: Example Test Files

See existing test for reference:
- `tests/mcp-config-adapter.test.ts` - Comprehensive adapter test suite

---

**End of Test Plan**

Next steps: Begin Phase 1 implementation with test configuration and fixtures.
