import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is missing");
}

const connectionString = process.env.DATABASE_URL;
const client = postgres(connectionString, {
  prepare: false, // Essential for Supabase transaction pooler (port 6543)
  connect_timeout: 30,
  idle_timeout: 20,
  max: 10,
  keep_alive: 5,
});

export const db = drizzle(client, { schema });
export * from "./schema";
