import pg from 'pg';

const { Pool } = pg;

let pool;

export function databaseConfigured() {
  return Boolean(process.env.DATABASE_URL);
}

export function blobConfigured() {
  return Boolean(process.env.STRATEGY_STORAGE_ROOT);
}

export function backendConfigured() {
  return databaseConfigured() && blobConfigured() && Boolean(process.env.STRATEGY_HASH_SECRET);
}

export function sql() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not configured.');
  pool ||= new Pool({
    connectionString: process.env.DATABASE_URL,
    max: Number(process.env.DB_POOL_MAX || 10),
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : undefined
  });
  return pool;
}

export async function query(text, params = []) {
  const result = await sql().query(text, params);
  return result.rows;
}

export async function transaction(statements) {
  const client = await sql().connect();
  try {
    await client.query('begin');
    const results = [];
    for (const statement of statements) results.push((await client.query(statement.text, statement.params || [])).rows);
    await client.query('commit');
    return results;
  } catch (caught) {
    try {
      await client.query('rollback');
    } catch {
    }
    throw caught;
  } finally {
    client.release();
  }
}