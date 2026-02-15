/**
 * Phase 6 (API Key Management & Usage Tracking) E2E tests.
 * Run: npx playwright test e2e/06-api-key-usage.spec.ts
 *
 * Requires:
 *   - TEST_USER_EMAIL, TEST_USER_PASSWORD in .env (or environment)
 *   - Dev servers running: npm run dev (web on 3000, server on 3001)
 * Verifies Settings (API keys, budget, usage dashboard) and agent preferred model UI.
 */
import { test, expect } from '@playwright/test';
import { setupWebAppConsoleLogger } from './utils/console-logger';

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000';

const hasTestUser =
  process.env.TEST_USER_EMAIL && process.env.TEST_USER_PASSWORD;

async function login(page: import('@playwright/test').Page) {
  await page.goto(`${baseURL}/login`);
  await page.getByRole('textbox', { name: /email/i }).fill(process.env.TEST_USER_EMAIL!);
  await page.getByLabel(/password/i).fill(process.env.TEST_USER_PASSWORD!);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(/\/(dashboard|chat)/, { timeout: 15000 });
}

test.beforeEach(async ({ page }, testInfo) => {
  test.skip(!hasTestUser, 'TEST_USER_EMAIL and TEST_USER_PASSWORD required');
  setupWebAppConsoleLogger(page);
});

test('1. Settings shows API Keys, LLM Configuration, and Usage sections', async ({ page }) => {
  await login(page);
  await page.goto(`${baseURL}/settings`);
  await expect(page).toHaveURL(/\/settings/, { timeout: 10000 });
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible({ timeout: 10000 });
  await expect(page.getByText('API Keys').first()).toBeVisible();
  await expect(page.getByText(/Add your own API keys to use your accounts/)).toBeVisible();
  await expect(page.getByText('LLM Configuration').first()).toBeVisible();
  await expect(page.getByText('Usage this month').first()).toBeVisible();
});

test('2. API Keys section shows Anthropic, OpenAI, and Google (Gemini) with Save & Verify when no key', async ({ page }) => {
  await login(page);
  await page.goto(`${baseURL}/settings`);
  await expect(page).toHaveURL(/\/settings/, { timeout: 10000 });
  await expect(page.getByText('Anthropic').first()).toBeVisible({ timeout: 10000 });
  await expect(page.getByText('OpenAI').first()).toBeVisible();
  await expect(page.getByText('Google (Gemini)').first()).toBeVisible();
  const saveVerify = page.getByRole('button', { name: 'Save & Verify' });
  await expect(saveVerify.first()).toBeVisible();
  await expect(saveVerify).toHaveCount(3);
});

test('3. Invalid API key shows error message', async ({ page }) => {
  await login(page);
  await page.goto(`${baseURL}/settings`);
  await expect(page).toHaveURL(/\/settings/, { timeout: 10000 });
  const anthropicInput = page.getByPlaceholder('sk-ant-...').first();
  await expect(anthropicInput).toBeVisible({ timeout: 10000 });
  await anthropicInput.fill('sk-ant-invalid-key-for-e2e-test');
  await page.getByRole('button', { name: 'Save & Verify' }).first().click();
  await expect(
    page.getByText(/Invalid API key|could not authenticate with provider/i)
  ).toBeVisible({ timeout: 15000 });
});

