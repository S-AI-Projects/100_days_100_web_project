import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "../../");
const reportDir = path.join(rootDir, "work/R60-T020");
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
  ".svg": "image/svg+xml",
};

function startServer() {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const parsedUrl = new URL(req.url, "http://localhost");
      const pathname = decodeURIComponent(parsedUrl.pathname);

      // Handle deliberate regression fixture route
      if (pathname.startsWith("/fixture/broken-binding/")) {
        const filePart = pathname.replace("/fixture/broken-binding/", "");
        const appDir = path.join(rootDir, "public/CountDown Timer");

        if (filePart === "" || filePart === "index.html") {
          const html = fs.readFileSync(path.join(appDir, "index.html"), "utf-8");
          res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
          res.end(html);
          return;
        }

        if (filePart === "script.js") {
          let js = fs.readFileSync(path.join(appDir, "script.js"), "utf-8");
          // Deliberately sever the #themeBtn event binding in this fixture to simulate regression
          js = js.replace(
            "els.themeBtn.addEventListener('click'",
            "// REGRESSION_MUTATION_SIMULATED: els.themeBtn.addEventListener('click'"
          );
          res.writeHead(200, { "Content-Type": "application/javascript; charset=utf-8" });
          res.end(js);
          return;
        }

        if (filePart === "style.css") {
          const css = fs.readFileSync(path.join(appDir, "style.css"), "utf-8");
          res.writeHead(200, { "Content-Type": "text/css; charset=utf-8" });
          res.end(css);
          return;
        }
      }

      let filePath = path.join(rootDir, pathname);

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

async function testThemeToggleBehavior(page) {
  const initialTheme = await page.evaluate(() => document.documentElement.getAttribute("data-theme"));
  const initialBtnText = await page.evaluate(() => document.getElementById("themeBtn")?.textContent?.trim());

  await page.click("#themeBtn");

  const toggledTheme = await page.evaluate(() => document.documentElement.getAttribute("data-theme"));
  const toggledBtnText = await page.evaluate(() => document.getElementById("themeBtn")?.textContent?.trim());

  const toggledSuccessfully =
    initialTheme === "dark" &&
    toggledTheme === "light" &&
    initialBtnText === "☀️" &&
    toggledBtnText === "🌙";

  return {
    initialTheme,
    initialBtnText,
    toggledTheme,
    toggledBtnText,
    passed: toggledSuccessfully,
  };
}

async function runTest() {
  console.log("Starting R60-T020 CountDown Timer interaction regression verification...");

  const results = {
    taskId: "R60-T020",
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
    // Check 1: Target Source Anchors Verification (Real Application)
    // ==========================================
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await context.newPage();
    page.on("pageerror", (err) => pageErrors.push(err.message));
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });

    await page.goto(`http://127.0.0.1:${port}/public/CountDown%20Timer/index.html`, {
      waitUntil: "domcontentloaded",
    });

    const anchors = await page.evaluate(() => {
      const app = document.getElementById("app");
      const statsBtn = document.getElementById("statsBtn");
      const fullscreenBtn = document.getElementById("fullscreenBtn");
      const themeBtn = document.getElementById("themeBtn");

      return {
        app: !!app && app.tagName.toLowerCase() === "div",
        statsBtn: !!statsBtn && statsBtn.tagName.toLowerCase() === "button",
        fullscreenBtn: !!fullscreenBtn && fullscreenBtn.tagName.toLowerCase() === "button",
        themeBtn: !!themeBtn && themeBtn.tagName.toLowerCase() === "button",
      };
    });

    const anchorsPassed =
      anchors.app && anchors.statsBtn && anchors.fullscreenBtn && anchors.themeBtn;

    results.checks.push({
      name: "Source anchors exist with required DOM structures (#app, #statsBtn, #fullscreenBtn, #themeBtn)",
      passed: anchorsPassed,
      data: anchors,
    });
    console.log(`Source anchors check: ${anchorsPassed ? "PASS" : "FAIL"}`);

    // ==========================================
    // Check 2: Theme Toggle Interaction (Real Application)
    // ==========================================
    console.log("Testing theme toggle interaction on production page...");
    const themeResult = await testThemeToggleBehavior(page);

    results.checks.push({
      name: "Production page: Theme toggle click updates data-theme attribute and button emoji",
      passed: themeResult.passed,
      data: themeResult,
    });
    console.log(`Theme toggle check: ${themeResult.passed ? "PASS" : "FAIL"}`);

    // Toggle back to dark mode
    await page.click("#themeBtn");

    // ==========================================
    // Check 3: Stats Overlay Visibility & Interaction (Real Application)
    // ==========================================
    console.log("Testing stats overlay interaction on production page...");
    const statsResult = await page.evaluate(async () => {
      const overlay = document.getElementById("statsOverlay");
      const statsBtn = document.getElementById("statsBtn");
      const initialHidden = overlay.classList.contains("hidden");

      statsBtn.click();
      const openHidden = overlay.classList.contains("hidden");
      const openDisplay = window.getComputedStyle(overlay).display;

      const closeBtn = overlay.querySelector(".close-btn");
      closeBtn.click();
      const closedHidden = overlay.classList.contains("hidden");
      const closedDisplay = window.getComputedStyle(overlay).display;

      return {
        initialHidden,
        openHidden,
        openDisplay,
        closedHidden,
        closedDisplay,
        passed:
          initialHidden === true &&
          openHidden === false &&
          openDisplay !== "none" &&
          closedHidden === true &&
          closedDisplay === "none",
      };
    });

    results.checks.push({
      name: "Production page: Session stats dialog opens on click and closes cleanly",
      passed: statsResult.passed,
      data: statsResult,
    });
    console.log(`Stats overlay check: ${statsResult.passed ? "PASS" : "FAIL"}`);

    // ==========================================
    // Check 4: Fullscreen Button Interaction (Real Application)
    // ==========================================
    console.log("Testing fullscreen mode toggle interaction...");
    const fullscreenResult = await page.evaluate(() => {
      const btn = document.getElementById("fullscreenBtn");
      const initialFs = document.body.classList.contains("fullscreen-mode");

      btn.click();
      const activeFs = document.body.classList.contains("fullscreen-mode");

      btn.click();
      const closedFs = document.body.classList.contains("fullscreen-mode");

      return {
        initialFs,
        activeFs,
        closedFs,
        passed: !initialFs && activeFs && !closedFs,
      };
    });

    results.checks.push({
      name: "Production page: Fullscreen button toggles fullscreen mode class and view scaling",
      passed: fullscreenResult.passed,
      data: fullscreenResult,
    });
    console.log(`Fullscreen check: ${fullscreenResult.passed ? "PASS" : "FAIL"}`);

    // ==========================================
    // Check 5: Core Timer Lifecycle & Presets (Real Application)
    // ==========================================
    console.log("Testing core timer lifecycle and preset controls...");
    // Click 1m preset
    await page.click('.preset-btn[data-seconds="60"]');

    const presetText = await page.evaluate(() => document.getElementById("timerDisplay")?.textContent?.trim());
    const presetPassed = presetText === "01:00";

    // Click Start
    await page.click("#startPauseBtn");
    const runningBtnText = await page.evaluate(() => document.getElementById("startPauseBtn")?.textContent?.trim());

    // Click Pause
    await page.click("#startPauseBtn");
    const pausedBtnText = await page.evaluate(() => document.getElementById("startPauseBtn")?.textContent?.trim());

    // Click Reset
    await page.click("#resetBtn");
    const resetText = await page.evaluate(() => document.getElementById("timerDisplay")?.textContent?.trim());

    const timerLifecyclePassed =
      presetPassed &&
      runningBtnText?.includes("Pause") &&
      pausedBtnText?.includes("Start") &&
      resetText === "01:00";

    results.checks.push({
      name: "Production page: Preset selection, start, pause, and reset timer controls operate correctly",
      passed: timerLifecyclePassed,
      data: { presetText, runningBtnText, pausedBtnText, resetText },
    });
    console.log(`Timer lifecycle check: ${timerLifecyclePassed ? "PASS" : "FAIL"}`);

    await context.close();

    // ==========================================
    // Check 6: Deliberate Regression Fixture Check (Mutation Assertion)
    // ==========================================
    console.log("Testing deliberate regression fixture (broken theme event binding)...");
    const fixtureContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const fixturePage = await fixtureContext.newPage();

    await fixturePage.goto(`http://127.0.0.1:${port}/fixture/broken-binding/index.html`, {
      waitUntil: "domcontentloaded",
    });

    // Run the identical behavioral assertion against the broken fixture
    const brokenFixtureResult = await testThemeToggleBehavior(fixturePage);

    // The mutation assertion must FAIL on the broken fixture for the intended behavioral reason
    const deliberateFailureCaught =
      brokenFixtureResult.passed === false &&
      brokenFixtureResult.initialTheme === "dark" &&
      brokenFixtureResult.toggledTheme === "dark"; // Severed binding caused data-theme to stay dark

    results.checks.push({
      name: "Deliberate fixture mutation check: severed event binding is caught and correctly distinguishes broken state",
      passed: deliberateFailureCaught,
      data: {
        brokenFixtureResult,
        distinguishedReason: "Event handler was disconnected in fixture; data-theme remained 'dark' despite user click",
      },
    });
    console.log(`Deliberate mutation regression catch check: ${deliberateFailureCaught ? "PASS" : "FAIL"}`);

    await fixtureContext.close();

    // ==========================================
    // Check 7: No Uncaught Page or Console Errors on Real App
    // ==========================================
    const noErrors = pageErrors.length === 0 && consoleErrors.length === 0;
    results.checks.push({
      name: "No uncaught runtime page errors or console error messages during test runs",
      passed: noErrors,
      data: { pageErrors, consoleErrors },
    });
    console.log(`Page errors check: ${noErrors ? "PASS" : "FAIL"}`);

    // ==========================================
    // Check 8: README Documentation Verification
    // ==========================================
    const readmeContent = fs.readFileSync(
      path.join(rootDir, "public/CountDown Timer/README.md"),
      "utf-8"
    );

    const docsVerified =
      readmeContent.includes("Automated Testing & Interaction Regression") &&
      readmeContent.includes("r60-t020.mjs") &&
      readmeContent.includes("#statsBtn");

    results.checks.push({
      name: "README.md documents source anchors, interaction architecture, and regression test execution",
      passed: docsVerified,
      data: { docsVerified },
    });
    console.log(`README documentation check: ${docsVerified ? "PASS" : "FAIL"}`);

    // ==========================================
    // Summary evaluation and record writing
    // ==========================================
    const allPassed = results.checks.every((c) => c.passed);
    results.passed = allPassed;

    fs.writeFileSync(reportFile, JSON.stringify(results, null, 2), "utf-8");
    console.log(`\nSaved report to ${reportFile}`);

    const baselineData = {
      taskId: "R60-T020",
      timestamp: new Date().toISOString(),
      item: "public/CountDown Timer",
      anchors: ["#app", "#statsBtn", "#fullscreenBtn", "#themeBtn"],
      visibleInteractions: {
        themeToggle: {
          element: "#themeBtn",
          event: "click",
          expectedEffect: "Toggles html[data-theme] between 'dark' and 'light' and updates button emoji",
        },
        statsDialog: {
          element: "#statsBtn",
          event: "click",
          expectedEffect: "Removes .hidden on #statsOverlay, rendering session stats; closes on .close-btn click",
        },
        fullscreenMode: {
          element: "#fullscreenBtn",
          event: "click",
          expectedEffect: "Toggles body.fullscreen-mode class, scaling timer display and app max-width",
        },
        timerLifecycle: {
          presets: "Updates duration display instantly upon clicking preset pills (e.g. 1m -> 01:00)",
          startPause: "Toggles timer status and updates button label between '▶ Start' and '⏸ Pause'",
          reset: "Restores initial duration and resets circle progress offset",
        },
      },
      regressionFixture: {
        mutationType: "Severed #themeBtn event binding in temporary fixture route",
        expectedFailure: "Clicking #themeBtn in mutated fixture leaves html[data-theme='dark'] instead of transitioning to 'light'",
        productionIntegrity: "The actual public/CountDown Timer application contains no mutation and passes all checks",
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
