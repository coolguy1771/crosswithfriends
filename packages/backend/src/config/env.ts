import {z} from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3021),
  DATABASE_URL: z.string().url().optional(),
  PGHOST: z.string().default('localhost'),
  PGUSER: z.string().default('postgres'),
  PGPASSWORD: z.string().default(''),
  PGDATABASE: z.string().default('dfac'),
  REDIS_URL: z.string().url().optional(),
  CORS_ORIGIN: z.string().default('*'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
});

export type Env = z.infer<typeof envSchema>;

let env: Env;

export function getEnv(): Env {
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (env) {
    return env;
  }
  env = envSchema.parse(process.env);
  return env;
}
