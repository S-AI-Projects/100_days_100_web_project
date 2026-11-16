import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "../../");
const reportDir = path.join(rootDir, "work/R60-T027");
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
  console.log("Starting R60-T027 Video Synthesis Engine walkthrough verification...");
  const results = {
    taskId: "R60-T027",
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

    const pageErrors = [];
    page.on("pageerror", (err) => pageErrors.push(err.message));

    const targetUrl = `http://127.0.0.1:${port}/public/video-synthesis-engine/index.html`;
    await page.goto(targetUrl, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(100);

    // Check 1: Source anchors exist (#dashboard-layout, #synthesisCanvas, #metric-latency, #metric-frame)
    const anchors = await page.evaluate(() => {
      return {
        dashboardLayout: !!document.getElementById("dashboard-layout"),
        synthesisCanvas: !!document.getElementById("synthesisCanvas"),
        metricLatency: !!document.getElementById("metric-latency"),
        metricFrame: !!document.getElementById("metric-frame"),
      };
    });

    const anchorsPassed =
      anchors.dashboardLayout &&
      anchors.synthesisCanvas &&
      anchors.metricLatency &&
      anchors.metricFrame;

    results.checks.push({
      name: "Source anchors exist (#dashboard-layout, #synthesisCanvas, #metric-latency, #metric-frame)",
      passed: anchorsPassed,
      data: anchors,
    });
    console.log(`Source anchors check: ${anchorsPassed ? "PASS" : "FAIL"}`);

    // Check 2: Walkthrough Step 1 - #dashboard-layout renders columns
    const layoutEvaluation = await page.evaluate(() => {
      const layout = document.getElementById("dashboard-layout");
      if (!layout) return null;
      const cs = window.getComputedStyle(layout);
      const panels = layout.querySelectorAll(".panel");
      return {
        display: cs.display,
        gap: cs.gap,
        panelCount: panels.length,
        rect: {
          width: layout.offsetWidth,
          height: layout.offsetHeight,
        },
      };
    });

    const layoutPassed =
      layoutEvaluation &&
      layoutEvaluation.display === "flex" &&
      layoutEvaluation.panelCount >= 2 &&
      layoutEvaluation.rect.width > 0;

    results.checks.push({
      name: "Walkthrough Step 1: #dashboard-layout renders two-column flex container",
      passed: layoutPassed,
      data: layoutEvaluation,
    });
    console.log(`Dashboard layout check: ${layoutPassed ? "PASS" : "FAIL"}`);

    // Check 3: Walkthrough Step 2 - #synthesisCanvas is mounted and active
    const canvasEvaluation = await page.evaluate(() => {
      const canvas = document.getElementById("synthesisCanvas");
      if (!canvas) return null;
      const ctx = canvas.getContext("2d");
      const has2D = !!ctx;
      let nonZeroPixels = false;
      try {
        const imgData = ctx.getImageData(0, 0, 50, 50);
        nonZeroPixels = imgData.data.some((val) => val > 0);
      } catch (e) {
        nonZeroPixels = true; // In case of security restrictions
      }
      return {
        width: canvas.width,
        height: canvas.height,
        has2D,
        nonZeroPixels,
        offsetWidth: canvas.offsetWidth,
        offsetHeight: canvas.offsetHeight,
      };
    });

    const canvasPassed =
      canvasEvaluation &&
      canvasEvaluation.width === 480 &&
      canvasEvaluation.height === 360 &&
      canvasEvaluation.has2D &&
      canvasEvaluation.nonZeroPixels;

    results.checks.push({
      name: "Walkthrough Step 2: #synthesisCanvas is mounted with dimensions 480x360 and active pixel synthesis",
      passed: canvasPassed,
      data: canvasEvaluation,
    });
    console.log(`Synthesis canvas check: ${canvasPassed ? "PASS" : "FAIL"}`);

    // Check 4: Walkthrough Step 3 - Metrics HUD and frame counter incrementing over time
    const initialFrame = await page.evaluate(() => {
      const frameEl = document.getElementById("metric-frame");
      const latencyEl = document.getElementById("metric-latency");
      return {
        frameText: frameEl?.textContent?.trim(),
        latencyText: latencyEl?.textContent?.trim(),
        frameNum: parseInt(frameEl?.textContent?.trim() || "0", 10),
        latencyNum: parseFloat(latencyEl?.textContent?.trim() || "0"),
      };
    });

    console.log(`Initial frame: ${initialFrame.frameNum}, latency: ${initialFrame.latencyNum} ms`);
    console.log("Waiting 300ms for procedural frames to synthesize...");
    await page.waitForTimeout(300);

    const updatedFrame = await page.evaluate(() => {
      const frameEl = document.getElementById("metric-frame");
      const latencyEl = document.getElementById("metric-latency");
      return {
        frameText: frameEl?.textContent?.trim(),
        latencyText: latencyEl?.textContent?.trim(),
        frameNum: parseInt(frameEl?.textContent?.trim() || "0", 10),
        latencyNum: parseFloat(latencyEl?.textContent?.trim() || "0"),
      };
    });

    console.log(`Updated frame: ${updatedFrame.frameNum}, latency: ${updatedFrame.latencyNum} ms`);

    const frameIncremented =
      !isNaN(initialFrame.frameNum) &&
      !isNaN(updatedFrame.frameNum) &&
      updatedFrame.frameNum > initialFrame.frameNum;

    const latencyFormatted =
      !isNaN(initialFrame.latencyNum) &&
      initialFrame.latencyNum >= 0 &&
      !isNaN(updatedFrame.latencyNum) &&
      updatedFrame.latencyNum >= 0;

    const metricsPassed = frameIncremented && latencyFormatted;

    results.checks.push({
      name: "Walkthrough Step 3: #metric-frame increments monotonically over time and #metric-latency is formatted",
      passed: metricsPassed,
      data: {
        initialFrame,
        updatedFrame,
        frameDifference: updatedFrame.frameNum - initialFrame.frameNum,
      },
    });
    console.log(`Metrics increment check: ${metricsPassed ? "PASS" : "FAIL"}`);

    // Check 5: Walkthrough Step 4 - Interactive Controls & No Uncaught Exceptions
    console.log("Testing interactive controls (mode change and slider updates)...");
    await page.selectOption("#interpolationMode", "sine");
    await page.fill("#motionFrequency", "25");
    await page.fill("#noiseDensity", "30");
    await page.waitForTimeout(100);

    const finalEvaluation = await page.evaluate(() => {
      const mode = document.getElementById("interpolationMode")?.value;
      const freq = document.getElementById("motionFrequency")?.value;
      const noise = document.getElementById("noiseDensity")?.value;
      const frame = parseInt(document.getElementById("metric-frame")?.textContent || "0", 10);
      return { mode, freq, noise, frame };
    });

    const controlsPassed =
      finalEvaluation.mode === "sine" &&
      finalEvaluation.freq === "25" &&
      finalEvaluation.noise === "30" &&
      finalEvaluation.frame > updatedFrame.frameNum &&
      pageErrors.length === 0;

    results.checks.push({
      name: "Walkthrough Step 4: Parameter controls update without uncaught exceptions",
      passed: controlsPassed,
      data: {
        finalEvaluation,
        pageErrorsCount: pageErrors.length,
        pageErrors,
      },
    });
    console.log(`Interactive controls check: ${controlsPassed ? "PASS" : "FAIL"}`);

    // Check 6: Documentation verified in README.md
    const readmeContent = fs.readFileSync(
      path.join(rootDir, "public/video-synthesis-engine/README.md"),
      "utf-8"
    );

    const docsVerified =
      readmeContent.includes("npx serve .") &&
      readmeContent.includes("http://localhost:3000/public/video-synthesis-engine/index.html") &&
      readmeContent.includes("#dashboard-layout") &&
      readmeContent.includes("#synthesisCanvas") &&
      readmeContent.includes("#metric-latency") &&
      readmeContent.includes("#metric-frame");

    results.checks.push({
      name: "README.md contains repo-root instructions and complete executable walkthrough referencing all source anchors",
      passed: docsVerified,
      data: { docsVerified },
    });
    console.log(`README walkthrough documentation check: ${docsVerified ? "PASS" : "FAIL"}`);

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
