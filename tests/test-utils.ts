import { vi } from 'vitest';

/**
 * Mock D1Database for testing
 */
export function createMockD1Database(): D1Database {
  const mockData: Record<string, any[]> = {};

  return {
    prepare: vi.fn((query: string) => ({
      bind: vi.fn((...values: any[]) => ({
        run: vi.fn(async () => ({ success: true, meta: {} })),
        first: vi.fn(async () => null),
        all: vi.fn(async () => ({ results: [], success: true, meta: {} })),
      })),
      run: vi.fn(async () => ({ success: true, meta: {} })),
      first: vi.fn(async () => null),
      all: vi.fn(async () => ({ results: [], success: true, meta: {} })),
    })),
    dump: vi.fn(),
    batch: vi.fn(),
    exec: vi.fn(),
  } as unknown as D1Database;
}

/**
 * Mock KVNamespace for testing
 */
export function createMockKVNamespace(): KVNamespace {
  const store = new Map<string, string>();

  return {
    get: vi.fn(async (key: string) => store.get(key) || null),
    put: vi.fn(async (key: string, value: string, options?: any) => {
      store.set(key, value);
    }),
    delete: vi.fn(async (key: string) => {
      store.delete(key);
    }),
    list: vi.fn(async () => ({ keys: [], list_complete: true, cursor: '' })),
    getWithMetadata: vi.fn(),
  } as unknown as KVNamespace;
}

/**
 * Mock R2Bucket for testing
 */
export function createMockR2Bucket(): R2Bucket {
  const store = new Map<string, any>();

  return {
    get: vi.fn(async (key: string) => {
      const data = store.get(key);
      if (!data) return null;
      return {
        body: data,
        httpMetadata: {},
        customMetadata: {},
        range: undefined,
        httpEtag: '',
        checksums: {},
        uploaded: new Date(),
        size: data.length || 0,
        version: '1',
        arrayBuffer: async () => data,
        text: async () => data.toString(),
        json: async () => JSON.parse(data.toString()),
        blob: async () => new Blob([data]),
      };
    }),
    put: vi.fn(async (key: string, value: any) => {
      store.set(key, value);
      return {
        key,
        etag: 'mock-etag',
        version: '1',
        size: value.length || 0,
        uploaded: new Date(),
        httpEtag: '',
        checksums: {},
      };
    }),
    delete: vi.fn(async (key: string) => {
      store.delete(key);
    }),
    list: vi.fn(async () => ({ objects: [], truncated: false, cursor: '' })),
    head: vi.fn(),
  } as unknown as R2Bucket;
}

/**
 * Sample config data for testing
 */
export const sampleConfigs = {
  claudeCodeSlashCommand: {
    name: 'test-command',
    type: 'slash_command' as const,
    original_format: 'claude_code' as const,
    content: `---
name: test-command
description: A test command
---

This is a test prompt.`,
  },

  codexSlashCommand: {
    name: 'test-command',
    type: 'slash_command' as const,
    original_format: 'codex' as const,
    content: `# test-command

A test command

## Prompt

This is a test prompt.`,
  },

  geminiSlashCommand: {
    name: 'test-command',
    type: 'slash_command' as const,
    original_format: 'gemini' as const,
    content: `description = "A test command"
prompt = """
This is a test prompt.
"""`,
  },

  mcpConfig: {
    name: 'test-mcp',
    type: 'mcp_config' as const,
    original_format: 'claude_code' as const,
    content: JSON.stringify({
      mcpServers: {
        'test-server': {
          type: 'stdio',
          command: 'npx',
          args: ['-y', 'test-package'],
          env: {
            API_KEY: 'test123',
          },
        },
      },
    }),
  },

  agentDefinition: {
    name: 'test-agent',
    type: 'agent_definition' as const,
    original_format: 'claude_code' as const,
    content: `---
name: test-agent
description: A test agent
---

Agent instructions here.`,
  },
};

/**
 * Create a mock config with ID and timestamps
 */
export function createMockConfig(input: typeof sampleConfigs[keyof typeof sampleConfigs]) {
  return {
    id: 'test-id-123',
    ...input,
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
  };
}

/**
 * Sample extension data for testing
 */
export const sampleExtension = {
  id: 'ext-123',
  name: 'Test Extension',
  description: 'A test extension',
  author: 'Test Author',
  version: '1.0.0',
  icon_url: 'https://example.com/icon.png',
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: '2024-01-01T00:00:00.000Z',
};

/**
 * Sample marketplace data for testing
 */
export const sampleMarketplace = {
  id: 'mkt-123',
  name: 'Test Marketplace',
  description: 'A test marketplace',
  owner_name: 'Test Owner',
  owner_email: 'owner@example.com',
  version: '1.0.0',
  homepage: 'https://example.com',
  repository: 'https://github.com/test/repo',
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: '2024-01-01T00:00:00.000Z',
};