test('4. LLM Configuration has Provider, Model, Monthly budget and Save', async ({ page }) => {
  await login(page);
  await page.goto(`${baseURL}/settings`);
  await expect(page).toHaveURL(/\/settings/, { timeout: 10000 });
  await expect(page.getByLabel('Provider')).toBeVisible({ timeout: 10000 });
  await expect(page.getByLabel('Model')).toBeVisible();
  await expect(page.getByLabel(/Monthly budget/i)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Save', exact: true })).toBeVisible();
  await expect(
    page.getByText(/Set a monthly spending limit in dollars/)
  ).toBeVisible();
});

test('5. Usage this month shows total, cost by provider when present, or empty state', async ({ page }) => {
  await login(page);
  await page.goto(`${baseURL}/settings`);
  await expect(page).toHaveURL(/\/settings/, { timeout: 10000 });
  await expect(page.getByText('Usage this month').first()).toBeVisible({ timeout: 10000 });
  const hasTotalOrEmpty = page
    .getByText(/\$[0-9]+\.[0-9]{2}/)
    .or(page.getByText(/No usage this period yet/))
    .first();
  await expect(hasTotalOrEmpty).toBeVisible({ timeout: 5000 });
  // When there is usage from cloud providers, cost by provider is shown (e.g. "Anthropic: $X.XX · OpenAI: $X.XX")
});

function viewHistoryLinkForNonArchivedAgent(page: import('@playwright/test').Page) {
  return page.locator('[data-slot="card"]').filter({ hasNot: page.getByText('Archived') }).first().getByRole('link', { name: 'View History' });
}

test('6. Agent detail shows Preferred model dropdown and Save', async ({ page }) => {
  await login(page);
  await page.goto(`${baseURL}/agents`);
  await expect(page).toHaveURL(/\/agents/, { timeout: 10000 });
  await expect(page.getByText('Contract Attorney').first()).toBeVisible({ timeout: 35000 });
  await viewHistoryLinkForNonArchivedAgent(page).click();
  await expect(page).toHaveURL(/\/agents\/[a-f0-9-]+/, { timeout: 10000 });
  await expect(page.getByText('Preferred model')).toBeVisible({ timeout: 10000 });
  await expect(
    page.getByText(/Override the default model for this agent/)
  ).toBeVisible();
  await expect(page.getByRole('combobox').first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Save', exact: true }).first()).toBeVisible();
});

test('7. Preferred model select opens and has Use Default option', async ({ page }) => {
  await login(page);
  await page.goto(`${baseURL}/agents`);
  await expect(page).toHaveURL(/\/agents/, { timeout: 10000 });
  await expect(page.getByText('Contract Attorney').first()).toBeVisible({ timeout: 35000 });
  await viewHistoryLinkForNonArchivedAgent(page).click();
  await expect(page).toHaveURL(/\/agents\/[a-f0-9-]+/, { timeout: 10000 });
  await page.getByRole('combobox').first().click();
  await expect(page.getByRole('option', { name: 'Use Default' })).toBeVisible({ timeout: 5000 });
});

test('8. Saving agent preferred model persists after reload', async ({ page }) => {
  await login(page);
  await page.goto(`${baseURL}/agents`);
  await expect(page).toHaveURL(/\/agents/, { timeout: 10000 });
  await expect(page.getByText('Contract Attorney').first()).toBeVisible({ timeout: 35000 });
  await viewHistoryLinkForNonArchivedAgent(page).click();
  await expect(page).toHaveURL(/\/agents\/[a-f0-9-]+/, { timeout: 10000 });
  const combobox = page.getByRole('combobox').first();
  await combobox.click();
  const useDefault = page.getByRole('option', { name: 'Use Default' });
  await expect(useDefault).toBeVisible({ timeout: 5000 });
  await useDefault.click();
  const saveBtn = page.getByRole('button', { name: 'Save', exact: true }).first();
  await saveBtn.click();
  await expect(saveBtn).toBeEnabled({ timeout: 10000 });
  await page.reload();
  await expect(page).toHaveURL(/\/agents\/[a-f0-9-]+/, { timeout: 10000 });
  await expect(page.getByRole('combobox').first()).toHaveText(/Use Default/, { timeout: 5000 });
});

test('9. Usage this month shows breakdown table (Model, Est. cost) or empty state', async ({ page }) => {
  await login(page);
  await page.goto(`${baseURL}/settings`);
  await expect(page).toHaveURL(/\/settings/, { timeout: 10000 });
  await expect(page.getByText('Usage this month').first()).toBeVisible({ timeout: 10000 });
  const usageCard = page.locator('[data-slot="card"]').filter({ has: page.getByText('Usage this month') });
  const hasTable = usageCard.getByRole('columnheader', { name: 'Model' });
  const hasEmpty = usageCard.getByText('No usage this period yet');
  await expect(hasTable.or(hasEmpty)).toBeVisible({ timeout: 5000 });
  if (await hasTable.isVisible()) {
    await expect(usageCard.getByRole('columnheader', { name: 'Est. cost' })).toBeVisible();
  }
});
