import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "../../");
const reportDir = path.join(rootDir, "work/R60-T017");
const reportFile = path.join(reportDir, "results-latest.json");
const baselineFile = path.join(reportDir, "baseline.json");
const screenshotFile = path.join(reportDir, "walkthrough.png");

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
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
  console.log("Starting R60-T017 Drawing-Canva tested walkthrough execution...");

  const results = {
    taskId: "R60-T017",
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

    // Intercept external font and icon resources to keep regression test self-contained & offline
    await context.route("**/*", (route) => {
      const u = route.request().url();
      if (
        u.includes("cdnjs.cloudflare.com") ||
        u.includes("fonts.googleapis.com") ||
        u.includes("fonts.gstatic.com")
      ) {
        route.fulfill({
          status: 200,
          contentType: "text/css",
          body: "/* mock font/icon css */",
        });
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
        consoleErrors.push(msg.text());
        console.error("Console error detected:", msg.text());
      }
    });

    // ==========================================
    // Walkthrough Step 1 & 2: Load Page & Verify Shell & Anchors (#app, #left, #brush, #eraser)
    // ==========================================
    const targetUrl = `http://127.0.0.1:${port}/public/Drawing-Canva/index.html`;
    await page.goto(targetUrl, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(200);

    const anchorState = await page.evaluate(() => {
      const app = document.getElementById("app");
      const left = document.getElementById("left");
      const brush = document.getElementById("brush");
      const eraser = document.getElementById("eraser");
      const canvas = document.getElementById("canvas");
      const currentTool = document.getElementById("currentTool");
      const canvasSize = document.getElementById("canvasSize");

      const appRect = app?.getBoundingClientRect();
      const leftRect = left?.getBoundingClientRect();
      const canvasRect = canvas?.getBoundingClientRect();

      return {
        appExists: !!app && app.tagName === "DIV",
        leftExists: !!left && left.tagName === "ASIDE",
        brushExists: !!brush && brush.tagName === "BUTTON",
        eraserExists: !!eraser && eraser.tagName === "BUTTON",
        brushActive: brush?.classList.contains("active"),
        eraserActive: eraser?.classList.contains("active"),
        currentToolText: currentTool?.textContent.trim(),
        canvasSizeText: canvasSize?.textContent.trim(),
        appWidth: Math.round(appRect?.width || 0),
        appHeight: Math.round(appRect?.height || 0),
        leftWidth: Math.round(leftRect?.width || 0),
        canvasWidth: Math.round(canvasRect?.width || 0),
        canvasHeight: Math.round(canvasRect?.height || 0),
      };
    });

    const anchorsPassed =
      anchorState.appExists &&
      anchorState.leftExists &&
      anchorState.brushExists &&
      anchorState.eraserExists;

    results.checks.push({
      name: "Source anchors exist (#app, #left, #brush, #eraser)",
      passed: anchorsPassed,
      data: anchorState,
    });
    console.log(`Source anchors check: ${anchorsPassed ? "PASS" : "FAIL"}`);

    // Verify initial layout observations match documented layout
    const layoutPassed =
      anchorState.appWidth === 1280 &&
      anchorState.appHeight === 800 &&
      anchorState.leftWidth === 300 &&
      anchorState.canvasWidth === 980 &&
      anchorState.canvasHeight === 720 &&
      anchorState.brushActive === true &&
      anchorState.eraserActive === false &&
      anchorState.currentToolText === "Brush" &&
      anchorState.canvasSizeText === "980 × 720 px";

    results.checks.push({
      name: "Initial layout observation matches documented walkthrough specifications",
      passed: layoutPassed,
      data: anchorState,
    });
    console.log(`Initial layout check: ${layoutPassed ? "PASS" : "FAIL"}`);

    // ==========================================
    // Walkthrough Step 3: Draw Stroke with #brush
    // ==========================================
    const canvasEl = page.locator("#canvas");
    const canvasBox = await canvasEl.boundingBox();

    // Initial canvas pixel check at (250, 200) relative to canvas
    const initialPixel = await page.evaluate(() => {
      const c = document.getElementById("canvas");
      const ctx = c.getContext("2d", { willReadFrequently: true });
      const p = ctx.getImageData(250, 200, 1, 1).data;
      return { r: p[0], g: p[1], b: p[2], a: p[3] };
    });

    const initialWhite =
      initialPixel.r === 255 &&
      initialPixel.g === 255 &&
      initialPixel.b === 255;

    // Draw stroke across (150, 150) -> (250, 200) -> (350, 250)
    await page.mouse.move(canvasBox.x + 150, canvasBox.y + 150);
    await page.mouse.down();
    await page.mouse.move(canvasBox.x + 250, canvasBox.y + 200, { steps: 5 });
    await page.mouse.move(canvasBox.x + 350, canvasBox.y + 250, { steps: 5 });
    await page.mouse.up();
    await page.waitForTimeout(100);

    const afterDraw = await page.evaluate(() => {
      const c = document.getElementById("canvas");
      const ctx = c.getContext("2d", { willReadFrequently: true });
      const p = ctx.getImageData(250, 200, 1, 1).data;
      const mousePos = document.getElementById("mousePos")?.textContent.trim();
      return {
        pixel: { r: p[0], g: p[1], b: p[2], a: p[3] },
        mousePos,
      };
    });

    const drawPassed =
      initialWhite &&
      afterDraw.pixel.r === 0 &&
      afterDraw.pixel.g === 0 &&
      afterDraw.pixel.b === 0 &&
      afterDraw.mousePos.includes("X:350") &&
      afterDraw.mousePos.includes("Y:250");

    results.checks.push({
      name: "Walkthrough Step 3: Drawing with #brush renders black stroke and updates #mousePos",
      passed: drawPassed,
      data: { initialPixel, afterDraw },
    });
    console.log(`Walkthrough brush drawing check: ${drawPassed ? "PASS" : "FAIL"}`);

    // ==========================================
    // Walkthrough Step 4 & 5: Switch to #eraser & Erase Stroke
    // ==========================================
    const eraserBtn = page.locator("#eraser");
    await eraserBtn.click();
    await page.waitForTimeout(100);

    const toolSwitchState = await page.evaluate(() => {
      const brush = document.getElementById("brush");
      const eraser = document.getElementById("eraser");
      const currentTool = document.getElementById("currentTool");
      return {
        brushActive: brush?.classList.contains("active"),
        eraserActive: eraser?.classList.contains("active"),
        toolText: currentTool?.textContent.trim(),
      };
    });

    // Erase across the point (250, 200)
    await page.mouse.move(canvasBox.x + 240, canvasBox.y + 195);
    await page.mouse.down();
    await page.mouse.move(canvasBox.x + 260, canvasBox.y + 205, { steps: 5 });
    await page.mouse.up();
    await page.waitForTimeout(100);

    const afterErase = await page.evaluate(() => {
      const c = document.getElementById("canvas");
      const ctx = c.getContext("2d", { willReadFrequently: true });
      const p = ctx.getImageData(250, 200, 1, 1).data;
      return { r: p[0], g: p[1], b: p[2], a: p[3] };
    });

    const erasePassed =
      toolSwitchState.brushActive === false &&
      toolSwitchState.eraserActive === true &&
      toolSwitchState.toolText === "Eraser" &&
      afterErase.r === 255 &&
      afterErase.g === 255 &&
      afterErase.b === 255;

    results.checks.push({
      name: "Walkthrough Step 4 & 5: Switching to #eraser updates tool indicator and erases stroke back to background color",
      passed: erasePassed,
      data: { toolSwitchState, afterErase },
    });
    console.log(`Walkthrough eraser check: ${erasePassed ? "PASS" : "FAIL"}`);

    // ==========================================
    // Walkthrough Step 6 & 7: History Undo & Redo
    // ==========================================
    const undoBtn = page.locator("#undo");
    await undoBtn.click();
    await page.waitForTimeout(100);

    const afterUndoPixel = await page.evaluate(() => {
      const c = document.getElementById("canvas");
      const ctx = c.getContext("2d", { willReadFrequently: true });
      const p = ctx.getImageData(250, 200, 1, 1).data;
      return { r: p[0], g: p[1], b: p[2], a: p[3] };
    });

    const redoBtn = page.locator("#redo");
    await redoBtn.click();
    await page.waitForTimeout(100);

    const afterRedoPixel = await page.evaluate(() => {
      const c = document.getElementById("canvas");
      const ctx = c.getContext("2d", { willReadFrequently: true });
      const p = ctx.getImageData(250, 200, 1, 1).data;
      return { r: p[0], g: p[1], b: p[2], a: p[3] };
    });

    const undoRedoPassed =
      afterUndoPixel.r === 0 &&
      afterUndoPixel.g === 0 &&
      afterUndoPixel.b === 0 &&
      afterRedoPixel.r === 255 &&
      afterRedoPixel.g === 255 &&
      afterRedoPixel.b === 255;

    results.checks.push({
      name: "Walkthrough Step 6 & 7: Undo restores drawn stroke and Redo restores erased stroke",
      passed: undoRedoPassed,
      data: { afterUndoPixel, afterRedoPixel },
    });
    console.log(`Walkthrough undo/redo check: ${undoRedoPassed ? "PASS" : "FAIL"}`);

    // ==========================================
    // Walkthrough Step 8: Clear Canvas
    // ==========================================
    const clearBtn = page.locator(".btn.clear");
    await clearBtn.click();
    await page.waitForTimeout(100);

    const afterClear = await page.evaluate(() => {
      const c = document.getElementById("canvas");
      const ctx = c.getContext("2d", { willReadFrequently: true });
      const p1 = ctx.getImageData(150, 150, 1, 1).data;
      const p2 = ctx.getImageData(250, 200, 1, 1).data;
      const p3 = ctx.getImageData(350, 250, 1, 1).data;
      return {
        p1: { r: p1[0], g: p1[1], b: p1[2] },
        p2: { r: p2[0], g: p2[1], b: p2[2] },
        p3: { r: p3[0], g: p3[1], b: p3[2] },
      };
    });

    const clearPassed =
      afterClear.p1.r === 255 &&
      afterClear.p2.r === 255 &&
      afterClear.p3.r === 255;

    results.checks.push({
      name: "Walkthrough Step 8: Clear canvas resets entire canvas surface to white background",
      passed: clearPassed,
      data: afterClear,
    });
    console.log(`Walkthrough clear canvas check: ${clearPassed ? "PASS" : "FAIL"}`);

    // ==========================================
    // Walkthrough Visual Artifact: Screenshot Generation
    // ==========================================
    await page.screenshot({ path: screenshotFile });
    const screenshotStat = fs.existsSync(screenshotFile) ? fs.statSync(screenshotFile) : null;
    const screenshotPassed = !!screenshotStat && screenshotStat.size > 10000;

    results.checks.push({
      name: "Walkthrough visual artifact screenshot captured and verified",
      passed: screenshotPassed,
      data: { screenshotFile, size: screenshotStat?.size || 0 },
    });
    console.log(`Walkthrough screenshot check: ${screenshotPassed ? "PASS" : "FAIL"}`);

    // ==========================================
    // Check 8: No Uncaught Page or Console Errors
    // ==========================================
    const noErrors = pageErrors.length === 0 && consoleErrors.length === 0;
    results.checks.push({
      name: "No uncaught runtime page errors or console error messages during test",
      passed: noErrors,
      data: { pageErrors, consoleErrors },
    });
    console.log(`Page errors check: ${noErrors ? "PASS" : "FAIL"}`);

    // ==========================================
    // Check 9: README Walkthrough Documentation Verification
    // ==========================================
    const readmeContent = fs.readFileSync(
      path.join(rootDir, "public/Drawing-Canva/README.md"),
      "utf-8"
    );

    const docsVerified =
      readmeContent.includes("Tested Walkthrough") &&
      readmeContent.includes("r60-t017.mjs") &&
      readmeContent.includes("#brush") &&
      readmeContent.includes("#eraser") &&
      readmeContent.includes("#canvas") &&
      readmeContent.includes("980 × 720 px");

    results.checks.push({
      name: "README.md documents tested walkthrough steps, selectors, outputs, and automated test command",
      passed: docsVerified,
      data: { docsVerified },
    });
    console.log(`README walkthrough documentation check: ${docsVerified ? "PASS" : "FAIL"}`);

    // Summary evaluation
    const allPassed = results.checks.every((c) => c.passed);
    results.passed = allPassed;

    fs.writeFileSync(reportFile, JSON.stringify(results, null, 2), "utf-8");
    console.log(`\nSaved report to ${reportFile}`);

    // Record baseline data
    const baselineData = {
      taskId: "R60-T017",
      timestamp: new Date().toISOString(),
      item: "public/Drawing-Canva",
      entryPoint: "public/Drawing-Canva/index.html",
      setupCommand: "node tests/course/r60-t017.mjs",
      anchors: ["#app", "#left", "#brush", "#eraser"],
      walkthroughSteps: [
        "1. Layout Shell & Viewport (1280x800)",
        "2. Default State Observation (Brush active, 980x720px canvas)",
        "3. Freehand Draw with #brush (stroke rendering verified via pixel inspection)",
        "4. Switch to #eraser & Erase Stroke",
        "5. History Undo & Redo Verification",
        "6. Clear Canvas Surface",
        "7. Visual Screenshot Artifact generation (walkthrough.png)",
      ],
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
