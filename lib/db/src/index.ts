import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  // Keep max low — Supavisor handles real pooling on port 6543.
  max: 5,
  idleTimeoutMillis: 20_000,
  // Fail fast (5s) instead of hanging forever when DB is unreachable
  connectionTimeoutMillis: 5_000,
});
export const db = drizzle(pool, { 
  schema,
});

export * from "./schema";
