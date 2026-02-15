/**
 * Phase 5 (UI Polish & Styling) E2E tests.
 * Run: npx playwright test e2e/05-ui-polish.spec.ts
 *
 * Requires: TEST_USER_EMAIL, TEST_USER_PASSWORD in .env. Server and web dev servers running.
 * Verifies app shell (sidebar, nav), theme toggle, and that key pages load with expected structure.
 */
import { test, expect } from '@playwright/test';
import { setupWebAppConsoleLogger } from './utils/console-logger';

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000';

async function login(page: import('@playwright/test').Page) {
  await page.goto(`${baseURL}/login`);
  await page.getByRole('textbox', { name: /email/i }).fill(process.env.TEST_USER_EMAIL!);
  await page.getByLabel(/password/i).fill(process.env.TEST_USER_PASSWORD!);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(/\/(dashboard|chat)/, { timeout: 15000 });
}

test.beforeEach(async ({ page }) => {
  setupWebAppConsoleLogger(page);
});

test('1. Login page has card layout and shadcn form elements', async ({ page }) => {
  await page.goto(`${baseURL}/login`);
  await expect(page.locator('[data-slot="card-title"]').filter({ hasText: 'Sign in' })).toBeVisible({ timeout: 10000 });
  await expect(page.getByRole('textbox', { name: /email/i })).toBeVisible();
  await expect(page.getByLabel(/password/i)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeVisible();
  await expect(page.getByText('or', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /Sign in with Google/i })).toBeVisible();
});

test('2. App shell shows sidebar with nav links after login', async ({ page }) => {
  await login(page);
  await expect(page.getByRole('link', { name: 'Dashboard' }).first()).toBeVisible({ timeout: 10000 });
  await expect(page.getByRole('link', { name: 'Chat' }).first()).toBeVisible();
  await expect(page.getByRole('link', { name: 'Agents' }).first()).toBeVisible();
  await expect(page.getByRole('link', { name: 'Memory' }).first()).toBeVisible();
  await expect(page.getByRole('link', { name: 'Documents' }).first()).toBeVisible();
  await expect(page.getByRole('link', { name: 'Settings' }).first()).toBeVisible();
});

test('3. Dashboard shows welcome and card grid', async ({ page }) => {
  await login(page);
  await page.goto(`${baseURL}/dashboard`);
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
  await expect(page.getByText(/Welcome,/)).toBeVisible({ timeout: 10000 });
  await expect(page.getByRole('link', { name: /Start Coaching Session/i })).toBeVisible({ timeout: 5000 });
  await expect(page.getByRole('link', { name: /Memory & Knowledge/i })).toBeVisible();
});

test('4. Theme toggle exists in sidebar', async ({ page }) => {
  await login(page);
  await page.goto(`${baseURL}/dashboard`);
  await expect(page.getByRole('button', { name: 'Toggle theme' })).toBeVisible({ timeout: 10000 });
});

test('5. Chat page has conversation area and input', async ({ page }) => {
  await login(page);
  await page.goto(`${baseURL}/chat`);
  await expect(page).toHaveURL(/\/chat\/[a-f0-9-]+/, { timeout: 15000 });
  await expect(page.getByPlaceholder('Message your coach...')).toBeVisible({ timeout: 10000 });
  await expect(page.getByRole('button', { name: 'Send' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Coach' })).toBeVisible();
});

test('6. Agents page shows heading, Create Agent, and agent cards', async ({ page }) => {
  await login(page);
  await page.goto(`${baseURL}/agents`);
  await expect(page).toHaveURL(/\/agents/, { timeout: 10000 });
  await expect(page.getByRole('heading', { name: 'Agents' })).toBeVisible({ timeout: 10000 });
  await expect(page.getByRole('button', { name: 'Create Agent' })).toBeVisible();
  await expect(page.getByText('Contract Attorney').first()).toBeVisible({ timeout: 35000 });
});

test('7. Agent detail shows Tabs (Prompt, Versions, Feedback)', async ({ page }) => {
  await login(page);
  await page.goto(`${baseURL}/agents`);
  await expect(page).toHaveURL(/\/agents/, { timeout: 10000 });
  await expect(page.getByText('Contract Attorney').first()).toBeVisible({ timeout: 35000 });
  await page.getByRole('link', { name: 'View History' }).first().click();
  await expect(page).toHaveURL(/\/agents\/[a-f0-9-]+/, { timeout: 10000 });
  await expect(page.getByRole('tab', { name: 'Prompt' })).toBeVisible({ timeout: 5000 });
  await expect(page.getByRole('tab', { name: 'Versions' })).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Feedback' })).toBeVisible();
});

test('8. Memory page shows heading and description', async ({ page }) => {
  await login(page);
  await page.goto(`${baseURL}/memory`);
  await expect(page).toHaveURL(/\/memory/, { timeout: 10000 });
  await expect(page.getByRole('heading', { name: 'What I Know About You' })).toBeVisible({ timeout: 10000 });
  await expect(page.getByText(/Facts extracted from our conversations/)).toBeVisible();
});

test('9. Documents page shows upload area and heading', async ({ page }) => {
  await login(page);
  await page.goto(`${baseURL}/documents`);
  await expect(page).toHaveURL(/\/documents/, { timeout: 10000 });
  await expect(page.getByRole('heading', { name: 'Documents', exact: true })).toBeVisible({ timeout: 10000 });
  await expect(page.getByText(/Drop a file here or click to select/)).toBeVisible();
  await expect(page.getByText('Your documents')).toBeVisible();
});

test('10. Settings page shows LLM config and Save', async ({ page }) => {
  await login(page);
  await page.goto(`${baseURL}/settings`);
  await expect(page).toHaveURL(/\/settings/, { timeout: 10000 });
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible({ timeout: 10000 });
  await expect(page.getByText(/Choose your preferred LLM provider/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Save' })).toBeVisible();
});

test('11. Dark mode toggle adds dark class to html', async ({ page }) => {
  await login(page);
  await page.goto(`${baseURL}/dashboard`);
  // Hide Next.js dev overlay so it doesn't block the theme button click
  await page.evaluate(() => {
    const overlay = document.querySelector('nextjs-portal');
    if (overlay?.parentElement) (overlay.parentElement as HTMLElement).style.setProperty('display', 'none');
  });
  const themeBtn = page.getByRole('button', { name: 'Toggle theme' });
  await expect(themeBtn).toBeVisible({ timeout: 10000 });
  const html = page.locator('html');
  await themeBtn.click();
  const darkItem = page.getByRole('menuitem', { name: 'Dark' });
  await expect(darkItem).toBeVisible({ timeout: 5000 });
  await darkItem.click();
  await expect(html).toHaveClass(/dark/, { timeout: 5000 });
});
