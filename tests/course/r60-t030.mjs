import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "../../");
const reportDir = path.join(rootDir, "work/R60-T030");
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

// Verification helper that tests screen transition back to #menuScreen
async function assertBackTransition(page, timeoutMs = 1500) {
  await page.click("#btnBack");
  const transitioned = await page
    .waitForFunction(
      () => {
        const menu = document.getElementById("menuScreen");
        const game = document.getElementById("gameScreen");
        return (
          menu &&
          menu.classList.contains("active") &&
          game &&
          !game.classList.contains("active")
        );
      },
      { timeout: timeoutMs }
    )
    .then(() => true)
    .catch(() => false);

  if (!transitioned) {
    throw new Error(
      "UI Regression Detected: Clicking #btnBack failed to transition from #gameScreen to #menuScreen"
    );
  }
  return true;
}

async function runTest() {
  console.log("Starting R60-T030 Tic Tac Toe UI regression and mutation testing...");
  const results = {
    taskId: "R60-T030",
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
    const targetUrl = `http://127.0.0.1:${port}/public/Tic Tac Toe game/index.html`;

    await page.goto(targetUrl, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(100);

    // Check 1: Source anchors exist (#menuScreen, #btnStart, #gameScreen, #btnBack)
    const anchors = await page.evaluate(() => {
      return {
        menuScreen: !!document.getElementById("menuScreen"),
        btnStart: !!document.getElementById("btnStart"),
        gameScreen: !!document.getElementById("gameScreen"),
        btnBack: !!document.getElementById("btnBack"),
      };
    });

    const anchorsPassed =
      anchors.menuScreen &&
      anchors.btnStart &&
      anchors.gameScreen &&
      anchors.btnBack;

    results.checks.push({
      name: "Source anchors exist (#menuScreen, #btnStart, #gameScreen, #btnBack)",
      passed: anchorsPassed,
      data: anchors,
    });
    console.log(`Source anchors check: ${anchorsPassed ? "PASS" : "FAIL"}`);

    // Check 2: Part 1 - Baseline Navigation Verification
    console.log("Testing Part 1: Baseline navigation transitions...");
    const initialMenuState = await page.evaluate(() => {
      const menu = document.getElementById("menuScreen");
      const game = document.getElementById("gameScreen");
      return {
        menuActive: menu.classList.contains("active"),
        gameActive: game.classList.contains("active"),
      };
    });

    // Click #btnStart to transition to #gameScreen
    await page.click("#btnStart");
    const gameScreenTransition = await page.waitForFunction(
      () => {
        const menu = document.getElementById("menuScreen");
        const game = document.getElementById("gameScreen");
        return (
          game &&
          game.classList.contains("active") &&
          menu &&
          !menu.classList.contains("active")
        );
      },
      { timeout: 2000 }
    ).then(() => true).catch(() => false);

    // Click #btnBack to return to #menuScreen
    let backTransitionClean = false;
    try {
      backTransitionClean = await assertBackTransition(page);
    } catch (err) {
      backTransitionClean = false;
    }

    const part1Passed =
      initialMenuState.menuActive &&
      !initialMenuState.gameActive &&
      gameScreenTransition &&
      backTransitionClean;

    results.checks.push({
      name: "Part 1: Baseline navigation transitions correctly (#btnStart -> #gameScreen, #btnBack -> #menuScreen)",
      passed: part1Passed,
      data: {
        initialMenuState,
        gameScreenTransition,
        backTransitionClean,
      },
    });
    console.log(`Part 1 Baseline navigation check: ${part1Passed ? "PASS" : "FAIL"}`);

    // Check 3: Part 2 - Mutation Testing (Deliberately mutate fixture and assert regression is detected)
    console.log("Testing Part 2: Deliberate mutation regression detection...");
    // Reload page to start with fresh state
    await page.goto(targetUrl, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(100);

    // Transition to game screen first
    await page.click("#btnStart");
    await page.waitForFunction(() => {
      const game = document.getElementById("gameScreen");
      return game && game.classList.contains("active");
    });

    // Deliberately introduce mutation: strip #btnBack click listener
    await page.evaluate(() => {
      const btnBack = document.getElementById("btnBack");
      if (btnBack) {
        // Clone node without listeners to simulate unbinding / broken listener regression
        const clone = btnBack.cloneNode(true);
        btnBack.parentNode.replaceChild(clone, btnBack);
      }
    });

    let regressionCaught = false;
    let regressionError = null;

    try {
      // Attempt the transition test on the mutated fixture
      await assertBackTransition(page, 800);
      regressionCaught = false; // If it didn't throw, regression wasn't detected!
    } catch (err) {
      regressionCaught = true;
      regressionError = err.message;
    }

    // Verify screen states remained stuck due to mutation
    const mutatedState = await page.evaluate(() => {
      const menu = document.getElementById("menuScreen");
      const game = document.getElementById("gameScreen");
      return {
        menuActive: menu.classList.contains("active"),
        gameActive: game.classList.contains("active"),
      };
    });

    const part2Passed =
      regressionCaught &&
      mutatedState.gameActive === true &&
      mutatedState.menuActive === false;

    results.checks.push({
      name: "Part 2: Mutation test successfully catches unhandled UI regression (unbound #btnBack listener)",
      passed: part2Passed,
      data: {
        mutationApplied: "Stripped #btnBack click event listener via node clone",
        regressionCaught,
        regressionError,
        mutatedState,
      },
    });
    console.log(`Part 2 Mutation testing check: ${part2Passed ? "PASS" : "FAIL"}`);

    // Check 4: Documentation verification in README.md
    const readmeContent = fs.readFileSync(
      path.join(rootDir, "public/Tic Tac Toe game/README.md"),
      "utf-8"
    );

    const docsVerified =
      readmeContent.includes("Interaction Regression & Mutation Testing") &&
      readmeContent.includes("Baseline Navigation") &&
      readmeContent.includes("Mutation Testing Methodology") &&
      readmeContent.includes("r60-t030.mjs");

    results.checks.push({
      name: "README.md documents interaction regression check and mutation testing methodology",
      passed: docsVerified,
      data: { docsVerified },
    });
    console.log(`README documentation check: ${docsVerified ? "PASS" : "FAIL"}`);

    const allPassed = results.checks.every((c) => c.passed);
    results.passed = allPassed;

    fs.mkdirSync(reportDir, { recursive: true });
    fs.writeFileSync(reportFile, JSON.stringify(results, null, 2), "utf-8");
    console.log(`\nSaved report to ${reportFile}`);

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
