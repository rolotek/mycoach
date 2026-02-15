#!/usr/bin/env node
/**
 * Runs the server with stdout/stderr teed to ./logs/server.log.
 * Creates ./logs if it doesn't exist. Cross-platform.
 */
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const logsDir = path.join(__dirname, "..", "logs");
const logFile = path.join(logsDir, "server.log");

fs.mkdirSync(logsDir, { recursive: true });
const stream = fs.createWriteStream(logFile, { flags: "a" });
stream.write(`\n--- ${new Date().toISOString()} ---\n`);

const child = spawn(
  "npx",
  ["tsx", "watch", "src/index.ts"],
  {
    cwd: path.join(__dirname, ".."),
    stdio: ["inherit", "pipe", "pipe"],
    shell: true,
  }
);

function tee(data, isStderr) {
  const out = process[isStderr ? "stderr" : "stdout"];
  out.write(data);
  stream.write(data);
}

child.stdout.on("data", (data) => tee(data, false));
child.stderr.on("data", (data) => tee(data, true));

child.on("exit", (code) => {
  stream.end();
  process.exit(code ?? 0);
});
