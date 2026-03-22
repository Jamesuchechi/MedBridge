/**
 * Phase 2.6 — E2E Tests (Playwright)
 * ====================================
 * Setup:
 *   pnpm add -D @playwright/test --filter @medbridge/web
 *   npx playwright install --with-deps
 *
 * Run:
 *   pnpm --filter @medbridge/web test:e2e
 *   pnpm --filter @medbridge/web test:e2e --headed   # to watch
 *
 * Add to apps/web/package.json scripts:
 *   "test:e2e": "playwright test"
 *
 * Add apps/web/playwright.config.ts with baseURL: "http://localhost:3000"
 */

import { test, expect, Page } from "@playwright/test";

// ─── Helpers ──────────────────────────────────────────────────────────────────
async function loginAsPatient(page: Page) {
  await page.goto("/login");
  await page.fill('input[type="email"]',    process.env.TEST_USER_EMAIL    || "test@medbridge.health");
  await page.fill('input[type="password"]', process.env.TEST_USER_PASSWORD || "TestPassword123!");
  await page.click('button[type="submit"]');
  await page.waitForURL("/dashboard");
}

// ─── 1. Drug Search → Interaction → Detail → Save to Profile ─────────────────
test.describe("Drug Intelligence flow", () => {
  test.beforeEach(async ({ page }) => { await loginAsPatient(page); });

  test("search for a drug and view its detail page", async ({ page }) => {
    await page.goto("/dashboard/drugs");

    // Search for paracetamol
    await page.fill('.di-search-input', "paracetamol");
    await page.waitForSelector('.di-drug-card', { timeout: 10000 });

    const cards = await page.locator('.di-drug-card').all();
    expect(cards.length).toBeGreaterThan(0);

    // Click first result
    await cards[0].click();

    // Should show detail view
    await expect(page.locator('.di-detail-name')).toBeVisible();
    await expect(page.locator('.di-detail-card-title').first()).toBeVisible();
  });

  test("drug interaction checker flags dangerous combinations", async ({ page }) => {
    await page.goto("/dashboard/drugs");

    // Switch to interaction checker tab
    await page.click('button.di-tab:has-text("Interaction")');

    // Add warfarin
    await page.click('.di-drug-tags');
    await page.fill('.di-drug-tag-input', "Warfarin");
    await page.keyboard.press("Enter");

    // Add aspirin
    await page.fill('.di-drug-tag-input', "Aspirin");
    await page.keyboard.press("Enter");

    // Run check
    await page.click('.di-check-btn');
    await page.waitForSelector('.di-severity-banner', { timeout: 15000 });

    // Should show at least moderate severity for Warfarin + Aspirin
    const banner = page.locator('.di-severity-banner');
    await expect(banner).toBeVisible();

    const bannerText = await banner.textContent();
    expect(["moderate", "severe", "contraindicated"].some((s) => bannerText?.toLowerCase().includes(s))).toBe(true);
  });

  test("drug interaction check shows disclaimer", async ({ page }) => {
    await page.goto("/dashboard/drugs");
    await page.click('button.di-tab:has-text("Interaction")');
    await page.click('.di-drug-tags');
    await page.fill('.di-drug-tag-input', "Metformin");
    await page.keyboard.press("Enter");
    await page.fill('.di-drug-tag-input', "Alcohol");
    await page.keyboard.press("Enter");
    await page.click('.di-check-btn');
    await page.waitForSelector('.di-disclaimer-box', { timeout: 15000 });
    await expect(page.locator('.di-disclaimer-box')).toContainText("informational purposes");
  });

  test("AI drug explanation modal opens and closes", async ({ page }) => {
    await page.goto("/dashboard/drugs");
    await page.fill('.di-search-input', "metformin");
    await page.waitForSelector('.di-drug-card', { timeout: 10000 });
    await page.locator('.di-drug-card').first().click();

    // Click "Ask AI" button in detail view
    await page.click('button:has-text("Ask AI")');
    await expect(page.locator('.di-modal')).toBeVisible();

    // Close it
    await page.click('.di-modal-close');
    await expect(page.locator('.di-modal')).not.toBeVisible();
  });
});

