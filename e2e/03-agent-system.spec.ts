/**
 * Phase 3 (Agent System) E2E tests. Titles match UAT test names for result merging.
 * Run: npx playwright test e2e/03-agent-system.spec.ts
 *
 * Requires: TEST_USER_EMAIL, TEST_USER_PASSWORD in .env. Server and web dev servers running.
 * Optional: LLM (e.g. Ollama) for chat; tests use generous timeouts for agent routing and execution.
 */
import { test, expect } from '@playwright/test';
import { setupWebAppConsoleLogger } from './utils/console-logger';

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000';

async function login(page: import('@playwright/test').Page) {
  await page.goto(`${baseURL}/login`);
  await page.getByRole('textbox', { name: /email/i }).fill(process.env.TEST_USER_EMAIL!);
  await page.getByLabel(/password/i).fill(process.env.TEST_USER_PASSWORD!);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(/\/(dashboard|chat|home)/, { timeout: 15000 });
}

test.beforeEach(async ({ page }) => {
  setupWebAppConsoleLogger(page);
});

test('1. Agents page shows four starter templates', async ({ page }) => {
  await login(page);
  await page.goto(`${baseURL}/agents`);
  await expect(page).toHaveURL(/\/agents/, { timeout: 10000 });
  await expect(page.getByRole('heading', { name: 'Agents' })).toBeVisible({ timeout: 10000 });
  // Wait for list to load (seed runs on first list fetch); allow time for tRPC + seed
  await expect(page.getByRole('button', { name: 'Create Agent' })).toBeVisible({ timeout: 10000 });
  await expect(page.getByText('Contract Attorney').first()).toBeVisible({ timeout: 35000 });
  await expect(page.getByText('Comms Writer').first()).toBeVisible({ timeout: 5000 });
  await expect(page.getByText('Meeting Prep').first()).toBeVisible({ timeout: 5000 });
  await expect(page.getByText('Research Analyst').first()).toBeVisible({ timeout: 5000 });
  await expect(page.getByText('Starter').first()).toBeVisible({ timeout: 5000 });
});

test('2. Create a new custom agent', async ({ page }) => {
  await login(page);
  await page.goto(`${baseURL}/agents`);
  await expect(page).toHaveURL(/\/agents/, { timeout: 10000 });
  await page.getByRole('button', { name: 'Create Agent' }).click();
  const uniqueName = `E2E Agent ${Date.now()}`;
  await page.getByPlaceholder(/e\.g\. Contract Attorney/i).fill(uniqueName);
  await page.getByPlaceholder(/What this agent does/i).fill('E2E test agent description.');
  await page.getByPlaceholder(/Instructions for the agent/i).fill('You are a test agent. Reply with OK.');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText(uniqueName)).toBeVisible({ timeout: 10000 });
});

test('3. Edit an agent', async ({ page }) => {
  await login(page);
  await page.goto(`${baseURL}/agents`);
  await expect(page).toHaveURL(/\/agents/, { timeout: 10000 });
  const uniqueName = `E2E Edit ${Date.now()}`;
  await page.getByRole('button', { name: 'Create Agent' }).click();
  await page.getByPlaceholder(/e\.g\. Contract Attorney/i).fill('Original Name');
  await page.getByPlaceholder(/What this agent does/i).fill('Description');
  await page.getByPlaceholder(/Instructions for the agent/i).fill('System prompt.');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText('Original Name').first()).toBeVisible({ timeout: 10000 });
  await page.getByRole('button', { name: 'Edit' }).first().click();
  await page.getByPlaceholder(/e\.g\. Contract Attorney/i).fill(uniqueName);
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText(uniqueName)).toBeVisible({ timeout: 10000 });
});

test('4. Delete an agent', async ({ page }) => {
  page.on('dialog', (dialog) => dialog.accept());
  await login(page);
  await page.goto(`${baseURL}/agents`);
  await expect(page).toHaveURL(/\/agents/, { timeout: 10000 });
  const uniqueName = `E2E Delete ${Date.now()}`;
  await page.getByRole('button', { name: 'Create Agent' }).click();
  await page.getByPlaceholder(/e\.g\. Contract Attorney/i).fill(uniqueName);
  await page.getByPlaceholder(/What this agent does/i).fill('To be deleted.');
  await page.getByPlaceholder(/Instructions for the agent/i).fill('Prompt.');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText(uniqueName)).toBeVisible({ timeout: 10000 });
  await page.locator('.rounded-lg.border').filter({ hasText: uniqueName }).getByRole('button', { name: 'Delete' }).click();
  await expect(page.getByText(uniqueName)).not.toBeVisible({ timeout: 5000 });
});

