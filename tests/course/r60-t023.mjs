import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "../../");
const reportDir = path.join(rootDir, "work/R60-T023");
const reportFile = path.join(reportDir, "results-latest.json");

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
  console.log("Starting R60-T023 Cricket Scorecard empty/error display verification...");
  const results = {
    taskId: "R60-T023",
    timestamp: new Date().toISOString(),
    passed: false,
    checks: [],
  };

  let serverInstance = null;
  let browser = null;

  try {
    const { server, port } = await startServer();
    serverInstance = server;
    console.log(`Local HTTP server running on http://127.0.0.1:${port}`);

    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
    });
    const page = await context.newPage();

    const targetUrl = `http://127.0.0.1:${port}/public/Cricket-Scorecard/index.html`;
    await page.goto(targetUrl, { waitUntil: "domcontentloaded" });

    // Check 1: Source anchors exist
    const anchors = await page.evaluate(() => {
      return {
        toggleTheme: !!document.getElementById("toggleTheme"),
        searchInput: !!document.getElementById("searchInput"),
        liveMatches: !!document.getElementById("live-matches"),
        upcomingMatches: !!document.getElementById("upcoming-matches"),
      };
    });

    const anchorsPassed =
      anchors.toggleTheme &&
      anchors.searchInput &&
      anchors.liveMatches &&
      anchors.upcomingMatches;

    results.checks.push({
      name: "Source anchors exist (#toggleTheme, #searchInput, #live-matches, #upcoming-matches)",
      passed: anchorsPassed,
      data: anchors,
    });
    console.log(`Source anchors check: ${anchorsPassed ? "PASS" : "FAIL"}`);

    // Wait for initial match cards to render (mock data resolves in ~800ms)
    console.log("Waiting for match cards to render...");
    await page.waitForSelector("#live-matches .match-card", { timeout: 5000 });
    const initialCardCount = await page.evaluate(() => {
      return document.querySelectorAll(".match-card").length;
    });
    console.log(`Initial rendered match cards count: ${initialCardCount}`);
    results.checks.push({
      name: "Initial match cards rendered from data source",
      passed: initialCardCount > 0,
      data: { initialCardCount },
    });

    // Check 2: Search with non-matching query 'NO_MATCH_XYZ'
    const nonMatchingQuery = "NO_MATCH_XYZ";
    console.log(`Typing non-matching query '${nonMatchingQuery}' into #searchInput...`);
    await page.fill("#searchInput", nonMatchingQuery);
    await page.waitForTimeout(100);

    const emptyStateEvaluation = await page.evaluate((query) => {
      const liveMatchesContainer = document.getElementById("live-matches");
      const upcomingMatchesContainer = document.getElementById("upcoming-matches");
      const recentMatchesContainer = document.getElementById("recent-matches");

      const emptyInLive = liveMatchesContainer.querySelector(".empty-state");
      const emptyInUpcoming = upcomingMatchesContainer.querySelector(".empty-state");
      const emptyInRecent = recentMatchesContainer?.querySelector(".empty-state");

      const allCards = Array.from(document.querySelectorAll(".match-card"));
      const visibleCards = allCards.filter((card) => {
        const style = window.getComputedStyle(card);
        return style.display !== "none" && style.visibility !== "hidden";
      });

      const liveText = emptyInLive ? emptyInLive.textContent : "";
      const upcomingText = emptyInUpcoming ? emptyInUpcoming.textContent : "";

      return {
        hasEmptyInLive: !!emptyInLive,
        hasEmptyInUpcoming: !!emptyInUpcoming,
        liveText,
        upcomingText,
        liveReflectsQuery: liveText.includes(query),
        upcomingReflectsQuery: upcomingText.includes(query),
        liveRole: emptyInLive?.getAttribute("role"),
        liveAriaLive: emptyInLive?.getAttribute("aria-live"),
        upcomingRole: emptyInUpcoming?.getAttribute("role"),
        visibleCardsCount: visibleCards.length,
      };
    }, nonMatchingQuery);

    const emptyStateAppeared =
      emptyStateEvaluation.hasEmptyInLive &&
      emptyStateEvaluation.liveReflectsQuery &&
      emptyStateEvaluation.hasEmptyInUpcoming &&
      emptyStateEvaluation.upcomingReflectsQuery &&
      emptyStateEvaluation.visibleCardsCount === 0;

    results.checks.push({
      name: `Empty-state message appears within matches sections with query '${nonMatchingQuery}' reflected`,
      passed: emptyStateAppeared,
      data: emptyStateEvaluation,
    });
    console.log(`Empty-state query reflection check: ${emptyStateAppeared ? "PASS" : "FAIL"}`);

    // Check 3: Empty state accessibility attributes (role="status" and aria-live="polite")
    const emptyStateAccessible =
      emptyStateEvaluation.liveRole === "status" &&
      emptyStateEvaluation.liveAriaLive === "polite";

    results.checks.push({
      name: 'Empty-state has accessible semantics (role="status" and aria-live="polite")',
      passed: emptyStateAccessible,
      data: {
        liveRole: emptyStateEvaluation.liveRole,
        liveAriaLive: emptyStateEvaluation.liveAriaLive,
      },
    });
    console.log(`Empty-state accessibility check: ${emptyStateAccessible ? "PASS" : "FAIL"}`);

    // Check 4: Restoring search filter returns cards and removes empty states
    console.log("Clearing search input...");
    await page.fill("#searchInput", "");
    await page.waitForTimeout(100);

    const restoredEvaluation = await page.evaluate(() => {
      const emptyStates = document.querySelectorAll(".empty-state--search");
      const allCards = Array.from(document.querySelectorAll(".match-card"));
      const visibleCards = allCards.filter((card) => {
        const style = window.getComputedStyle(card);
        return style.display !== "none" && style.visibility !== "hidden";
      });
      return {
        emptyStatesCount: emptyStates.length,
        visibleCardsCount: visibleCards.length,
        totalCardsCount: allCards.length,
      };
    });

    const searchRestored =
      restoredEvaluation.emptyStatesCount === 0 &&
      restoredEvaluation.visibleCardsCount === restoredEvaluation.totalCardsCount &&
      restoredEvaluation.visibleCardsCount > 0;

    results.checks.push({
      name: "Clearing search restores all match cards and removes empty-state display",
      passed: searchRestored,
      data: restoredEvaluation,
    });
    console.log(`Search clearing restoration check: ${searchRestored ? "PASS" : "FAIL"}`);

    // Check 5: Accessible network error container rendering
    console.log("Testing network error container rendering...");
    const errorStateEvaluation = await page.evaluate(() => {
      const container = document.getElementById("live-matches");
      window.renderErrorState(
        container,
        "Network connection lost. Please check your internet connection."
      );
      const errorDiv = container.querySelector(".error-state");
      const title = errorDiv?.querySelector(".error-state__title")?.textContent;
      const message = errorDiv?.querySelector(".error-state__message")?.textContent;
      const retryBtn = errorDiv?.querySelector(".error-state__retry-btn");

      return {
        hasErrorContainer: !!errorDiv,
        role: errorDiv?.getAttribute("role"),
        ariaLive: errorDiv?.getAttribute("aria-live"),
        title,
        message,
        hasRetryButton: !!retryBtn,
      };
    });

    const errorContainerPassed =
      errorStateEvaluation.hasErrorContainer &&
      errorStateEvaluation.role === "alert" &&
      errorStateEvaluation.ariaLive === "assertive" &&
      errorStateEvaluation.hasRetryButton &&
      errorStateEvaluation.message.includes("Network connection lost");

    results.checks.push({
      name: 'Network failure states render accessible error container (role="alert", aria-live="assertive", retry action)',
      passed: errorContainerPassed,
      data: errorStateEvaluation,
    });
    console.log(`Network error container check: ${errorContainerPassed ? "PASS" : "FAIL"}`);

    const allPassed = results.checks.every((c) => c.passed);
    results.passed = allPassed;

    fs.mkdirSync(reportDir, { recursive: true });
    fs.writeFileSync(reportFile, JSON.stringify(results, null, 2), "utf-8");
    console.log(`Saved report to ${reportFile}`);

    if (allPassed) {
      console.log("ALL CHECKS PASSED (exit code 0)");
      process.exitCode = 0;
    } else {
      console.error("SOME CHECKS FAILED");
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
