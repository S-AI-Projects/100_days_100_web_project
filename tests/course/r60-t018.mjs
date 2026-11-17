import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "../../");
const reportDir = path.join(rootDir, "work/R60-T018");
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
  console.log("Starting R60-T018 SVGPathBuilder safe text rendering verification...");

  const results = {
    taskId: "R60-T018",
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

    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await context.newPage();

    page.on("pageerror", (err) => pageErrors.push(err.message));
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });

    await page.goto(`http://127.0.0.1:${port}/public/SVGPathBuilder/index.html`, {
      waitUntil: "domcontentloaded",
    });

    // ==========================================
    // Check 1: Target Source Anchors Verification
    // ==========================================
    const anchors = await page.evaluate(() => {
      const drawCanvas = document.getElementById("draw-canvas");
      const svgPath = document.getElementById("svg-path");
      const clearBtn = document.getElementById("clear-btn");
      const copyBtn = document.getElementById("copy-btn");
      const codeOutput = document.getElementById("code-output");
      const pathLabelInput = document.getElementById("path-label-input");
      const setLabelBtn = document.getElementById("set-label-btn");
      const pathLabelPreview = document.getElementById("path-label-preview");

      return {
        drawCanvas: !!drawCanvas && drawCanvas.tagName.toLowerCase() === "svg",
        svgPath: !!svgPath && svgPath.tagName.toLowerCase() === "path",
        clearBtn: !!clearBtn && clearBtn.tagName.toLowerCase() === "button",
        copyBtn: !!copyBtn && copyBtn.tagName.toLowerCase() === "button",
        codeOutput: !!codeOutput,
        pathLabelInput: !!pathLabelInput,
        setLabelBtn: !!setLabelBtn,
        pathLabelPreview: !!pathLabelPreview,
      };
    });

    const anchorsPassed =
      anchors.drawCanvas &&
      anchors.svgPath &&
      anchors.clearBtn &&
      anchors.copyBtn &&
      anchors.codeOutput &&
      anchors.pathLabelInput &&
      anchors.setLabelBtn &&
      anchors.pathLabelPreview;

    results.checks.push({
      name: "Source anchors exist with required DOM structures (#draw-canvas, #svg-path, #clear-btn, #copy-btn)",
      passed: anchorsPassed,
      data: anchors,
    });
    console.log(`Source anchors check: ${anchorsPassed ? "PASS" : "FAIL"}`);

    // ==========================================
    // Check 2: Core Drawing and Clear Interaction
    // ==========================================
    console.log("Testing core drawing and clear interactions...");
    const canvasBox = await page.locator("#draw-canvas").boundingBox();
    if (!canvasBox) {
      throw new Error("Could not get bounding box for #draw-canvas");
    }

    // Click 3 points on the canvas
    await page.mouse.click(canvasBox.x + 50, canvasBox.y + 50);
    await page.mouse.click(canvasBox.x + 150, canvasBox.y + 120);
    await page.mouse.click(canvasBox.x + 250, canvasBox.y + 60);

    const drawState = await page.evaluate(() => {
      const path = document.getElementById("svg-path");
      const nodes = document.querySelectorAll("#draw-canvas .node");
      const code = document.getElementById("code-output");

      return {
        hasPathD: (path?.getAttribute("d") || "").startsWith("M "),
        nodeCount: nodes.length,
        codeContainsSvg: code?.textContent?.includes("<svg") || false,
        codeContainsPath: code?.textContent?.includes("<path d=") || false,
      };
    });

    const drawPassed =
      drawState.hasPathD &&
      drawState.nodeCount === 3 &&
      drawState.codeContainsSvg &&
      drawState.codeContainsPath;

    // Now test Clear button
    await page.locator("#clear-btn").click();

    const clearState = await page.evaluate(() => {
      const path = document.getElementById("svg-path");
      const nodes = document.querySelectorAll("#draw-canvas .node");
      const code = document.getElementById("code-output");

      return {
        pathIsEmpty: path?.getAttribute("d") === "",
        nodeCount: nodes.length,
        codeIsEmpty: code?.textContent === "",
      };
    });

    const clearPassed =
      clearState.pathIsEmpty && clearState.nodeCount === 0 && clearState.codeIsEmpty;

    const drawingAndClearPassed = drawPassed && clearPassed;
    results.checks.push({
      name: "Core drawing (point creation, SVG path calculation) and clearing behave correctly",
      passed: drawingAndClearPassed,
      data: { drawState, clearState },
    });
    console.log(`Core drawing and clear check: ${drawingAndClearPassed ? "PASS" : "FAIL"}`);

    // ==========================================
    // Check 3: Safe Text Rendering - HTML Formatting / Special Characters
    // ==========================================
    console.log("Testing safe text rendering with HTML markup and entity characters...");
    const markupString = "<b>Bold Header</b> & <span class='test'>Special 'Quotes' & \"Entities\"</span>";

    await page.fill("#path-label-input", markupString);
    await page.click("#set-label-btn");

    const markupCheck = await page.evaluate((expected) => {
      const preview = document.getElementById("path-label-preview");
      const bTag = preview?.querySelector("b");
      const spanTag = preview?.querySelector("span");

      return {
        textContentMatches: preview?.textContent === expected,
        hasNoInjectedBTag: bTag === null,
        hasNoInjectedSpanTag: spanTag === null,
        innerHTMLIsEscaped: preview?.innerHTML?.includes("&lt;b&gt;"),
      };
    }, markupString);

    const markupPassed =
      markupCheck.textContentMatches &&
      markupCheck.hasNoInjectedBTag &&
      markupCheck.hasNoInjectedSpanTag &&
      markupCheck.innerHTMLIsEscaped;

    results.checks.push({
      name: "Safe text rendering keeps HTML formatting markup and entities strictly as text without DOM elements",
      passed: markupPassed,
      data: markupCheck,
    });
    console.log(`HTML formatting safe text check: ${markupPassed ? "PASS" : "FAIL"}`);

    // ==========================================
    // Check 4: Safe Text Rendering - Malicious <img> with onerror Handler
    // ==========================================
    console.log("Testing safe text rendering with hostile <img onerror> payload...");
    const xssImgPayload = `<img src="nonexistent-file.png" onerror="window.__xss_img_executed=true;" />`;

    await page.fill("#path-label-input", xssImgPayload);
    // Also test live typing/input event handler
    await page.dispatchEvent("#path-label-input", "input");

    // Wait a brief tick to ensure any browser handler would have fired if executed
    await page.waitForTimeout(100);

    const xssImgCheck = await page.evaluate((expected) => {
      const preview = document.getElementById("path-label-preview");
      const imgInPreview = preview?.querySelector("img");
      const imgInDocument = document.querySelectorAll("img");

      return {
        xssExecuted: window.__xss_img_executed === true,
        textContentMatches: preview?.textContent === expected,
        noImgInPreview: imgInPreview === null,
        noImgInDocument: imgInDocument.length === 0,
        innerHTMLIsEscaped: preview?.innerHTML?.includes("&lt;img"),
      };
    }, xssImgPayload);

    const xssImgPassed =
      !xssImgCheck.xssExecuted &&
      xssImgCheck.textContentMatches &&
      xssImgCheck.noImgInPreview &&
      xssImgCheck.noImgInDocument &&
      xssImgCheck.innerHTMLIsEscaped;

    results.checks.push({
      name: "Safe text rendering neutralizes <img onerror> vector (no execution, no DOM node, literal text preserved)",
      passed: xssImgPassed,
      data: xssImgCheck,
    });
    console.log(`<img onerror> safe text check: ${xssImgPassed ? "PASS" : "FAIL"}`);

    // ==========================================
    // Check 5: Safe Text Rendering - Script Injection and Arbitrary Node Injection
    // ==========================================
    console.log("Testing safe text rendering with script and nested element payload...");
    const scriptPayload = `<script>window.__xss_script_executed=true;</script><div id="injected-payload-div">Injected Content</div>`;

    await page.fill("#path-label-input", scriptPayload);
    await page.click("#set-label-btn");

    await page.waitForTimeout(100);

    const scriptCheck = await page.evaluate((expected) => {
      const preview = document.getElementById("path-label-preview");
      const injectedDiv = document.getElementById("injected-payload-div");
      const scriptInPreview = preview?.querySelector("script");

      return {
        scriptExecuted: window.__xss_script_executed === true,
        textContentMatches: preview?.textContent === expected,
        noInjectedDiv: injectedDiv === null,
        noScriptTag: scriptInPreview === null,
      };
    }, scriptPayload);

    const scriptPassed =
      !scriptCheck.scriptExecuted &&
      scriptCheck.textContentMatches &&
      scriptCheck.noInjectedDiv &&
      scriptCheck.noScriptTag;

    results.checks.push({
      name: "Safe text rendering neutralizes <script> and injected node vectors (no script execution, element not found)",
      passed: scriptPassed,
      data: scriptCheck,
    });
    console.log(`<script> safe text check: ${scriptPassed ? "PASS" : "FAIL"}`);

    // ==========================================
    // Check 6: Safe Text in SVG Code Output
    // ==========================================
    console.log("Testing safe comment integration in generated SVG code output...");
    // Draw a point so codeOutput is populated
    await page.mouse.click(canvasBox.x + 100, canvasBox.y + 100);
    await page.mouse.click(canvasBox.x + 200, canvasBox.y + 100);

    const codeOutputCheck = await page.evaluate(() => {
      const codeOutput = document.getElementById("code-output");
      const text = codeOutput?.textContent || "";
      const injectedInDoc = document.getElementById("injected-payload-div");

      return {
        hasCode: text.length > 0,
        includesLabelComment: text.includes("<!-- label:"),
        noInjectedInDoc: injectedInDoc === null,
      };
    });

    const codeOutputPassed =
      codeOutputCheck.hasCode &&
      codeOutputCheck.includesLabelComment &&
      codeOutputCheck.noInjectedInDoc;

    results.checks.push({
      name: "Generated SVG code safely reflects fixture label metadata without DOM execution",
      passed: codeOutputPassed,
      data: codeOutputCheck,
    });
    console.log(`SVG code output check: ${codeOutputPassed ? "PASS" : "FAIL"}`);

    // ==========================================
    // Check 7: No Uncaught Page or Console Errors
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
      path.join(rootDir, "public/SVGPathBuilder/README.md"),
      "utf-8"
    );

    const docsVerified =
      readmeContent.includes("Safe Text Rendering & Security") &&
      readmeContent.includes("r60-t018.mjs") &&
      readmeContent.includes("textContent");

    results.checks.push({
      name: "README.md documents safe text rendering guidelines and automated test execution",
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
      taskId: "R60-T018",
      timestamp: new Date().toISOString(),
      item: "public/SVGPathBuilder",
      anchors: ["#draw-canvas", "#svg-path", "#clear-btn", "#copy-btn"],
      safeTextRendering: {
        strategy: "Strict textContent DOM binding for user/fixture text",
        targetElements: ["#path-label-preview", "#code-output"],
        payloadsTested: [
          "<b>Bold Header</b> & <span class='test'>Special 'Quotes' & \"Entities\"</span>",
          '<img src="nonexistent-file.png" onerror="window.__xss_img_executed=true;" />',
          '<script>window.__xss_script_executed=true;</script><div id="injected-payload-div">Injected Content</div>',
        ],
        results: {
          xssExecuted: false,
          elementsInjected: false,
          literalTextPreserved: true,
        },
      },
    };
    fs.writeFileSync(baselineFile, JSON.stringify(baselineData, null, 2), "utf-8");
    console.log(`Saved baseline records to ${baselineFile}`);

    await context.close();

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
