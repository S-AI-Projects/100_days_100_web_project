import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "../../");
const reportDir = path.join(rootDir, "work/R60-T029");
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
  console.log("Starting R60-T029 Holo Button motion and focus preference verification...");
  const results = {
    taskId: "R60-T029",
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

    // Launch context with reducedMotion: 'reduce'
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      reducedMotion: "reduce",
    });

    // Intercept external network calls (Spline scene CDN) to ensure deterministic offline execution
    await context.route("**/*spline*", (route) => {
      route.abort();
    });
    await context.route("**/*esm.sh*", (route) => {
      route.abort();
    });

    const page = await context.newPage();
    const targetUrl = `http://127.0.0.1:${port}/public/Holo Button/index.html`;
    await page.goto(targetUrl, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(100);

    // Check 1: Source anchors exist (#container, #canvas3d, #holo-title, #statusText)
    const anchors = await page.evaluate(() => {
      return {
        container: !!document.getElementById("container"),
        canvas3d: !!document.getElementById("canvas3d"),
        holoTitle: !!document.getElementById("holo-title"),
        statusText: !!document.getElementById("statusText"),
      };
    });

    const anchorsPassed =
      anchors.container &&
      anchors.canvas3d &&
      anchors.holoTitle &&
      anchors.statusText;

    results.checks.push({
      name: "Source anchors exist (#container, #canvas3d, #holo-title, #statusText)",
      passed: anchorsPassed,
      data: anchors,
    });
    console.log(`Source anchors check: ${anchorsPassed ? "PASS" : "FAIL"}`);

    // Check 2: Animation disabled in reducedMotion: 'reduce' mode
    const motionStyles = await page.evaluate(() => {
      const bg = document.querySelector(".animated-image-bg");
      const ring = document.querySelector(".button-ring");
      const holoBtn = document.getElementById("holoButton");

      const bgComputed = bg ? window.getComputedStyle(bg) : null;
      const ringComputed = ring ? window.getComputedStyle(ring) : null;

      // Also test when button is active
      if (holoBtn) {
        holoBtn.classList.add("is-active");
      }
      const ringActiveComputed = ring ? window.getComputedStyle(ring) : null;

      return {
        bgAnimationName: bgComputed ? bgComputed.animationName : null,
        ringAnimationName: ringComputed ? ringComputed.animationName : null,
        ringActiveAnimationName: ringActiveComputed ? ringActiveComputed.animationName : null,
        bgAnimation: bgComputed ? bgComputed.animation : null,
        ringAnimation: ringComputed ? ringComputed.animation : null,
      };
    });

    const motionDisabled =
      motionStyles.bgAnimationName === "none" &&
      motionStyles.ringAnimationName === "none" &&
      motionStyles.ringActiveAnimationName === "none";

    results.checks.push({
      name: "Animations (.button-ring and .animated-image-bg) disabled under prefers-reduced-motion: reduce",
      passed: motionDisabled,
      data: motionStyles,
    });
    console.log(`Reduced motion animations check: ${motionDisabled ? "PASS" : "FAIL"}`);

    // Check 3: Interactive controls have clear visible focus outlines
    // Controls: .project-back-button, #holoButton, .theme-option, .utility-button
    const selectors = [
      ".project-back-button",
      "#holoButton",
      ".theme-option",
      ".utility-button",
    ];

    const focusCheckDetails = [];
    let allFocusPassed = true;

    for (const selector of selectors) {
      const el = page.locator(selector).first();
      await el.focus();
      await page.waitForTimeout(50);

      const outlineInfo = await page.evaluate((sel) => {
        const element = document.querySelector(sel);
        if (!element) return { found: false };
        const cs = window.getComputedStyle(element);
        return {
          found: true,
          outlineWidth: cs.outlineWidth,
          outlineStyle: cs.outlineStyle,
          outlineColor: cs.outlineColor,
          outlineOffset: cs.outlineOffset,
        };
      }, selector);

      const hasVisibleOutline =
        outlineInfo.found &&
        outlineInfo.outlineStyle !== "none" &&
        outlineInfo.outlineWidth !== "0px" &&
        parseFloat(outlineInfo.outlineWidth) > 0;

      if (!hasVisibleOutline) {
        allFocusPassed = false;
      }

      focusCheckDetails.push({
        selector,
        hasVisibleOutline,
        outlineInfo,
      });
    }

    results.checks.push({
      name: "Interactive controls (.project-back-button, #holoButton, .theme-option, .utility-button) have clear :focus-visible outlines",
      passed: allFocusPassed,
      data: focusCheckDetails,
    });
    console.log(`Focus outlines check: ${allFocusPassed ? "PASS" : "FAIL"}`);

    // Check 4: Documentation verification in README.md
    const readmeContent = fs.readFileSync(
      path.join(rootDir, "public/Holo Button/README.md"),
      "utf-8"
    );

    const docsVerified =
      readmeContent.includes("prefers-reduced-motion") &&
      readmeContent.includes("focus") &&
      readmeContent.includes("r60-t029.mjs");

    results.checks.push({
      name: "README.md documents motion preference handling and focus outlines",
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
