#!/usr/bin/env node
const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");

const SCR = path.join(__dirname, "..", "screenshots", "steps");
const FAIL = path.join(__dirname, "..", "screenshots", "failures");
fs.mkdirSync(SCR, { recursive: true });
fs.mkdirSync(FAIL, { recursive: true });
const CREDS = { username: "admin", password: "Admin@2026!" };
const BASE = "https://app.socialpulses.io";
let pass = 0, fail = 0;

async function step(name, fn) {
  try { await fn(); console.log("  \u2713 " + name); pass++; }
  catch (e) { console.log("  \u2717 " + name + ": " + e.message); fail++; }
}

(async () => {
  console.log("\n=== SocialPulses Onboarding Wizard E2E ===\n");
  const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", e => errors.push(e.message));

  try {
    // Login
    await step("Navigate to login", async () => {
      await page.goto(BASE + "/login", { waitUntil: "networkidle" });
    });
    await step("Login as admin", async () => {
      await page.fill("input[placeholder=\"Enter your username\"]", CREDS.username);
      await page.fill("input[placeholder=\"Enter your password\"]", CREDS.password);
      await page.click("button:has-text(\"Sign in\")");
      await page.waitForURL("**/");
    });

    // Step 1
    await step("Step 1: Welcome screen", async () => {
      await page.waitForSelector("h1:has-text(\"Welcome to SocialPulses\")", { timeout: 10000 });
      await page.waitForSelector("button:has-text(\"Next\")");
    });
    await page.screenshot({ path: SCR + "/01-welcome.png", fullPage: true });
    await page.click("button:has-text(\"Next\")");
    await page.waitForTimeout(400);

    // Step 2
    await step("Step 2: Role selection", async () => {
      await page.waitForSelector("h2:has-text(\"How would you describe yourself?\")");
    });
    await page.screenshot({ path: SCR + "/02-role.png", fullPage: true });
    await page.click("button:has-text(\"Solo creator\")");
    await page.click("button:has-text(\"Continue\")");
    await page.waitForTimeout(400);

    // Step 3
    await step("Step 3: Tools selection", async () => {
      await page.waitForSelector("h2:has-text(\"What tools do you use?\")");
    });
    await page.screenshot({ path: SCR + "/03-tools.png", fullPage: true });
    await page.click("button:has-text(\"Continue\")");
    await page.waitForTimeout(400);

    // Step 4
    await step("Step 4: Channels — all 11 visible, labels readable", async () => {
      await page.waitForSelector("h2:has-text(\"What social channels are in focus?\")");
      for (const ch of ["Instagram", "Facebook", "Twitter/X", "LinkedIn", "TikTok", "YouTube", "Pinterest", "Threads", "Bluesky", "Mastodon", "Google Business"]) {
        const n = await page.locator("button:has-text(\"" + ch + "\")").count();
        if (n === 0) throw new Error("Missing: " + ch);
      }
    });
    await page.screenshot({ path: SCR + "/04-channels.png", fullPage: true });
    await page.click("button:has-text(\"Continue\")");
    await page.waitForTimeout(400);

    // Step 5
    await step("Step 5: Done screen", async () => {
      await page.waitForSelector("h1:has-text(\"Your workspace is ready!\")");
    });
    await page.screenshot({ path: SCR + "/05-done.png", fullPage: true });
    await page.click("button:has-text(\"Go to Dashboard\")");
    await page.waitForTimeout(2000);

    await step("Wizard closed after completion", async () => {
      const vis = await page.isVisible("h1:has-text(\"Welcome to SocialPulses\")");
      if (vis) throw new Error("Still visible");
    });
    await step("No JavaScript errors", async () => {
      if (errors.length) throw new Error(errors.join("; "));
    });
    await page.screenshot({ path: SCR + "/06-dashboard.png", fullPage: true });
    console.log("\n=== RESULTS: " + pass + " passed, " + fail + " failed ===\n");
  } catch (e) {
    await page.screenshot({ path: FAIL + "/crash.png", fullPage: true });
    console.error("FATAL:", e.message);
  } finally {
    await browser.close();
  }
  process.exit(fail > 0 ? 1 : 0);
})();
