/**
 * Phase 8 (Projects) E2E tests.
 * Run: npx playwright test e2e/08-projects.spec.ts
 *
 * Requires:
 *   - TEST_USER_EMAIL, TEST_USER_PASSWORD in .env (or environment)
 *   - Dev servers running: npm run dev (web on 3000, server on 3001)
 *   - Phase 8 DB schema applied: cd apps/server && npm run db:push
 * Verifies Projects list, project detail (definition, documents, links, milestones, tasks),
 * add task directly to a milestone, and "Open chat for this project" flow.
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

test('1. Sidebar shows Projects link', async ({ page }) => {
  await login(page);
  await page.goto(`${baseURL}/dashboard`);
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
  await expect(page.getByRole('link', { name: 'Projects' }).first()).toBeVisible({ timeout: 10000 });
});

test('2. Projects list page shows heading, description, and New project button', async ({ page }) => {
  await login(page);
  await page.goto(`${baseURL}/projects`);
  await expect(page).toHaveURL(/\/projects/, { timeout: 10000 });
  await expect(page.getByRole('heading', { name: 'Projects', exact: true })).toBeVisible({ timeout: 10000 });
  await expect(
    page.getByText(/Create projects to scope coaching and tasks/, { exact: false })
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'New project' })).toBeVisible();
});

test('3. Projects list shows empty state or project cards', async ({ page }) => {
  await login(page);
  await page.goto(`${baseURL}/projects`);
  await expect(page).toHaveURL(/\/projects/, { timeout: 10000 });
  const emptyState = page.getByText(/No projects yet/i);
  const projectLinks = page.locator('a[href^="/projects/"]');
  await expect(emptyState.or(projectLinks.first())).toBeVisible({ timeout: 10000 });
});

test('4. New project dialog opens and has name and description fields', async ({ page }) => {
  await login(page);
  await page.goto(`${baseURL}/projects`);
  await expect(page).toHaveURL(/\/projects/, { timeout: 10000 });
  await page.getByRole('button', { name: 'New project' }).click();
  await expect(page.getByRole('dialog').getByRole('heading', { name: 'New project' })).toBeVisible({
    timeout: 5000,
  });
  await expect(page.getByRole('dialog').getByLabel('Name')).toBeVisible();
  await expect(page.getByRole('dialog').getByLabel(/Description/)).toBeVisible();
  await expect(page.getByRole('dialog').getByRole('button', { name: 'Create' })).toBeVisible();
  await expect(page.getByRole('dialog').getByRole('button', { name: 'Cancel' })).toBeVisible();
});

test('5. Create project redirects to project detail', async ({ page }) => {
  await login(page);
  await page.goto(`${baseURL}/projects`);
  await expect(page).toHaveURL(/\/projects/, { timeout: 10000 });
  await page.getByRole('button', { name: 'New project' }).click();
  await expect(page.getByRole('dialog').getByRole('heading', { name: 'New project' })).toBeVisible({
    timeout: 5000,
  });
  const name = `E2E Project ${Date.now()}`;
  await page.getByRole('dialog').getByLabel('Name').fill(name);
  await page.getByRole('dialog').getByRole('button', { name: /^Create$/ }).click();
  await expect(page).toHaveURL(/\/projects\/[a-f0-9-]+/, { timeout: 15000 });
  await expect(page.getByRole('link', { name: 'Back to Projects' })).toBeVisible({ timeout: 5000 });
});

test('6. Project detail shows Definition, Documents & links, Milestones, Tasks sections', async ({
  page,
}) => {
  await login(page);
  await page.goto(`${baseURL}/projects`);
  await expect(page).toHaveURL(/\/projects/, { timeout: 10000 });
  const newBtn = page.getByRole('button', { name: 'New project' });
  if (!(await newBtn.isVisible())) {
    const firstLink = page.locator('a[href^="/projects/"]').first();
    await expect(firstLink).toBeVisible({ timeout: 5000 });
    await firstLink.click();
  } else {
    await newBtn.click();
    await page.getByRole('dialog').getByLabel('Name').fill(`E2E Detail ${Date.now()}`);
    await page.getByRole('dialog').getByRole('button', { name: 'Create' }).click();
  }
  await expect(page).toHaveURL(/\/projects\/[a-f0-9-]+/, { timeout: 10000 });
  await expect(page.getByText('Definition', { exact: true })).toBeVisible({
    timeout: 10000,
  });
  await expect(page.getByText('Documents & links', { exact: true })).toBeVisible();
  await expect(page.getByText('Milestones', { exact: true })).toBeVisible();
  await expect(page.getByText('Tasks', { exact: true })).toBeVisible();
});

test('7. Project detail has Open chat for this project button', async ({ page }) => {
  await login(page);
  await page.goto(`${baseURL}/projects`);
  await expect(page).toHaveURL(/\/projects/, { timeout: 10000 });
  await page.getByRole('button', { name: 'New project' }).click();
  await page.getByRole('dialog').getByLabel('Name').fill(`E2E Chat ${Date.now()}`);
  await page.getByRole('dialog').getByRole('button', { name: 'Create' }).click();
  await expect(page).toHaveURL(/\/projects\/[a-f0-9-]+/, { timeout: 10000 });
  const openChat = page.getByRole('link', { name: 'Open chat for this project' });
  await expect(openChat).toBeVisible({ timeout: 5000 });
  await expect(openChat).toHaveAttribute('href', /\/chat\?projectId=[a-f0-9-]+/);
});

test('8. Open chat for this project navigates to chat with projectId', async ({ page }) => {
  await login(page);
  await page.goto(`${baseURL}/projects`);
  await expect(page).toHaveURL(/\/projects/, { timeout: 10000 });
  await page.getByRole('button', { name: 'New project' }).click();
  await page.getByRole('dialog').getByLabel('Name').fill(`E2E Nav ${Date.now()}`);
  await page.getByRole('dialog').getByRole('button', { name: 'Create' }).click();
  await expect(page).toHaveURL(/\/projects\/[a-f0-9-]+/, { timeout: 10000 });
  const projectId = page.url().split('/projects/')[1]?.split('?')[0] ?? '';
  await page.getByRole('link', { name: 'Open chat for this project' }).click();
  await expect(page).toHaveURL(/\/chat\/[a-f0-9-]+/, { timeout: 15000 });
  expect(page.url()).toContain(`projectId=${projectId}`);
  await expect(page.getByPlaceholder('Message your coach...')).toBeVisible({ timeout: 10000 });
});

test('9. Add link to project', async ({ page }) => {
  await login(page);
  await page.goto(`${baseURL}/projects`);
  await expect(page).toHaveURL(/\/projects/, { timeout: 10000 });
  await page.getByRole('button', { name: 'New project' }).click();
  await page.getByRole('dialog').getByLabel('Name').fill(`E2E Links ${Date.now()}`);
  await page.getByRole('dialog').getByRole('button', { name: 'Create' }).click();
  await expect(page).toHaveURL(/\/projects\/[a-f0-9-]+/, { timeout: 10000 });
  await page.getByPlaceholder('Label').fill('E2E Link');
  await page.getByPlaceholder('https://...').fill('https://example.com/e2e');
  await page.getByRole('button', { name: 'Add link' }).click();
  await expect(page.getByRole('link', { name: 'E2E Link' })).toBeVisible({ timeout: 5000 });
});

test('10. Add milestone to project', async ({ page }) => {
  await login(page);
  await page.goto(`${baseURL}/projects`);
  await expect(page).toHaveURL(/\/projects/, { timeout: 10000 });
  await page.getByRole('button', { name: 'New project' }).click();
  await page.getByRole('dialog').getByLabel('Name').fill(`E2E Milestones ${Date.now()}`);
  await page.getByRole('dialog').getByRole('button', { name: 'Create' }).click();
  await expect(page).toHaveURL(/\/projects\/[a-f0-9-]+/, { timeout: 10000 });
  const title = `Milestone ${Date.now()}`;
  await page.getByPlaceholder('Milestone title').fill(title);
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await expect(page.getByText(title)).toBeVisible({ timeout: 10000 });
});

test('11. Add task to project', async ({ page }) => {
  await login(page);
  await page.goto(`${baseURL}/projects`);
  await expect(page).toHaveURL(/\/projects/, { timeout: 10000 });
  await page.getByRole('button', { name: 'New project' }).click();
  await page.getByRole('dialog').getByLabel('Name').fill(`E2E Tasks ${Date.now()}`);
  await page.getByRole('dialog').getByRole('button', { name: 'Create' }).click();
  await expect(page).toHaveURL(/\/projects\/[a-f0-9-]+/, { timeout: 10000 });
  const title = `Task ${Date.now()}`;
  await page.getByPlaceholder('Task title').fill(title);
  await page.getByRole('button', { name: 'Add task' }).click();
  await expect(page.getByText(title)).toBeVisible({ timeout: 5000 });
});

test('12. Add task directly to a milestone', async ({ page }) => {
  await login(page);
  await page.goto(`${baseURL}/projects`);
  await expect(page).toHaveURL(/\/projects/, { timeout: 10000 });
  await page.getByRole('button', { name: 'New project' }).click();
  await page.getByRole('dialog').getByLabel('Name').fill(`E2E Milestone Task ${Date.now()}`);
  await page.getByRole('dialog').getByRole('button', { name: 'Create' }).click();
  await expect(page).toHaveURL(/\/projects\/[a-f0-9-]+/, { timeout: 10000 });
  const milestoneTitle = `MS ${Date.now()}`;
  await page.getByPlaceholder('Milestone title').fill(milestoneTitle);
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await expect(page.getByText(milestoneTitle)).toBeVisible({ timeout: 5000 });
  await page.getByRole('button', { name: 'Add task to this milestone' }).click();
  const taskTitle = `Milestone task ${Date.now()}`;
  await page.getByPlaceholder('Task title').first().fill(taskTitle);
  await page.getByRole('button', { name: 'Cancel' }).locator('..').getByRole('button', { name: 'Add', exact: true }).click();
  await expect(page.getByText(taskTitle)).toBeVisible({ timeout: 5000 });
});

test('13. Definition section has status select and due date', async ({ page }) => {
  await login(page);
  await page.goto(`${baseURL}/projects`);
  await expect(page).toHaveURL(/\/projects/, { timeout: 10000 });
  await page.getByRole('button', { name: 'New project' }).click();
  await page.getByRole('dialog').getByLabel('Name').fill(`E2E Def ${Date.now()}`);
  await page.getByRole('dialog').getByRole('button', { name: 'Create' }).click();
  await expect(page).toHaveURL(/\/projects\/[a-f0-9-]+/, { timeout: 10000 });
  await expect(page.getByText('Definition', { exact: true })).toBeVisible({ timeout: 10000 });
  await expect(page.getByText('Status', { exact: true })).toBeVisible({ timeout: 5000 });
  await expect(page.getByText('Due date', { exact: true })).toBeVisible();
  await expect(page.getByRole('combobox').first()).toBeVisible();
  await expect(page.locator('input[type="date"]').first()).toBeVisible();
});

test('14. Back to Projects returns to list', async ({ page }) => {
  await login(page);
  await page.goto(`${baseURL}/projects`);
  await expect(page).toHaveURL(/\/projects/, { timeout: 10000 });
  const firstLink = page.locator('a[href^="/projects/"]').first();
  if (await firstLink.isVisible()) {
    await firstLink.click();
    await expect(page).toHaveURL(/\/projects\/[a-f0-9-]+/, { timeout: 5000 });
  } else {
    await page.getByRole('button', { name: 'New project' }).click();
    await page.getByRole('dialog').getByLabel('Name').fill(`E2E Back ${Date.now()}`);
    await page.getByRole('dialog').getByRole('button', { name: 'Create' }).click();
    await expect(page).toHaveURL(/\/projects\/[a-f0-9-]+/, { timeout: 10000 });
  }
  await page.getByRole('link', { name: 'Back to Projects' }).click();
  await expect(page).toHaveURL(/\/projects$/, { timeout: 5000 });
  await expect(page.getByRole('heading', { name: 'Projects', exact: true })).toBeVisible();
});
