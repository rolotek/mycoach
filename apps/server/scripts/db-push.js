#!/usr/bin/env node
const path = require("path");
const { config } = require("dotenv");

// Load repo root .env (run from apps/server -> ../../.env)
config({ path: path.resolve(process.cwd(), "../../.env"), override: true });
require("child_process").execSync("npx drizzle-kit push", {
  stdio: "inherit",
  env: process.env,
});
