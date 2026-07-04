import 'dotenv/config';
import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { readConfig } from '../src/config.js';
import { createDatabasePool } from '../src/database.js';

const migrationDirectory = fileURLToPath(new URL('../migrations/', import.meta.url));
const config = readConfig();
const pool = createDatabasePool(config);
const client = await pool.connect();

try {
  await client.query(`create schema if not exists virtual_classroom`);
  await client.query(`
    create table if not exists virtual_classroom.schema_migrations (
      name text primary key,
      checksum text not null,
      applied_at timestamptz not null default now()
    )
  `);
  await client.query(`select pg_advisory_lock(hashtext('virtual_classroom_schema_migrations'))`);

  const migrationNames = (await readdir(migrationDirectory))
    .filter((name) => /^\d+.*\.sql$/.test(name))
    .sort();

  for (const name of migrationNames) {
    const sql = await readFile(new URL(`../migrations/${name}`, import.meta.url), 'utf8');
    const checksum = createHash('sha256').update(sql).digest('hex');
    const existing = await client.query<{ checksum: string }>(
      `select checksum from virtual_classroom.schema_migrations where name = $1`,
      [name],
    );

    if (existing.rows[0]) {
      if (existing.rows[0].checksum !== checksum) {
        throw new Error(`Migration ${name} was changed after it was applied.`);
      }
      console.log(`Already applied: ${name}`);
      continue;
    }

    await client.query('begin');
    try {
      await client.query(sql);
      await client.query(
        `insert into virtual_classroom.schema_migrations (name, checksum) values ($1, $2)`,
        [name, checksum],
      );
      await client.query('commit');
      console.log(`Applied: ${name}`);
    } catch (error) {
      await client.query('rollback');
      throw error;
    }
  }
} finally {
  await client.query(`select pg_advisory_unlock(hashtext('virtual_classroom_schema_migrations'))`).catch(() => undefined);
  client.release();
  await pool.end();
}
