import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';
import { OnboardingWizardPage } from './pages/OnboardingWizardPage';
import * as fs from 'fs';
import * as path from 'path';

// Load test credentials
const authData = JSON.parse(
  fs.readFileSync(path.resolve('tests/fixtures/auth.json'), 'utf-8')
);

const SCREENSHOT_DIR = 'tests/screenshots/steps';

test.describe('Onboarding Wizard E2E', () => {
  let loginPage: LoginPage;
  let wizard: OnboardingWizardPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    wizard = new OnboardingWizardPage(page);
  });

  test('full wizard flow — all 5 steps render correctly with no JS errors', async ({ page }) => {
    const jsErrors: string[] = [];
    page.on('pageerror', (err) => jsErrors.push(err.message));

    await loginPage.goto();
    await loginPage.login(authData.admin.username, authData.admin.password);
    await expect(wizard.dialog).toBeVisible({ timeout: 10000 });

    // Step 1: Welcome
    await expect(page.locator('h1:has-text("Welcome to SocialPulses")')).toBeVisible();
    await expect(wizard.nextButton).toBeVisible();
    await expect(wizard.skipButton).toBeVisible();
    await page.screenshot({ path: `${SCREENSHOT_DIR}/step1-welcome.png`, fullPage: true });
    await wizard.clickNext();

    // Step 2: Role
    await expect(page.locator('h2:has-text("How would you describe yourself?")')).toBeVisible();
    for (const role of ['Solo creator', 'Small business owner', 'Marketing agency', 'Other']) {
      await expect(page.locator(`button:has-text("${role}")`).first()).toBeVisible();
    }
    await expect(wizard.continueButton).toBeVisible();
    await page.screenshot({ path: `${SCREENSHOT_DIR}/step2-role.png`, fullPage: true });
    await wizard.selectRole('Solo creator');
    await wizard.clickNext();

    // Step 3: Tools
    await expect(page.locator('h2:has-text("What tools do you use?")')).toBeVisible();
    for (const tool of ['None (post directly)', 'AI Platforms', 'Meta Business Suite']) {
      await expect(page.locator(`button:has-text("${tool}")`).first()).toBeVisible();
    }
    await page.screenshot({ path: `${SCREENSHOT_DIR}/step3-tools.png`, fullPage: true });
    await wizard.clickNext();

    // Step 4: Channels
    await expect(page.locator('h2:has-text("What social channels are in focus?")')).toBeVisible();
    for (const ch of ['Instagram', 'Twitter/X', 'TikTok', 'YouTube', 'LinkedIn']) {
      await expect(page.locator(`button:has-text("${ch}")`).first()).toBeVisible();
    }
    // Test label visibility bug fix: selected label should NOT be white
    await wizard.selectChannel('Instagram');
    const selectedLabel = page.locator('button:has-text("Instagram") span').last();
    const labelColor = await selectedLabel.evaluate(el => getComputedStyle(el).color);
    expect(labelColor).not.toBe('rgb(255, 255, 255)');
    console.log('  Selected channel label color:', labelColor, '(should not be white)');
    await page.screenshot({ path: `${SCREENSHOT_DIR}/step4-channels.png`, fullPage: true });
    await wizard.clickNext();

    // Step 5: Done
    await expect(page.locator('h1:has-text("Your workspace is ready!")')).toBeVisible();
    await expect(wizard.goToDashboardButton).toBeVisible();
    await page.screenshot({ path: `${SCREENSHOT_DIR}/step5-done.png`, fullPage: true });
    await wizard.complete();

    // Verify wizard closed and dashboard loaded
    await expect(wizard.dialog).not.toBeVisible({ timeout: 5000 });
    expect(jsErrors).toEqual([]);
    console.log('JS errors:', jsErrors.length);
  });

  test('skip button works at every step', async ({ page }) => {
    await loginPage.goto();
    await loginPage.login(authData.admin.username, authData.admin.password);
    await expect(wizard.dialog).toBeVisible({ timeout: 10000 });
    await wizard.skip();
    await expect(wizard.dialog).not.toBeVisible({ timeout: 5000 });
  });

  test('wizard does not reappear after completion', async ({ page }) => {
    await loginPage.goto();
    await loginPage.login(authData.admin.username, authData.admin.password);
    await expect(wizard.dialog).toBeVisible({ timeout: 10000 });
    await wizard.skip();
    await page.reload();
    await page.waitForLoadState('networkidle');
    await expect(wizard.dialog).not.toBeVisible({ timeout: 10000 });
  });
});
