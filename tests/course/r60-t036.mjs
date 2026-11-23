import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "../../");
const reportDir = path.join(rootDir, "work/R60-T036");
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
  console.log("Starting R60-T036 SnapScribe feature support regression test...");

  fs.mkdirSync(reportDir, { recursive: true });

  const { server, port } = await startServer();
  console.log(`Local HTTP server running on http://127.0.0.1:${port}`);

  const pagePath = "/public/SnapScribe/index.html";
  const url = `http://127.0.0.1:${port}${pagePath}`;

  const sourceAnchors = ["#root"];
  const testResults = {
    taskId: "R60-T036",
    page: "public/SnapScribe/index.html",
    timestamp: new Date().toISOString(),
    anchorsCheck: false,
    featurePresentCheck: false,
    featureAbsentCheck: false,
    pageErrors: [],
  };

  let browser;

  try {
    browser = await chromium.launch({ headless: true });

    // 1. Feature Present Path
    console.log("Testing feature-present path (mocked getUserMedia)...");
    const contextSupported = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const pageSupported = await contextSupported.newPage();

    const supportedErrors = [];
    pageSupported.on("pageerror", (err) => supportedErrors.push(err.message));

    // Inject mock mediaDevices stream
    await pageSupported.addInitScript(() => {
      if (!navigator.mediaDevices) navigator.mediaDevices = {};
      navigator.mediaDevices.getUserMedia = async () => {
        const canvas = document.createElement("canvas");
        canvas.width = 640;
        canvas.height = 480;
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#6366f1";
        ctx.fillRect(0, 0, 640, 480);
        return canvas.captureStream(30);
      };
      navigator.mediaDevices.enumerateDevices = async () => [
        { kind: "videoinput", deviceId: "default", label: "Front Camera" },
      ];
    });

    await pageSupported.goto(url, { waitUntil: "domcontentloaded" });
    await pageSupported.waitForSelector("#root", { timeout: 5000 });

    const rootCount = await pageSupported.locator("#root").count();
    assert.ok(rootCount > 0, "Anchor #root must be mounted");
    testResults.anchorsCheck = true;

    // Trigger camera modal
    await pageSupported.waitForSelector(".camera-trigger", { timeout: 5000 });
    await pageSupported.click(".camera-trigger");

    await pageSupported.waitForSelector(".camera-modal", { timeout: 5000 });
    const modalVisible = await pageSupported.locator(".camera-modal").count();
    assert.ok(modalVisible > 0, "Camera modal should open on supported path");

    // Close camera modal
    await pageSupported.click(".camera-close");
    await pageSupported.waitForTimeout(300);
    const modalClosed = await pageSupported.locator(".camera-modal").count();
    assert.equal(modalClosed, 0, "Camera modal should close when clicking close button");

    const screenshotPath = path.join(reportDir, "feature-support.png");
    await pageSupported.screenshot({ path: screenshotPath, fullPage: true });

    assert.equal(supportedErrors.length, 0, `Errors on supported path: ${supportedErrors.join(", ")}`);
    testResults.featurePresentCheck = true;
    console.log("Feature-present path check: PASS");
    await contextSupported.close();

    // 2. Feature Absent Path
    console.log("Testing feature-absent path (unsupported getUserMedia)...");
    const contextUnsupported = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const pageUnsupported = await contextUnsupported.newPage();

    const unsupportedErrors = [];
    pageUnsupported.on("pageerror", (err) => unsupportedErrors.push(err.message));

    // Stub missing media devices
    await pageUnsupported.addInitScript(() => {
      Object.defineProperty(navigator, "mediaDevices", {
        value: undefined,
        configurable: true,
      });
    });

    await pageUnsupported.goto(url, { waitUntil: "domcontentloaded" });
    await pageUnsupported.waitForSelector(".camera-trigger", { timeout: 5000 });

    // Clicking trigger with unsupported mediaDevices must not throw uncaught page crash
    await pageUnsupported.click(".camera-trigger");
    await pageUnsupported.waitForTimeout(500);

    // Filter out expected toast/notification behaviors; assert zero uncaught fatal page crashes
    assert.equal(
      unsupportedErrors.length,
      0,
      `Uncaught page errors on unsupported path: ${unsupportedErrors.join(", ")}`
    );

    testResults.featureAbsentCheck = true;
    console.log("Feature-absent path check: PASS (graceful error handling, 0 uncaught errors)");
    await contextUnsupported.close();

    testResults.pageErrors = [...supportedErrors, ...unsupportedErrors];

    // Write baseline metadata
    const baseline = {
      task: "R60-T036",
      description: "SnapScribe camera feature-support fallback and regression check",
      dateRecorded: new Date().toISOString(),
      sourceAnchors,
      baselineObservation: "SnapScribe uses navigator.mediaDevices.getUserMedia for in-app camera capture; verified supported video capture path and graceful fallback when mediaDevices is unavailable.",
    };
    fs.writeFileSync(baselineFile, JSON.stringify(baseline, null, 2));
    fs.writeFileSync(reportFile, JSON.stringify(testResults, null, 2));

    const prBody = `## Description
This pull request verifies and validates browser feature detection and fallback handling for **SnapScribe** (\`public/SnapScribe\`) as specified in task \`R60-T036\` for [Issue #36](https://github.com/S-AI-Projects/100_days_100_web_project/issues/36).

### Problem Solved
Web applications relying on native hardware APIs (\`navigator.mediaDevices.getUserMedia\`) risk runtime failures on unsupported browsers or sandboxed environments. This change verifies explicit feature support and graceful fallback without uncaught exceptions.

### Changes Made
1. **\`public/SnapScribe/index.html\`**:
   - Linked built distribution assets so the application runs directly over local HTTP static servers without requiring an external build step.
2. **\`public/SnapScribe/README.md\`**:
   - Added Testing & Verification section with execution command \`node tests/course/r60-t036.mjs\`.
3. **\`tests/course/r60-t036.mjs\`**:
   - Automated test suite validating source anchor (\`#root\`), feature-present path (mocked video stream in camera modal), and feature-absent path (missing \`getUserMedia\` fallback handling without page crash).
4. **\`work/R60-T036/\`**:
   - Verification logs, test report, baseline records, and visual screenshot artifact.

## Related Issue
Fixes #36

## Type of Change
- [x] Bug fix (entrypoint asset linkage)
- [x] Documentation update
- [x] Tests (Playwright feature-support regression suite)

## Testing
- Command: \`node tests/course/r60-t036.mjs\`
- Result: **PASS** (exit code 0 on both feature-present and feature-absent paths)

## Checklist
- [x] Tested both feature-present and feature-absent paths.
- [x] Unsupported browser feature produces graceful fallback without uncaught exceptions.
- [x] Automated test exits 0 on success, non-zero on failure.
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
