import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "../../");
const reportDir = path.join(rootDir, "work/R60-T015");
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

// Deterministic mock fixtures
const MOCK_DISCOVER_RESPONSE = {
  page: 1,
  results: [
    {
      id: 27205,
      title: "Inception",
      overview:
        "Cobb, a skilled thief who commits corporate espionage by infiltrating subconscious minds, is offered a chance to regain his old life.",
      release_date: "2010-07-15",
      vote_average: 8.4,
      poster_path: "/oYuLEt3zVCKq57qu2F8dT7NIa6f.jpg",
      genre_ids: [28, 878, 12],
    },
    {
      id: 157336,
      title: "Interstellar",
      overview:
        "The adventures of a group of explorers who make use of a newly discovered wormhole to surpass the limitations of human space travel.",
      release_date: "2014-11-05",
      vote_average: 8.4,
      poster_path: "/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg",
      genre_ids: [12, 18, 878],
    },
  ],
  total_pages: 1,
  total_results: 2,
};

const MOCK_SVG_IMAGE =
  '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="600"><rect width="400" height="600" fill="#1b2336"/><text x="50%" y="50%" fill="#94a3b8" text-anchor="middle" font-family="sans-serif" font-size="20">Movie Poster</text></svg>';

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

async function setupDeterministicContext(browser, interceptRequests = true) {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 1,
  });

  // Seeded PRNG & deterministic environment injection
  await context.addInitScript(() => {
    // Seeded linear congruential generator for reproducible Math.random
    let seed = 42;
    Math.random = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };

    window.TMDB_API_KEY = "deterministic_test_key";

    window.__openedUrls = [];
    window.open = (url) => {
      window.__openedUrls.push(url);
      return null;
    };

    window.__alertMessages = [];
    window.alert = (msg) => {
      window.__alertMessages.push(msg);
    };
  });

  if (interceptRequests) {
    // Intercept TMDb API requests with deterministic local JSON fixture
    await context.route("**/*api.themoviedb.org/3/discover/movie*", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_DISCOVER_RESPONSE),
      });
    });

    // Intercept external image requests with deterministic SVG fixture
    await context.route("**/*image.tmdb.org/**", (route) => {
      route.fulfill({
        status: 200,
        contentType: "image/svg+xml",
        body: MOCK_SVG_IMAGE,
      });
    });

    await context.route("**/*images.unsplash.com/**", (route) => {
      route.fulfill({
        status: 200,
        contentType: "image/svg+xml",
        body: MOCK_SVG_IMAGE,
      });
    });
  }

  return context;
}

