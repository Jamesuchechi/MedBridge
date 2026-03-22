import { test, expect } from '@playwright/test';

test.describe('Drug Intelligence Flow', () => {
  test('should search for a drug and show details', async ({ page }) => {
    await page.goto('/dashboard/drugs');
    
    // 1. Search for Paracetamol
    await page.fill('input[placeholder*="search"]', 'Paracetamol');
    await page.press('input[placeholder*="search"]', 'Enter');

    // 2. Click on the first result
    const firstResult = page.locator('div:has-text("Paracetamol")').first();
    await expect(firstResult).toBeVisible();
    await firstResult.click();

    // 3. Verify details are shown
    await expect(page.locator('h1:has-text("Paracetamol")')).toBeVisible();
    await expect(page.locator('text=NAFDAC')).toBeVisible();
  });

  test('should check drug interactions', async ({ page }) => {
    await page.goto('/dashboard/drugs');
    
    // 1. Open interaction checker if it's a separate tab or modal
    await page.click('button:has-text("Interaction Check")');

    // 2. Add two drugs (Mocked or real search)
    await page.fill('input[placeholder*="Add drug"]', 'Aspirin');
    await page.click('button:has-text("Add")');
    
    await page.fill('input[placeholder*="Add drug"]', 'Warfarin');
    await page.click('button:has-text("Add")');

    // 3. Trigger check
    await page.click('button:has-text("Check Interactions")');

    // 4. Verify warning
    await expect(page.locator('text=INTERACTION DETECTED')).toBeVisible();
    await expect(page.locator('text=high risk')).toBeVisible();
  });
});
