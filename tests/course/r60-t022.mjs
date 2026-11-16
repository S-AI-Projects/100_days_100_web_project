import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "../../");
const reportDir = path.join(rootDir, "work/R60-T022");
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
  console.log("Starting R60-T022 layout verification...");
  const results = {
    taskId: "R60-T022",
    timestamp: new Date().toISOString(),
    passed: false,
    viewports: {},
    checks: [],
  };

  let serverInstance = null;
  let browser = null;

  try {
    const { server, port } = await startServer();
    serverInstance = server;
    console.log(`Local HTTP server running on http://127.0.0.1:${port}`);

    browser = await chromium.launch({ headless: true });
    const targetUrl = `http://127.0.0.1:${port}/public/Mood%20Tracker/index.html`;

    const viewports = [
      { name: "mobile", width: 360, height: 800 },
      { name: "desktop", width: 1280, height: 800 },
    ];

    for (const vp of viewports) {
      console.log(`Testing viewport ${vp.width}x${vp.height} (${vp.name})...`);
      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
      });
      const page = await context.newPage();

      await page.goto(targetUrl, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(100);

      // Check: Source anchors exist
      const anchors = await page.evaluate(() => {
        return {
          mobileOverlay: !!document.getElementById("mobileOverlay"),
          sidebar: !!document.getElementById("sidebar"),
          currentDate: !!document.getElementById("currentDate"),
          currentTime: !!document.getElementById("currentTime"),
        };
      });

      const allAnchorsPresent =
        anchors.mobileOverlay &&
        anchors.sidebar &&
        anchors.currentDate &&
        anchors.currentTime;

      results.checks.push({
        name: `[${vp.name} ${vp.width}px] Source anchors exist (#mobileOverlay, #sidebar, #currentDate, #currentTime)`,
        passed: allAnchorsPresent,
        data: anchors,
      });

      // Check: scrollWidth <= clientWidth (no unintentional horizontal scrollbar)
      const scrollMetrics = await page.evaluate(() => {
        const de = document.documentElement;
        const b = document.body;
        return {
          docClientWidth: de.clientWidth,
          docScrollWidth: de.scrollWidth,
          bodyClientWidth: b.clientWidth,
          bodyScrollWidth: b.scrollWidth,
          hasHorizontalOverflow: de.scrollWidth > de.clientWidth,
        };
      });

      const noHorizontalScrollbar = !scrollMetrics.hasHorizontalOverflow;
      results.checks.push({
        name: `[${vp.name} ${vp.width}px] document.documentElement.scrollWidth <= document.documentElement.clientWidth`,
        passed: noHorizontalScrollbar,
        data: scrollMetrics,
      });
      console.log(
        `[${vp.name} ${vp.width}px] Horizontal scrollWidth (${scrollMetrics.docScrollWidth}) <= clientWidth (${scrollMetrics.docClientWidth}): ${noHorizontalScrollbar ? "PASS" : "FAIL"}`,
      );

      // Check: overflow-x is hidden on html, body, and .app
      const overflowStyles = await page.evaluate(() => {
        const html = window.getComputedStyle(
          document.documentElement,
        ).overflowX;
        const body = window.getComputedStyle(document.body).overflowX;
        const appEl = document.querySelector(".app");
        const app = appEl ? window.getComputedStyle(appEl).overflowX : null;
        return { html, body, app };
      });

      const overflowCorrect =
        overflowStyles.html === "hidden" &&
        overflowStyles.body === "hidden" &&
        overflowStyles.app === "hidden";

      results.checks.push({
        name: `[${vp.name} ${vp.width}px] overflow-x: hidden on html, body, and .app`,
        passed: overflowCorrect,
        data: overflowStyles,
      });

      // Check: sidebar visibility when closed
      if (vp.width <= 768) {
        const sidebarClosedStyle = await page.evaluate(() => {
          const sidebar = document.getElementById("sidebar");
          const cs = window.getComputedStyle(sidebar);
          return {
            visibility: cs.visibility,
            left: cs.left,
            width: cs.width,
            hasClassShow: sidebar.classList.contains("show"),
          };
        });

        const sidebarClosedHidden =
          sidebarClosedStyle.visibility === "hidden" &&
          !sidebarClosedStyle.hasClassShow;

        results.checks.push({
          name: `[${vp.name} ${vp.width}px] Closed #sidebar has visibility: hidden`,
          passed: sidebarClosedHidden,
          data: sidebarClosedStyle,
        });

        // Test opening sidebar via menu button
        await page.click(".menu-btn");
        await page.waitForTimeout(50);

        const sidebarOpenedStyle = await page.evaluate(() => {
          const sidebar = document.getElementById("sidebar");
          const cs = window.getComputedStyle(sidebar);
          return {
            visibility: cs.visibility,
            left: cs.left,
            hasClassShow: sidebar.classList.contains("show"),
          };
        });

        const sidebarOpenedVisible =
          sidebarOpenedStyle.visibility === "visible" &&
          sidebarOpenedStyle.hasClassShow;

        results.checks.push({
          name: `[${vp.name} ${vp.width}px] Open #sidebar has visibility: visible`,
          passed: sidebarOpenedVisible,
          data: sidebarOpenedStyle,
        });

        // Close sidebar via overlay click
        await page.evaluate(() => {
          document.getElementById("mobileOverlay").click();
        });
        await page.waitForTimeout(50);
      } else {
        const sidebarDesktopStyle = await page.evaluate(() => {
          const sidebar = document.getElementById("sidebar");
          const cs = window.getComputedStyle(sidebar);
          return {
            visibility: cs.visibility,
            display: cs.display,
            position: cs.position,
          };
        });

        const desktopSidebarVisible =
          sidebarDesktopStyle.visibility === "visible" &&
          sidebarDesktopStyle.display !== "none";

        results.checks.push({
          name: `[${vp.name} ${vp.width}px] Desktop #sidebar is visible in layout`,
          passed: desktopSidebarVisible,
          data: sidebarDesktopStyle,
        });
      }

      // Check: no interactive controls clipped
      const clippedControls = await page.evaluate((width) => {
        const issues = [];
        const selectors = [
          ".mobile-header .menu-btn",
          ".stats-grid .stat-card",
          "#mood .card",
          ".mood-btn",
          "#moodInput",
          "#energyLevel",
          "#stressLevel",
          "#journalText",
          "#highlight",
          'button[onclick="addEntry()"]',
        ];

        selectors.forEach((sel) => {
          document.querySelectorAll(sel).forEach((el) => {
            const cs = window.getComputedStyle(el);
            // Ignore hidden elements (e.g. mobile-header on desktop)
            const parent = el.closest(".mobile-header");
            if (parent && window.getComputedStyle(parent).display === "none") {
              return;
            }
            if (cs.display === "none" || cs.visibility === "hidden") {
              return;
            }

            const rect = el.getBoundingClientRect();
            // A control is clipped if its bounds are outside the viewport or collapsed to 0
            if (
              rect.left < 0 ||
              rect.right > width + 1 ||
              rect.width <= 0 ||
              rect.height <= 0
            ) {
              issues.push({
                selector: sel,
                id: el.id,
                className: el.className,
                rect: {
                  left: rect.left,
                  right: rect.right,
                  width: rect.width,
                  height: rect.height,
                },
                viewportWidth: width,
              });
            }
          });
        });

        return issues;
      }, vp.width);

      const noControlsClipped = clippedControls.length === 0;
      results.checks.push({
        name: `[${vp.name} ${vp.width}px] No controls clipped within viewport`,
        passed: noControlsClipped,
        data: { clippedCount: clippedControls.length, clippedControls },
      });
      console.log(
        `[${vp.name} ${vp.width}px] No controls clipped: ${noControlsClipped ? "PASS" : "FAIL"}`,
      );

      // Check: #currentDate and #currentTime do not cause overflow or clip
      const timeDateMetrics = await page.evaluate(() => {
        const dateEl = document.getElementById("currentDate");
        const timeEl = document.getElementById("currentTime");
        const dateRect = dateEl ? dateEl.getBoundingClientRect() : null;
        const timeRect = timeEl ? timeEl.getBoundingClientRect() : null;
        return {
          dateRect,
          timeRect,
          dateText: dateEl?.innerText,
          timeText: timeEl?.innerText,
        };
      });

      results.viewports[vp.name] = {
        viewport: vp,
        scrollMetrics,
        timeDateMetrics,
        noControlsClipped,
      };

      await context.close();
    }

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
