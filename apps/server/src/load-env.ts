/**
 * Load repo root .env before any other app code runs.
 * Must be the first import in index.ts so env is set before db/auth load.
 * Uses multiple strategies so env is found whether run as CJS (__dirname) or ESM (import.meta.url)
 * or when cwd is apps/server (e.g. npm run dev from workspace).
 */
import { existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { config } from "dotenv";

function findRootEnv(): string | null {
  // ESM: __dirname is not defined; use import.meta.url
  try {
    const dir =
      typeof __dirname !== "undefined"
        ? dirname(__dirname)
        : dirname(fileURLToPath(import.meta.url));
    const fromFile = resolve(dir, "../../.env");
    if (existsSync(fromFile)) return fromFile;
  } catch {
    // __dirname undefined (ESM) and we're not in a file with import.meta.url
  }
  // Fallback: when cwd is apps/server (e.g. dev-with-logs.js), repo root is ../..
  const fromCwd = resolve(process.cwd(), "../../.env");
  if (existsSync(fromCwd)) return fromCwd;
  return null;
}

const rootEnv = findRootEnv();
if (rootEnv) {
  config({ path: rootEnv, override: true });
}
config({ override: false });
