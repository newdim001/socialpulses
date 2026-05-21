#!/usr/bin/env node

/**
 * Supply Chain Safety Check — SocialPulses
 * 
 * Runs before every `npm run build` and on `npm install`.
 * Checks for known compromised packages, suspicious payload files,
 * and configuration integrity.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const NM = path.join(ROOT, "node_modules");
const PKG_JSON = path.join(ROOT, "package.json");

// ─── Known compromised packages from Mini Shai-Hulud (May 2026) ───
// Main attack: Antv ecosystem (254 packages) + standalone packages
const COMPROMISED = new Set([
  "echarts-for-react", "timeago.js", "timeago-react", "size-sensor",
  "jest-canvas-mock", "jest-date-mock", "lint-md", "canvas-nest.js",
  "boring-avatars", "boring-avatars-vanilla", "mcp-echarts",
  "mcp-mermaid", "react-adsense", "tribbon.js", "xmorse",
]);

const COMPROMISED_SCOPES = new Set(["@antv"]);

// Known large legitimate files (bundles that are expected to be >400KB)
const KNOWN_LARGE_LEGIT = [
  "playwright-core", "quickjs-emscripten", "babelBundle", "coreBundle",
  "utilsBundle", "vite/", "react-dom/", "typescript/", "axe-core/",
  "lighthouse/", "jsdom/", "puppeteer-core/", "framer-motion/",
  "lucide-react/", "recharts/", "eslint-plugin-react-hooks/",
  "hermes-parser/", "chromium-bidi/", "date-fns/locale/cdn",
  "opentelemetry/semantic-conventions", "playwright/lib/matchers/expect.js",
  "pngjs/browser.js",
];

// Suspicious patterns in JS files (Mini Shai-Hulud payload indicators)
const SUSPICIOUS_PATTERNS = [
  "/proc/", "t.m-kosche.com", "firedalazer",
  "@antv/setup", "kitty-monitor", "__DAEMONIZED",
];

let errors = 0;
let scannedFiles = 0;

function fail(msg) {
  console.error("  ❌", msg);
  errors++;
}

function log(msg) {
  console.log("  ✅", msg);
}

// ─── Check for compromised packages ───
function checkCompromisedPackages() {
  if (!fs.existsSync(NM)) {
    log("No node_modules yet");
    return;
  }

  const topLevel = fs.readdirSync(NM);
  for (const pkg of topLevel) {
    if (pkg.startsWith("@")) {
      const scopeDir = path.join(NM, pkg);
      if (!fs.statSync(scopeDir).isDirectory()) continue;
      
      if (COMPROMISED_SCOPES.has(pkg)) {
        // Check if any @antv/* package is actually installed
        const packages = fs.readdirSync(scopeDir);
        for (const name of packages) {
          fail(`COMPROMISED PACKAGE: ${pkg}/${name} — ANTv namespace fully compromised`);
        }
      } else {
        const packages = fs.readdirSync(scopeDir);
        for (const name of packages) {
          if (COMPROMISED.has(`${pkg}/${name}`)) {
            fail(`COMPROMISED PACKAGE: ${pkg}/${name}`);
          }
        }
      }
    } else if (COMPROMISED.has(pkg)) {
      fail(`COMPROMISED PACKAGE: ${pkg}`);
    }
  }
}

// ─── Check for malicious payload files ───
function checkMaliciousPayloads() {
  if (!fs.existsSync(NM)) return;

  // The Mini Shai-Hulud payload is a 486-498KB obfuscated index.js
  // with specific content patterns. Walk node_modules for suspicious files.
  function walk(dir, depth = 0) {
    if (depth > 4 || !fs.existsSync(dir)) return;
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch { return; }

    for (const entry of entries) {
      if (entry.name === ".cache" || entry.name === "node_modules") continue;
      const full = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        walk(full, depth + 1);
      } else if (entry.name === "index.js") {
        // Malware always names the payload file index.js
        try {
          const stat = fs.statSync(full);
          const sizeKB = stat.size / 1024;

          // Malware is 486-498KB. Legitimate index.js files are usually <50KB.
          // But be careful: some legit packages have large index.js too.
          // Only flag if it's between 400-600KB AND contains suspicious patterns.
          if (sizeKB > 400 && sizeKB < 600) {
            const relative = path.relative(NM, full);
            // Check if this is in a known-legit location
            const isKnownLarge = KNOWN_LARGE_LEGIT.some(l => relative.includes(l));
            if (!isKnownLarge) {
              // Scan file for suspicious patterns
              try {
                const content = fs.readFileSync(full, "utf-8").toLowerCase();
                for (const pattern of SUSPICIOUS_PATTERNS) {
                  if (content.includes(pattern)) {
                    fail(`SUSPICIOUS PAYLOAD in ${relative} (${sizeKB.toFixed(0)}KB) — contains "${pattern}"`);
                    break;
                  }
                }
              } catch { /* binary file, skip */ }
            }
          }
          scannedFiles++;
        } catch { /* skip */ }
      }
    }
  }
  walk(NM);
}

// ─── Check for pinned versions ───
function checkPinnedVersions() {
  const pkg = JSON.parse(fs.readFileSync(PKG_JSON, "utf-8"));
  const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
  const bad = [];
  for (const [name, ver] of Object.entries(allDeps)) {
    if (/^[\^~><*x]/.test(ver) || ver.includes("x")) {
      bad.push(`${name}@${ver}`);
    }
  }
  if (bad.length > 0) {
    bad.forEach(b => fail(`Non-exact version: ${b}`));
  } else {
    log(`All ${Object.keys(allDeps).length} deps pinned exactly`);
  }
}

// ─── Check overrides ───
function checkOverrides() {
  const pkg = JSON.parse(fs.readFileSync(PKG_JSON, "utf-8"));
  const overrides = pkg.overrides || {};
  if (Object.keys(overrides).length > 0) {
    log(`${Object.keys(overrides).length} packages in overrides (blocked)`);
  } else {
    fail("No overrides defined");
  }
}

// ─── Main ───
console.log("=".repeat(56));
console.log("  🛡️  Supply Chain Safety");
console.log("=".repeat(56));

checkCompromisedPackages();
checkMaliciousPayloads();
checkPinnedVersions();
checkOverrides();

console.log(`\n📊 Scanned ${scannedFiles} index.js files`);
console.log("=".repeat(56));
if (errors > 0) {
  console.error(`  ❌ ${errors} error(s) — SECURITY BREACH DETECTED`);
  process.exit(1);
}
console.log("  ✅ All checks passed — environment is safe");
console.log("=".repeat(56));
