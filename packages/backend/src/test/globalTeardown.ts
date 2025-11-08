/* eslint-disable no-console */
// Global teardown runs once in the main process after all workers finish
// This ensures we clean up the test container properly

import {stopTestContainer} from './helpers/testcontainers';
import {closeTestDatabase} from './helpers/database';

// Check if we should use testcontainers or manual database
const USE_TESTCONTAINERS = process.env.USE_TESTCONTAINERS !== 'false';

export default async function teardown() {
  console.log('🧹 Global test teardown starting...');

  if (USE_TESTCONTAINERS) {
    try {
      await stopTestContainer();
      console.log('✅ Global teardown: Test container stopped');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('⚠️  Error stopping test container:', message);
    }
  } else {
    await closeTestDatabase();
    console.log('✅ Global teardown: Database connection closed');
  }

  console.log('✅ Global teardown complete');
}
