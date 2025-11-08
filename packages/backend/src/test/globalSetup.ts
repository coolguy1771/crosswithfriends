/* eslint-disable no-console */
// Global setup runs once in the main process before any workers are spawned
// This ensures we only start one test container that all workers can use

// Set NODE_ENV to test FIRST, before any other imports
if (process.env.NODE_ENV !== 'test') {
  process.env.NODE_ENV = 'test';
}

// Set test-specific defaults
process.env.LOG_LEVEL = process.env.LOG_LEVEL ?? 'error';
process.env.CORS_ORIGIN = process.env.CORS_ORIGIN ?? '*';

import {startTestContainer} from './helpers/testcontainers';
import {setupTestDatabase} from './helpers/database';

// Check if we should use testcontainers or manual database
const USE_TESTCONTAINERS = process.env.USE_TESTCONTAINERS !== 'false';

export default async function setup() {
  console.log('🔧 Global test setup starting...');

  if (USE_TESTCONTAINERS) {
    try {
      // Start test container (this will set DATABASE_URL and run migrations)
      await startTestContainer();
      console.log('✅ Global setup: Test container started and ready');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn('⚠️  Testcontainers failed, falling back to manual database setup:', message);
      console.warn('   Set USE_TESTCONTAINERS=false to skip testcontainers');

      // Fallback to manual database setup
      await setupTestDatabase();
    }
  } else {
    // Use manual database setup
    console.log('Using manual test database (USE_TESTCONTAINERS=false)');
    await setupTestDatabase();
  }

  // Export the DATABASE_URL so workers can access it
  // Workers will read this from process.env.DATABASE_URL
  console.log('✅ Global setup complete');
}
