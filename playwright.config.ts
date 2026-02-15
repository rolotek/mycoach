import 'dotenv/config';
import { defineConfig, devices } from '@playwright/test';

/**
 * E2E tests for verify-work. Loads .env so TEST_USER_EMAIL, TEST_USER_PASSWORD, etc. are available.
 * Base URL and ports should match .env / dev servers.
 * Run after `npm run dev` (or ensure apps are up) or use webServer to start them.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  workers: 1,
  reporter: [['list'], ['json', { outputFile: 'e2e-results.json' }]],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  timeout: 30_000,
  expect: { timeout: 10_000 },
});