async function runScenario(page, port) {
  const targetUrl = `http://127.0.0.1:${port}/public/movie-selector/index.html`;
  await page.goto(targetUrl, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(150);

  // 1. Click genre dropdown trigger
  const genreTrigger = page.locator("#genreTrigger");
  await genreTrigger.click();
  await page.waitForTimeout(100);

  // 2. Select genres: Action (28) and Sci-Fi (878)
  const actionCheckbox = page.locator('#genreMenu input[value="28"]');
  const scifiCheckbox = page.locator('#genreMenu input[value="878"]');
  await actionCheckbox.check();
  await scifiCheckbox.check();
  await page.waitForTimeout(100);

  // 3. Click Find Movie
  const findMovieBtn = page.locator("#findMovieBtn");
  await findMovieBtn.click();

  // 4. Wait for movie card to appear
  const movieCard = page.locator("#movieCard");
  await movieCard.waitFor({ state: "visible", timeout: 5000 });

  // 5. Save movie to watchlist
  const saveBtn = page.locator("#saveBtn");
  await saveBtn.click();
  await page.waitForTimeout(100);

  // 6. Click trailer button
  const trailerBtn = page.locator("#trailerBtn");
  await trailerBtn.click();
  await page.waitForTimeout(50);

  // Extract snapshot of asserted state
  const stateSnapshot = await page.evaluate(() => {
    const title = document.getElementById("movieTitle")?.textContent.trim();
    const rating = document.getElementById("movieRating")?.textContent.trim();
    const release = document.getElementById("movieReleaseDate")?.textContent.trim();
    const overview = document.getElementById("movieOverview")?.textContent.trim();
    const posterSrc = document.getElementById("moviePoster")?.getAttribute("src");
    const saveBtnText = document.getElementById("saveBtn")?.textContent.trim();
    const genreLabel = document.getElementById("genreTriggerLabel")?.textContent.trim();

    const watchlistCount = document.getElementById("watchlistCount")?.textContent.trim();
    const watchlistItemTitles = Array.from(
      document.querySelectorAll("#watchlistGrid .wl-title")
    ).map((el) => el.textContent.trim());

    const openedUrls = window.__openedUrls || [];
    const alerts = window.__alertMessages || [];

    const cardRect = document.getElementById("movieCard")?.getBoundingClientRect();

    return {
      movie: {
        title,
        rating,
        release,
        overview,
        posterSrc,
        saveBtnText,
      },
      genreLabel,
      watchlist: {
        count: watchlistCount,
        titles: watchlistItemTitles,
      },
      openedUrls,
      alerts,
      layout: {
        cardWidth: Math.round(cardRect?.width || 0),
        cardHeight: Math.round(cardRect?.height || 0),
      },
    };
  });

  return stateSnapshot;
}

async function runTest() {
  console.log("Starting R60-T015 Movie Selector deterministic browser fixtures verification...");

  const results = {
    taskId: "R60-T015",
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
    const probeContext = await setupDeterministicContext(browser, true);
    const probePage = await probeContext.newPage();

    probePage.on("pageerror", (err) => {
      pageErrors.push(err.message);
      console.error("Page error detected:", err.message);
    });

    probePage.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
        console.error("Console error detected:", msg.text());
      }
    });

    await probePage.goto(`http://127.0.0.1:${port}/public/movie-selector/index.html`, {
      waitUntil: "domcontentloaded",
    });

    const anchors = await probePage.evaluate(() => {
      const wrapper = document.getElementById("genreDropdownWrapper");
      const trigger = document.getElementById("genreTrigger");
      const label = document.getElementById("genreTriggerLabel");
      const menu = document.getElementById("genreMenu");

      return {
        wrapperExists: !!wrapper,
        wrapperTag: wrapper?.tagName,
        triggerExists: !!trigger,
        triggerTag: trigger?.tagName,
        labelExists: !!label,
        labelText: label?.textContent.trim(),
        menuExists: !!menu,
        menuIsHidden: menu?.classList.contains("hidden"),
        checkboxCount: menu?.querySelectorAll('input[type="checkbox"]').length,
      };
    });

    const anchorsPassed =
      anchors.wrapperExists &&
      anchors.wrapperTag === "DIV" &&
      anchors.triggerExists &&
      anchors.triggerTag === "BUTTON" &&
      anchors.labelExists &&
      anchors.labelText === "Choose genre(s)…" &&
      anchors.menuExists &&
      anchors.menuIsHidden === true &&
      anchors.checkboxCount >= 12;

    results.checks.push({
      name: "Source anchors exist (#genreDropdownWrapper, #genreTrigger, #genreTriggerLabel, #genreMenu)",
      passed: anchorsPassed,
      data: anchors,
    });
    console.log(`Source anchors check: ${anchorsPassed ? "PASS" : "FAIL"}`);

    // ==========================================
    // Check 2: Dropdown Toggle & Selection Behavior
    // ==========================================
    await probePage.locator("#genreTrigger").click();
    await probePage.waitForTimeout(50);
    const menuOpenState = await probePage.evaluate(() => {
      const menu = document.getElementById("genreMenu");
      const trigger = document.getElementById("genreTrigger");
      return {
        menuVisible: !menu?.classList.contains("hidden"),
        triggerOpen: trigger?.classList.contains("open"),
        ariaExpanded: trigger?.getAttribute("aria-expanded"),
      };
    });

    // Click outside to verify auto-close
    await probePage.locator("h1").click();
    await probePage.waitForTimeout(50);
    const menuClosedState = await probePage.evaluate(() => {
      const menu = document.getElementById("genreMenu");
      const trigger = document.getElementById("genreTrigger");
      return {
        menuHidden: menu?.classList.contains("hidden"),
        triggerClosed: !trigger?.classList.contains("open"),
      };
    });

    const dropdownPassed =
      menuOpenState.menuVisible &&
      menuOpenState.triggerOpen &&
      menuClosedState.menuHidden &&
      menuClosedState.triggerClosed;

    results.checks.push({
      name: "Genre dropdown toggles open and closes upon outside click with accessible attributes",
      passed: dropdownPassed,
      data: { menuOpenState, menuClosedState },
    });
    console.log(`Dropdown toggle check: ${dropdownPassed ? "PASS" : "FAIL"}`);

    await probeContext.close();

    // ==========================================
    // Check 3: Deterministic Execution in Context 1
    // ==========================================
    console.log("Running scenario in Context 1...");
    const context1 = await setupDeterministicContext(browser, true);
    const page1 = await context1.newPage();
    page1.on("pageerror", (err) => pageErrors.push(err.message));
    page1.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });
    const state1 = await runScenario(page1, port);
    await context1.close();

    const context1Valid =
      state1.movie.title === "Interstellar" &&
      state1.movie.rating === "⭐ 8.4" &&
      state1.movie.release === "2014" &&
      state1.movie.saveBtnText === "♥ Saved" &&
      state1.watchlist.count === "1" &&
      state1.watchlist.titles.includes("Interstellar") &&
      state1.openedUrls.some((u) => u.includes("Interstellar") && u.includes("trailer"));

    results.checks.push({
      name: "Context 1 produces expected asserted state using local network & asset fixtures",
      passed: context1Valid,
      data: state1,
    });
    console.log(`Context 1 scenario check: ${context1Valid ? "PASS" : "FAIL"}`);

    // ==========================================
    // Check 4: Deterministic Execution in Context 2 (Fresh Context)
    // ==========================================
    console.log("Running scenario in Fresh Context 2...");
    const context2 = await setupDeterministicContext(browser, true);
    const page2 = await context2.newPage();
    page2.on("pageerror", (err) => pageErrors.push(err.message));
    page2.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });
    const state2 = await runScenario(page2, port);
    await context2.close();

    const context2Valid =
      state2.movie.title === "Interstellar" &&
      state2.movie.rating === "⭐ 8.4" &&
      state2.movie.release === "2014" &&
      state2.movie.saveBtnText === "♥ Saved" &&
      state2.watchlist.count === "1" &&
      state2.watchlist.titles.includes("Interstellar");

    results.checks.push({
      name: "Context 2 produces expected asserted state in fresh browser context",
      passed: context2Valid,
      data: state2,
    });
    console.log(`Context 2 scenario check: ${context2Valid ? "PASS" : "FAIL"}`);

    // ==========================================
    // Check 5: Cross-Context Deterministic State Identity
    // ==========================================
    const json1 = JSON.stringify(state1);
    const json2 = JSON.stringify(state2);
    const stateIdentityPassed = json1 === json2;

    results.checks.push({
      name: "Two fresh browser contexts produce byte-for-byte identical asserted DOM & layout state",
      passed: stateIdentityPassed,
      data: {
        state1,
        state2,
        identical: stateIdentityPassed,
      },
    });
    console.log(`Cross-context identity check: ${stateIdentityPassed ? "PASS" : "FAIL"}`);

    // ==========================================
    // Check 6: Safe Offline Local Fallback (No API Key Required)
    // ==========================================
    console.log("Testing offline fallback behavior when no API key is provided...");
    const fallbackContext = await browser.newContext({
      viewport: { width: 1280, height: 800 },
    });
    // In this context, do NOT set window.TMDB_API_KEY
    await fallbackContext.addInitScript(() => {
      delete window.TMDB_API_KEY;
    });

    const fallbackPage = await fallbackContext.newPage();
    fallbackPage.on("pageerror", (err) => pageErrors.push(err.message));
    fallbackPage.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });

    await fallbackPage.goto(`http://127.0.0.1:${port}/public/movie-selector/index.html`, {
      waitUntil: "domcontentloaded",
    });

    // Select Animation (16)
    await fallbackPage.locator("#genreTrigger").click();
    await fallbackPage.locator('#genreMenu input[value="16"]').check();
    await fallbackPage.locator("#findMovieBtn").click();

    await fallbackPage.locator("#movieCard").waitFor({ state: "visible", timeout: 5000 });
    const fallbackMovie = await fallbackPage.evaluate(() => {
      return {
        title: document.getElementById("movieTitle")?.textContent.trim(),
        rating: document.getElementById("movieRating")?.textContent.trim(),
        release: document.getElementById("movieReleaseDate")?.textContent.trim(),
        posterDisplayed: document.getElementById("moviePoster")?.style.display !== "none",
      };
    });

    const fallbackPassed =
      fallbackMovie.title === "Spirited Away" &&
      fallbackMovie.rating.includes("8.5") &&
      fallbackMovie.release === "2001";

    results.checks.push({
      name: "Offline fallback gracefully serves curated movie when no API key is provided without errors",
      passed: fallbackPassed,
      data: fallbackMovie,
    });
    console.log(`Offline fallback check: ${fallbackPassed ? "PASS" : "FAIL"}`);

    await fallbackContext.close();

    // ==========================================
    // Check 7: No Uncaught Page or Console Errors
    // ==========================================
    const noErrors = pageErrors.length === 0 && consoleErrors.length === 0;
    results.checks.push({
      name: "No uncaught runtime page errors or console error messages across all scenarios",
      passed: noErrors,
      data: { pageErrors, consoleErrors },
    });
    console.log(`Page errors check: ${noErrors ? "PASS" : "FAIL"}`);

    // ==========================================
    // Check 8: README Documentation Verification
    // ==========================================
    const readmeContent = fs.readFileSync(
      path.join(rootDir, "public/movie-selector/README.md"),
      "utf-8"
    );

    const docsVerified =
      readmeContent.includes("Deterministic Browser Testing") &&
      readmeContent.includes("r60-t015.mjs") &&
      readmeContent.includes("Network Interception");

    results.checks.push({
      name: "README.md documents deterministic testing, local fixtures, and test command",
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
      taskId: "R60-T015",
      timestamp: new Date().toISOString(),
      item: "public/movie-selector",
      anchors: [
        "#genreDropdownWrapper",
        "#genreTrigger",
        "#genreTriggerLabel",
        "#genreMenu",
      ],
      deterministicFixtures: {
        networkRouting: "TMDb Discover API intercepted via context.route returning deterministic JSON fixture",
        mediaAssets: "Poster images intercepted returning 1x1 SVG fixture without external requests",
        randomness: "Seeded PRNG injected via addInitScript locking Math.random sequence",
        viewport: "Locked at 1280x800 across both browser contexts",
        hardwareAndPermissions: "Native window.open and alert stubbed to prevent unhandled modals or popups",
      },
      baselineVsChangedBehavior: {
        baseline: "Unstubbed requests depend on external TMDb API & key availability, random page generation produces divergent movie recommendations",
        changed: "Two fresh browser contexts produce 100% byte-for-byte identical DOM and layout state independent of external network availability",
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
