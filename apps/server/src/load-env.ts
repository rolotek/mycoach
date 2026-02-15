/**
 * Load repo root .env before any other app code runs.
 * Must be the first import in index.ts so env is set before db/auth load.
 */
import { existsSync } from "fs";
import { resolve, dirname } from "path";
import { config } from "dotenv";

const rootEnv = resolve(dirname(__dirname), "../../.env");
if (existsSync(rootEnv)) {
  config({ path: rootEnv, override: true });
}
config({ override: false });
