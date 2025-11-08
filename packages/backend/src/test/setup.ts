// Set NODE_ENV to test FIRST, before any other imports
// This must happen before any modules that use env.ts (which imports zod)
if (process.env.NODE_ENV !== 'test') {
  process.env.NODE_ENV = 'test';
}

// Set test-specific defaults
process.env.LOG_LEVEL = process.env.LOG_LEVEL ?? 'error';
process.env.CORS_ORIGIN = process.env.CORS_ORIGIN ?? '*';

import {beforeEach} from 'vitest';
import {truncateAllTables} from './helpers/database';

// Note: We don't reset the database connection here because:
// 1. The connection will be initialized when first needed via getDatabase()
// 2. TEST_DATABASE_URL is set by globalSetup, so getDatabase() will use it
// 3. Resetting here can cause connection issues with repositories

/**
 * Cleanup between tests for isolation
 * This runs before each test to ensure a clean database state
 * We only truncate tables - the connection pool will handle reconnections if needed
 */
beforeEach(async () => {
  // Truncate all tables to clean up data between tests
  // This ensures each test starts with a clean database state
  // TRUNCATE is immediately visible to all connections
  await truncateAllTables();
});
