import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';
import * as fs from 'fs';
import * as path from 'path';

const BASE_URL = 'https://app.socialpulses.io';

// Load test credentials
const authData = JSON.parse(
  fs.readFileSync(path.resolve('tests/fixtures/auth.json'), 'utf-8')
);

interface ApiResponse<T = unknown> {
  ok: boolean;
  status: number;
  body: T;
}

test.describe('API Endpoint Tests', () => {
  let loginPage: LoginPage;
  let authToken: string;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    // Log in to get auth token using the test user
    await loginPage.goto();
    await loginPage.login(authData.test_user.username, authData.test_user.password);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    // Extract auth token from localStorage (stored as "sp-token" by the app)
    authToken =
      (await page.evaluate(() => localStorage.getItem('sp-token') ?? null)) ??
      '';

    if (!authToken) {
      console.warn('WARN: No auth token found — API tests may fail with 401');
    } else {
      console.log(`Auth token extracted (${authToken.substring(0, 20)}...)`);
    }
  });

  /** Helper: make an authenticated API request via page.fetch */
  async function apiRequest<T>(
    page: import('@playwright/test').Page,
    path: string
  ): Promise<ApiResponse<T>> {
    const response = await page.request.get(`${BASE_URL}${path}`, {
      headers: authToken
        ? { Authorization: `Bearer ${authToken}` }
        : undefined,
    });
    const body = (await response.json()) as T;
    return {
      ok: response.ok(),
      status: response.status(),
      body,
    };
  }

  test.describe('GET /api/auth/check', () => {
    test('returns 200 with user data for authenticated user', async ({ page }) => {
      const res = await apiRequest<Record<string, unknown>>(
        page,
        '/api/auth/check'
      );

      // Log for debugging
      console.log(`/api/auth/check → ${res.status}`, JSON.stringify(res.body).substring(0, 200));

      // Assert status
      expect(res.status).toBe(200);
      expect(res.ok).toBe(true);

      // Assert response shape — should have user-related fields
      expect(res.body).toBeDefined();
      expect(typeof res.body).toBe('object');

      // Common user data fields
      const body = res.body;
      const hasUserField =
        'user' in body ||
        'id' in body ||
        'username' in body ||
        'email' in body ||
        'authenticated' in body;
      expect(hasUserField).toBe(true);
    });
  });

  test.describe('GET /api/platforms', () => {
    test('returns 200 with platform list', async ({ page }) => {
      const res = await apiRequest<Record<string, unknown>>(
        page,
        '/api/platforms'
      );

      // Log for debugging
      console.log(`/api/platforms → ${res.status}`, JSON.stringify(res.body).substring(0, 300));

      // Assert status
      expect(res.status).toBe(200);
      expect(res.ok).toBe(true);

      // Assert response shape — should contain platform data
      expect(res.body).toBeDefined();
      expect(typeof res.body).toBe('object');

      const body = res.body;

      // Platform data might be an array or object with a platforms key
      const hasPlatformData =
        Array.isArray(body)
          ? body.length > 0
          : 'platforms' in body ||
            'data' in body ||
            'items' in body ||
            Object.keys(body).length > 0;

      expect(hasPlatformData).toBe(true);
    });
  });
});
