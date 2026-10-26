import { config as loadEnv } from 'dotenv';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

const currentDir = dirname(fileURLToPath(import.meta.url));

// Load `.env` from the backend package first, then fall back to the repo root.
// Paths are resolved relative to both this file and the working directory so
// that the source (tsx) and bundled (dist) entrypoints both find the file.
// Variables already present in process.env (e.g. injected by the test runner
// or the host platform) always win, so nothing can be silently overridden.
for (const candidate of [
  resolve(currentDir, '.env'),
  resolve(currentDir, '../../.env'),
  resolve(currentDir, '../../../../.env'),
  resolve(process.cwd(), '.env'),
  resolve(process.cwd(), '../../.env'),
]) {
  loadEnv({ path: candidate });
}

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  API_PREFIX: z
    .string()
    .default('/api/v1')
    .transform((value) => (value.endsWith('/') ? value.slice(0, -1) : value)),
  CORS_ORIGINS: z.string().default('http://localhost:5173,http://localhost:8081'),
  LOG_LEVEL: z.string().default('info'),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  BCRYPT_SALT_ROUNDS: z.coerce.number().int().min(8).max(15).default(12),

  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(900_000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),

  // Relax request throttling for instructor-led demos, where many devices
  // legitimately share one NAT address. Never enable this in production.
  DEMO_MODE: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),

  // Only enable when the app actually sits behind a reverse proxy. Trusting a
  // proxy unconditionally lets a direct client spoof X-Forwarded-For and dodge
  // IP-based limits.
  TRUST_PROXY: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
});

export type Env = z.infer<typeof envSchema>;

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((issue) => `  - ${issue.path.join('.') || 'env'}: ${issue.message}`)
    .join('\n');

  console.error(`Invalid environment configuration:\n${issues}`);
  process.exit(1);
}

export const env: Env = parsed.data;
export const isProduction = env.NODE_ENV === 'production';
export const isDevelopment = env.NODE_ENV === 'development';
export const corsOrigins = env.CORS_ORIGINS.split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
