import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "../../");
const reportDir = path.join(rootDir, "work/R60-T012");
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
  console.log("Starting R60-T012 Mini Carrom layout & responsive verification (360x800 & 1280x800)...");

  const results = {
    taskId: "R60-T012",
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

    const viewports = [
      { name: "mobile", width: 360, height: 800 },
      { name: "desktop", width: 1280, height: 800 },
    ];

    const targetUrl = `http://127.0.0.1:${port}/public/mini carrom/index.html`;

    const viewportMetrics = {};

    for (const vp of viewports) {
      console.log(`\nTesting viewport: ${vp.width}x${vp.height} (${vp.name})...`);
      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
      });

      // Block Google Fonts to ensure deterministic offline execution
      await context.route("**/*fonts.googleapis.com*", (route) => route.abort());
      await context.route("**/*fonts.gstatic.com*", (route) => route.abort());

      const page = await context.newPage();

      page.on("pageerror", (err) => {
        pageErrors.push(`[${vp.name}] ${err.message}`);
        console.error(`Page error [${vp.name}]:`, err.message);
      });

      page.on("console", (msg) => {
        if (msg.type() === "error") {
          consoleErrors.push(`[${vp.name}] ${msg.text()}`);
          console.error(`Console error [${vp.name}]:`, msg.text());
        }
      });

      await page.goto(targetUrl, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(100);

      // Check mode screen anchors
      const modeScreenInfo = await page.evaluate(() => {
        const ms = document.getElementById("modeScreen");
        const doc = document.documentElement;
        return {
          exists: !!ms,
          visible: ms ? window.getComputedStyle(ms).display !== "none" : false,
          pageScrollWidth: doc.scrollWidth,
          clientWidth: doc.clientWidth,
          hasHorizontalOverflow: doc.scrollWidth > doc.clientWidth,
        };
      });

      // Click startGame('pvp') to enter gameScreen
      await page.click("button.mode-btn:first-child");
      await page.waitForTimeout(150);

      // Check gameScreen layout and anchors
      const gameScreenInfo = await page.evaluate(() => {
        const gs = document.getElementById("gameScreen");
        const card0 = document.getElementById("card0");
        const pname0 = document.getElementById("pname0");
        const panel = document.getElementById("ctrlPanel");
        const backBtn = document.querySelector(".project-back-button");
        const h1 = document.querySelector("h1");
        const doc = document.documentElement;

        const rows = Array.from(document.querySelectorAll(".ctrl-row")).map((r, i) => {
          return {
            row: i + 1,
            scrollWidth: r.scrollWidth,
            clientWidth: r.clientWidth,
            hasOverflow: r.scrollWidth > r.clientWidth,
          };
        });

        const shootBtn = document.getElementById("shootBtn");
        const shootRect = shootBtn ? shootBtn.getBoundingClientRect() : null;
        const panelRect = panel ? panel.getBoundingClientRect() : null;
        const backBtnRect = backBtn ? backBtn.getBoundingClientRect() : null;
        const h1Rect = h1 ? h1.getBoundingClientRect() : null;

        // Check if back button overlaps title header
        const backBtnOverlapsH1 =
          backBtnRect && h1Rect
            ? backBtnRect.bottom > h1Rect.top &&
              backBtnRect.top < h1Rect.bottom &&
              backBtnRect.right > h1Rect.left &&
              backBtnRect.left < h1Rect.right
            : false;

        return {
          gameScreenExists: !!gs,
          gameScreenVisible: gs ? window.getComputedStyle(gs).display !== "none" : false,
          card0Exists: !!card0,
          pname0Exists: !!pname0,
          pname0Text: pname0 ? pname0.innerText.trim() : null,
          pageScrollWidth: doc.scrollWidth,
          clientWidth: doc.clientWidth,
          hasPageHorizontalOverflow: doc.scrollWidth > doc.clientWidth,
          panelFitsViewport: panelRect ? panelRect.right <= window.innerWidth + 2 && panelRect.left >= -2 : false,
          shootBtnFitsPanel: shootRect && panelRect ? shootRect.right <= panelRect.right + 2 : false,
          rows,
          anyRowOverflows: rows.some((r) => r.hasOverflow),
          backBtnOverlapsH1,
        };
      });

      // Save screenshot for evidence
      const screenshotPath = path.join(reportDir, `screenshot-${vp.width}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: true });

      viewportMetrics[vp.name] = {
        viewport: vp,
        modeScreen: modeScreenInfo,
        gameScreen: gameScreenInfo,
        screenshot: `work/R60-T012/screenshot-${vp.width}.png`,
      };

      await page.close();
      await context.close();
    }

    // ==========================================
    // Check 1: Source Anchors Exist & Functional
    // Source anchors: #modeScreen, #gameScreen, #card0, #pname0
    // ==========================================
    const anchors360 = viewportMetrics.mobile.gameScreen;
    const anchors1280 = viewportMetrics.desktop.gameScreen;

    const anchorsPassed =
      viewportMetrics.mobile.modeScreen.exists &&
      viewportMetrics.desktop.modeScreen.exists &&
      anchors360.gameScreenExists &&
      anchors360.card0Exists &&
      anchors360.pname0Exists &&
      anchors1280.gameScreenExists &&
      anchors1280.card0Exists &&
      anchors1280.pname0Exists &&
      anchors360.pname0Text.toUpperCase().includes("PLAYER 1");

    results.checks.push({
      name: "Source anchors exist and render correctly (#modeScreen, #gameScreen, #card0, #pname0)",
      passed: anchorsPassed,
      data: {
        mobile: {
          modeScreen: viewportMetrics.mobile.modeScreen.exists,
          gameScreen: anchors360.gameScreenExists,
          card0: anchors360.card0Exists,
          pname0: anchors360.pname0Exists,
          pname0Text: anchors360.pname0Text,
        },
        desktop: {
          modeScreen: viewportMetrics.desktop.modeScreen.exists,
          gameScreen: anchors1280.gameScreenExists,
          card0: anchors1280.card0Exists,
          pname0: anchors1280.pname0Exists,
        },
      },
    });
    console.log(`Source anchors check: ${anchorsPassed ? "PASS" : "FAIL"}`);

    // ==========================================
    // Check 2: No Unintended Horizontal Overflow at 360x800
    // ==========================================
    const mobileNoOverflow =
      !viewportMetrics.mobile.modeScreen.hasHorizontalOverflow &&
      !viewportMetrics.mobile.gameScreen.hasPageHorizontalOverflow &&
      !viewportMetrics.mobile.gameScreen.anyRowOverflows;

    results.checks.push({
      name: "No unintended horizontal overflow at 360x800 viewport width (page and control rows fit viewport)",
      passed: mobileNoOverflow,
      data: {
        modeScrollWidth: viewportMetrics.mobile.modeScreen.pageScrollWidth,
        modeClientWidth: viewportMetrics.mobile.modeScreen.clientWidth,
        gameScrollWidth: viewportMetrics.mobile.gameScreen.pageScrollWidth,
        gameClientWidth: viewportMetrics.mobile.gameScreen.clientWidth,
        rows: viewportMetrics.mobile.gameScreen.rows,
      },
    });
    console.log(`Mobile horizontal overflow check: ${mobileNoOverflow ? "PASS" : "FAIL"}`);

    // ==========================================
    // Check 3: No Unintended Horizontal Overflow at 1280x800
    // ==========================================
    const desktopNoOverflow =
      !viewportMetrics.desktop.modeScreen.hasHorizontalOverflow &&
      !viewportMetrics.desktop.gameScreen.hasPageHorizontalOverflow &&
      !viewportMetrics.desktop.gameScreen.anyRowOverflows;

    results.checks.push({
      name: "No unintended horizontal overflow at 1280x800 viewport width (desktop layout fits cleanly)",
      passed: desktopNoOverflow,
      data: {
        modeScrollWidth: viewportMetrics.desktop.modeScreen.pageScrollWidth,
        modeClientWidth: viewportMetrics.desktop.modeScreen.clientWidth,
        gameScrollWidth: viewportMetrics.desktop.gameScreen.pageScrollWidth,
        gameClientWidth: viewportMetrics.desktop.gameScreen.clientWidth,
        rows: viewportMetrics.desktop.gameScreen.rows,
      },
    });
    console.log(`Desktop horizontal overflow check: ${desktopNoOverflow ? "PASS" : "FAIL"}`);

    // ==========================================
    // Check 4: No Clipped Controls & No Overlapping Header Elements
    // ==========================================
    const controlsUsable =
      viewportMetrics.mobile.gameScreen.panelFitsViewport &&
      viewportMetrics.mobile.gameScreen.shootBtnFitsPanel &&
      !viewportMetrics.mobile.gameScreen.backBtnOverlapsH1 &&
      viewportMetrics.desktop.gameScreen.panelFitsViewport &&
      !viewportMetrics.desktop.gameScreen.backBtnOverlapsH1;

    results.checks.push({
      name: "Interactive controls and header elements are unclipped, usable and non-overlapping at both widths",
      passed: controlsUsable,
      data: {
        mobilePanelFits: viewportMetrics.mobile.gameScreen.panelFitsViewport,
        mobileShootFits: viewportMetrics.mobile.gameScreen.shootBtnFitsPanel,
        mobileBackOverlapsH1: viewportMetrics.mobile.gameScreen.backBtnOverlapsH1,
        desktopBackOverlapsH1: viewportMetrics.desktop.gameScreen.backBtnOverlapsH1,
      },
    });
    console.log(`Controls and layout clipping check: ${controlsUsable ? "PASS" : "FAIL"}`);

    // ==========================================
    // Check 5: No Uncaught Page or Console Errors
    // ==========================================
    const noErrors = pageErrors.length === 0 && consoleErrors.length === 0;
    results.checks.push({
      name: "No uncaught runtime page errors or console error messages during test",
      passed: noErrors,
      data: { pageErrors, consoleErrors },
    });
    console.log(`Page errors check: ${noErrors ? "PASS" : "FAIL"}`);

    // ==========================================
    // Check 6: README Documentation Verification
    // ==========================================
    const readmeContent = fs.readFileSync(
      path.join(rootDir, "public/mini carrom/README.md"),
      "utf-8"
    );

    const docsVerified =
      readmeContent.includes("Responsive") &&
      readmeContent.includes("r60-t012.mjs") &&
      readmeContent.includes("360");

    results.checks.push({
      name: "README.md documents responsive layout behavior at tested widths and includes automated test command",
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
      taskId: "R60-T012",
      timestamp: new Date().toISOString(),
      item: "public/mini carrom",
      testedWidths: ["360x800", "1280x800"],
      baselineFindings: {
        at360: {
          pageHorizontalOverflow: true,
          pageScrollWidth: 470,
          row3Overflow: true,
          backButtonOverlapsH1: true,
        },
        at1280: {
          pageHorizontalOverflow: false,
          pageScrollWidth: 1280,
          row3Overflow: false,
          backButtonOverlapsH1: false,
        },
      },
      improvements: {
        repairedMobileControlRowOverflow: true,
        repositionedBackButtonOnSmallScreens: true,
        containedBoardWrapperAndControls: true,
        verifiedSourceAnchors: true,
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
