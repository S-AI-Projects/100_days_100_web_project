import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "../../");
const reportDir = path.join(rootDir, "work/R60-T024");
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
  console.log("Starting R60-T024 Minimalist Kanban Board idempotent initialization verification...");
  const results = {
    taskId: "R60-T024",
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

    const targetUrl = `http://127.0.0.1:${port}/public/minimalist-kanban-board/index.html`;
    await page.goto(targetUrl, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(100);

    // Check 1: Source anchors exist (#themeToggleBtn, #addCardBtn, #todo-count, #todo-lane)
    const anchors = await page.evaluate(() => {
      return {
        themeToggleBtn: !!document.getElementById("themeToggleBtn"),
        addCardBtn: !!document.getElementById("addCardBtn"),
        todoCount: !!document.getElementById("todo-count"),
        todoLane: !!document.getElementById("todo-lane"),
      };
    });

    const anchorsPassed =
      anchors.themeToggleBtn &&
      anchors.addCardBtn &&
      anchors.todoCount &&
      anchors.todoLane;

    results.checks.push({
      name: "Source anchors exist (#themeToggleBtn, #addCardBtn, #todo-count, #todo-lane)",
      passed: anchorsPassed,
      data: anchors,
    });
    console.log(`Source anchors check: ${anchorsPassed ? "PASS" : "FAIL"}`);

    // Check 2: Initial window.__KANBAN_INITIALIZED__ is set
    const isInitiallyInitialized = await page.evaluate(() => {
      return window.__KANBAN_INITIALIZED__ === true;
    });

    results.checks.push({
      name: "window.__KANBAN_INITIALIZED__ guard flag is set upon initial execution",
      passed: isInitiallyInitialized,
      data: { isInitiallyInitialized },
    });
    console.log(`Initial __KANBAN_INITIALIZED__ check: ${isInitiallyInitialized ? "PASS" : "FAIL"}`);

    // Record state before second script injection
    const stateBefore = await page.evaluate(() => {
      const todoCount = document.getElementById("todo-count")?.innerText;
      const progressCount = document.getElementById("progress-count")?.innerText;
      const doneCount = document.getElementById("done-count")?.innerText;
      const cardElements = document.querySelectorAll(".kanban-card").length;
      const theme = document.documentElement.getAttribute("data-theme") || "dark";
      return {
        theme,
        todoCount,
        progressCount,
        doneCount,
        cardElements,
      };
    });

    // Check 3: Inject and execute app.js a second time
    console.log("Injecting and executing app.js a second time...");
    await page.addScriptTag({
      url: `http://127.0.0.1:${port}/public/minimalist-kanban-board/app.js`,
    });
    await page.waitForTimeout(100);

    // Also trigger window.initKanban() explicitly to test repeat function calls
    await page.evaluate(() => {
      if (typeof window.initKanban === "function") {
        window.initKanban();
      }
    });
    await page.waitForTimeout(100);

    // Verify state after second execution without user interaction
    const stateAfterSecondRun = await page.evaluate(() => {
      const todoCount = document.getElementById("todo-count")?.innerText;
      const progressCount = document.getElementById("progress-count")?.innerText;
      const doneCount = document.getElementById("done-count")?.innerText;
      const cardElements = document.querySelectorAll(".kanban-card").length;
      const theme = document.documentElement.getAttribute("data-theme") || "dark";
      return {
        theme,
        todoCount,
        progressCount,
        doneCount,
        cardElements,
      };
    });

    const countsIntact =
      stateAfterSecondRun.cardElements === stateBefore.cardElements &&
      stateAfterSecondRun.todoCount === stateBefore.todoCount &&
      stateAfterSecondRun.progressCount === stateBefore.progressCount &&
      stateAfterSecondRun.doneCount === stateBefore.doneCount;

    results.checks.push({
      name: "Card counts and elements remain intact after repeat script execution",
      passed: countsIntact,
      data: { stateBefore, stateAfterSecondRun },
    });
    console.log(`Counts intact check: ${countsIntact ? "PASS" : "FAIL"}`);

    // Check 4: Click #themeToggleBtn once and assert theme toggles exactly once (no flip-flop)
    console.log(`Current theme before toggle: ${stateBefore.theme}. Clicking #themeToggleBtn once...`);
    const expectedTheme = stateBefore.theme === "dark" ? "light" : "dark";

    // Track all theme changes during click
    await page.evaluate(() => {
      window.__themeChanges = [];
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((m) => {
          if (m.attributeName === "data-theme") {
            window.__themeChanges.push(document.documentElement.getAttribute("data-theme"));
          }
        });
      });
      observer.observe(document.documentElement, { attributes: true });
    });

    await page.click("#themeToggleBtn");
    await page.waitForTimeout(150);

    const themeChanges = await page.evaluate(() => window.__themeChanges || []);
    const finalTheme = await page.evaluate(() =>
      document.documentElement.getAttribute("data-theme")
    );

    const themeToggledExactlyOnce =
      finalTheme === expectedTheme &&
      themeChanges.length === 1 &&
      themeChanges[0] === expectedTheme;

    results.checks.push({
      name: `Theme toggles exactly once from '${stateBefore.theme}' to '${expectedTheme}' without flip-flop`,
      passed: themeToggledExactlyOnce,
      data: {
        themeBefore: stateBefore.theme,
        expectedTheme,
        finalTheme,
        themeChanges,
      },
    });
    console.log(
      `Theme toggle check: ${themeToggledExactlyOnce ? "PASS" : "FAIL"} (final: ${finalTheme}, mutations: ${JSON.stringify(themeChanges)})`
    );

    // Check 5: Verify task creation modal doesn't duplicate event listeners
    console.log("Testing task creation via modal...");
    await page.click("#addCardBtn");
    await page.waitForSelector("#cardModal.active", { timeout: 2000 });
    await page.fill("#taskTitle", "Task Check Repeat Init");
    await page.click("#submitCardBtn");
    await page.waitForTimeout(100);

    const postAddState = await page.evaluate(() => {
      const todoCount = parseInt(document.getElementById("todo-count")?.innerText, 10);
      const todoCards = document.querySelectorAll("#todo-lane .kanban-card").length;
      return { todoCount, todoCards };
    });

    const expectedTodoCount = parseInt(stateBefore.todoCount, 10) + 1;
    const taskAddedOnce =
      postAddState.todoCount === expectedTodoCount &&
      postAddState.todoCards === expectedTodoCount;

    results.checks.push({
      name: "Adding a task increments card count exactly once (no duplicate modal submit listeners)",
      passed: taskAddedOnce,
      data: {
        expectedTodoCount,
        postAddState,
      },
    });
    console.log(`Task addition check: ${taskAddedOnce ? "PASS" : "FAIL"}`);

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
