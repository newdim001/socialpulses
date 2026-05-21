import { test } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { LoginPage } from './pages/LoginPage';

const authData = JSON.parse(
  fs.readFileSync(path.resolve('tests/fixtures/auth.json'), 'utf-8')
);

const SCREENSHOT_DIR = 'tests/screenshots/full';

test.describe('Visual Review — Full Page Screenshots', () => {
  let loginPage: LoginPage;

  test.beforeAll(() => {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  });

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
  });

  test('login page', async ({ page }) => {
    await loginPage.goto();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/login-page.png`, fullPage: true });
  });

  test('dashboard after login', async ({ page }) => {
    await loginPage.goto();
    await loginPage.login(authData.admin.username, authData.admin.password);
    await page.waitForLoadState('networkidle');
    await page.waitForURL(/^(?!.*\/login)/, { timeout: 20000 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/dashboard.png`, fullPage: true });
  });

  test('compose page', async ({ page }) => {
    await loginPage.goto();
    await loginPage.login(authData.admin.username, authData.admin.password);
    await page.waitForLoadState('networkidle');
    await page.waitForURL(/^(?!.*\/login)/, { timeout: 20000 });
    await page.goto('/compose');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/compose.png`, fullPage: true });
  });

  test('history page', async ({ page }) => {
    await loginPage.goto();
    await loginPage.login(authData.admin.username, authData.admin.password);
    await page.waitForLoadState('networkidle');
    await page.waitForURL(/^(?!.*\/login)/, { timeout: 20000 });
    await page.goto('/history');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/history.png`, fullPage: true });
  });

  test('settings page', async ({ page }) => {
    await loginPage.goto();
    await loginPage.login(authData.admin.username, authData.admin.password);
    await page.waitForLoadState('networkidle');
    await page.waitForURL(/^(?!.*\/login)/, { timeout: 20000 });
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/settings.png`, fullPage: true });
  });

  test('analytics page', async ({ page }) => {
    await loginPage.goto();
    await loginPage.login(authData.admin.username, authData.admin.password);
    await page.waitForLoadState('networkidle');
    await page.waitForURL(/^(?!.*\/login)/, { timeout: 20000 });
    await page.goto('/analytics');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/analytics.png`, fullPage: true });
  });

  // --- Onboarding wizard screenshots (fresh user) ---
  test('onboarding step 1 - welcome', async ({ page }) => {
    // Sign up a fresh user
    await page.goto('/signup', { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    await page.fill('input[placeholder="John Doe"]', 'Review User');
    await page.fill('input[placeholder="john@example.com"]', `review${Date.now()}@test.com`);
    await page.fill('input[placeholder="Create a strong password"]', 'TestPass123!');
    // Confirm password - need to fill the confirm password field
    const confirmInputs = page.locator('input[placeholder="Confirm your password"]');
    if (await confirmInputs.count() > 0) {
      await confirmInputs.fill('TestPass123!');
    }
    await page.click('button:has-text("Create account")');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/onboarding-welcome.png`, fullPage: true });
  });

  test('onboarding step 2 - role', async ({ page }) => {
    await page.goto('/signup', { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    await page.fill('input[placeholder="John Doe"]', 'Review User');
    const ts = Date.now().toString();
    await page.fill('input[placeholder="john@example.com"]', `review${ts}@test.com`);
    await page.fill('input[placeholder="Create a strong password"]', 'TestPass123!');
    const confirmInputs = page.locator('input[placeholder="Confirm your password"]');
    if (await confirmInputs.count() > 0) {
      await confirmInputs.fill('TestPass123!');
    }
    await page.click('button:has-text("Create account")');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    await page.click('button:has-text("Next")');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/onboarding-role.png`, fullPage: true });
  });
});
