/**
 * Phase 4 (Agent Evolution) E2E tests.
 * Run: npx playwright test e2e/04-agent-evolution.spec.ts
 *
 * Requires: TEST_USER_EMAIL, TEST_USER_PASSWORD in .env. Server and web dev servers running.
 * Depends on Phase 3 (agent dispatch, approval, result card). Uses generous timeouts for LLM/agent runs.
 */
import { test, expect } from '@playwright/test';
import { setupWebAppConsoleLogger } from './utils/console-logger';

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000';

function en(path: string) {
  return `${baseURL}/en${path.startsWith('/') ? path : '/' + path}`;
}

async function login(page: import('@playwright/test').Page) {
  await page.goto(en('/login'));
  await page.getByRole('textbox', { name: /email/i }).fill(process.env.TEST_USER_EMAIL!);
  await page.getByLabel(/password/i).fill(process.env.TEST_USER_PASSWORD!);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(/\/(en|fr-FR|it|ja|zh-CN|en-GB)\/(dashboard|chat|home)/, { timeout: 15000 });
}

test.beforeEach(async ({ page }) => {
  setupWebAppConsoleLogger(page);
});

test('1. Feedback buttons visible after agent result', async ({ page }) => {
  test.setTimeout(180000);
  await login(page);
  await page.goto(en('/chat'));
  await expect(page).toHaveURL(/\/en\/chat\/[a-f0-9-]+/, { timeout: 15000 });
  await page.getByPlaceholder(/Message your coach/).fill('Draft an email to my team announcing our Q1 priorities.');
  await page.getByRole('button', { name: 'Send' }).click();
  await expect(page.getByRole('button', { name: 'Approve' })).toBeVisible({ timeout: 90000 });
  await page.getByRole('button', { name: 'Approve' }).click();
  await expect(page.getByText(/Result from/)).toBeVisible({ timeout: 120000 });
  // Phase 4: +1 / -1 feedback buttons below result
  await expect(page.getByRole('button', { name: '+1' })).toBeVisible({ timeout: 5000 });
  await expect(page.getByRole('button', { name: '-1' })).toBeVisible({ timeout: 5000 });
});

test('2. Thumbs up submits and shows thanks', async ({ page }) => {
  test.setTimeout(180000);
  await login(page);
  await page.goto(en('/chat'));
  await expect(page).toHaveURL(/\/en\/chat\/[a-f0-9-]+/, { timeout: 15000 });
  await page.getByPlaceholder(/Message your coach/).fill('Summarize the key risks of a 6-month project.');
  await page.getByRole('button', { name: 'Send' }).click();
  await expect(page.getByRole('button', { name: 'Approve' })).toBeVisible({ timeout: 90000 });
  await page.getByRole('button', { name: 'Approve' }).click();
  await expect(page.getByText(/Result from/)).toBeVisible({ timeout: 120000 });
  await expect(page.getByRole('button', { name: '+1' })).toBeVisible({ timeout: 5000 });
  await page.getByRole('button', { name: '+1' }).click();
  await expect(page.getByText('Thanks for the feedback')).toBeVisible({ timeout: 10000 });
});

test('3. Thumbs down shows correction UI', async ({ page }) => {
  test.setTimeout(180000);
  await login(page);
  await page.goto(en('/chat'));
  await expect(page).toHaveURL(/\/en\/chat\/[a-f0-9-]+/, { timeout: 15000 });
  await page.getByPlaceholder(/Message your coach/).fill('List three bullet points for a status update.');
  await page.getByRole('button', { name: 'Send' }).click();
  await expect(page.getByRole('button', { name: 'Approve' })).toBeVisible({ timeout: 90000 });
  await page.getByRole('button', { name: 'Approve' }).click();
  await expect(page.getByText(/Result from/)).toBeVisible({ timeout: 120000 });
  await expect(page.getByRole('button', { name: '-1' })).toBeVisible({ timeout: 5000 });
  await page.getByRole('button', { name: '-1' }).click();
  await expect(page.getByPlaceholder('What should have been different?')).toBeVisible({ timeout: 5000 });
  await expect(page.getByRole('button', { name: 'Submit correction' })).toBeVisible({ timeout: 5000 });
});

