import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 1,
  reporter: [
    ['html', { outputFolder: 'tests/reports/playwright-report' }],
    ['list'],
  ],

  // Store snapshots in tests/screenshots/baseline/
  snapshotPathTemplate:
    'tests/screenshots/baseline/{testFilePath}/{arg}{ext}',

  // Timeout per test
  timeout: 60_000,
  expect: {
    // Screenshot comparison threshold (0 = exact match, default = 0.2)
    toHaveScreenshot: { maxDiffPixels: 100, threshold: 0.2 },
    timeout: 15_000,
  },

  use: {
    baseURL: 'https://app.socialpulses.io',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
        deviceScaleFactor: 2,
      },
    },
  ],
});
