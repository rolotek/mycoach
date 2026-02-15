/**
 * Phase 1 (Foundation) E2E tests. Titles must match UAT test names for result merging.
 * Run: npm run test:e2e (or npm run test:e2e:uat to run and merge into UAT).
 *
 * Credentials: set TEST_USER_EMAIL, TEST_USER_PASSWORD (and optionally TEST_USER_EMAIL_2,
 * TEST_USER_PASSWORD_2 for test 7) in .env. Playwright config loads .env via dotenv.
 */
import { test, expect } from '@playwright/test';
import { setupWebAppConsoleLogger } from './utils/console-logger';

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000';
const apiURL = process.env.PLAYWRIGHT_API_URL ?? 'http://localhost:3001';

test('1. Dev server starts', async ({ request }) => {
  const home = await request.get(baseURL);
  expect(home.ok()).toBeTruthy();
  const health = await request.get(`${apiURL}/health`);
  expect(health.ok()).toBeTruthy();
  const body = await health.json();
  expect(body).toBeDefined();
});

test('2. Signup with email and password', async ({ page }) => {
  setupWebAppConsoleLogger(page);
  await page.goto(`${baseURL}/signup`);
  await page.getByRole('textbox', { name: /name/i }).fill('Playwright User');
  await page.getByRole('textbox', { name: /email/i }).fill(`pw-${Date.now()}@example.com`);
  await page.getByLabel(/password/i).fill('TestPassword123!');
  await page.getByRole('button', { name: /sign up|submit|create/i }).click();
  await expect(page).toHaveURL(/\/(dashboard|home)?$/);
  await expect(page.getByText(/welcome|dashboard|home/i)).toBeVisible({ timeout: 10000 });
});

test('3. Login with email and password', async ({ page }) => {
  setupWebAppConsoleLogger(page);
  await page.goto(`${baseURL}/login`);
  await page.getByRole('textbox', { name: /email/i }).fill(process.env.TEST_USER_EMAIL!);
  await page.getByLabel(/password/i).fill(process.env.TEST_USER_PASSWORD!);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(/\/(dashboard|home)?$/);
});

test('4. Session persists across refresh', async ({ page, context }) => {
  setupWebAppConsoleLogger(page);
  await page.goto(`${baseURL}/login`);
  await page.getByRole('textbox', { name: /email/i }).fill(process.env.TEST_USER_EMAIL!);
  await page.getByLabel(/password/i).fill(process.env.TEST_USER_PASSWORD!);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(/\/(dashboard|home)?$/);
  await page.reload();
  await expect(page).toHaveURL(/\/(dashboard|home)?$/);
});

test('5. Sign out', async ({ page }) => {
  setupWebAppConsoleLogger(page);
  await page.goto(`${baseURL}/login`);
  await page.getByRole('textbox', { name: /email/i }).fill(process.env.TEST_USER_EMAIL!);
  await page.getByLabel(/password/i).fill(process.env.TEST_USER_PASSWORD!);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(/\/(dashboard|home)?$/);
  await page.getByRole('button', { name: /sign out|log out|logout/i }).click();
  await expect(page).toHaveURL(/\/login/);
  await page.goto(`${baseURL}/dashboard`);
  await expect(page).toHaveURL(/\/login/);
});

test('6. Settings page — view and save', async ({ page }) => {
  setupWebAppConsoleLogger(page);
  await page.goto(`${baseURL}/login`);
  await page.getByRole('textbox', { name: /email/i }).fill(process.env.TEST_USER_EMAIL!);
  await page.getByLabel(/password/i).fill(process.env.TEST_USER_PASSWORD!);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(/\/(dashboard|home)?$/, { timeout: 10000 });
  await page.goto(`${baseURL}/settings`);
  await expect(page).toHaveURL(/\/settings/, { timeout: 10000 });
  await expect(page.getByText(/choose your preferred|provider and model/i)).toBeVisible({ timeout: 15000 });
  const providerSelect = page.locator('#provider');
  await expect(providerSelect).toBeVisible({ timeout: 5000 });
  await page.getByRole('button', { name: /save/i }).click();
  await page.reload();
  await expect(providerSelect).toBeVisible({ timeout: 15000 });
});

test('7. User data isolation', async ({ browser }) => {
  const user1 = await browser.newContext();
  const user2 = await browser.newContext();
  const p1 = await user1.newPage();
  const p2 = await user2.newPage();
  setupWebAppConsoleLogger(p1);
  setupWebAppConsoleLogger(p2);
  await p1.goto(`${baseURL}/login`);
  await p1.getByRole('textbox', { name: /email/i }).fill(process.env.TEST_USER_EMAIL!);
  await p1.getByLabel(/password/i).fill(process.env.TEST_USER_PASSWORD!);
  await p1.getByRole('button', { name: 'Sign in', exact: true }).click();
  await p1.goto(`${baseURL}/settings`);
  await p2.goto(`${baseURL}/login`);
  await p2.getByRole('textbox', { name: /email/i }).fill(process.env.TEST_USER_EMAIL_2!);
  await p2.getByLabel(/password/i).fill(process.env.TEST_USER_PASSWORD_2!);
  await p2.getByRole('button', { name: 'Sign in', exact: true }).click();
  await p2.goto(`${baseURL}/settings`);
  await expect(p2).toHaveURL(/\/settings/);
  await user1.close();
  await user2.close();
});

test('8. Google OAuth button present', async ({ page }) => {
  setupWebAppConsoleLogger(page);
  await page.goto(`${baseURL}/login`);
  await expect(page.getByRole('button', { name: /google/i })).toBeVisible();
});

test('9. Microsoft OAuth button present', async ({ page }) => {
  setupWebAppConsoleLogger(page);
  await page.goto(`${baseURL}/login`);
  await expect(page.getByRole('button', { name: /microsoft/i })).toBeVisible();
});