// ─── 2. Health Profile → Symptom Check (profile used in AI call) ──────────────
test.describe("Health profile enrichment in symptom checker", () => {
  test.beforeEach(async ({ page }) => { await loginAsPatient(page); });

  test("complete profile step 1 and 2 successfully", async ({ page }) => {
    await page.goto("/dashboard/profile");

    // Step 1 — personal
    await page.fill('input[placeholder="Emeka"]', "Test");
    await page.fill('input[placeholder="Okonkwo"]', "User");
    // Sex selection
    await page.click('.hp-sex-btn:has-text("male")');
    await page.click('button:has-text("Continue")');

    // Step 2 — clinical
    await expect(page.locator('text=Clinical data')).toBeVisible();
    // Select blood type A+
    await page.click('.hp-pill-opt:has-text("A+")');
    // Select genotype AS
    await page.click('.hp-pill-opt:has-text("AS")');
    await page.click('button:has-text("Continue")');

    // Should now be on step 3
    await expect(page.locator('text=Conditions')).toBeVisible({ timeout: 5000 });
  });

  test("symptom checker shows results with urgency score", async ({ page }) => {
    await page.goto("/dashboard/symptoms");

    // Add fever symptom
    await page.fill('.sc-tag-text-input', "Fever");
    await page.keyboard.press("Enter");

    // Add headache
    await page.fill('.sc-tag-text-input', "Headache");
    await page.keyboard.press("Enter");

    // Toggle fever context
    await page.click('.sc-toggle-btn:has-text("Fever")');

    // Submit
    await page.click('.sc-submit');

    // Wait for results (AI may take a moment)
    await page.waitForSelector('.sc-urgency-banner', { timeout: 30000 });

    // Results should include conditions list
    await expect(page.locator('.sc-condition-item').first()).toBeVisible();

    // AfriDx insight should be present
    await expect(page.locator('.sc-afridx-box')).toBeVisible();

    // Disclaimer always present
    await expect(page.locator('.sc-disclaimer')).toBeVisible();
  });

  test("emergency symptoms trigger emergency overlay", async ({ page }) => {
    await page.goto("/dashboard/symptoms");

    await page.fill('.sc-tag-text-input', "chest pain");
    await page.keyboard.press("Enter");
    await page.click('.sc-submit');

    // Emergency overlay should appear
    await page.waitForSelector('.sc-emergency', { timeout: 5000 });
    await expect(page.locator('.sc-emergency')).toBeVisible();
    await expect(page.locator('a:has-text("Call 112")')).toBeVisible();
  });

  test("symptom history is saved and accessible", async ({ page }) => {
    // First run a check
    await page.goto("/dashboard/symptoms");
    await page.fill('.sc-tag-text-input', "Cough");
    await page.keyboard.press("Enter");
    await page.click('.sc-submit');
    await page.waitForSelector('.sc-urgency-banner', { timeout: 30000 });

    // Switch to history tab
    await page.click('button.sc-tab:has-text("History")');
    await page.waitForSelector('.sc-history-item', { timeout: 5000 });

    const histItems = await page.locator('.sc-history-item').all();
    expect(histItems.length).toBeGreaterThan(0);
  });

  test("symptom check uses health profile (genotype) to influence results", async ({ page }) => {
    // 1. Go to profile and set genotype to SS
    await page.goto("/dashboard/profile");
    
    // Ensure we are on Step 2 (Clinical) where genotype is
    // If not there, navigate through step 1
    const stepTitle = await page.locator('.hp-step-title').textContent();
    if (stepTitle?.includes("Personal")) {
      await page.fill('input[placeholder="Emeka"]', "Test");
      await page.fill('input[placeholder="Okonkwo"]', "User");
      await page.click('.hp-sex-btn:has-text("male")');
      await page.click('button:has-text("Continue")');
    }
    
    await expect(page.locator('text=Clinical data')).toBeVisible();
    // Select Blood Type (A+) and Genotype (SS)
    await page.click('.hp-pill-opt:has-text("A+")');
    await page.click('.hp-pill-opt:has-text("SS")');
    await page.click('button:has-text("Continue")');
    
    // 2. Go to symptom checker
    await page.goto("/dashboard/symptoms");
    
    // Input symptoms that trigger sickle cell crisis weighting (Joint pain, Bone pain)
    await page.fill('.sc-tag-text-input', "Joint pain");
    await page.keyboard.press("Enter");
    await page.fill('.sc-tag-text-input', "Bone pain");
    await page.keyboard.press("Enter");
    
    await page.click('.sc-submit');
    
    // 3. Verify results
    await page.waitForSelector('.sc-urgency-banner', { timeout: 30000 });
    
    // "Sickle Cell Crisis" should be a top condition due to SS genotype + matching symptoms
    const topCondition = await page.locator('.sc-condition-name').first().textContent();
    expect(topCondition?.toLowerCase()).toContain("sickle cell");
    
    // Look for AfriDx highlight badge/text in the condition item
    const conditionItem = page.locator('.sc-condition-item').first();
    await expect(conditionItem.locator('.sc-afridx-indicator')).toBeVisible();
  });
});

