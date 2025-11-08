import {getEnv} from './env.js';
import postgres from 'postgres';
import {fileURLToPath} from 'url';
import {dirname, resolve} from 'path';
import {existsSync, readdirSync, readFileSync} from 'fs';

/**
 * Run database migrations automatically on server startup.
 * This ensures the database schema is always up to date.
 *
 * This custom migration runner reads SQL files directly and tracks
 * which migrations have been applied in a migrations table.
 */
export async function runMigrations(): Promise<void> {
  const env = getEnv();

  // Create a separate connection for migrations
  // Use DATABASE_URL if provided, otherwise construct from individual env vars
  const connectionString =
    env.DATABASE_URL ??
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    `postgresql://${env.PGUSER ?? 'postgres'}:${env.PGPASSWORD ?? ''}@${env.PGHOST ?? 'localhost'}:5432/${env.PGDATABASE ?? 'dfac'}`;

  const migrationClient = postgres(connectionString, {max: 1});

  try {
    // Get the absolute path to the migrations folder
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    // From src/config/ go up to packages/backend/ root
    const packageRoot = resolve(__dirname, '../..');
    const migrationsPath = resolve(packageRoot, 'sql/migrations');

    // Verify the migrations folder exists
    if (!existsSync(migrationsPath)) {
      throw new Error(`Migrations folder not found at: ${migrationsPath}`);
    }

    // Create migrations tracking table if it doesn't exist
    await migrationClient`
      CREATE TABLE IF NOT EXISTS drizzle_migrations (
        id SERIAL PRIMARY KEY,
        hash text NOT NULL,
        created_at bigint
      )
    `;

    // Get list of migration files, sorted by name
    const migrationFiles = readdirSync(migrationsPath)
      .filter((file) => file.endsWith('.sql'))
      .sort();

    if (migrationFiles.length === 0) {
      // eslint-disable-next-line no-console
      console.log('No migration files found');
      return;
    }

    // eslint-disable-next-line no-console
    console.log(`Found ${migrationFiles.length} migration file(s)`);

    // Acquire advisory lock to ensure only one process can run migrations at a time
    // Use a fixed key (1234567890) for the migration lock
    const MIGRATION_LOCK_KEY = 1234567890;
    let lockAcquired = false;
    try {
      const result = await migrationClient<[{acquired: boolean}]>`
        SELECT pg_try_advisory_lock(${MIGRATION_LOCK_KEY}) as acquired
      `;
      lockAcquired = result[0]?.acquired ?? false;
    } catch (error) {
      throw new Error(
        `Failed to acquire migration lock: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    if (!lockAcquired) {
      throw new Error(
        'Could not acquire migration lock. Another migration process may be running. Please wait and try again.'
      );
    }

    try {
      // Run each migration that hasn't been applied yet
      for (const file of migrationFiles) {
        // Extract hash from filename (format: {index}_{name}.sql)
        // Remove .sql extension from the end of the filename
        const hash = file.endsWith('.sql') ? file.slice(0, -4) : file;

        // Check if this migration has already been applied
        const existing = await migrationClient`
          SELECT id FROM drizzle_migrations WHERE hash = ${hash}
        `;

        if (existing.length > 0) {
          // eslint-disable-next-line no-console
          console.log(`Skipping ${file} (already applied)`);
          continue;
        }

        // Read the migration file
        const migrationSQL = readFileSync(resolve(migrationsPath, file), 'utf-8');

        // eslint-disable-next-line no-console
        console.log(`Running migration: ${file}`);

        // Execute the migration in a transaction
        await migrationClient.begin(async (sql) => {
          // Execute the entire migration file as a single SQL script
          // The postgres library handles multiple statements separated by semicolons
          await sql.unsafe(migrationSQL);

          // Record that this migration was applied
          await sql`
            INSERT INTO drizzle_migrations (hash, created_at)
            VALUES (${hash}, ${Date.now()})
          `;
        });

        // eslint-disable-next-line no-console
        console.log(`✓ Applied migration: ${file}`);
      }

      // eslint-disable-next-line no-console
      console.log('Database migrations completed successfully');
    } finally {
      // Always release the advisory lock, even if migrations fail
      await migrationClient`
        SELECT pg_advisory_unlock(${MIGRATION_LOCK_KEY})
      `.catch((err) => {
        // Log but don't throw - we want to ensure cleanup happens
        console.warn('Failed to release migration lock:', err);
      });
    }
  } catch (error) {
    console.error('Failed to run database migrations:', error);
    throw error;
  } finally {
    await migrationClient.end();
  }
}
