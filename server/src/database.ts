import pg from 'pg';
import type { ApiConfig } from './config.js';

const { Pool } = pg;

export function createDatabasePool(config: ApiConfig): pg.Pool {
  const pool = new Pool({
    connectionString: config.databaseUrl,
    max: config.databasePoolMax,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
    ssl: config.databaseSsl
      ? { rejectUnauthorized: config.databaseSslRejectUnauthorized }
      : undefined,
  });

  pool.on('error', (error) => {
    console.error('Unexpected PostgreSQL pool error', error);
  });

  return pool;
}