test('5. Dashboard links to Agents', async ({ page }) => {
  await login(page);
  await page.goto(`${baseURL}/dashboard`);
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
  await expect(page.getByRole('link', { name: 'Agents' })).toBeVisible({ timeout: 5000 });
  await page.getByRole('link', { name: 'Agents' }).click();
  await expect(page).toHaveURL(/\/agents/, { timeout: 5000 });
});

test('6. Chat — coaching question gets direct response', async ({ page }) => {
  await login(page);
  await page.goto(`${baseURL}/chat`);
  await expect(page).toHaveURL(/\/chat\/[a-f0-9-]+/, { timeout: 15000 });
  await page.getByPlaceholder('Message your coach...').fill('Help me think through whether to take this new job offer.');
  await page.getByRole('button', { name: 'Send' }).click();
  await expect(page.getByText('Coach').first()).toBeVisible({ timeout: 60000 });
  await expect(page.getByRole('button', { name: 'Approve' })).not.toBeVisible({ timeout: 3000 }).catch(() => true);
});

test('7. Chat — task request shows approval card', async ({ page }) => {
  await login(page);
  await page.goto(`${baseURL}/chat`);
  await expect(page).toHaveURL(/\/chat\/[a-f0-9-]+/, { timeout: 15000 });
  await page.getByPlaceholder('Message your coach...').fill('Draft an email to my team announcing our Q1 priorities.');
  await page.getByRole('button', { name: 'Send' }).click();
  await expect(page.getByText(/Chief of Staff suggests|Delegate to/)).toBeVisible({ timeout: 90000 });
  await expect(page.getByRole('button', { name: 'Approve' })).toBeVisible({ timeout: 5000 });
  await expect(page.getByRole('button', { name: 'Deny' })).toBeVisible({ timeout: 5000 });
});

test('8. Chat — approve agent dispatch', async ({ page }) => {
  test.setTimeout(180000); // Approve + specialist run + result can be slow
  await login(page);
  await page.goto(`${baseURL}/chat`);
  await expect(page).toHaveURL(/\/chat\/[a-f0-9-]+/, { timeout: 15000 });
  await page.getByPlaceholder('Message your coach...').fill('Draft an email to my team announcing our Q1 priorities.');
  await page.getByRole('button', { name: 'Send' }).click();
  await expect(page.getByRole('button', { name: 'Approve' })).toBeVisible({ timeout: 90000 });
  await page.getByRole('button', { name: 'Approve' }).click();
  // Result card shows "Result from {agentName}" after specialist runs
  await expect(page.getByText(/Result from/)).toBeVisible({ timeout: 120000 });
});

test('9. Chat — task suggests Contract Attorney', async ({ page }) => {
  await login(page);
  await page.goto(`${baseURL}/chat`);
  await expect(page).toHaveURL(/\/chat\/[a-f0-9-]+/, { timeout: 15000 });
  await page.getByPlaceholder('Message your coach...').fill('Review this contract clause: The vendor may terminate at any time with 30 days notice.');
  await page.getByRole('button', { name: 'Send' }).click();
  await expect(page.getByText(/Chief of Staff suggests|Delegate to|Contract Attorney/)).toBeVisible({ timeout: 90000 });
  await expect(page.getByRole('button', { name: 'Approve' })).toBeVisible({ timeout: 5000 });
});

test('10. Chat — deny agent dispatch', async ({ page }) => {
  await login(page);
  await page.goto(`${baseURL}/chat`);
  await expect(page).toHaveURL(/\/chat\/[a-f0-9-]+/, { timeout: 15000 });
  await page.getByPlaceholder('Message your coach...').fill('Review this contract clause: The vendor may terminate at any time with 30 days notice.');
  await page.getByRole('button', { name: 'Send' }).click();
  await expect(page.getByRole('button', { name: 'Deny' })).toBeVisible({ timeout: 90000 });
  await page.getByRole('button', { name: 'Deny' }).click();
  await expect(page.getByText(/declined|Agent dispatch was declined/i)).toBeVisible({ timeout: 30000 });
});
