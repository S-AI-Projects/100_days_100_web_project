import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "../../");
const reportDir = path.join(rootDir, "work/R60-T039");
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
        baseUrl: `http://127.0.0.1:${port}/public/movie-watchlist/`,
      });
    });

    server.on("error", reject);
  });
}

const mockMovie = {
  Response: "True",
  imdbID: "tt0111161",
  Title: "The Shawshank Redemption",
  Year: "1994",
  Poster: "https://via.placeholder.com/60x90",
  Genre: "Drama",
  imdbRating: "9.3",
  Runtime: "142 min",
};

async function runChecks() {
  fs.mkdirSync(reportDir, { recursive: true });

  const { server, baseUrl } = await startServer();
  let browser;

  const results = {
    task: "R60-T039",
    student: "Ayushi Sinha",
    page: "public/movie-watchlist/index.html",
    sourceAnchors: ["#search-input", "#search-btn", "#movie-result", "#stats-bar"],
    viewportsTested: [
      { width: 360, height: 640, label: "mobile" },
      { width: 1280, height: 800, label: "desktop" },
    ],
    tests: [],
  };

  try {
    browser = await chromium.launch({ headless: true });

    // 1. Record baseline behavior with default motion
    {
      const context = await browser.newContext({
        viewport: { width: 1280, height: 800 },
      });
      const page = await context.newPage();
      await page.goto(baseUrl, { waitUntil: "domcontentloaded" });

      const baselineMotionDuration = await page.evaluate(() => {
        const testEl = document.createElement("div");
        testEl.className = "fade-in";
        document.body.appendChild(testEl);
        const style = window.getComputedStyle(testEl);
        const dur = style.animationDuration;
        testEl.remove();
        return dur;
      });

      fs.writeFileSync(
        baselineFile,
        JSON.stringify(
          {
            description: "Baseline motion and focus state before reduced-motion and focus-visible enhancements",
            defaultAnimationDuration: baselineMotionDuration,
            timestamp: new Date().toISOString(),
          },
          null,
          2
        )
      );

      await context.close();
    }

    // 2. Test both viewports with reduced motion and keyboard focus
    for (const vp of results.viewportsTested) {
      const pageErrors = [];
      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        reducedMotion: "reduce",
      });

      const page = await context.newPage();
      page.on("pageerror", (err) => pageErrors.push(err.message));

      // Mock OMDb API route
      await page.route("https://www.omdbapi.com/**", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(mockMovie),
        });
      });

      await page.goto(baseUrl, { waitUntil: "networkidle" });

      // Verify source anchors exist
      for (const selector of results.sourceAnchors) {
        const el = await page.$(selector);
        assert.ok(el, `Anchor ${selector} must exist in DOM at ${vp.label}`);
      }

      // Check reduced motion duration
      const reducedAnimationDuration = await page.evaluate(() => {
        const testEl = document.createElement("div");
        testEl.className = "fade-in";
        document.body.appendChild(testEl);
        const style = window.getComputedStyle(testEl);
        const dur = style.animationDuration;
        testEl.remove();
        return dur;
      });

      const isReduced =
        reducedAnimationDuration === "0.00001s" ||
        reducedAnimationDuration === "0s" ||
        parseFloat(reducedAnimationDuration) <= 0.001;

      assert.ok(
        isReduced,
        `Expected animation duration under reduced motion to be <= 0.001s, got ${reducedAnimationDuration}`
      );

      // Verify keyboard navigation and focus visibility
      await page.focus("#search-input");
      await page.keyboard.press("Tab");

      const activeId = await page.evaluate(() => document.activeElement?.id);
      assert.strictEqual(
        activeId,
        "search-btn",
        `Expected Tab from search-input to focus search-btn, got: ${activeId}`
      );

      const focusOutline = await page.evaluate(() => {
        const btn = document.getElementById("search-btn");
        const style = window.getComputedStyle(btn);
        return {
          outlineStyle: style.outlineStyle,
          outlineWidth: style.outlineWidth,
          outlineColor: style.outlineColor,
        };
      });

      assert.notStrictEqual(
        focusOutline.outlineStyle,
        "none",
        `Focus outlineStyle must not be none at ${vp.label}`
      );
      assert.ok(
        parseFloat(focusOutline.outlineWidth) > 0,
        `Focus outlineWidth must be > 0 at ${vp.label}, got ${focusOutline.outlineWidth}`
      );

      // Functional test: search and add to watchlist
      await page.fill("#search-input", "The Shawshank Redemption");
      await page.click("#search-btn");

      await page.waitForSelector("#add-to-list-btn", { state: "visible", timeout: 5000 });
      await page.click("#add-to-list-btn");

      // Verify watchlist item added and stats bar updated
      await page.waitForSelector(".watch-item", { state: "visible", timeout: 5000 });
      const statsText = await page.textContent("#stats-bar");
      assert.ok(statsText.includes("Total movies"), "Stats bar must render total movies stat");

      assert.strictEqual(
        pageErrors.length,
        0,
        `Unexpected page errors at ${vp.label}: ${pageErrors.join(", ")}`
      );

      results.tests.push({
        viewport: vp.label,
        width: vp.width,
        height: vp.height,
        anchorsVerified: true,
        reducedMotionEnforced: isReduced,
        reducedAnimationDuration,
        keyboardFocusVisible: true,
        focusOutline,
        functionalSearchAndAddPassed: true,
        errors: 0,
      });

      await context.close();
    }

    fs.writeFileSync(reportFile, JSON.stringify(results, null, 2));

    const prBody = `### Task R60-T039: Respect motion and focus preferences in public/movie-watchlist

#### 1. Baseline Summary
- Baseline styles in \`public/movie-watchlist/style.css\` contained transitions and \`fadeInUp\` / \`spin\` animations without a \`prefers-reduced-motion\` media query.
- Interactive buttons lacked dedicated high-contrast \`:focus-visible\` indicator styling.

#### 2. Changes Made
- Added \`@media (prefers-reduced-motion: reduce)\` rule to minimize animation and transition durations to \`0.01ms !important\`.
- Added clear \`:focus-visible\` and \`button:focus-visible\` outline rules for accessible keyboard navigation.
- Updated \`public/movie-watchlist/README.md\` with documentation on accessibility and automated testing.
- Created Playwright regression test suite \`tests/course/r60-t039.mjs\` testing both 360px mobile and 1280px desktop viewports.

#### 3. Verification & Evidence
- \`node tests/course/r60-t039.mjs\` passed with exit code 0.
- All source anchors (\`#search-input\`, \`#search-btn\`, \`#movie-result\`, \`#stats-bar\`) validated.
- Tested keyboard Tab focus navigation and focus outline visibility at both widths.
- Verified functional search, add to watchlist, and statistics update with OMDb API mocked.
- Evidence saved to \`work/R60-T039/\`.
`;
    fs.writeFileSync(prBodyFile, prBody);
    console.log("R60-T039 checks passed successfully.");
  } finally {
    if (browser) await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
}

runChecks().catch((err) => {
  console.error("R60-T039 check failed:", err);
  process.exit(1);
});
