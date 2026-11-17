import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "../../");
const reportDir = path.join(rootDir, "work/R60-T016");
const reportFile = path.join(reportDir, "results-latest.json");
const baselineFile = path.join(reportDir, "baseline.json");

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".ico": "image/x-icon",
};

function startServer() {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const parsedUrl = new URL(req.url, "http://localhost");
      let filePath = path.join(rootDir, decodeURIComponent(parsedUrl.pathname));

      if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
        filePath = path.join(filePath, "index.html");
      }

      if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
        res.writeHead(404, { "Content-Type": "text/plain" });
        res.end("404 Not Found");
        return;
      }

      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || "application/octet-stream";
      res.writeHead(200, { "Content-Type": contentType });
      fs.createReadStream(filePath).pipe(res);
    });

    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = address.port;
      resolve({ server, port });
    });

    server.on("error", reject);
  });
}

async function runTest() {
  console.log("Starting R60-T016 Website Personalizer feature-support fallback verification...");

  const results = {
    taskId: "R60-T016",
    timestamp: new Date().toISOString(),
    toolVersions: {
      node: process.version,
      playwright: "chromium",
    },
    passed: false,
    checks: [],
  };

  const pageErrors = [];
  const consoleErrors = [];

  let serverInstance = null;
  let browser = null;

  try {
    const { server, port } = await startServer();
    serverInstance = server;
    console.log(`Local HTTP server running on http://127.0.0.1:${port}`);

    browser = await chromium.launch({ headless: true });
    results.toolVersions.chromiumVersion = browser.version();

    fs.mkdirSync(reportDir, { recursive: true });

    // ==========================================
    // Check 1: Source Anchors Verification
    // ==========================================
    const probeContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const probePage = await probeContext.newPage();
    probePage.on("pageerror", (err) => pageErrors.push(err.message));
    probePage.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });

    await probePage.goto(`http://127.0.0.1:${port}/public/WebsitePersonalizer/index.html`, {
      waitUntil: "domcontentloaded",
    });

    const anchors = await probePage.evaluate(() => {
      const quizPhase = document.getElementById("quiz-phase");
      const progressFill = document.getElementById("progress-fill");
      const progressLabel = document.getElementById("progress-label");
      const cardStack = document.getElementById("card-stack");

      return {
        quizPhase: !!quizPhase && quizPhase.classList.contains("active"),
        progressFill: !!progressFill,
        progressLabel: !!progressLabel && progressLabel.textContent.trim() === "1 / 5",
        cardStack: !!cardStack && cardStack.querySelectorAll(".q-card").length === 1,
      };
    });

    const anchorsPassed =
      anchors.quizPhase &&
      anchors.progressFill &&
      anchors.progressLabel &&
      anchors.cardStack;

    results.checks.push({
      name: "Source anchors exist with expected initial quiz states (#quiz-phase, #progress-fill, #progress-label, #card-stack)",
      passed: anchorsPassed,
      data: anchors,
    });
    console.log(`Source anchors check: ${anchorsPassed ? "PASS" : "FAIL"}`);

    await probeContext.close();

    // ==========================================
    // Check 2: Feature-Present Path (matchMedia & Clipboard available)
    // ==========================================
    console.log("Testing feature-present path...");
    const presentContext = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      permissions: ["clipboard-read", "clipboard-write"],
    });

    // Provide mock clipboard store in browser context
    await presentContext.addInitScript(() => {
      let clipStore = "";
      window.__clipboardStore = () => clipStore;
      if (navigator.clipboard) {
        navigator.clipboard.writeText = async (text) => {
          clipStore = text;
        };
      }
    });

    const presentPage = await presentContext.newPage();
    presentPage.on("pageerror", (err) => pageErrors.push(err.message));
    presentPage.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });

    await presentPage.goto(`http://127.0.0.1:${port}/public/WebsitePersonalizer/index.html`, {
      waitUntil: "domcontentloaded",
    });

    // Q1: Pick Minimal
    await presentPage.locator('.q-card .q-opt[data-val="minimal"]').click();
    await presentPage.waitForTimeout(650);

    // Q2: Check that Auto (system preference) option is enabled and functional
    const autoOption = presentPage.locator('.q-card .q-opt[data-val="system"]');
    const autoOptData = await autoOption.evaluate((el) => {
      return {
        disabled: el.disabled,
        hasDisabledClass: el.classList.contains("disabled-feature"),
        text: el.textContent.trim(),
      };
    });

    const autoEnabled =
      autoOptData.disabled === false &&
      autoOptData.hasDisabledClass === false &&
      !autoOptData.text.includes("(Unsupported)");

    // Click Auto
    await autoOption.click();
    await presentPage.waitForTimeout(650);

    // Q3: Color -> violet
    await presentPage.locator('.q-card .q-opt[data-val="violet"]').click();
    await presentPage.waitForTimeout(650);

    // Q4: Motion -> fluid
    await presentPage.locator('.q-card .q-opt[data-val="fluid"]').click();
    await presentPage.waitForTimeout(650);

    // Q5: Typo -> default
    await presentPage.locator('.q-card .q-opt[data-val="default"]').click();

    // Fast-forward brew animation
    await presentPage.waitForSelector("#site-phase.active", { timeout: 10000 });

    // Test Export CSS button with clipboard supported
    const exportBtn = presentPage.locator("#copy-config-btn");
    await exportBtn.click();
    await presentPage.waitForTimeout(100);

    const presentExportState = await presentPage.evaluate(() => {
      const btn = document.getElementById("copy-config-btn");
      const drawer = document.getElementById("export-drawer");
      const copiedText = window.__clipboardStore ? window.__clipboardStore() : "";
      return {
        btnText: btn?.textContent.trim(),
        drawerHidden: drawer?.classList.contains("hidden"),
        copiedContainsTokens: copiedText.includes("--selected-vibe"),
      };
    });

    const presentPathPassed =
      autoEnabled &&
      presentExportState.btnText === "✓ Copied!" &&
      presentExportState.drawerHidden === true &&
      presentExportState.copiedContainsTokens === true;

    results.checks.push({
      name: "Feature-present path: matchMedia auto-option enabled and clipboard export succeeds without manual drawer",
      passed: presentPathPassed,
      data: { autoOptData, presentExportState },
    });
    console.log(`Feature-present check: ${presentPathPassed ? "PASS" : "FAIL"}`);

    await presentContext.close();

    // ==========================================
    // Check 3: Feature-Absent Path: Unsupported matchMedia
    // ==========================================
    console.log("Testing feature-absent path (matchMedia unsupported)...");
    const absentMediaContext = await browser.newContext({
      viewport: { width: 1280, height: 800 },
    });

    // Explicitly delete window.matchMedia before script execution
    await absentMediaContext.addInitScript(() => {
      delete window.matchMedia;
    });

    const absentMediaPage = await absentMediaContext.newPage();
    absentMediaPage.on("pageerror", (err) => pageErrors.push(err.message));
    absentMediaPage.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });

    await absentMediaPage.goto(`http://127.0.0.1:${port}/public/WebsitePersonalizer/index.html`, {
      waitUntil: "domcontentloaded",
    });

    // Q1: Pick Cyberpunk
    await absentMediaPage.locator('.q-card .q-opt[data-val="cyberpunk"]').click();
    await absentMediaPage.waitForTimeout(650);

    // Q2: Inspect Auto button under absent matchMedia
    const absentAutoBtn = absentMediaPage.locator('.q-card .q-opt[data-val="system"]');
    const absentAutoData = await absentAutoBtn.evaluate((el) => {
      return {
        disabled: el.disabled,
        hasDisabledClass: el.classList.contains("disabled-feature"),
        text: el.textContent.trim(),
        title: el.getAttribute("title"),
      };
    });

    const absentMediaHandled =
      absentAutoData.disabled === true &&
      absentAutoData.hasDisabledClass === true &&
      absentAutoData.text.includes("(Unsupported)");

    // Supported alternative choices still work
    const darkBtn = absentMediaPage.locator('.q-card .q-opt[data-val="dark"]');
    await darkBtn.click();
    await absentMediaPage.waitForTimeout(650);

    const afterClickProgress = await absentMediaPage.locator("#progress-label").textContent();

    const absentMediaPassed = absentMediaHandled && afterClickProgress.trim() === "3 / 5";

    results.checks.push({
      name: "Feature-absent path: unsupported matchMedia disables control with fallback text while supported choices work",
      passed: absentMediaPassed,
      data: { absentAutoData, afterClickProgress },
    });
    console.log(`Absent matchMedia check: ${absentMediaPassed ? "PASS" : "FAIL"}`);

    await absentMediaContext.close();

    // ==========================================
    // Check 4: Feature-Absent Path: Unsupported Clipboard API
    // ==========================================
    console.log("Testing feature-absent path (Clipboard API unsupported)...");
    const absentClipContext = await browser.newContext({
      viewport: { width: 1280, height: 800 },
    });

    // Delete navigator.clipboard
    await absentClipContext.addInitScript(() => {
      delete navigator.clipboard;
    });

    const absentClipPage = await absentClipContext.newPage();
    absentClipPage.on("pageerror", (err) => pageErrors.push(err.message));
    absentClipPage.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });

    await absentClipPage.goto(`http://127.0.0.1:${port}/public/WebsitePersonalizer/index.html`, {
      waitUntil: "domcontentloaded",
    });

    // Progress through quiz
    await absentClipPage.locator('.q-card .q-opt[data-val="aesthetic"]').click();
    await absentClipPage.waitForTimeout(650);
    await absentClipPage.locator('.q-card .q-opt[data-val="light"]').click();
    await absentClipPage.waitForTimeout(650);
    await absentClipPage.locator('.q-card .q-opt[data-val="rose"]').click();
    await absentClipPage.waitForTimeout(650);
    await absentClipPage.locator('.q-card .q-opt[data-val="subtle"]').click();
    await absentClipPage.waitForTimeout(650);
    await absentClipPage.locator('.q-card .q-opt[data-val="relaxed"]').click();

    // Wait for site reveal
    await absentClipPage.waitForSelector("#site-phase.active", { timeout: 10000 });

    // Click Export CSS when clipboard is unsupported
    await absentClipPage.locator("#copy-config-btn").click();
    await absentClipPage.waitForTimeout(100);

    const fallbackDrawerState = await absentClipPage.evaluate(() => {
      const drawer = document.getElementById("export-drawer");
      const feedback = document.getElementById("export-feedback");
      const textarea = document.getElementById("export-textarea");
      const btn = document.getElementById("copy-config-btn");

      return {
        drawerVisible: drawer && !drawer.classList.contains("hidden"),
        feedbackText: feedback?.textContent.trim(),
        textareaContent: textarea?.value.trim(),
        btnText: btn?.textContent.trim(),
      };
    });

    // Close drawer
    await absentClipPage.locator("#close-export-btn").click();
    const drawerClosed = await absentClipPage.evaluate(() => {
      const drawer = document.getElementById("export-drawer");
      return drawer?.classList.contains("hidden");
    });

    const absentClipPassed =
      fallbackDrawerState.drawerVisible === true &&
      fallbackDrawerState.feedbackText.includes("Clipboard API is unsupported") &&
      fallbackDrawerState.textareaContent.includes('--selected-vibe: "aesthetic"') &&
      fallbackDrawerState.btnText === "View CSS" &&
      drawerClosed === true;

    results.checks.push({
      name: "Feature-absent path: unsupported clipboard gracefully reveals manual export drawer with fallback guidance",
      passed: absentClipPassed,
      data: { fallbackDrawerState, drawerClosed },
    });
    console.log(`Absent clipboard check: ${absentClipPassed ? "PASS" : "FAIL"}`);

    await absentClipContext.close();

    // ==========================================
    // Check 5: CSS @supports Fallback Rules
    // ==========================================
    const cssContent = fs.readFileSync(
      path.join(rootDir, "public/WebsitePersonalizer/style.css"),
      "utf-8"
    );

    const hasSupportsRules =
      cssContent.includes("@supports not (color: color-mix(in srgb, red, blue))") &&
      cssContent.includes("@supports not (backdrop-filter: blur(12px))");

    results.checks.push({
      name: "CSS style.css defines explicit @supports not fallbacks for color-mix and backdrop-filter",
      passed: hasSupportsRules,
      data: { hasSupportsRules },
    });
    console.log(`CSS @supports fallback check: ${hasSupportsRules ? "PASS" : "FAIL"}`);

    // ==========================================
    // Check 6: No Uncaught Page or Console Errors
    // ==========================================
    const noErrors = pageErrors.length === 0 && consoleErrors.length === 0;
    results.checks.push({
      name: "No uncaught runtime page errors or console error messages during test runs",
      passed: noErrors,
      data: { pageErrors, consoleErrors },
    });
    console.log(`Page errors check: ${noErrors ? "PASS" : "FAIL"}`);

    // ==========================================
    // Check 7: README Documentation Verification
    // ==========================================
    const readmeContent = fs.readFileSync(
      path.join(rootDir, "public/WebsitePersonalizer/README.md"),
      "utf-8"
    );

    const docsVerified =
      readmeContent.includes("Browser Feature Support & Explicit Fallbacks") &&
      readmeContent.includes("r60-t016.mjs") &&
      readmeContent.includes("matchMedia");

    results.checks.push({
      name: "README.md documents feature-support fallback architecture and includes automated test command",
      passed: docsVerified,
      data: { docsVerified },
    });
    console.log(`README documentation check: ${docsVerified ? "PASS" : "FAIL"}`);

    // Summary evaluation
    const allPassed = results.checks.every((c) => c.passed);
    results.passed = allPassed;

    fs.writeFileSync(reportFile, JSON.stringify(results, null, 2), "utf-8");
    console.log(`\nSaved report to ${reportFile}`);

    // Record baseline data
    const baselineData = {
      taskId: "R60-T016",
      timestamp: new Date().toISOString(),
      item: "public/WebsitePersonalizer",
      anchors: ["#quiz-phase", "#progress-fill", "#progress-label", "#card-stack"],
      fallbacks: {
        matchMedia: {
          present: "Auto-detects prefers-color-scheme system theme",
          absent: "Disables control with (Unsupported) indicator, preserving functional manual choices",
        },
        clipboard: {
          present: "Direct one-click copy to system clipboard via navigator.clipboard.writeText",
          absent: "Opens accessible export drawer containing CSS tokens and explicit manual copy instructions",
        },
        cssModernFeatures: {
          colorMix: "CSS @supports not (color: color-mix(...)) provides opaque/rgba solid fallbacks",
          backdropFilter: "CSS @supports not (backdrop-filter: ...) provides solid surface fallbacks",
        },
      },
    };
    fs.writeFileSync(baselineFile, JSON.stringify(baselineData, null, 2), "utf-8");
    console.log(`Saved baseline records to ${baselineFile}`);

    if (allPassed) {
      console.log("\nALL CHECKS PASSED (exit code 0)");
      process.exitCode = 0;
    } else {
      console.error("\nSOME CHECKS FAILED (exit code 1)");
      process.exitCode = 1;
    }
  } catch (err) {
    console.error("Test execution failed with error:", err);
    results.error = err.message;
    fs.mkdirSync(reportDir, { recursive: true });
    fs.writeFileSync(reportFile, JSON.stringify(results, null, 2), "utf-8");
    process.exitCode = 1;
  } finally {
    if (browser) await browser.close();
    if (serverInstance) serverInstance.close();
  }
}

runTest();
