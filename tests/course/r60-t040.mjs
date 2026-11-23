import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "../../");
const reportDir = path.join(rootDir, "work/R60-T040");
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
      res.writeHead(200, {
        "Content-Type": MIME_TYPES[ext] || "application/octet-stream",
        "Cache-Control": "no-store",
      });
      fs.createReadStream(filePath).pipe(res);
    });

    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      resolve({
        server,
        port,
        baseUrl: `http://127.0.0.1:${port}/public/StatisticsDashboard/`,
      });
    });

    server.on("error", reject);
  });
}

async function testPage(page, options = {}) {
  const { expectWinRate } = options;

  // Verify source anchors
  const anchors = ["#totalGamesInput", "#xWinsInput", "#oWinsInput", "#drawsInput"];
  for (const selector of anchors) {
    const el = await page.$(selector);
    assert.ok(el, `Anchor ${selector} must exist in DOM`);
  }

  // Fill in sample game stats
  await page.fill("#totalGamesInput", "10");
  await page.dispatchEvent("#totalGamesInput", "input");

  await page.fill("#xWinsInput", "6");
  await page.dispatchEvent("#xWinsInput", "input");

  await page.fill("#oWinsInput", "3");
  await page.dispatchEvent("#oWinsInput", "input");

  await page.fill("#drawsInput", "1");
  await page.dispatchEvent("#drawsInput", "input");

  // Read summary cards
  const totalDisplay = (await page.textContent("#totalGamesDisplay")).trim();
  const xWinsDisplay = (await page.textContent("#xWinsDisplay")).trim();
  const oWinsDisplay = (await page.textContent("#oWinsDisplay")).trim();
  const drawsDisplay = (await page.textContent("#drawsDisplay")).trim();
  const winRateText = (await page.textContent("#winRateX")).trim();

  assert.strictEqual(totalDisplay, "10", `Expected totalGamesDisplay to be 10, got ${totalDisplay}`);
  assert.strictEqual(xWinsDisplay, "6", `Expected xWinsDisplay to be 6, got ${xWinsDisplay}`);
  assert.strictEqual(oWinsDisplay, "3", `Expected oWinsDisplay to be 3, got ${oWinsDisplay}`);
  assert.strictEqual(drawsDisplay, "1", `Expected drawsDisplay to be 1, got ${drawsDisplay}`);

  // Win rate assertion (Player X win rate for 6 wins out of 10 games = 60.0%)
  assert.strictEqual(
    winRateText,
    expectWinRate || "60.0%",
    `Expected Player X Win Rate to be ${expectWinRate || "60.0%"}, got ${winRateText}`
  );

  return {
    totalDisplay,
    xWinsDisplay,
    oWinsDisplay,
    drawsDisplay,
    winRateText,
  };
}

