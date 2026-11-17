import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "../../");
const reportDir = path.join(rootDir, "work/R60-T014");
const reportFile = path.join(reportDir, "results-latest.json");
const baselineFile = path.join(reportDir, "baseline.json");

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".webp": "image/webp",
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
  console.log("Starting R60-T014 Boredom Buster DOM lifecycle & repeat initialization verification...");

  const results = {
    taskId: "R60-T014",
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

    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
    });

    // Intercept Google Fonts requests to ensure tests run offline without external dependency
    await context.route("**/*", (route) => {
      const u = route.request().url();
      if (u.includes("fonts.googleapis.com") || u.includes("fonts.gstatic.com")) {
        route.abort();
      } else {
        route.continue();
      }
    });

    const page = await context.newPage();

    page.on("pageerror", (err) => {
      pageErrors.push(err.message);
      console.error("Page error detected:", err.message);
    });

    page.on("console", (msg) => {
      if (msg.type() === "error") {
        if (msg.text().includes("net::ERR_FAILED") || msg.text().includes("fonts.google")) {
          return;
        }
        consoleErrors.push(msg.text());
        console.error("Console error detected:", msg.text());
      }
    });

    const targetUrl = `http://127.0.0.1:${port}/public/BordemBuster/index.html`;
    await page.goto(targetUrl, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(150);

    // ==========================================
    // Check 1: Source Anchors Presence & Properties
    // ==========================================
    const anchors = await page.evaluate(() => {
      const themeBtn = document.getElementById("themeBtn");
      const category = document.getElementById("category");
      const participants = document.getElementById("participants");
      const budget = document.getElementById("budget");

      return {
        themeBtn: !!themeBtn && themeBtn.tagName === "BUTTON",
        category: !!category && category.tagName === "SELECT",
        participants: !!participants && participants.tagName === "INPUT",
        budget: !!budget && budget.tagName === "SELECT",
        themeBtnText: themeBtn ? themeBtn.textContent.trim() : null,
        categoryOptions: category ? category.options.length : 0,
        budgetOptions: budget ? budget.options.length : 0,
      };
    });

    const anchorsPassed =
      anchors.themeBtn &&
      anchors.category &&
      anchors.participants &&
      anchors.budget &&
      anchors.categoryOptions >= 9 &&
      anchors.budgetOptions >= 4;

    results.checks.push({
      name: "Source anchors exist with required HTML elements (#themeBtn, #category, #participants, #budget)",
      passed: anchorsPassed,
      data: anchors,
    });
    console.log(`Source anchors check: ${anchorsPassed ? "PASS" : "FAIL"}`);

    // ==========================================
    // Check 2: Initial DOM Counts & Structural Baseline
    // ==========================================
    const initialCounts = await page.evaluate(() => {
      return {
        themeBtnCount: document.querySelectorAll("#themeBtn").length,
        categoryCount: document.querySelectorAll("#category").length,
        participantsCount: document.querySelectorAll("#participants").length,
        budgetCount: document.querySelectorAll("#budget").length,
        fetchBtnCount: document.querySelectorAll("#fetchBtn").length,
        againBtnCount: document.querySelectorAll("#againBtn").length,
        favBtnCount: document.querySelectorAll("#favBtn").length,
        shareBtnCount: document.querySelectorAll("#shareBtn").length,
        completeBtnCount: document.querySelectorAll("#completeBtn").length,
        resultBoxCount: document.querySelectorAll("#resultBox").length,
        badgeCount: document.querySelectorAll(".badges .badge").length,
        isInitialized: window.BoredomBuster ? window.BoredomBuster.isInitialized() : false,
        activeTimers: window.BoredomBuster ? window.BoredomBuster.getActiveTimers() : -1,
      };
    });

    const baselinePassed =
      initialCounts.themeBtnCount === 1 &&
      initialCounts.categoryCount === 1 &&
      initialCounts.participantsCount === 1 &&
      initialCounts.budgetCount === 1 &&
      initialCounts.fetchBtnCount === 1 &&
      initialCounts.againBtnCount === 1 &&
      initialCounts.favBtnCount === 1 &&
      initialCounts.shareBtnCount === 1 &&
      initialCounts.completeBtnCount === 1 &&
      initialCounts.resultBoxCount === 1 &&
      initialCounts.badgeCount === 4 &&
      initialCounts.isInitialized === true &&
      initialCounts.activeTimers === 0;

    results.checks.push({
      name: "Initial DOM node counts and structural baseline verified",
      passed: baselinePassed,
      data: initialCounts,
    });
    console.log(`Initial DOM baseline check: ${baselinePassed ? "PASS" : "FAIL"}`);

    // ==========================================
    // Check 3: Repeat Initialization Idempotency
    // ==========================================
    // Call window.BoredomBuster.init() 5 times consecutively
    await page.evaluate(() => {
      for (let i = 0; i < 5; i++) {
        window.BoredomBuster.init();
      }
    });
    await page.waitForTimeout(100);

    const afterRepeatInitCounts = await page.evaluate(() => {
      return {
        themeBtnCount: document.querySelectorAll("#themeBtn").length,
        resultBoxCount: document.querySelectorAll("#resultBox").length,
        badgeCount: document.querySelectorAll(".badges .badge").length,
        fetchBtnCount: document.querySelectorAll("#fetchBtn").length,
        activeTimers: window.BoredomBuster.getActiveTimers(),
      };
    });

    // Test handler duplication: A single click on #themeBtn must toggle theme exactly once
    const initialTheme = await page.evaluate(() => document.documentElement.getAttribute("data-theme"));
    await page.locator("#themeBtn").click();
    await page.waitForTimeout(100);
    const toggledTheme = await page.evaluate(() => document.documentElement.getAttribute("data-theme"));

    // Single click on #fetchBtn must add exactly 1 entry to history
    const initialHistoryLength = await page.evaluate(() => window.BoredomBuster.getState().history.length);
    await page.locator("#fetchBtn").click();
    await page.waitForTimeout(300); // Allow fetch timeout to resolve
    const afterHistoryLength = await page.evaluate(() => window.BoredomBuster.getState().history.length);

    const repeatInitPassed =
      afterRepeatInitCounts.themeBtnCount === 1 &&
      afterRepeatInitCounts.resultBoxCount === 1 &&
      afterRepeatInitCounts.badgeCount === 4 &&
      afterRepeatInitCounts.fetchBtnCount === 1 &&
      initialTheme !== toggledTheme && // Toggled once (not an even number of times which would cancel out)
      afterHistoryLength === initialHistoryLength + 1; // Exactly 1 item added

    results.checks.push({
      name: "Repeat initialization (5x) is idempotent with zero DOM duplication or multiplied handlers",
      passed: repeatInitPassed,
      data: {
        afterRepeatInitCounts,
        initialTheme,
        toggledTheme,
        initialHistoryLength,
        afterHistoryLength,
      },
    });
    console.log(`Repeat initialization check: ${repeatInitPassed ? "PASS" : "FAIL"}`);

    // ==========================================
    // Check 4: Rapid Repeated User Interaction & Handler Protection
    // ==========================================
    // Rapidly click #fetchBtn 5 times
    for (let i = 0; i < 5; i++) {
      await page.locator("#fetchBtn").click();
    }
    await page.waitForTimeout(350);

    const rapidFetchResult = await page.evaluate(() => {
      const nameEl = document.getElementById("activityName");
      const nameText = nameEl ? nameEl.textContent.trim() : "";
      const resultBoxes = document.querySelectorAll("#resultBox").length;
      const pillTypes = document.querySelectorAll("#pillType").length;
      const timers = window.BoredomBuster.getActiveTimers();
      return {
        hasValidActivity: nameText.length > 5,
        resultBoxes,
        pillTypes,
        timers,
      };
    });

    // Rapidly toggle favourites 4 times (add -> remove -> add -> remove)
    const favBtn = page.locator("#favBtn");
    for (let i = 0; i < 4; i++) {
      await favBtn.click();
    }
    const favResult = await page.evaluate(() => {
      const favs = window.BoredomBuster.getState().favourites;
      const favListCount = document.querySelectorAll("#favList .fav-item").length;
      return {
        favsLength: favs.length,
        favListCount,
      };
    });

    // Click complete button once to mark completed, then verify disabled state and idempotent re-clicks
    const completeBtn = page.locator("#completeBtn");
    await completeBtn.click();
    await completeBtn.click({ force: true });
    await page.evaluate(() => {
      const btn = document.getElementById("completeBtn");
      if (btn) btn.click();
    });
    const completeResult = await page.evaluate(() => {
      const completed = window.BoredomBuster.getState().completed;
      const countText = document.getElementById("completedCount").textContent.trim();
      const unlockedBadges = document.querySelectorAll(".badges .badge.unlocked").length;
      return {
        completedCount: completed.length,
        countText,
        unlockedBadges,
      };
    });

    const rapidInteractionPassed =
      rapidFetchResult.hasValidActivity &&
      rapidFetchResult.resultBoxes === 1 &&
      rapidFetchResult.pillTypes === 1 &&
      favResult.favsLength === 0 &&
      favResult.favListCount === 0 &&
      completeResult.completedCount === 1 &&
      completeResult.countText === "1" &&
      completeResult.unlockedBadges >= 1;

    results.checks.push({
      name: "Rapid repeated interactions (fetch, fav toggle, completion) execute cleanly without duplicate state",
      passed: rapidInteractionPassed,
      data: {
        rapidFetchResult,
        favResult,
        completeResult,
      },
    });
    console.log(`Rapid repeated interactions check: ${rapidInteractionPassed ? "PASS" : "FAIL"}`);

    // ==========================================
    // Check 5: Cleanup & Teardown Verification
    // ==========================================
    await page.evaluate(() => {
      window.BoredomBuster.cleanup();
    });
    await page.waitForTimeout(100);

    const cleanupStatus = await page.evaluate(() => {
      return {
        isInitialized: window.BoredomBuster.isInitialized(),
        activeTimers: window.BoredomBuster.getActiveTimers(),
        bodyFlag: document.body.hasAttribute("data-boredom-buster-initialized"),
      };
    });

    // Clicks while cleaned up should not trigger handlers
    const historyBeforeClick = await page.evaluate(() => window.BoredomBuster.getState().history.length);
    await page.locator("#fetchBtn").click();
    await page.waitForTimeout(250);
    const historyAfterClick = await page.evaluate(() => window.BoredomBuster.getState().history.length);

    const cleanupPassed =
      cleanupStatus.isInitialized === false &&
      cleanupStatus.activeTimers === 0 &&
      cleanupStatus.bodyFlag === false &&
      historyBeforeClick === historyAfterClick;

    results.checks.push({
      name: "Cleanup/teardown detaches all event handlers and clears all active timers",
      passed: cleanupPassed,
      data: {
        cleanupStatus,
        historyBeforeClick,
        historyAfterClick,
      },
    });
    console.log(`Cleanup check: ${cleanupPassed ? "PASS" : "FAIL"}`);

    // ==========================================
    // Check 6: Re-Initialization after Cleanup
    // ==========================================
    await page.evaluate(() => {
      window.BoredomBuster.init();
    });
    await page.waitForTimeout(100);

    const reinitStatus = await page.evaluate(() => {
      return {
        isInitialized: window.BoredomBuster.isInitialized(),
        bodyFlag: document.body.hasAttribute("data-boredom-buster-initialized"),
      };
    });

    // Test that handlers work again after re-init
    const reinitHistBefore = await page.evaluate(() => window.BoredomBuster.getState().history.length);
    await page.locator("#fetchBtn").click();
    await page.waitForTimeout(300);
    const reinitHistAfter = await page.evaluate(() => window.BoredomBuster.getState().history.length);

    const reinitPassed =
      reinitStatus.isInitialized === true &&
      reinitStatus.bodyFlag === true &&
      reinitHistAfter === reinitHistBefore + 1;

    results.checks.push({
      name: "Re-initialization after cleanup cleanly restores functionality without leaks",
      passed: reinitPassed,
      data: {
        reinitStatus,
        reinitHistBefore,
        reinitHistAfter,
      },
    });
    console.log(`Re-initialization check: ${reinitPassed ? "PASS" : "FAIL"}`);

    // ==========================================
    // Check 7: No Uncaught Page or Console Errors
    // ==========================================
    const noErrors = pageErrors.length === 0 && consoleErrors.length === 0;
    results.checks.push({
      name: "No uncaught runtime page errors or console error messages during test",
      passed: noErrors,
      data: { pageErrors, consoleErrors },
    });
    console.log(`Page errors check: ${noErrors ? "PASS" : "FAIL"}`);

    // ==========================================
    // Check 8: README Documentation Verification
    // ==========================================
    const readmeContent = fs.readFileSync(
      path.join(rootDir, "public/BordemBuster/README.md"),
      "utf-8"
    );

    const docsVerified =
      readmeContent.includes("DOM Lifecycle") &&
      readmeContent.includes("r60-t014.mjs") &&
      readmeContent.includes("Idempotent");

    results.checks.push({
      name: "README.md documents DOM lifecycle idempotency and includes automated test command",
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
      taskId: "R60-T014",
      timestamp: new Date().toISOString(),
      item: "public/BordemBuster",
      anchors: ["#themeBtn", "#category", "#participants", "#budget"],
      lifecycleProtections: [
        "Idempotent initialization via window.BoredomBuster.init()",
        "Teardown and listener detachment via AbortController in window.BoredomBuster.cleanup()",
        "Active timer tracking with cancellation of in-flight timeouts",
        "SafeStorage memory fallback for restricted environments",
        "DOM node count stability under rapid repeat interaction",
      ],
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