// ─── 3. CommunityRx — Pharmacy search & reporting ─────────────────────────────
test.describe("CommunityRx pharmacy locator", () => {
  test.beforeEach(async ({ page }) => { await loginAsPatient(page); });

  test("pharmacy search returns results for Lagos", async ({ page }) => {
    await page.goto("/dashboard/drugs/pharmacies");

    await page.fill('.crx-input', "Lagos Ikeja");
    // Wait for results (OSM API call)
    await page.waitForSelector('.crx-card', { timeout: 20000 });

    const cards = await page.locator('.crx-card').all();
    expect(cards.length).toBeGreaterThan(0);
  });

  test("clicking a pharmacy opens its detail view", async ({ page }) => {
    await page.goto("/dashboard/drugs/pharmacies");
    await page.fill('.crx-input', "pharmacy Abuja");
    await page.waitForSelector('.crx-card', { timeout: 20000 });

    await page.locator('.crx-card').first().click();
    await expect(page.locator('.crx-detail')).toBeVisible();
    await expect(page.locator('.crx-dn')).toBeVisible();
  });

  test("report availability modal opens and accepts input", async ({ page }) => {
    await page.goto("/dashboard/drugs/pharmacies");
    await page.fill('.crx-input', "pharmacy Lagos");
    await page.waitForSelector('.crx-card', { timeout: 20000 });
    await page.locator('.crx-card').first().click();
    await page.waitForSelector('.crx-detail');

    await page.click('button:has-text("Report Stock")');
    await expect(page.locator('.crx-modal')).toBeVisible();

    await page.fill('input[placeholder*="Paracetamol"]', "Amoxicillin");
    await page.click('.crx-toggle:has-text("In Stock")');

    await expect(page.locator('.crx-submit:not(:disabled)')).toBeVisible();
  });

  test("report price modal validates required fields", async ({ page }) => {
    await page.goto("/dashboard/drugs/pharmacies");
    await page.fill('.crx-input', "pharmacy Kano");
    await page.waitForSelector('.crx-card', { timeout: 20000 });
    await page.locator('.crx-card').first().click();
    await page.waitForSelector('.crx-detail');

    await page.click('button:has-text("Report Price")');
    await expect(page.locator('.crx-modal')).toBeVisible();

    // Submit button should be disabled without drug name + price
    await expect(page.locator('.crx-submit:disabled')).toBeVisible();

    // Fill in drug name but not price — still disabled
    await page.fill('input[placeholder*="Paracetamol"]', "Ibuprofen");
    await expect(page.locator('.crx-submit:disabled')).toBeVisible();

    // Fill price — now enabled
    await page.fill('input[type="number"]', "1200");
    await expect(page.locator('.crx-submit:not(:disabled)')).toBeVisible();
  });

  test("back button returns to pharmacy list", async ({ page }) => {
    await page.goto("/dashboard/drugs/pharmacies");
    await page.fill('.crx-input', "pharmacy Ibadan");
    await page.waitForSelector('.crx-card', { timeout: 20000 });
    await page.locator('.crx-card').first().click();
    await page.waitForSelector('.crx-detail');

    await page.click('.crx-back');
    await expect(page.locator('.crx-grid')).toBeVisible();
  });
});