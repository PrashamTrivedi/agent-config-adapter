import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.test.ts',
        'src/index.ts',
        'src/routes/plugins.ts', // Exclude download routes (as requested)
        'src/routes/files.ts', // Exclude download routes (as requested)
        'src/infrastructure/ai-converter.ts', // Exclude AI Gateway (as requested)
        'src/services/file-generation-service.ts', // Exclude file generation (as requested)
        'src/services/zip-generation-service.ts', // Exclude ZIP generation (as requested)
      ],
    },
  },
});
