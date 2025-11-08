import {drizzle} from 'drizzle-orm/postgres-js';
import postgres, {type Sql} from 'postgres';
import * as schema from '../../models/schema';
import {runMigrations} from '../../config/migrate';

let testClient: Sql | null = null;
let testDb: ReturnType<typeof drizzle> | null = null;

/**
 * Get test database connection
 * Uses TEST_DATABASE_URL or constructs from env vars with _test suffix
 */
export function getTestDatabase() {
  if (!testDb) {
    const testDbUrl =
      process.env.TEST_DATABASE_URL ??
      `postgresql://${process.env.PGUSER ?? 'postgres'}:${process.env.PGPASSWORD ?? ''}@${process.env.PGHOST ?? 'localhost'}:5432/${process.env.PGDATABASE ?? 'dfac'}_test`;

    testClient = postgres(testDbUrl, {
      max: 10,
      idle_timeout: 20,
      connect_timeout: 10,
    });

    // Initialize drizzle following Drizzle best practices for postgres.js
    // Use object form: drizzle({ client, schema }) for consistency
    testDb = drizzle({
      client: testClient,
      schema,
    });
  }

  return testDb;
}

/**
 * Get test postgres client
 */
export function getTestPostgresClient(): Sql {
  if (!testClient) {
    getTestDatabase();
  }
  if (!testClient) {
    throw new Error('Test database client not initialized');
  }
  return testClient;
}

/**
 * Run migrations on test database
 * Note: This is now handled by testcontainers setup
 * Kept for backwards compatibility but will use TEST_DATABASE_URL if set
 */
export async function setupTestDatabase(): Promise<void> {
  // If using testcontainers, TEST_DATABASE_URL will be set and migrations already run
  if (process.env.TEST_DATABASE_URL) {
    return;
  }

  // Fallback for manual test database setup (not using testcontainers)
  const originalEnv = {...process.env};
  const testDbUrl =
    process.env.TEST_DATABASE_URL ??
    `postgresql://${process.env.PGUSER ?? 'postgres'}:${process.env.PGPASSWORD ?? ''}@${process.env.PGHOST ?? 'localhost'}:5432/${process.env.PGDATABASE ?? 'dfac'}_test`;

  process.env.DATABASE_URL = testDbUrl;
  process.env.PGDATABASE = `${process.env.PGDATABASE ?? 'dfac'}_test`;

  try {
    await runMigrations();
  } finally {
    // Restore original env
    Object.assign(process.env, originalEnv);
  }
}

/**
 * Clean up test database connection
 */
export async function closeTestDatabase(): Promise<void> {
  if (testClient) {
    await testClient.end();
    testClient = null;
    testDb = null;
  }
}

/**
 * Clean up test data before each test
 * This ensures test isolation when using a shared test database
 */
export async function cleanupTestData(): Promise<void> {
  await truncateAllTables();
}

/**
 * Truncate all tables (for cleanup between test suites)
 * Uses the same database connection as repositories
 * Ensures all connections see the truncate by using the drizzle instance
 */
export async function truncateAllTables(): Promise<void> {
  // Import here to avoid circular dependency
  const {getPostgresClient} = await import('../../config/database');

  // Get the postgres client to execute raw SQL
  // This ensures we use the same connection pool as repositories
  const client = getPostgresClient();

  // Execute truncate using raw SQL
  // TRUNCATE is auto-committed in PostgreSQL, so all connections will see it
  // We use RESTART IDENTITY CASCADE to reset sequences and handle foreign keys
  await client`
    TRUNCATE TABLE 
      puzzles,
      game_events,
      game_snapshots,
      puzzle_solves,
      room_events
    RESTART IDENTITY CASCADE
  `;
}
