import { test, expect } from '@playwright/test';

test.describe('Symptom Checker Flow', () => {
  test('should analyze symptoms and show emergency warning for chest pain', async ({ page }) => {
    // 1. Navigate to dashboard (Mock login or bypass if possible in test env)
    await page.goto('/dashboard/symptoms');

    // 2. Fill in symptoms
    await page.fill('input[placeholder*="headache"]', 'Chest pain and difficulty breathing');
    await page.selectOption('select', { label: 'hour' });
    await page.fill('input[type="number"]', '1');
    
    // 3. Set high severity
    const slider = await page.locator('input[type="range"]');
    await slider.fill('10');

    // 4. Submit
    await page.click('button:has-text("Analyze")');

    // 5. Verify emergency status
    await expect(page.locator('text=EMERGENCY')).toBeVisible();
    await expect(page.locator('text=Acute Medical Emergency')).toBeVisible();
    await expect(page.locator('text=Go to the nearest emergency department')).toBeVisible();
  });

  test('should show moderate results for non-emergency symptoms', async ({ page }) => {
    await page.goto('/dashboard/symptoms');
    await page.fill('input[placeholder*="headache"]', 'Fever and body aches');
    await page.selectOption('select', { label: 'day' });
    await page.fill('input[type="number"]', '3');
    await page.click('button:has-text("Analyze")');

    // Wait for analysis (simulated or real)
    await expect(page.locator('text=Analysis Results')).toBeVisible({ timeout: 20000 });
    // Potential results include Malaria or Flu
    const malaria = page.locator('text=Malaria');
    const flu = page.locator('text=Flu');
    await expect(malaria.or(flu)).toBeVisible();
  });
});
