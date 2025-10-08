import { test, expect } from '@playwright/test';

test.describe('Public surface smoke', () => {
  test('home page renders welcome copy', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Welcome');
    await expect(page.getByRole('link', { name: /Sign In with WorkOS/i })).toBeVisible();
  });

  test('pricing page renders tier cards', async ({ page }) => {
    await page.goto('/pricing');
    await expect(page).toHaveTitle(/Pricing/i);
    await expect(page.getByRole('heading', { name: /Pricing/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Starter/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Professional/i })).toBeVisible();
  });

  test('legal center navigation is accessible', async ({ page }) => {
    await page.goto('/legal');
    await expect(page.getByRole('heading', { name: 'Legal Center' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Terms of Service' })).toBeVisible();
  });
});
