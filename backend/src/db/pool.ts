import { existsSync } from 'fs';
import path from 'path';
import { config as loadEnv } from 'dotenv';
import { Pool, PoolConfig } from 'pg';

// Load all present files (repo root → backend → cwd) so a sparse first match
// does not block DB vars that live only in another path (common outside Docker).
const envPaths = [
  path.resolve(__dirname, '../../../.env'),
  path.resolve(__dirname, '../../.env'),
  path.resolve(process.cwd(), '.env'),
];
const loadedEnvPaths = new Set<string>();
for (const envPath of envPaths) {
  const resolved = path.resolve(envPath);
  if (loadedEnvPaths.has(resolved)) continue;
  if (existsSync(resolved)) {
    loadedEnvPaths.add(resolved);
    loadEnv({ path: resolved, override: true });
  }
}

function resolvePoolConfig(): PoolConfig {
  const url = process.env.DATABASE_URL?.trim();
  if (url) {
    return { connectionString: url };
  }

  const host =
    process.env.POSTGRES_HOST?.trim() ||
    process.env.PGHOST?.trim();
  const user =
    process.env.POSTGRES_USER?.trim() ||
    process.env.PGUSER?.trim();
  const password = process.env.POSTGRES_PASSWORD ?? '';
  const database =
    process.env.POSTGRES_DB?.trim() ||
    process.env.PGDATABASE?.trim();
  const portStr =
    process.env.POSTGRES_PORT?.trim() ||
    process.env.PGPORT?.trim() ||
    '5432';

  if (!host || !user || !database) {
    throw new Error(
      'Database is not configured. Set DATABASE_URL, or set POSTGRES_HOST, POSTGRES_USER, POSTGRES_DB (and optionally POSTGRES_PASSWORD, POSTGRES_PORT).',
    );
  }

  const port = Number.parseInt(portStr, 10);
  if (Number.isNaN(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid POSTGRES_PORT (or PGPORT): ${portStr}`);
  }

  return {
    host,
    port,
    user,
    password,
    database,
  };
}

const pool = new Pool(resolvePoolConfig());

pool.on('error', (err) => {
  console.error('Unexpected pg pool error:', err);
});

export default pool;
