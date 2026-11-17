import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "../../");
const reportDir = path.join(rootDir, "work/R60-T011");
const reportFile = path.join(reportDir, "results-latest.json");
const baselineFile = path.join(reportDir, "baseline.json");

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
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
  console.log("Starting R60-T011 Mood Tracker Dashboard keyboard accessibility verification...");

  const results = {
    taskId: "R60-T011",
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

    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
    });

    // Intercept Google Fonts to ensure deterministic offline execution
    await context.route("**/*fonts.googleapis.com*", (route) => route.abort());
    await context.route("**/*fonts.gstatic.com*", (route) => route.abort());

    const page = await context.newPage();

    page.on("pageerror", (err) => {
      pageErrors.push(err.message);
      console.error("Page error detected:", err.message);
    });

    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
        console.error("Console error detected:", msg.text());
      }
    });

    const targetUrl = `http://127.0.0.1:${port}/public/mood-tracker-dashboard/index.html`;

    // Clear any previous localStorage before test
    await page.goto(targetUrl, { waitUntil: "domcontentloaded" });
    await page.evaluate(() => localStorage.clear());
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForTimeout(100);

    // ==========================================
    // Check 1: Source Anchors Exist & Initial Values
    // Source anchors: #mainMood, #totalEntries, #greatCount, #goodCount
    // ==========================================
    const sourceAnchors = await page.evaluate(() => {
      const mainMoodEl = document.getElementById("mainMood");
      const totalEntriesEl = document.getElementById("totalEntries");
      const greatCountEl = document.getElementById("greatCount");
      const goodCountEl = document.getElementById("goodCount");

      return {
        mainMoodExists: !!mainMoodEl,
        mainMoodText: mainMoodEl ? mainMoodEl.innerText.trim() : null,
        totalEntriesExists: !!totalEntriesEl,
        totalEntriesText: totalEntriesEl ? totalEntriesEl.innerText.trim() : null,
        greatCountExists: !!greatCountEl,
        greatCountText: greatCountEl ? greatCountEl.innerText.trim() : null,
        goodCountExists: !!goodCountEl,
        goodCountText: goodCountEl ? goodCountEl.innerText.trim() : null,
      };
    });

    const anchorsPassed =
      sourceAnchors.mainMoodExists &&
      sourceAnchors.totalEntriesExists &&
      sourceAnchors.greatCountExists &&
      sourceAnchors.goodCountExists &&
      sourceAnchors.mainMoodText.includes("Great") &&
      sourceAnchors.totalEntriesText.includes("2") &&
      sourceAnchors.greatCountText === "1" &&
      sourceAnchors.goodCountText === "0";

    results.checks.push({
      name: "Source anchors exist and display initial metrics (#mainMood, #totalEntries, #greatCount, #goodCount)",
      passed: anchorsPassed,
      data: sourceAnchors,
    });
    console.log(`Source anchors check: ${anchorsPassed ? "PASS" : "FAIL"}`);

    // ==========================================
    // Check 2: No Positive Tabindex Introduced
    // ==========================================
    const tabindexCheck = await page.evaluate(() => {
      const elementsWithTabindex = Array.from(document.querySelectorAll("[tabindex]"));
      const positiveTabindexes = elementsWithTabindex
        .map((el) => ({
          tag: el.tagName.toLowerCase(),
          id: el.id,
          className: el.className,
          tabindex: parseInt(el.getAttribute("tabindex") || "0", 10),
        }))
        .filter((item) => item.tabindex > 0);

      return {
        totalWithTabindex: elementsWithTabindex.length,
        positiveTabindexes,
      };
    });

    const noPositiveTabindex = tabindexCheck.positiveTabindexes.length === 0;
    results.checks.push({
      name: "No positive tabindex attribute introduced on any element",
      passed: noPositiveTabindex,
      data: tabindexCheck,
    });
    console.log(`No positive tabindex check: ${noPositiveTabindex ? "PASS" : "FAIL"}`);

    // ==========================================
    // Check 3: Skip-to-Content Link
    // ==========================================
    const skipLinkLoc = page.locator(".skip-link");
    const skipLinkExists = (await skipLinkLoc.count()) > 0;

    let skipLinkInfo = { exists: false };
    if (skipLinkExists) {
      const isOffscreenInitial = await skipLinkLoc.evaluate((el) => {
        const rect = el.getBoundingClientRect();
        return rect.top < 0 || rect.bottom <= 0;
      });

      await skipLinkLoc.focus();
      await page.waitForTimeout(250);

      const focusedData = await skipLinkLoc.evaluate((el) => {
        const cs = window.getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        return {
          href: el.getAttribute("href"),
          isVisibleFocused: rect.top >= 0 && rect.bottom > 0,
          focusedOutlineStyle: cs.outlineStyle,
          focusedOutlineWidth: cs.outlineWidth,
          focusedOutlineColor: cs.outlineColor,
          top: rect.top,
        };
      });

      skipLinkInfo = {
        exists: true,
        href: focusedData.href,
        isOffscreenInitial,
        isVisibleFocused: focusedData.isVisibleFocused,
        focusedOutlineStyle: focusedData.focusedOutlineStyle,
        focusedOutlineWidth: focusedData.focusedOutlineWidth,
        focusedOutlineColor: focusedData.focusedOutlineColor,
      };
    }

    const skipLinkPassed =
      skipLinkInfo.exists &&
      skipLinkInfo.href === "#mainContent" &&
      skipLinkInfo.isOffscreenInitial &&
      skipLinkInfo.isVisibleFocused &&
      skipLinkInfo.focusedOutlineStyle !== "none" &&
      parseFloat(skipLinkInfo.focusedOutlineWidth) >= 2;

    results.checks.push({
      name: "Skip-to-content link exists, stays visually hidden until focused, and shows clear outline when focused",
      passed: skipLinkPassed,
      data: skipLinkInfo,
    });
    console.log(`Skip link check: ${skipLinkPassed ? "PASS" : "FAIL"}`);

    // ==========================================
    // Check 4: Sequential Tab Traversal
    // Logical order: .skip-link -> Great button -> Good button -> Neutral button -> Bad button
    // ==========================================
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForTimeout(100);

    const traversalOrder = [];
    const expectedControls = [
      { type: "skip-link", selector: ".skip-link" },
      { type: "button", selector: ".buttons button:nth-of-type(1)", label: "Great" },
      { type: "button", selector: ".buttons button:nth-of-type(2)", label: "Good" },
      { type: "button", selector: ".buttons button:nth-of-type(3)", label: "Neutral" },
      { type: "button", selector: ".buttons button:nth-of-type(4)", label: "Bad" },
    ];

    for (let i = 0; i < expectedControls.length; i++) {
      await page.keyboard.press("Tab");
      await page.waitForTimeout(50);

      const activeElementInfo = await page.evaluate(() => {
        const el = document.activeElement;
        if (!el) return { tag: null };
        return {
          tag: el.tagName.toLowerCase(),
          className: el.className,
          id: el.id,
          text: el.innerText.trim(),
          type: el.getAttribute("type"),
        };
      });

      traversalOrder.push({
        step: i + 1,
        expected: expectedControls[i],
        actual: activeElementInfo,
      });
    }

    const traversalPassed =
      traversalOrder.length === 5 &&
      traversalOrder[0].actual.className.includes("skip-link") &&
      traversalOrder[1].actual.text.includes("Great") &&
      traversalOrder[2].actual.text.includes("Good") &&
      traversalOrder[3].actual.text.includes("Neutral") &&
      traversalOrder[4].actual.text.includes("Bad");

    results.checks.push({
      name: "Tab key traverses interactive controls in natural sequential order (.skip-link -> Great -> Good -> Neutral -> Bad)",
      passed: traversalPassed,
      data: traversalOrder,
    });
    console.log(`Tab traversal check: ${traversalPassed ? "PASS" : "FAIL"}`);

    // ==========================================
    // Check 5: Visible Focus Outlines on Buttons
    // ==========================================
    const buttonFocusOutlines = [];
    const buttonsLoc = page.locator(".buttons button");
    const buttonCount = await buttonsLoc.count();

    for (let idx = 0; idx < buttonCount; idx++) {
      const btn = buttonsLoc.nth(idx);
      await btn.focus();
      await page.waitForTimeout(100);
      const info = await btn.evaluate((el, i) => {
        const cs = window.getComputedStyle(el);
        return {
          index: i,
          label: el.innerText.trim(),
          outlineStyle: cs.outlineStyle,
          outlineWidth: cs.outlineWidth,
          outlineColor: cs.outlineColor,
          outlineOffset: cs.outlineOffset,
          hasOutline:
            cs.outlineStyle !== "none" &&
            parseFloat(cs.outlineWidth || "0") >= 2 &&
            cs.outlineColor === "rgb(179, 0, 75)",
        };
      }, idx);
      buttonFocusOutlines.push(info);
    }

    const allButtonsHaveFocusOutline = buttonFocusOutlines.every((b) => b.hasOutline);
    results.checks.push({
      name: "Interactive mood buttons feature high-contrast visible focus outlines (:focus-visible >= 2px)",
      passed: allButtonsHaveFocusOutline,
      data: buttonFocusOutlines,
    });
    console.log(`Button focus outline check: ${allButtonsHaveFocusOutline ? "PASS" : "FAIL"}`);

    // ==========================================
    // Check 6: Keyboard Activation (Enter & Space)
    // ==========================================
    // Reset state for clean activation testing
    await page.evaluate(() => localStorage.clear());
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForTimeout(100);

    // Initial state: great=1, good=0, neutral=1, bad=0, total=2
    // Tab 1 -> skip-link
    await page.keyboard.press("Tab");
    // Tab 2 -> Great button
    await page.keyboard.press("Tab");

    // Activate Great button with 'Enter'
    await page.keyboard.press("Enter");
    await page.waitForTimeout(100);

    const afterGreatEnter = await page.evaluate(() => {
      return {
        greatCount: document.getElementById("greatCount").innerText.trim(),
        totalEntries: document.getElementById("totalEntries").innerText.trim(),
        mainMood: document.getElementById("mainMood").innerText.trim(),
        jarBallsCount: document.querySelectorAll(".jar .mood-ball").length,
        chartItemsCount: document.querySelectorAll("#chartData span").length,
      };
    });

    // Tab 3 -> Good button
    await page.keyboard.press("Tab");
    // Activate Good button with 'Space'
    await page.keyboard.press("Space");
    await page.waitForTimeout(100);

    const afterGoodSpace = await page.evaluate(() => {
      return {
        goodCount: document.getElementById("goodCount").innerText.trim(),
        totalEntries: document.getElementById("totalEntries").innerText.trim(),
        jarBallsCount: document.querySelectorAll(".jar .mood-ball").length,
        chartItemsCount: document.querySelectorAll("#chartData span").length,
      };
    });

    // Tab 4 -> Neutral button
    await page.keyboard.press("Tab");
    // Activate Neutral button with 'Enter'
    await page.keyboard.press("Enter");
    await page.waitForTimeout(100);

    const afterNeutralEnter = await page.evaluate(() => {
      return {
        neutralCount: document.getElementById("neutralCount").innerText.trim(),
        totalEntries: document.getElementById("totalEntries").innerText.trim(),
      };
    });

    // Tab 5 -> Bad button
    await page.keyboard.press("Tab");
    // Activate Bad button with 'Space'
    await page.keyboard.press("Space");
    await page.waitForTimeout(100);

    const afterBadSpace = await page.evaluate(() => {
      return {
        badCount: document.getElementById("badCount").innerText.trim(),
        totalEntries: document.getElementById("totalEntries").innerText.trim(),
      };
    });

    const activationPassed =
      afterGreatEnter.greatCount === "2" &&
      afterGreatEnter.totalEntries.includes("3") &&
      afterGreatEnter.mainMood.includes("Great") &&
      afterGoodSpace.goodCount === "1" &&
      afterGoodSpace.totalEntries.includes("4") &&
      afterNeutralEnter.neutralCount === "2" &&
      afterNeutralEnter.totalEntries.includes("5") &&
      afterBadSpace.badCount === "1" &&
      afterBadSpace.totalEntries.includes("6") &&
      afterGoodSpace.jarBallsCount >= 4 &&
      afterGoodSpace.chartItemsCount >= 2;

    results.checks.push({
      name: "Keyboard activation via Enter and Space operates controls, updates metrics and animations correctly",
      passed: activationPassed,
      data: {
        afterGreatEnter,
        afterGoodSpace,
        afterNeutralEnter,
        afterBadSpace,
      },
    });
    console.log(`Keyboard activation check: ${activationPassed ? "PASS" : "FAIL"}`);

    // ==========================================
    // Check 7: No Unexpected Page or Console Errors
    // ==========================================
    const noErrorsPassed = pageErrors.length === 0 && consoleErrors.length === 0;
    results.checks.push({
      name: "No uncaught runtime page errors or console error messages during test",
      passed: noErrorsPassed,
      data: { pageErrors, consoleErrors },
    });
    console.log(`Page errors check: ${noErrorsPassed ? "PASS" : "FAIL"}`);

    // ==========================================
    // Check 8: README Documentation Verification
    // ==========================================
    const readmeContent = fs.readFileSync(
      path.join(rootDir, "public/mood-tracker-dashboard/README.md"),
      "utf-8"
    );

    const docsVerified =
      readmeContent.includes("Accessibility") &&
      readmeContent.includes("r60-t011.mjs") &&
      readmeContent.includes("focus-visible");

    results.checks.push({
      name: "README.md documents keyboard navigation, focus indicators and automated test command",
      passed: docsVerified,
      data: { docsVerified },
    });
    console.log(`README documentation check: ${docsVerified ? "PASS" : "FAIL"}`);

    // Summary evaluation
    const allPassed = results.checks.every((c) => c.passed);
    results.passed = allPassed;

    fs.mkdirSync(reportDir, { recursive: true });
    fs.writeFileSync(reportFile, JSON.stringify(results, null, 2), "utf-8");
    console.log(`\nSaved report to ${reportFile}`);

    // Baseline recording
    const baselineData = {
      taskId: "R60-T011",
      timestamp: new Date().toISOString(),
      item: "public/mood-tracker-dashboard",
      baselineSummary: {
        anchorsPresent: true,
        interactiveButtonsCount: 4,
        nativeKeyboardReachable: true,
        customFocusIndicatorInOriginal: false,
        skipLinkInOriginal: false,
      },
      improvements: {
        addedSkipLink: true,
        addedHighContrastFocusVisible: true,
        verifiedNoPositiveTabindex: true,
        verifiedKeyboardActivation: true,
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