test('4. Agents page shows Archive and View History', async ({ page }) => {
  await login(page);
  await page.goto(en('/agents'));
  await expect(page).toHaveURL(/\/en\/agents/, { timeout: 10000 });
  await expect(page.getByRole('heading', { name: 'Agents' })).toBeVisible({ timeout: 10000 });
  await expect(page.getByText('Contract Attorney').first()).toBeVisible({ timeout: 35000 });
  await expect(page.getByRole('button', { name: 'Archive' }).first()).toBeVisible({ timeout: 5000 });
  await expect(page.getByRole('link', { name: 'View History' }).first()).toBeVisible({ timeout: 5000 });
});

test('5. Archive agent shows Archived badge and Unarchive', async ({ page }) => {
  await login(page);
  await page.goto(en('/agents'));
  await expect(page).toHaveURL(/\/en\/agents/, { timeout: 10000 });
  const uniqueName = `E2E Archive ${Date.now()}`;
  await page.getByRole('button', { name: 'Create Agent' }).click();
  await page.getByPlaceholder(/e\.g\. Contract Attorney/i).fill(uniqueName);
  await page.getByPlaceholder(/What this agent does/i).fill('To be archived then unarchived.');
  await page.getByPlaceholder(/Instructions for the agent/i).fill('You reply with OK.');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText(uniqueName)).toBeVisible({ timeout: 10000 });
  const card = page.locator('.rounded-lg.border').filter({ hasText: uniqueName });
  await card.getByRole('button', { name: 'Archive' }).click();
  await expect(page.getByText('Archived').first()).toBeVisible({ timeout: 5000 });
  await expect(card.getByRole('button', { name: 'Unarchive' })).toBeVisible({ timeout: 5000 });
});

test('6. Unarchive restores active state', async ({ page }) => {
  await login(page);
  await page.goto(en('/agents'));
  await expect(page).toHaveURL(/\/en\/agents/, { timeout: 10000 });
  const uniqueName = `E2E Unarchive ${Date.now()}`;
  await page.getByRole('button', { name: 'Create Agent' }).click();
  await page.getByPlaceholder(/e\.g\. Contract Attorney/i).fill(uniqueName);
  await page.getByPlaceholder(/What this agent does/i).fill('Archive then unarchive test.');
  await page.getByPlaceholder(/Instructions for the agent/i).fill('OK.');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText(uniqueName)).toBeVisible({ timeout: 10000 });
  const card = page.locator('.rounded-lg.border').filter({ hasText: uniqueName });
  await card.getByRole('button', { name: 'Archive' }).click();
  await expect(card.getByRole('button', { name: 'Unarchive' })).toBeVisible({ timeout: 5000 });
  await card.getByRole('button', { name: 'Unarchive' }).click();
  await expect(card.getByRole('button', { name: 'Archive' })).toBeVisible({ timeout: 5000 });
});

test('7. View History opens agent detail with version history and feedback summary', async ({ page }) => {
  await login(page);
  await page.goto(en('/agents'));
  await expect(page).toHaveURL(/\/en\/agents/, { timeout: 10000 });
  await expect(page.getByText('Contract Attorney').first()).toBeVisible({ timeout: 35000 });
  await page.getByRole('link', { name: 'View History' }).first().click();
  await expect(page).toHaveURL(/\/en\/agents\/[a-f0-9-]+/, { timeout: 10000 });
  await expect(page.getByRole('link', { name: 'Back to Agents' })).toBeVisible({ timeout: 5000 });
  await expect(page.getByRole('heading', { name: 'Version history' })).toBeVisible({ timeout: 5000 });
  await expect(page.getByRole('heading', { name: 'Feedback summary' })).toBeVisible({ timeout: 5000 });
});

test('8. Agent detail shows current prompt and version list', async ({ page }) => {
  await login(page);
  await page.goto(en('/agents'));
  await expect(page).toHaveURL(/\/en\/agents/, { timeout: 10000 });
  await expect(page.getByText('Contract Attorney').first()).toBeVisible({ timeout: 35000 });
  await page.getByRole('link', { name: 'View History' }).first().click();
  await expect(page).toHaveURL(/\/en\/agents\/[a-f0-9-]+/, { timeout: 10000 });
  await expect(page.getByRole('heading', { name: 'Current system prompt' })).toBeVisible({ timeout: 5000 });
  await expect(
    page.getByText('No version history yet').or(page.getByText(/Version \d+/)).or(page.locator('text=manual').first())
  ).toBeVisible({ timeout: 5000 });
});
