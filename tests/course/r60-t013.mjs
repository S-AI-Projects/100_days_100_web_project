import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "../../");
const reportDir = path.join(rootDir, "work/R60-T013");
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
  console.log("Starting R60-T013 Missionaries & Cannibals empty/error states and asset fallback verification...");

  const results = {
    taskId: "R60-T013",
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

    // Asset failure fixture: Intercept and abort external Google Fonts
    let fontRequestsBlocked = 0;
    await context.route("**/*", (route) => {
      const u = route.request().url();
      if (u.includes("fonts.googleapis.com") || u.includes("fonts.gstatic.com")) {
        fontRequestsBlocked++;
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
        // Disregard expected network error from our intentional failed-asset fixture
        if (msg.text().includes("net::ERR_FAILED") || msg.text().includes("fonts.google")) {
          return;
        }
        consoleErrors.push(msg.text());
        console.error("Console error detected:", msg.text());
      }
    });

    const targetUrl = `http://127.0.0.1:${port}/public/Missionaries%26Cannibals/index.html`;
    await page.goto(targetUrl, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(150);

    // ==========================================
    // Check 1: Source Anchors Exist (#theme-toggle, #instructions-btn, #move-count, #timer-chip)
    // ==========================================
    const anchors = await page.evaluate(() => {
      const themeToggle = document.getElementById("theme-toggle");
      const instructionsBtn = document.getElementById("instructions-btn");
      const moveCount = document.getElementById("move-count");
      const timerChip = document.getElementById("timer-chip");

      return {
        themeToggleExists: !!themeToggle,
        instructionsBtnExists: !!instructionsBtn,
        moveCountExists: !!moveCount,
        moveCountText: moveCount ? moveCount.innerText.trim() : null,
        timerChipExists: !!timerChip,
      };
    });

    const anchorsPassed =
      anchors.themeToggleExists &&
      anchors.instructionsBtnExists &&
      anchors.moveCountExists &&
      anchors.moveCountText === "0" &&
      anchors.timerChipExists;

    results.checks.push({
      name: "Source anchors exist and display initial state (#theme-toggle, #instructions-btn, #move-count, #timer-chip)",
      passed: anchorsPassed,
      data: anchors,
    });
    console.log(`Source anchors check: ${anchorsPassed ? "PASS" : "FAIL"}`);

    // ==========================================
    // Check 2: Failed Asset Fixture & Font Fallback Chain
    // ==========================================
    const fontFallbackInfo = await page.evaluate(() => {
      const body = document.body;
      const h1 = document.querySelector("h1");
      const csBody = window.getComputedStyle(body);
      const csH1 = window.getComputedStyle(h1);

      return {
        bodyFontFamily: csBody.fontFamily,
        h1FontFamily: csH1.fontFamily,
        bodyHasFallback:
          csBody.fontFamily.includes("system-ui") ||
          csBody.fontFamily.includes("sans-serif"),
        h1Visible: h1 && h1.getBoundingClientRect().height > 0,
      };
    });

    const assetFixturePassed =
      fontRequestsBlocked > 0 &&
      fontFallbackInfo.bodyHasFallback &&
      fontFallbackInfo.h1Visible;

    results.checks.push({
      name: "Failed asset fixture (blocked external fonts) exercises robust readable system font fallback without crashing",
      passed: assetFixturePassed,
      data: {
        fontRequestsBlocked,
        ...fontFallbackInfo,
      },
    });
    console.log(`Failed asset fallback check: ${assetFixturePassed ? "PASS" : "FAIL"}`);

    // ==========================================
    // Check 3: Empty Bank Display State
    // ==========================================
    const emptyBankInfo = await page.evaluate(() => {
      const leftCount = document.getElementById("left-count");
      const rightCount = document.getElementById("right-count");

      return {
        leftCountText: leftCount ? leftCount.innerText.trim() : null,
        rightCountText: rightCount ? rightCount.innerText.trim() : null,
      };
    });

    const emptyBankPassed =
      emptyBankInfo.leftCountText.includes("3") &&
      emptyBankInfo.rightCountText === "Empty";

    results.checks.push({
      name: "Empty bank displays explicit 'Empty' status badge when containing zero characters",
      passed: emptyBankPassed,
      data: emptyBankInfo,
    });
    console.log(`Empty bank check: ${emptyBankPassed ? "PASS" : "FAIL"}`);

    // ==========================================
    // Check 4: Empty Best Score Placeholder
    // ==========================================
    const emptyBestInfo = await page.evaluate(() => {
      const best = document.getElementById("best-display");
      return {
        bestText: best ? best.innerText.trim() : null,
      };
    });

    const emptyBestPassed = emptyBestInfo.bestText === "—";
    results.checks.push({
      name: "Empty scoreboard renders clean '—' placeholder prior to any recorded games",
      passed: emptyBestPassed,
      data: emptyBestInfo,
    });
    console.log(`Empty best score check: ${emptyBestPassed ? "PASS" : "FAIL"}`);

    // ==========================================
    // Check 5: Empty Boat Move Validation & Recovery
    // ==========================================
    // Close instructions modal if open to start interactive gameplay
    const modalStartBtn = page.locator("#modal-start-btn");
    if (await modalStartBtn.isVisible()) {
      await modalStartBtn.click();
      await page.waitForTimeout(100);
    }

    // Attempt to move empty boat (0 passengers)
    const moveBoatBtn = page.locator("#move-boat");
    await moveBoatBtn.click();
    await page.waitForTimeout(100);

    const afterEmptyMove = await page.evaluate(() => {
      const msg = document.getElementById("message");
      const boat = document.getElementById("boat");
      const moveCount = document.getElementById("move-count");
      return {
        msgText: msg ? msg.innerText.trim() : null,
        msgClass: msg ? msg.className : null,
        boatHasRightClass: boat ? boat.classList.contains("boat-right") : null,
        moveCount: moveCount ? moveCount.innerText.trim() : null,
      };
    });

    const emptyMoveCaught =
      afterEmptyMove.msgText.includes("passenger") &&
      !afterEmptyMove.boatHasRightClass &&
      afterEmptyMove.moveCount === "0";

    // Recovery: Board one character and sail boat
    const firstPerson = page.locator("#left-people .person").first();
    await firstPerson.click();
    await page.waitForTimeout(100);

    const afterBoarding = await page.evaluate(() => {
      const boatCap = document.getElementById("boat-capacity");
      const boatPeople = document.querySelectorAll("#boat-people .person").length;
      return {
        boatCap: boatCap ? boatCap.innerText.trim() : null,
        passengersCount: boatPeople,
      };
    });

    // Sail the loaded boat
    await moveBoatBtn.click();
    await page.waitForTimeout(300);

    const afterRecovery = await page.evaluate(() => {
      const boat = document.getElementById("boat");
      const moveCount = document.getElementById("move-count");
      const msg = document.getElementById("message");
      return {
        boatHasRightClass: boat ? boat.classList.contains("boat-right") : null,
        moveCount: moveCount ? moveCount.innerText.trim() : null,
        msgText: msg ? msg.innerText.trim() : null,
      };
    });

    const recoveryPassed =
      emptyMoveCaught &&
      afterBoarding.passengersCount >= 1 &&
      afterRecovery.boatHasRightClass &&
      afterRecovery.moveCount === "1";

    results.checks.push({
      name: "Empty boat move error is captured with warning, prevents sailing, and cleanly recovers when passengers board",
      passed: recoveryPassed,
      data: {
        afterEmptyMove,
        afterBoarding,
        afterRecovery,
      },
    });
    console.log(`Empty boat validation & recovery check: ${recoveryPassed ? "PASS" : "FAIL"}`);

    // ==========================================
    // Check 6: Outnumbered Error State & Clean Reset Recovery
    // ==========================================
    // Restart game to clean round
    const startResetBtn = page.locator("#start-reset");
    await startResetBtn.click();
    await page.waitForTimeout(100);

    // Load two sheep onto boat from left bank
    const sheep = page.locator('#left-people .person[data-type="missionary"]');
    await sheep.nth(0).click();
    await page.waitForTimeout(50);
    await sheep.nth(1).click();
    await page.waitForTimeout(50);

    // Move boat with 2 sheep -> leaving 1 sheep and 3 tigers on left bank (outnumbered!)
    await moveBoatBtn.click();
    await page.waitForTimeout(300);

    const afterOutnumbered = await page.evaluate(() => {
      const msg = document.getElementById("message");
      const modal = document.getElementById("results-modal");
      const title = document.getElementById("result-title");
      return {
        msgText: msg ? msg.innerText.trim() : null,
        modalVisible: modal ? modal.classList.contains("show") : false,
        modalTitle: title ? title.innerText.trim() : null,
      };
    });

    const errorTriggered =
      afterOutnumbered.modalVisible &&
      (afterOutnumbered.msgText.includes("outnumbered") ||
        afterOutnumbered.modalTitle.includes("Game Over"));

    // Recover via restart button
    const restartBtn = page.locator("#restart-btn");
    await restartBtn.click();
    await page.waitForTimeout(150);

    const afterResetRecovery = await page.evaluate(() => {
      const modal = document.getElementById("results-modal");
      const moveCount = document.getElementById("move-count");
      const boat = document.getElementById("boat");
      const leftCount = document.getElementById("left-count");
      return {
        modalClosed: modal ? !modal.classList.contains("show") : false,
        moveCount: moveCount ? moveCount.innerText.trim() : null,
        boatAtLeft: boat ? !boat.classList.contains("boat-right") : false,
        leftCount: leftCount ? leftCount.innerText.trim() : null,
      };
    });

    const errorRecoveryPassed =
      errorTriggered &&
      afterResetRecovery.modalClosed &&
      afterResetRecovery.moveCount === "0" &&
      afterResetRecovery.boatAtLeft &&
      afterResetRecovery.leftCount.includes("3");

    results.checks.push({
      name: "Outnumbered game over state triggers error display and cleanly recovers upon restart",
      passed: errorRecoveryPassed,
      data: {
        afterOutnumbered,
        afterResetRecovery,
      },
    });
    console.log(`Error state & restart recovery check: ${errorRecoveryPassed ? "PASS" : "FAIL"}`);

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
      path.join(rootDir, "public/Missionaries&Cannibals/README.md"),
      "utf-8"
    );

    const docsVerified =
      readmeContent.includes("Empty") &&
      readmeContent.includes("r60-t013.mjs") &&
      readmeContent.includes("Fallback");

    results.checks.push({
      name: "README.md documents empty & error states and includes automated test command",
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
      taskId: "R60-T013",
      timestamp: new Date().toISOString(),
      item: "public/Missionaries&Cannibals",
      verifiedStates: [
        "Empty bank indicator",
        "Empty scoreboard placeholder",
        "Empty boat validation error and recovery",
        "Failed asset (Google Fonts) fallback chain",
        "Outnumbered state error and restart recovery",
      ],
      storageProtection: "Safe try-catch wrapper with memory fallback added",
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
