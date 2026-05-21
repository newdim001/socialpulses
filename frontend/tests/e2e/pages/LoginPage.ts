import { type Page, type Locator } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly usernameInput: Locator;
  readonly passwordInput: Locator;
  readonly signInButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.usernameInput = page.locator('input[placeholder="Enter your username"]');
    this.passwordInput = page.locator('input[placeholder="Enter your password"]');
    this.signInButton = page.locator('button:has-text("Sign in")');
  }

  async goto(path = '/login') {
    await this.page.goto(path, { waitUntil: 'networkidle' });
  }

  async login(username: string, password: string) {
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    await this.signInButton.click();
    await this.page.waitForURL(/^(?!.*\/login)/, { timeout: 15000 });
  }

  /** Extract the auth token from localStorage after login */
  async getAuthToken(): Promise<string | null> {
    return this.page.evaluate(() => localStorage.getItem('sp-token') ?? null);
  }
}
