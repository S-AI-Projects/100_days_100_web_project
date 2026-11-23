import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "../../");
const reportDir = path.join(rootDir, "work/R60-T033");
const reportFile = path.join(reportDir, "results-latest.json");
const baselineFile = path.join(reportDir, "baseline.json");
const prBodyFile = path.join(reportDir, "pr-body.md");

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".ico": "image/x-icon",
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
      resolve({ server, port: address.port });
    });

    server.on("error", reject);
  });
}

async function runTest() {
  console.log("Starting R60-T033 stock-market-simulator empty/error state regression test...");

  fs.mkdirSync(reportDir, { recursive: true });

  const { server, port } = await startServer();
  console.log(`Local HTTP server running on http://127.0.0.1:${port}`);

  const pagePath = "/public/stock-market-simulator/index.html";
  const url = `http://127.0.0.1:${port}${pagePath}`;

  const sourceAnchors = ["#themeToggle", "#balance", "#portfolioValue", "#pl"];
  const testResults = {
    taskId: "R60-T033",
    page: "public/stock-market-simulator/index.html",
    timestamp: new Date().toISOString(),
    anchorsCheck: false,
    emptyStatesCheck: false,
    recoveryCheck: false,
    marketEmptyCheck: false,
    pageErrors: [],
  };

  let browser;

  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await context.newPage();

    const pageErrors = [];
    page.on("pageerror", (err) => pageErrors.push(err.message));
    page.on("console", (msg) => {
      if (msg.type() === "error") pageErrors.push(msg.text());
    });

    // Clear local storage first to ensure fresh empty state
    await page.addInitScript(() => {
      localStorage.clear();
    });

    await page.goto(url, { waitUntil: "domcontentloaded" });

    // 1. Verify source anchors
    for (const sel of sourceAnchors) {
      const count = await page.locator(sel).count();
      assert.ok(count > 0, `Expected anchor ${sel} to exist`);
    }
    const balanceText = await page.locator("#balance").textContent();
    assert.ok(balanceText.includes("100000"), "Balance should reflect initial amount ₹100000");
    testResults.anchorsCheck = true;
    console.log("Source anchors check: PASS");

    // 2. Verify initial empty states
    const portfolioEmpty = await page.locator("#portfolio-empty").count();
    assert.ok(portfolioEmpty > 0, "Expected empty portfolio placeholder to be displayed");
    const historyEmpty = await page.locator("#history-empty").count();
    assert.ok(historyEmpty > 0, "Expected empty history placeholder to be displayed");
    testResults.emptyStatesCheck = true;
    console.log("Initial empty states check: PASS");

    // 3. Exercise empty market fallback fixture
    await page.evaluate(() => {
      // Simulate empty market data fixture
      window.stockSim.prices = {};
      window.stockSim.renderMarket();
    });
    const marketEmptyCount = await page.locator("#market-empty").count();
    assert.ok(marketEmptyCount > 0, "Expected #market-empty fallback when no stock data is available");
    testResults.marketEmptyCheck = true;
    console.log("Market empty state fallback check: PASS");

    // 4. Exercise recovery from empty to active state
    await page.evaluate(() => {
      // Restore prices and purchase a stock
      const newPrices = {};
      marketEngine.stocks.forEach(s => {
        newPrices[s.symbol] = s.basePrice;
      });
      window.stockSim.prices = newPrices;
      window.stockSim.renderMarket();

      // Simulate buying 5 shares of AAPL
      window.stockSim.portfolio = { AAPL: { quantity: 5, avgPrice: 175.00 } };
      window.stockSim.history = [new Date().toLocaleTimeString() + " - Bought 5 AAPL @ ₹175.00"];
      window.stockSim.renderAll();
      window.stockSim.renderHistory();
    });

    const emptyCountAfterBuy = await page.locator("#portfolio-empty").count();
    assert.equal(emptyCountAfterBuy, 0, "Empty portfolio placeholder must disappear after holding a stock");

    const portfolioItemCount = await page.locator(".portfolio-item").count();
    assert.ok(portfolioItemCount > 0, "Portfolio item must be displayed after acquiring shares");

    const historyItemCount = await page.locator(".history-item").count();
    assert.ok(historyItemCount > 0, "Transaction item must appear in transaction history");

    testResults.recoveryCheck = true;
    console.log("State recovery after valid input check: PASS");

    // 5. Verify no unexpected uncaught errors
    assert.equal(pageErrors.length, 0, `Unexpected page errors: ${pageErrors.join(", ")}`);
    testResults.pageErrors = pageErrors;
    console.log("Page errors check: PASS (0 errors)");

    // Save screenshot evidence
    const screenshotPath = path.join(reportDir, "empty-and-recovery.png");
    await page.screenshot({ path: screenshotPath, fullPage: true });

    // Write baseline metadata
    const baseline = {
      task: "R60-T033",
      description: "stock-market-simulator empty and error state regression",
      dateRecorded: new Date().toISOString(),
      sourceAnchors,
      baselineObservation: "Initial state lacked structured semantic empty-state placeholders in market and portfolio; added resilient empty states and verified recovery upon stock transactions.",
    };
    fs.writeFileSync(baselineFile, JSON.stringify(baseline, null, 2));
    fs.writeFileSync(reportFile, JSON.stringify(testResults, null, 2));

    const prBody = `## Description
This pull request implements and verifies empty, fallback, and recovery states for **Stock Market Simulator** (\`public/stock-market-simulator\`) as specified in task \`R60-T033\` for [Issue #33](https://github.com/S-AI-Projects/100_days_100_web_project/issues/33).

### Problem Solved
Previously, when market prices were uninitialized or empty, the market table rendered without an informative fallback. Portfolio and history sections rendered plain text strings rather than structured, accessible empty states.

### Changes Made
1. **\`public/stock-market-simulator/script.js\`**:
   - Added \`#market-empty\` table row fallback when stock feeds or price fixtures are unavailable.
   - Structured \`#portfolio-empty\` and \`#history-empty\` components with clear feedback.
   - Verified clean transition and recovery between empty holdings and active holdings.
2. **\`public/stock-market-simulator/README.md\`**:
   - Added Testing & Verification documentation with execution command \`node tests/course/r60-t033.mjs\`.
3. **\`tests/course/r60-t033.mjs\`**:
   - Automated test suite asserting source anchors (\`#themeToggle\`, \`#balance\`, \`#portfolioValue\`, \`#pl\`), initial empty states, empty market fallback, state recovery upon purchasing shares, and 0 console errors.
4. **\`work/R60-T033/\`**:
   - Verification evidence, test report, baseline metrics, and visual artifact screenshot.

## Related Issue
Fixes #33

## Type of Change
- [x] Bug fix (empty and fallback state improvements)
- [x] Documentation update
- [x] Tests (Playwright automated regression suite)

## Testing
- Command: \`node tests/course/r60-t033.mjs\`
- Result: **PASS** (exit code 0)

## Checklist
- [x] Meaningful empty and fallback states are displayed and recover on valid input.
- [x] No uncaught page or console errors are logged.
- [x] Regression test exits 0 on success, non-zero on failure.
`;
    fs.writeFileSync(prBodyFile, prBody);

    console.log("Saved test report to", reportFile);
    console.log("Saved baseline records to", baselineFile);
    console.log("Saved PR body description to", prBodyFile);
    console.log("\nALL CHECKS PASSED (exit code 0)");

    await context.close();
  } finally {
    if (browser) await browser.close();
    server.close();
  }
}

runTest().catch((err) => {
  console.error("Test execution failed with error:", err);
  process.exit(1);
});
