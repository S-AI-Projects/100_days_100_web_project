import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "../../");
const reportDir = path.join(rootDir, "work/R60-T026");
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
  console.log("Starting R60-T026 Cute Calculator unsupported browser feature verification...");
  const results = {
    taskId: "R60-T026",
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
    const targetUrl = `http://127.0.0.1:${port}/public/cute-calculator/index.html`;

    // Check CSS @supports not rule in style.css
    const cssPath = path.join(rootDir, "public/cute-calculator/style.css");
    const cssContent = fs.readFileSync(cssPath, "utf-8");
    const hasBackdropFallback =
      cssContent.includes("@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px)))") &&
      cssContent.includes(".calculator") &&
      cssContent.includes("#ffffff");

    results.checks.push({
      name: "@supports not block provides #ffffff opaque fallback for .calculator when backdrop-filter is missing",
      passed: hasBackdropFallback,
      data: { hasBackdropFallback },
    });
    console.log(`Backdrop-filter CSS fallback check: ${hasBackdropFallback ? "PASS" : "FAIL"}`);

    // ==========================================
    // Context 1: Normal Browser
    // ==========================================
    console.log("\n--- Testing Context 1: Normal Browser ---");
    const normalContext = await browser.newContext();
    const normalPage = await normalContext.newPage();

    const normalPageErrors = [];
    normalPage.on("pageerror", (err) => normalPageErrors.push(err.message));

    await normalPage.goto(targetUrl, { waitUntil: "domcontentloaded" });
    await normalPage.waitForTimeout(100);

    // Source anchors check
    const normalAnchors = await normalPage.evaluate(() => {
      return {
        expression: !!document.getElementById("expression"),
        display: !!document.getElementById("display"),
        historyPanel: !!document.getElementById("historyPanel"),
        clearHistoryBtn: !!document.getElementById("clearHistoryBtn"),
      };
    });

    const normalAnchorsPassed =
      normalAnchors.expression &&
      normalAnchors.display &&
      normalAnchors.historyPanel &&
      normalAnchors.clearHistoryBtn;

    results.checks.push({
      name: "[Normal Context] Source anchors exist (#expression, #display, #historyPanel, #clearHistoryBtn)",
      passed: normalAnchorsPassed,
      data: normalAnchors,
    });
    console.log(`[Normal Context] Source anchors check: ${normalAnchorsPassed ? "PASS" : "FAIL"}`);

    // Perform arithmetic '8*5=40'
    console.log("[Normal Context] Performing arithmetic 8 * 5 = 40...");
    await normalPage.click("button:text-is('8')");
    await normalPage.click("button:text-is('×')");
    await normalPage.click("button:text-is('5')");
    await normalPage.click("#equalsBtn");
    await normalPage.waitForTimeout(100);

    const normalCalcResult = await normalPage.evaluate(() => {
      return {
        display: document.getElementById("display").value,
        expression: document.getElementById("expression").textContent,
      };
    });

    const normalArithmeticPassed =
      normalCalcResult.display === "40" &&
      normalCalcResult.expression.includes("8×5");

    results.checks.push({
      name: "[Normal Context] Performs arithmetic '8*5=40' correctly",
      passed: normalArithmeticPassed,
      data: normalCalcResult,
    });
    console.log(`[Normal Context] Arithmetic check: ${normalArithmeticPassed ? "PASS" : "FAIL"}`);

    // Test history panel and clear confirmation dialog
    console.log("[Normal Context] Testing history and clear dialog...");
    await normalPage.click(".history-btn");
    await normalPage.waitForTimeout(50);
    const historyItemText = await normalPage.evaluate(() => {
      return document.querySelector(".history-item")?.textContent || "";
    });

    const normalHistoryHasItem = historyItemText.includes("8×5 = 40");

    await normalPage.click("#clearHistoryBtn");
    await normalPage.waitForTimeout(50);
    const normalOverlayOpen = await normalPage.evaluate(() => {
      const overlay = document.getElementById("clearHistoryOverlay");
      return overlay.classList.contains("open") && overlay.getAttribute("aria-hidden") === "false";
    });

    await normalPage.click("#confirmClearHistory");
    await normalPage.waitForTimeout(200);

    const normalClearedState = await normalPage.evaluate(() => {
      const overlay = document.getElementById("clearHistoryOverlay");
      const emptyMsg = document.getElementById("historyEmpty");
      return {
        overlayClosed: !overlay.classList.contains("open"),
        emptyDisplayed: window.getComputedStyle(emptyMsg).display !== "none",
        historyItemsCount: document.querySelectorAll(".history-item").length,
      };
    });

    const normalDialogPassed =
      normalHistoryHasItem &&
      normalOverlayOpen &&
      normalClearedState.overlayClosed &&
      normalClearedState.historyItemsCount === 0 &&
      normalPageErrors.length === 0;

    results.checks.push({
      name: "[Normal Context] Dialogs and history function without uncaught exceptions",
      passed: normalDialogPassed,
      data: {
        normalHistoryHasItem,
        normalOverlayOpen,
        normalClearedState,
        errorCount: normalPageErrors.length,
        errors: normalPageErrors,
      },
    });
    console.log(`[Normal Context] Dialog & no-exception check: ${normalDialogPassed ? "PASS" : "FAIL"}`);

    await normalContext.close();

    // ==========================================
    // Context 2: Disabled / Mocked localStorage Throwing Errors
    // ==========================================
    console.log("\n--- Testing Context 2: Disabled / Mocked localStorage Throwing Errors ---");
    const restrictedContext = await browser.newContext();

    // Inject mocked localStorage that throws SecurityError / QuotaExceededError
    await restrictedContext.addInitScript(() => {
      const throwingStorage = {
        getItem: (key) => {
          throw new DOMException("The operation is insecure (SecurityError).", "SecurityError");
        },
        setItem: (key, value) => {
          throw new DOMException("The quota has been exceeded (QuotaExceededError).", "QuotaExceededError");
        },
        removeItem: (key) => {
          throw new DOMException("The operation is insecure (SecurityError).", "SecurityError");
        },
        clear: () => {
          throw new DOMException("The operation is insecure (SecurityError).", "SecurityError");
        },
        get length() {
          throw new DOMException("The operation is insecure (SecurityError).", "SecurityError");
        },
        key: () => {
          throw new DOMException("The operation is insecure (SecurityError).", "SecurityError");
        },
      };

      try {
        Object.defineProperty(window, "localStorage", {
          get: () => throwingStorage,
          configurable: true,
        });
      } catch (e) {
        window.localStorage = throwingStorage;
      }
    });

    const restrictedPage = await restrictedContext.newPage();
    const restrictedPageErrors = [];
    restrictedPage.on("pageerror", (err) => restrictedPageErrors.push(err.message));

    await restrictedPage.goto(targetUrl, { waitUntil: "domcontentloaded" });
    await restrictedPage.waitForTimeout(100);

    // Perform arithmetic '8*5=40' in restricted context
    console.log("[Restricted Context] Performing arithmetic 8 * 5 = 40 with throwing localStorage...");
    await restrictedPage.click("button:text-is('8')");
    await restrictedPage.click("button:text-is('×')");
    await restrictedPage.click("button:text-is('5')");
    await restrictedPage.click("#equalsBtn");
    await restrictedPage.waitForTimeout(100);

    const restrictedCalcResult = await restrictedPage.evaluate(() => {
      return {
        display: document.getElementById("display").value,
        expression: document.getElementById("expression").textContent,
      };
    });

    const restrictedArithmeticPassed =
      restrictedCalcResult.display === "40" &&
      restrictedCalcResult.expression.includes("8×5") &&
      restrictedPageErrors.length === 0;

    results.checks.push({
      name: "[Restricted Context] Performs arithmetic '8*5=40' without uncaught exceptions when storage throws",
      passed: restrictedArithmeticPassed,
      data: {
        restrictedCalcResult,
        errorCount: restrictedPageErrors.length,
        errors: restrictedPageErrors,
      },
    });
    console.log(
      `[Restricted Context] Arithmetic check: ${restrictedArithmeticPassed ? "PASS" : "FAIL"}`
    );

    // Test in-memory history and dialogs in restricted context
    console.log("[Restricted Context] Testing in-memory history fallback and clear dialog...");
    await restrictedPage.click(".history-btn");
    await restrictedPage.waitForTimeout(50);

    const restrictedHistoryItemText = await restrictedPage.evaluate(() => {
      return document.querySelector(".history-item")?.textContent || "";
    });

    const restrictedHistoryInMemWorked = restrictedHistoryItemText.includes("8×5 = 40");

    await restrictedPage.click("#clearHistoryBtn");
    await restrictedPage.waitForTimeout(50);
    const restrictedOverlayOpen = await restrictedPage.evaluate(() => {
      const overlay = document.getElementById("clearHistoryOverlay");
      return overlay.classList.contains("open") && overlay.getAttribute("aria-hidden") === "false";
    });

    await restrictedPage.click("#confirmClearHistory");
    await restrictedPage.waitForTimeout(200);

    const restrictedClearedState = await restrictedPage.evaluate(() => {
      const overlay = document.getElementById("clearHistoryOverlay");
      const emptyMsg = document.getElementById("historyEmpty");
      return {
        overlayClosed: !overlay.classList.contains("open"),
        emptyDisplayed: window.getComputedStyle(emptyMsg).display !== "none",
        historyItemsCount: document.querySelectorAll(".history-item").length,
      };
    });

    const restrictedDialogPassed =
      restrictedHistoryInMemWorked &&
      restrictedOverlayOpen &&
      restrictedClearedState.overlayClosed &&
      restrictedClearedState.historyItemsCount === 0 &&
      restrictedPageErrors.length === 0;

    results.checks.push({
      name: "[Restricted Context] In-memory history and dialogs function without uncaught exceptions on throwing storage",
      passed: restrictedDialogPassed,
      data: {
        restrictedHistoryInMemWorked,
        restrictedOverlayOpen,
        restrictedClearedState,
        errorCount: restrictedPageErrors.length,
        errors: restrictedPageErrors,
      },
    });
    console.log(
      `[Restricted Context] In-memory history & dialog check: ${restrictedDialogPassed ? "PASS" : "FAIL"}`
    );

    await restrictedContext.close();

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
