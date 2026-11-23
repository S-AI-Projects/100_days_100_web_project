import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "../../");
const reportDir = path.join(rootDir, "work/R60-T035");
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
  ".webp": "image/webp",
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
  console.log("Starting R60-T035 Chronosphere deterministic browser fixture regression test...");

  fs.mkdirSync(reportDir, { recursive: true });

  const { server, port } = await startServer();
  console.log(`Local HTTP server running on http://127.0.0.1:${port}`);

  const pagePath = "/public/Chronosphere/index.html";
  const url = `http://127.0.0.1:${port}${pagePath}`;

  const sourceAnchors = ["#aboutLink", "#aboutModal", "#aboutClose", "#aboutTitle"];
  const testResults = {
    taskId: "R60-T035",
    page: "public/Chronosphere/index.html",
    timestamp: new Date().toISOString(),
    anchorsCheck: false,
    deterministicMatch: false,
    rounds: [],
    pageErrors: [],
  };

  let browser;

  try {
    browser = await chromium.launch({ headless: true });

    const roundStates = [];

    for (let round = 1; round <= 2; round++) {
      console.log(`Executing verification Round ${round}...`);
      const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
      const page = await context.newPage();

      const pageErrors = [];
      page.on("pageerror", (err) => pageErrors.push(err.message));
      page.on("console", (msg) => {
        if (msg.type() === "error") pageErrors.push(msg.text());
      });

      // Deterministic fixture: stub Math.random with a seeded linear congruential generator
      await page.addInitScript(() => {
        let seed = 42;
        Math.random = function () {
          seed = (seed * 9301 + 49297) % 233280;
          return seed / 233280;
        };
      });

      // Block any external requests so test never depends on external network
      await page.route("**/*", (route) => {
        const reqUrl = route.request().url();
        if (reqUrl.startsWith("http://127.0.0.1:") || reqUrl.startsWith("http://localhost:")) {
          return route.continue();
        }
        return route.abort();
      });

      await page.goto(url, { waitUntil: "domcontentloaded" });
      await page.waitForSelector(".card", { timeout: 5000 });

      // Verify all source anchors
      for (const sel of sourceAnchors) {
        const count = await page.locator(sel).count();
        assert.ok(count > 0, `Expected anchor ${sel} to exist in Round ${round}`);
      }

      // Assert modal behavior
      const modalBefore = await page.locator("#aboutModal").getAttribute("aria-hidden");
      assert.equal(modalBefore, "true", "Modal should initially be hidden");

      await page.click("#aboutLink");
      const modalAfterOpen = await page.locator("#aboutModal").getAttribute("aria-hidden");
      assert.equal(modalAfterOpen, "false", "Modal should be visible after clicking aboutLink");

      await page.click("#aboutClose");
      const modalAfterClose = await page.locator("#aboutModal").getAttribute("aria-hidden");
      assert.equal(modalAfterClose, "true", "Modal should be hidden after clicking aboutClose");

      // Extract deterministic DOM state
      const stateSummary = await page.evaluate(() => {
        const cards = Array.from(document.querySelectorAll(".card"));
        return {
          cardCount: cards.length,
          cardTitles: cards.slice(0, 5).map((c) => c.querySelector("h3")?.textContent?.trim()),
          categoryOptions: Array.from(document.querySelectorAll("#categoryFilter option")).map((o) => o.value),
          eraOptions: Array.from(document.querySelectorAll("#eraFilter option")).map((o) => o.value),
        };
      });

      assert.ok(stateSummary.cardCount > 0, "Timeline cards must be rendered");
      assert.ok(stateSummary.categoryOptions.length > 1, "Category filter options must be present");

      if (round === 1) {
        const screenshotPath = path.join(reportDir, "deterministic-check.png");
        await page.screenshot({ path: screenshotPath, fullPage: true });
      }

      roundStates.push(stateSummary);
      testResults.rounds.push({ round, stateSummary, pageErrors });

      assert.equal(pageErrors.length, 0, `Round ${round} encountered page errors: ${pageErrors.join(", ")}`);
      await context.close();
    }

    // Assert exact equality between round 1 and round 2 states
    assert.deepEqual(
      roundStates[0],
      roundStates[1],
      "DOM state between two fresh browser contexts must match identically"
    );

    testResults.anchorsCheck = true;
    testResults.deterministicMatch = true;
    console.log("Source anchors check: PASS");
    console.log("Deterministic cross-context match check: PASS");
    console.log("Page errors check: PASS (0 errors across rounds)");

    // Write baseline metadata
    const baseline = {
      task: "R60-T035",
      description: "Chronosphere deterministic browser fixtures and cross-context assertions",
      dateRecorded: new Date().toISOString(),
      sourceAnchors,
      baselineObservation: "Page uses local events.json and canvas starfield; locked random generator and isolated network requests to ensure identical DOM rendering across runs.",
    };
    fs.writeFileSync(baselineFile, JSON.stringify(baseline, null, 2));
    fs.writeFileSync(reportFile, JSON.stringify(testResults, null, 2));

    const prBody = `## Description
This pull request introduces deterministic regression testing for **Chronosphere** (\`public/Chronosphere\`) as specified in task \`R60-T035\` for [Issue #35](https://github.com/S-AI-Projects/100_days_100_web_project/issues/35).

### Problem Solved
Browser tests that rely on external requests, clock timing, or unseeded Math.random can suffer from non-deterministic execution. This change establishes local fixtures and deterministic guarantees.

### Changes Made
1. **\`tests/course/r60-t035.mjs\`**:
   - Automated regression test running two isolated browser contexts.
   - Enforces seeded pseudo-randomness and aborts unexpected external network calls.
   - Asserts source anchors (\`#aboutLink\`, \`#aboutModal\`, \`#aboutClose\`, \`#aboutTitle\`), modal accessibility states (\`aria-hidden\`), and identical DOM output across rounds.
2. **\`public/Chronosphere/README.md\`**:
   - Added Testing & Verification documentation with test command \`node tests/course/r60-t035.mjs\`.
3. **\`work/R60-T035/\`**:
   - Verification evidence, baseline metrics, test output, and visual screenshot.

## Related Issue
Fixes #35

## Type of Change
- [x] Documentation update
- [x] Tests (Playwright deterministic regression suite)

## Testing
- Command: \`node tests/course/r60-t035.mjs\`
- Result: **PASS** (exit code 0 across multiple fresh browser contexts)

## Checklist
- [x] Two fresh browser contexts produce identical asserted DOM states.
- [x] Test does not depend on public API availability.
- [x] Zero console or page errors detected.
`;
    fs.writeFileSync(prBodyFile, prBody);

    console.log("Saved test report to", reportFile);
    console.log("Saved baseline records to", baselineFile);
    console.log("Saved PR body description to", prBodyFile);
    console.log("\nALL CHECKS PASSED (exit code 0)");
  } finally {
    if (browser) await browser.close();
    server.close();
  }
}

runTest().catch((err) => {
  console.error("Test execution failed with error:", err);
  process.exit(1);
});
