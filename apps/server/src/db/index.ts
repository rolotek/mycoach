import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL?.trim();
if (!connectionString) {
  throw new Error(
    "DATABASE_URL is not set. Set it in the repo root .env (e.g. DATABASE_URL=postgresql://mycoach:mycoach@localhost:5432/mycoach)"
  );
}

const pool = new Pool({ connectionString });
export const db = drizzle(pool, { schema });