async function runChecks() {
  fs.mkdirSync(reportDir, { recursive: true });

  const { server, baseUrl } = await startServer();
  let browser;

  const results = {
    task: "R60-T040",
    student: "Ayushi Sinha",
    page: "public/StatisticsDashboard/index.html",
    sourceAnchors: ["#totalGamesInput", "#xWinsInput", "#oWinsInput", "#drawsInput"],
    runs: {},
  };

  try {
    browser = await chromium.launch({ headless: true });

    // 1. Run correct page test
    console.log("Running correct page verification...");
    {
      const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
      const page = await context.newPage();
      const pageErrors = [];
      page.on("pageerror", (err) => pageErrors.push(err.message));

      await page.goto(baseUrl, { waitUntil: "networkidle" });
      const baselineResult = await testPage(page);

      // Save statistics and test storage persistence
      await page.click("#saveStats");
      await page.waitForTimeout(100);

      const message = await page.textContent("#messageBox");
      assert.ok(
        message.includes("Statistics saved successfully"),
        `Expected success message on save, got: ${message}`
      );

      const storedStats = await page.evaluate(() => localStorage.getItem("stats"));
      assert.ok(storedStats, "Stats must be saved to localStorage");
      const parsed = JSON.parse(storedStats);
      assert.strictEqual(parsed.total, 10);
      assert.strictEqual(parsed.xWins, 6);

      // Test increment button
      await page.click('.increase[data-target="totalGamesInput"]');
      const incrementedTotal = await page.$eval("#totalGamesInput", (el) => el.value);
      assert.strictEqual(incrementedTotal, "11", "Increment button must update input value to 11");

      assert.strictEqual(pageErrors.length, 0, `Page errors: ${pageErrors.join(", ")}`);

      results.runs.correctPage = {
        passed: true,
        baselineResult,
        savedToLocalStorage: true,
        incrementButtonVerified: true,
        errors: 0,
      };

      fs.writeFileSync(
        baselineFile,
        JSON.stringify(
          {
            description: "Baseline visible behavior for Statistics Dashboard",
            baselineResult,
            savedToLocalStorage: true,
            timestamp: new Date().toISOString(),
          },
          null,
          2
        )
      );

      await context.close();
    }

    // 2. Run deliberate mutation test to verify regression detection
    console.log("Running deliberate fixture mutation regression check...");
    {
      const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
      const page = await context.newPage();

      // Intercept script.js and introduce a deliberate calculation defect
      // (e.g. win rate calculation omits the * 100 multiplier)
      await page.route("**/script.js", async (route) => {
        const originalResponse = await route.fetch();
        const text = await originalResponse.text();
        const mutatedText = text.replace(
          "((stats.xWins / stats.total) * 100).toFixed(1)",
          "((stats.xWins / stats.total)).toFixed(1)" // Deliberate bug: gives 0.6% instead of 60.0%
        );
        await route.fulfill({
          status: 200,
          contentType: "application/javascript",
          body: mutatedText,
        });
      });

      await page.goto(baseUrl, { waitUntil: "networkidle" });

      let mutationCaught = false;
      let mutationError = null;

      try {
        await testPage(page, { expectWinRate: "60.0%" });
      } catch (err) {
        mutationCaught = true;
        mutationError = err.message;
      }

      assert.ok(
        mutationCaught,
        "The test assertion must detect the deliberate win rate calculation regression in the test fixture"
      );
      assert.ok(
        mutationError.includes("Expected Player X Win Rate to be 60.0%"),
        `Expected failure message to pinpoint win rate difference, got: ${mutationError}`
      );

      results.runs.mutatedFixture = {
        mutationCaught: true,
        detectedError: mutationError,
      };

      console.log("Mutation successfully caught by assertion:", mutationError);
      await context.close();
    }

    fs.writeFileSync(reportFile, JSON.stringify(results, null, 2));

    const prBody = `### Task R60-T040: Catch a plausible UI regression in public/StatisticsDashboard

#### 1. Baseline Summary
- \`public/StatisticsDashboard/index.html\` provides game statistics tracking with source anchors \`#totalGamesInput\`, \`#xWinsInput\`, \`#oWinsInput\`, and \`#drawsInput\`.
- Tested baseline behavior: setting total games = 10 and player X wins = 6 correctly calculates player X win rate as 60.0%, updates summary cards, and persists to localStorage on save.

#### 2. Changes & Regression Test
- Enhanced \`public/StatisticsDashboard/script.js\` to dispatch \`input\` events when increment and decrement buttons are pressed, ensuring immediate reactive updates.
- Added automated Playwright regression test suite \`tests/course/r60-t040.mjs\`:
  - Validates correct behavior, storage persistence, and reactive updates on the production application.
  - Tests against a deliberate fixture mutation (intercepting win rate calculation logic) to verify that the assertion strictly catches behavioral regressions and fails with an informative error.
  - Confirms the final repository application contains no mutation.
- Updated \`public/StatisticsDashboard/README.md\` with documentation and test execution commands.

#### 3. Verification & Evidence
- \`node tests/course/r60-t040.mjs\` passed with exit code 0.
- Source anchors verified: \`#totalGamesInput\`, \`#xWinsInput\`, \`#oWinsInput\`, \`#drawsInput\`.
- Deliberate fixture mutation caught and rejected by strict assertion.
- Evidence saved to \`work/R60-T040/\`.
`;
    fs.writeFileSync(prBodyFile, prBody);
    console.log("R60-T040 checks passed successfully.");
  } finally {
    if (browser) await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
}

runChecks().catch((err) => {
  console.error("R60-T040 check failed:", err);
  process.exit(1);
});
