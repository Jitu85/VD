import 'dotenv/config';
import argon2 from 'argon2';
import { z } from 'zod';
import { readConfig } from './config.js';
import { createDatabasePool } from './database.js';

const inputSchema = z.object({
  ADMIN_EMAIL: z.email().max(254),
  ADMIN_PASSWORD: z.string().min(14).max(128),
  ADMIN_NAME: z.string().trim().min(2).max(120),
});

const input = inputSchema.parse(process.env);
const config = readConfig();
const pool = createDatabasePool(config);
const client = await pool.connect();

try {
  const passwordHash = await argon2.hash(input.ADMIN_PASSWORD, {
    type: argon2.argon2id,
    memoryCost: 19_456,
    timeCost: 2,
    parallelism: 1,
  });
  await client.query('begin');
  const existing = await client.query<{ id: string; role: string }>(
    `select id, role from virtual_classroom.app_users where lower(email)=lower($1) for update`,
    [input.ADMIN_EMAIL],
  );
  if (existing.rows[0] && existing.rows[0].role !== 'administrator') {
    throw new Error('That email address already belongs to a student account.');
  }
  if (existing.rows[0]) {
    await client.query(
      `update virtual_classroom.app_users
       set password_hash=$2, display_name=$3, status='active', email_verified_at=coalesce(email_verified_at,now())
       where id=$1`,
      [existing.rows[0].id, passwordHash, input.ADMIN_NAME],
    );
  } else {
    await client.query(
      `insert into virtual_classroom.app_users
         (role,email,password_hash,status,email_verified_at,display_name)
       values ('administrator',$1,$2,'active',now(),$3)`,
      [input.ADMIN_EMAIL.trim().toLowerCase(), passwordHash, input.ADMIN_NAME],
    );
  }
  await client.query('commit');
  console.log(`Administrator account ready for ${input.ADMIN_EMAIL.trim().toLowerCase()}.`);
} catch (error) {
  await client.query('rollback');
  throw error;
} finally {
  client.release();
  await pool.end();
}