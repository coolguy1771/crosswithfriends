import 'dotenv/config';
import {defineConfig} from 'drizzle-kit';
import {getEnv} from './src/config/env';

const env = getEnv();

// Use DATABASE_URL if provided, otherwise construct from individual env vars
const connectionString =
  env.DATABASE_URL ??
  `postgresql://${encodeURIComponent(env.PGUSER)}:${encodeURIComponent(env.PGPASSWORD ?? '')}@${env.PGHOST}:${env.PGPORT ?? 5432}/${env.PGDATABASE}`;

// Drizzle config following best practices from https://orm.drizzle.team/docs/get-started/postgresql-new
export default defineConfig({
  schema: './src/models/schema.ts',
  out: './sql/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: connectionString,
  },
});
