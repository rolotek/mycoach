import { existsSync } from "fs";
import { resolve, dirname } from "path";
import { config } from "dotenv";

// DATABASE_URL lives in repo root .env (single source for server, drizzle, scripts).
// From apps/server, root is ../.. so we load ../../.env.
const rootEnv = resolve(dirname(__dirname), "../.env");
if (existsSync(rootEnv)) config({ path: rootEnv, override: true });
config({ override: false });

import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
