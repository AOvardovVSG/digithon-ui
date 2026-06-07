import { existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import * as schema from './schema';

/**
 * SQLite (better-sqlite3) + Drizzle. Server-only — import only from route handlers /
 * server components. A single connection is cached on globalThis so Next.js dev hot-reload
 * doesn't open a new handle (and re-run migrations) on every change.
 *
 * On Vercel only /tmp is writable at runtime; fall back to that when no DB_PATH is set.
 */
const DB_PATH = process.env.DB_PATH ?? '/tmp/digithon.db';

type DrizzleDb = ReturnType<typeof drizzle<typeof schema>>;
const globalForDb = globalThis as unknown as { __db?: DrizzleDb };

function createDb(): DrizzleDb {
  const dir = dirname(DB_PATH);
  if (dir && dir !== '.' && !existsSync(dir)) mkdirSync(dir, { recursive: true });

  const sqlite = new Database(DB_PATH);
  sqlite.pragma('journal_mode = WAL');
  const database = drizzle(sqlite, { schema });

  // Ensure the schema exists on first use (idempotent).
  migrate(database, { migrationsFolder: join(process.cwd(), 'drizzle') });
  return database;
}

export const db = globalForDb.__db ?? createDb();
if (process.env.NODE_ENV !== 'production') globalForDb.__db = db;

export { schema };
