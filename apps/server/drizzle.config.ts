import { existsSync } from "fs";
import { resolve, dirname } from "path";
import { config } from "dotenv";

// Load repo root .env (this file is apps/server/drizzle.config.ts -> ../../.env)
const rootEnv = resolve(dirname(__dirname), "../../.env");
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
