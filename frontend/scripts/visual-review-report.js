#!/usr/bin/env node
/**
 * Visual Review Report Generator
 * Open-source alternative to Percy — generates HTML report with before/after diffs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createCanvas, loadImage } from 'canvas'; // will npm install canvas if available

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');
const BASELINE_DIR = path.join(PROJECT_ROOT, 'tests/screenshots/baseline');
const CURRENT_DIR = path.join(PROJECT_ROOT, 'tests/screenshots/current');
const DIFF_DIR = path.join(PROJECT_ROOT, 'tests/screenshots/diffs');
const REPORT_DIR = path.join(PROJECT_ROOT, 'tests/reports');

const NAV_ITEMS = [
  { name: 'Login Page', test: 'login-page.png', path: '/login' },
  { name: 'Dashboard', test: 'dashboard.png', path: '/dashboard' },
  { name: 'Compose', test: 'compose.png', path: '/compose' },
  { name: 'History', test: 'history.png', path: '/history' },
  { name: 'Settings', test: 'settings.png', path: '/settings' },
  { name: 'Analytics', test: 'analytics.png', path: '/analytics' },
];

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function computeDiff(baselinePath, currentPath, diffPath) {
  if (!fs.existsSync(baselinePath)) return { status: 'no-baseline' };
  if (!fs.existsSync(currentPath)) return { status: 'no-current' };

  // Read both images
  const baseline = fs.readFileSync(baselinePath);
  const current = fs.readFileSync(currentPath);

  // If files are identical, no diff
  if (baseline.equals(current)) {
    return { status: 'identical' };
  }

  // Use pixelmatch via a simple Node script
  // For now, just copy current as diff for visual review
  fs.copyFileSync(currentPath, diffPath);
  return { status: 'changed' };
}

function generateReport() {
  ensureDir(DIFF_DIR);
  ensureDir(REPORT_DIR);

  const results = NAV_ITEMS.map(item => {
    const baselinePath = path.join(BASELINE_DIR, 'visual-regression.spec.ts', item.test);
    const currentPath = path.join(CURRENT_DIR, item.test);
    const diffPath = path.join(DIFF_DIR, item.test);

    const result = computeDiff(baselinePath, currentPath, diffPath);

    return {
      ...item,
      baselineExists: fs.existsSync(baselinePath),
      currentExists: fs.existsSync(currentPath),
      status: result.status,
      baselineUrl: fs.existsSync(baselinePath) ? `/baselines/${item.test}` : null,
      currentUrl: fs.existsSync(currentPath) ? `/currents/${item.test}` : null,
      diffUrl: result.status === 'changed' ? `/diffs/${item.test}` : null,
    };
  });

  const passCount = results.filter(r => r.status === 'identical').length;
  const failCount = results.filter(r => r.status === 'changed').length;
  const missingCount = results.filter(r => r.status === 'no-baseline' || r.status === 'no-current').length;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Visual Review Report</title>
  <style>
    :root {
      --bg: #0f0f13;
      --surface: #1a1a24;
      --border: #2a2a3a;
      --text: #e4e4ec;
      --text-dim: #8888a0;
      --accent: #8b5cf6;
      --green: #34d399;
      --red: #f87171;
      --amber: #fbbf24;
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Inter', sans-serif; background: var(--bg); color: var(--text); }
    .header { padding: 32px 40px; border-bottom: 1px solid var(--border); }
    .header h1 { font-size: 24px; }
    .header p { color: var(--text-dim); margin-top: 4px; font-size: 14px; }
    .stats { display: flex; gap: 16px; margin-top: 16px; }
    .stat { padding: 8px 16px; border-radius: 8px; font-size: 14px; font-weight: 600; }
    .stat.pass { background: rgba(52, 211, 153, 0.1); color: var(--green); border: 1px solid rgba(52, 211, 153, 0.2); }
    .stat.fail { background: rgba(248, 113, 113, 0.1); color: var(--red); border: 1px solid rgba(248, 113, 113, 0.2); }
    .stat.missing { background: rgba(251, 191, 36, 0.1); color: var(--amber); border: 1px solid rgba(251, 191, 36, 0.2); }
    .grid { display: grid; gap: 24px; padding: 32px 40px; }
    .card { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; overflow: hidden; }
    .card-header { padding: 16px 20px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border); }
    .card-header h2 { font-size: 16px; }
    .badge { padding: 4px 10px; border-radius: 12px; font-size: 12px; font-weight: 600; }
    .badge.identical { background: rgba(52, 211, 153, 0.15); color: var(--green); }
    .badge.changed { background: rgba(248, 113, 113, 0.15); color: var(--red); }
    .badge.pending { background: rgba(251, 191, 36, 0.15); color: var(--amber); }
    .card-body { padding: 16px 20px; }
    .screenshots { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 12px; }
    .screenshot { text-align: center; }
    .screenshot img { width: 100%; border-radius: 8px; border: 1px solid var(--border); }
    .screenshot label { display: block; font-size: 12px; color: var(--text-dim); margin-top: 4px; }
    .diff-overlay { position: relative; }
    @media (max-width: 768px) { .screenshots { grid-template-columns: 1fr; } }
  </style>
</head>
<body>
  <div class="header">
    <h1>🖼 Visual Review Report</h1>
    <p>Generated ${new Date().toLocaleString()}</p>
    <div class="stats">
      <div class="stat pass">✅ ${passCount} passed</div>
      <div class="stat fail">❌ ${failCount} changed</div>
      <div class="stat missing">⚠️ ${missingCount} missing baseline</div>
    </div>
  </div>
  <div class="grid">
    ${results.map(r => {
      const badgeClass = r.status === 'identical' ? 'identical' : r.status === 'changed' ? 'changed' : 'pending';
      const badgeText = r.status === 'identical' ? 'Identical' : r.status === 'changed' ? 'Changed' : 'No Baseline';
      const hasImages = r.currentUrl || r.baselineUrl;
      return `
      <div class="card">
        <div class="card-header">
          <h2>${r.name}</h2>
          <span class="badge ${badgeClass}">${badgeText}</span>
        </div>
        <div class="card-body">
          <div class="screenshots">
            ${r.baselineUrl ? `
            <div class="screenshot">
              <img src="${r.baselineUrl}" alt="Baseline for ${r.name}" loading="lazy">
              <label>Baseline</label>
            </div>` : ''}
            ${r.currentUrl ? `
            <div class="screenshot">
              <img src="${r.currentUrl}" alt="Current for ${r.name}" loading="lazy">
              <label>Current</label>
            </div>` : ''}
            ${r.diffUrl ? `
            <div class="screenshot diff-overlay">
              <img src="${r.diffUrl}" alt="Diff for ${r.name}" loading="lazy" style="border-color: var(--red);">
              <label style="color: var(--red);">Diff ⚠️</label>
            </div>` : ''}
          </div>
        </div>
      </div>`}).join('\n    ')}
  </div>
</body>
</html>`;

  fs.writeFileSync(path.join(REPORT_DIR, 'visual-review.html'), html);
  fs.writeFileSync(path.join(REPORT_DIR, 'visual-review-results.json'), JSON.stringify(results, null, 2));

  console.log(`\n📊 Visual Review Report: tests/reports/visual-review.html`);
  console.log(`   Passed: ${passCount} | Changed: ${failCount} | Missing: ${missingCount}`);
}

// Also generate a diff image using pixelmatch if images differ
async function computeDiffImage(baselinePath, currentPath, diffPath) {
  try {
    const { createCanvas, loadImage } = await import('canvas');
    const pixelmatch = (await import('pixelmatch')).default;

    const img1 = await loadImage(baselinePath);
    const img2 = await loadImage(currentPath);
    const { width, height } = img1;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    ctx.drawImage(img1, 0, 0);
    const data1 = ctx.getImageData(0, 0, width, height);
    ctx.drawImage(img2, 0, 0);
    const data2 = ctx.getImageData(0, 0, width, height);

    const diffData = ctx.createImageData(width, height);
    const diffPixels = pixelmatch(data1.data, data2.data, diffData.data, width, height, { threshold: 0.1 });

    ctx.putImageData(diffData, 0, 0);
    const buf = canvas.toBuffer('image/png');
    fs.writeFileSync(diffPath, buf);

    return diffPixels;
  } catch (e) {
    console.warn(`  ⚠️ pixelmatch diff not available: ${e.message}. Copying current as diff.`);
    if (fs.existsSync(currentPath)) {
      fs.copyFileSync(currentPath, diffPath);
    }
    return -1;
  }
}

// Main
ensureDir(CURRENT_DIR);
ensureDir(DIFF_DIR);

// Copy current screenshots from Playwright test-results if available
const testResultsDir = path.join(PROJECT_ROOT, 'test-results');
if (fs.existsSync(testResultsDir)) {
  function findScreenshots(dir, depth = 0) {
    if (depth > 5) return [];
    const results = [];
    try {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          results.push(...findScreenshots(full, depth + 1));
        } else if (entry.name.endsWith('-actual.png') || entry.name.endsWith('-expected.png') || entry.name.endsWith('-diff.png')) {
          results.push(full);
        }
      }
    } catch {}
    return results;
  }

  // Also scan the visual-regression spec test-results subdir
  for (const entry of fs.readdirSync(testResultsDir, { withFileTypes: true })) {
    if (entry.isDirectory() && entry.name.includes('visual-regression')) {
      const specDir = path.join(testResultsDir, entry.name);
      for (const testDir of fs.readdirSync(specDir, { withFileTypes: true })) {
        if (testDir.isDirectory()) {
          const testDirPath = path.join(specDir, testDir.name);
          for (const file of fs.readdirSync(testDirPath)) {
            const src = path.join(testDirPath, file);
            const dest = path.join(CURRENT_DIR, file);
            if (file.endsWith('-actual.png') || file.endsWith('.png')) {
              fs.copyFileSync(src, dest);
            }
          }
        }
      }
    }
  }
}

generateReport();
