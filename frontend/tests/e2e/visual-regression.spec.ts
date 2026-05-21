import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { LoginPage } from './pages/LoginPage';

// Load test credentials
const authData = JSON.parse(
  fs.readFileSync(path.resolve('tests/fixtures/auth.json'), 'utf-8')
);

// Screenshot directories
const BASELINE_DIR = 'tests/screenshots/baseline';
const FAILURES_DIR = 'tests/screenshots/failures';

test.describe('Visual Regression Tests', () => {
  let loginPage: LoginPage;

  test.beforeAll(() => {
    // Ensure screenshot directories exist
    for (const dir of [BASELINE_DIR, FAILURES_DIR]) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }
  });

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
  });

  test('login page screenshot', async ({ page }, testInfo) => {
    // Navigate to login page
    await loginPage.goto();
    await page.waitForLoadState('networkidle');

    // Wait for the login form to be fully rendered
    await expect(loginPage.signInButton).toBeVisible({ timeout: 15000 });

    // Compare against baseline screenshot
    // First run creates the baseline; subsequent runs compare
    await expect(page).toHaveScreenshot('login-page.png', {
      fullPage: true,
      mask: [page.locator('input[type="password"]')], // mask password field value
    });
  });

  test('dashboard after login screenshot', async ({ page }, testInfo) => {
    // Navigate to login and perform login
    await loginPage.goto();
    await page.waitForLoadState('networkidle');
    await expect(loginPage.signInButton).toBeVisible({ timeout: 15000 });

    await loginPage.login(authData.test_user.username, authData.test_user.password);
    await page.waitForLoadState('networkidle');

    // Wait for dashboard to be visible — look for key dashboard elements
    // The dashboard should load after redirect from /login
    await page.waitForURL(/^(?!.*\/login)/, { timeout: 20000 });

    // Give the dashboard time to fully render (charts, widgets, etc.)
    await page.waitForTimeout(2000);

    // Take full-page screenshot for visual comparison
    await expect(page).toHaveScreenshot('dashboard.png', {
      fullPage: true,
    });
  });
});
