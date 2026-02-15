import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import pg from "pg";

// Load repo root .env (this file is apps/server/scripts/enable-pgvector.ts)
const __dirname = dirname(fileURLToPath(import.meta.url));
const rootEnv = resolve(__dirname, "../../../.env");
config({ path: rootEnv, override: true });
config(); // cwd .env if any

async function enablePgvector() {
  const client = new pg.Client({
    connectionString: process.env.DATABASE_URL,
  });
  await client.connect();
  try {
    await client.query("CREATE EXTENSION IF NOT EXISTS vector;");
    console.log("pgvector extension enabled");
  } finally {
    await client.end();
  }
}

enablePgvector().catch((err: { code?: string }) => {
  if (err.code === "42501") {
    console.error(
      "pgvector requires a superuser. Run once:\n  psql -U postgres -d mycoach -c \"CREATE EXTENSION IF NOT EXISTS vector;\""
    );
  } else {
    console.error("Failed to enable pgvector:", err);
  }
  process.exit(1);
});
