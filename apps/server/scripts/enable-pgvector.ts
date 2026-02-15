import "dotenv/config";
import pg from "pg";

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

enablePgvector().catch((err) => {
  console.error("Failed to enable pgvector:", err);
  process.exit(1);
});
