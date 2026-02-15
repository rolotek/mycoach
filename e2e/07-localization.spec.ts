/**
 * Phase 7 (Friendlier errors & localization) E2E tests.
 * Titles match UAT test names for playwright-from-uat.js result merging.
 *
 * Run: npx playwright test e2e/07-localization.spec.ts
 *
 * Requires: TEST_USER_EMAIL, TEST_USER_PASSWORD for tests 4–5. Server and web dev servers running.
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
  await expect(page).toHaveURL(/\/(en|fr-FR|it|ja|zh-CN|en-GB)\/(dashboard|chat)/, { timeout: 15000 });
}

test.beforeEach(async ({ page }) => {
  setupWebAppConsoleLogger(page);
});

test('1. Root and locale routing', async ({ page }) => {
  await page.goto(baseURL + '/');
  await expect(page).toHaveURL(/\/(en|fr-FR|it|ja|zh-CN|en-GB)(\/|$)/, { timeout: 10000 });
  await page.goto(en('/dashboard'));
  await expect(page).toHaveURL(/\/en\/dashboard/, { timeout: 10000 });
  await page.goto(en('/login'));
  await expect(page).toHaveURL(/\/en\/login/, { timeout: 10000 });
  await page.goto(en('/'));
  await expect(page).toHaveURL(/\/en\//, { timeout: 5000 });
  await expect(page).toHaveURL(/\/(en|fr-FR|it|ja|zh-CN|en-GB)\/(login|dashboard)/, { timeout: 5000 });
});

test('2. Locale switcher in sidebar', async ({ page }) => {
  await login(page);
  await page.goto(en('/dashboard'));
  await expect(page).toHaveURL(/\/en\//, { timeout: 10000 });
  const localeBtn = page.getByRole('button', { name: /language/i });
  await expect(localeBtn).toBeVisible({ timeout: 10000 });
  await localeBtn.click();
  await expect(page.getByRole('menuitem', { name: 'System' })).toBeVisible({ timeout: 3000 });
  await expect(page.getByRole('menuitem', { name: 'Français' })).toBeVisible();
  await expect(page.getByRole('menuitem', { name: 'British English' })).toBeVisible();
  await page.getByRole('menuitem', { name: 'Français' }).click();
  await expect(page).toHaveURL(/\/fr-FR\//, { timeout: 10000 });
});

test('3. French locale displays translated UI', async ({ page }) => {
  await page.goto(`${baseURL}/fr-FR/login`);
  await expect(page).toHaveURL(/\/fr-FR\/login/, { timeout: 10000 });
  await expect(page.getByRole('button', { name: 'Se connecter', exact: true })).toBeVisible({ timeout: 5000 });
  await page.getByRole('textbox', { name: /e-mail|email/i }).fill(process.env.TEST_USER_EMAIL!);
  await page.getByLabel(/mot de passe|password/i).fill(process.env.TEST_USER_PASSWORD!);
  await page.getByRole('button', { name: 'Se connecter', exact: true }).click();
  await expect(page).toHaveURL(/\/fr-FR\/(dashboard|chat)/, { timeout: 15000 });
  await expect(page.getByRole('link', { name: 'Tableau de bord' }).first()).toBeVisible({ timeout: 10000 });
  await expect(page.getByRole('link', { name: 'Paramètres' }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Déconnexion' })).toBeVisible({ timeout: 5000 });
  await page.goto(`${baseURL}/fr-FR/settings`);
  await expect(page.getByRole('button', { name: 'Enregistrer' })).toBeVisible({ timeout: 5000 });
});

const hasTestUser =
  process.env.TEST_USER_EMAIL && process.env.TEST_USER_PASSWORD;

test('4. Chat shows friendly error messages', async ({ page }) => {
  test.skip(!hasTestUser, 'TEST_USER_EMAIL and TEST_USER_PASSWORD required');
  await login(page);
  await page.goto(en('/settings'));
  await expect(page).toHaveURL(/\/en\/settings/, { timeout: 10000 });
  await page.getByLabel(/provider/i).click();
  await page.getByRole('option', { name: 'OpenAI' }).click();
  await page.getByLabel(/model/i).click();
  await page.getByRole('option', { name: /gpt-4o mini/i }).click();
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByText(/saved/i)).toBeVisible({ timeout: 5000 });
  await page.goto(en('/chat'));
  await expect(page).toHaveURL(/\/en\/chat\/[a-f0-9-]+/, { timeout: 15000 });
  await page.getByPlaceholder(/message your coach/i).fill('Hello');
  await page.getByRole('button', { name: 'Send' }).click();
  const alert = page.getByRole('alert');
  await expect(alert).toBeVisible({ timeout: 15000 });
  await expect(
    alert.getByText(/API key|Settings|clé API|paramètres/i)
  ).toBeVisible({ timeout: 5000 });
});

test('5. Main pages use translation keys', async ({ page }) => {
  test.skip(!hasTestUser, 'TEST_USER_EMAIL and TEST_USER_PASSWORD required');
  await login(page);
  await page.goto(en('/dashboard'));
  await expect(page.getByRole('heading', { name: /welcome/i })).toBeVisible({ timeout: 10000 });
  await expect(page.getByRole('link', { name: /start coaching session/i })).toBeVisible();
  await page.goto(en('/settings'));
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible({ timeout: 5000 });
  await expect(page.getByText('API Keys', { exact: true })).toBeVisible({ timeout: 5000 });
  await page.goto(en('/agents'));
  await expect(page.getByRole('heading', { name: 'Agents' })).toBeVisible({ timeout: 5000 });
  await expect(page.getByRole('button', { name: 'Create Agent' })).toBeVisible();
  await page.goto(en('/documents'));
  await expect(page.getByRole('heading', { name: 'Documents', exact: true })).toBeVisible({ timeout: 5000 });
  await expect(page.getByText(/drop a file here|your documents/i).first()).toBeVisible();
  await page.goto(en('/memory'));
  await expect(page.getByRole('heading', { name: 'What I Know About You' })).toBeVisible({ timeout: 5000 });
  await page.goto(en('/projects'));
  await expect(page.getByRole('heading', { name: 'Projects' })).toBeVisible({ timeout: 5000 });
  await expect(page.getByRole('button', { name: 'New project' })).toBeVisible();
});
