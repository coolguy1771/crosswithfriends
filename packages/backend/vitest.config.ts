import {configDefaults, defineConfig} from 'vitest/config';
import path from 'path';

// Set NODE_ENV before any imports
process.env.NODE_ENV = process.env.NODE_ENV || 'test';

export default defineConfig({
  test: {
    // Enable globals for Jest-like API (describe, it, expect, etc.)
    globals: true,

    // Test environment
    environment: 'node',

    // Setup files
    setupFiles: ['./src/test/setup.ts'],
    globalSetup: ['./src/test/globalSetup.ts'],

    // Timeouts
    testTimeout: 30000, // 30 seconds for individual tests
    hookTimeout: 180000, // 3 minutes for beforeAll/afterAll hooks (first run needs to pull image)

    // Test pool configuration
    // Using 'forks' pool for better isolation with database tests
    // Each test file runs in its own process, ensuring clean state
    pool: 'forks',

    // Test file patterns - include test files in __tests__ directories and adjacent test files
    include: [
      'src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
      'src/**/__tests__/**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
    ],

    // Exclude patterns - extend defaults with project-specific exclusions
    exclude: [
      ...configDefaults.exclude,
      '**/dist/**',
      '**/node_modules/**',
      '**/.{idea,git,cache,output,temp}/**',
      '**/coverage/**',
    ],

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        ...(configDefaults.coverage?.exclude || []),
        '**/*.config.{js,ts}',
        '**/test/**',
        '**/__tests__/**',
        '**/dist/**',
        '**/migrations/**',
        '**/drizzle.config.ts',
      ],
      // Include source files for coverage
      include: ['src/**/*.{ts,tsx}'],
      // Coverage thresholds (adjust based on project requirements)
      thresholds: {
        // Global thresholds
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,
      },
    },

    // Reporters
    reporters: ['verbose', 'hanging-process'],

    // Retry configuration for flaky tests
    retry: 0, // Disable retries by default (can be overridden per test)

    // Max concurrency for parallel test execution
    // Reduced to 1 for database tests to ensure proper isolation
    // Database tests need sequential execution to avoid race conditions
    maxConcurrency: 1,

    // Sequence configuration
    sequence: {
      // Run hooks in parallel where possible
      hooks: 'parallel',
      // Shuffle tests to detect order-dependent bugs
      shuffle: false,
    },

    // Watch mode configuration
    watch: false, // Disable watch by default (use --watch flag)

    // Bail on first failure (useful for CI)
    bail: 0, // 0 = don't bail, >0 = bail after N failures
  },

  // Path resolution
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, '../shared/src'),
    },
  },

  // Note: SSR configuration removed for tests
  // For Node.js tests, we want to use actual packages from node_modules
  // If you need SSR config for production builds, use vite.config.ts instead
});
