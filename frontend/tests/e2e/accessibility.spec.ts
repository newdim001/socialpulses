import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';
import AxeBuilder from '@axe-core/playwright';
import * as fs from 'fs';
import * as path from 'path';

const BASE_URL = 'https://app.socialpulses.io';

// Load test credentials
const authData = JSON.parse(
  fs.readFileSync(path.resolve('tests/fixtures/auth.json'), 'utf-8')
);

const REPORT_DIR = 'tests/reports';

interface ViolationGroup {
  impact: string;
  count: number;
  violations: Array<{
    id: string;
    description: string;
    help: string;
    helpUrl: string;
    nodes: number;
    tags: string[];
    impact: string;
  }>;
}

interface AccessibilityReport {
  timestamp: string;
  url: string;
  totalViolations: number;
  summary: Record<string, number>;
  byImpact: ViolationGroup[];
  rawViolations: unknown[];
}

test.describe('Accessibility — axe-core scan', () => {
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
  });

  test('dashboard page has no critical accessibility violations', async ({ page }) => {
    // Log in as admin
    await loginPage.goto();
    await loginPage.login(authData.admin.username, authData.admin.password);

    // Wait for dashboard to fully load
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Run axe-core accessibility scan
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'])
      .analyze();

    // Organize violations by impact level
    const impactOrder = ['critical', 'serious', 'moderate', 'minor'];
    const byImpact: ViolationGroup[] = impactOrder.map((impact) => {
      const impactViolations = results.violations.filter(
        (v) => v.impact === impact
      );
      return {
        impact,
        count: impactViolations.length,
        violations: impactViolations.map((v) => ({
          id: v.id,
          description: v.description,
          help: v.help,
          helpUrl: v.helpUrl,
          nodes: v.nodes.length,
          tags: v.tags,
          impact: v.impact ?? 'unknown',
        })),
      };
    });

    // Build full report
    const report: AccessibilityReport = {
      timestamp: new Date().toISOString(),
      url: page.url(),
      totalViolations: results.violations.length,
      summary: Object.fromEntries(
        byImpact.map((g) => [g.impact, g.count])
      ),
      byImpact,
      rawViolations: results.violations,
    };

    // Ensure reports directory exists
    fs.mkdirSync(REPORT_DIR, { recursive: true });

    // Write report JSON
    fs.writeFileSync(
      path.join(REPORT_DIR, 'accessibility-violations.json'),
      JSON.stringify(report, null, 2)
    );

    // Log summary to console for CI visibility
    console.log('\n=== Accessibility Scan Results ===');
    console.log(`URL: ${report.url}`);
    console.log(`Total Violations: ${report.totalViolations}`);
    for (const group of byImpact) {
      if (group.count > 0) {
        console.log(`  ${group.impact}: ${group.count}`);
        for (const v of group.violations) {
          console.log(`    - ${v.id}: ${v.help} (${v.nodes} nodes)`);
        }
      }
    }
    console.log(`Report saved to: ${REPORT_DIR}/accessibility-violations.json\n`);

    // Assert: no critical or serious violations allowed
    const criticalOrSerious = results.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious'
    );
    expect(criticalOrSerious).toEqual([]);
  });
});
