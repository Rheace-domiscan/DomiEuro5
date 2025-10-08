import { test, expect } from '@playwright/test';

const loginPathPattern = /\/auth\/login/;

test.describe('Protected routes', () => {
  test('dashboard requires authentication', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(loginPathPattern);
    await expect(page.getByRole('heading', { name: /Sign In/i })).toBeVisible();
  });

  test('settings billing requires authentication', async ({ page }) => {
    await page.goto('/settings/billing');
    await expect(page).toHaveURL(loginPathPattern);
  });

  test('settings team requires authentication', async ({ page }) => {
    await page.goto('/settings/team');
    await expect(page).toHaveURL(loginPathPattern);
  });
});
