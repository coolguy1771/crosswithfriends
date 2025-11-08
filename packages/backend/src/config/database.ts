import {drizzle} from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import type {Sql} from 'postgres';
import * as schema from '../models/schema.js';
import {getEnv} from './env.js';

let client: Sql | null = null;
let db: ReturnType<typeof drizzle> | null = null;
let cachedConnectionString: string | null = null;

export function getDatabase() {
  const env = getEnv();

  // In test mode, prefer TEST_DATABASE_URL
  const isTest = env.NODE_ENV === 'test';
  const testDbUrl = process.env.TEST_DATABASE_URL;

  // Use DATABASE_URL if provided, otherwise construct from individual env vars
  const connectionString =
    (isTest ? testDbUrl : undefined) ??
    env.DATABASE_URL ??
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    `postgresql://${env.PGUSER ?? 'postgres'}:${env.PGPASSWORD ?? ''}@${env.PGHOST ?? 'localhost'}:5432/${env.PGDATABASE ?? 'dfac'}${isTest && !testDbUrl ? '_test' : ''}`;

  // Reset connection if connection string changed (e.g., switching to test mode)
  // This is especially important in tests when TEST_DATABASE_URL is set after initial connection
  if (db && cachedConnectionString !== connectionString) {
    if (client) {
      client.end().catch(() => {
        // Ignore errors during cleanup
      });
    }
    client = null;
    db = null;
    cachedConnectionString = null;
  }

  // In test mode, always check if TEST_DATABASE_URL changed and reset if needed
  // This ensures repositories get the correct test database connection
  if (isTest && testDbUrl && cachedConnectionString !== testDbUrl) {
    if (client) {
      client.end().catch(() => {
        // Ignore errors during cleanup
      });
    }
    client = null;
    db = null;
    cachedConnectionString = null;
  }

  if (!db) {
    cachedConnectionString = connectionString;
    // In test mode, use a single connection to avoid connection pool issues
    // This ensures all operations see the same database state
    const poolSize = isTest ? 1 : 10;
    client = postgres(connectionString, {
      max: poolSize, // Connection pool size (1 for tests, 10 for production)
      idle_timeout: 20,
      connect_timeout: 10,
      // In test mode, disable prepared statements to avoid caching issues
      // This ensures queries always see the latest data
      prepare: !isTest,
    });

    // Initialize drizzle following Drizzle best practices for postgres.js
    // Use object form: drizzle({ client, schema }) for better type inference and consistency
    db = drizzle({
      client,
      schema,
    });
  }

  return db;
}

export function getPostgresClient(): Sql {
  if (!client) {
    getDatabase(); // Initialize database connection
  }
  if (!client) {
    throw new Error('Database client not initialized. Check database connection configuration.');
  }
  return client;
}

export async function closeDatabase() {
  if (client) {
    await client.end();
    client = null;
    db = null;
    cachedConnectionString = null;
  }
}

/**
 * Reset database connection (useful for tests)
 */
export function resetDatabase() {
  if (client) {
    client.end().catch(() => {
      // Ignore errors during cleanup
    });
  }
  client = null;
  db = null;
  cachedConnectionString = null;
}
