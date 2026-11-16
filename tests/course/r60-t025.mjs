import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "../../");
const reportDir = path.join(rootDir, "work/R60-T025");
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
  ".webp": "image/webp",
};

const THREE_MOCK_STUB = `
window.THREE = {
  WebGLRenderer: function() {
    this.domElement = document.createElement('canvas');
    this.domElement.id = 'three-canvas';
    this.setPixelRatio = function() {};
    this.setSize = function() {};
    this.setClearColor = function() {};
    this.render = function() {};
    this.dispose = function() {};
  },
  Scene: function() {
    this.add = function() {};
    this.remove = function() {};
    this.rotation = { x: 0, y: 0, z: 0 };
    this.position = { x: 0, y: 0, z: 0 };
  },
  PerspectiveCamera: function() {
    this.position = { x: 0, y: 0, z: 0, set: function() {} };
    this.aspect = 1;
    this.updateProjectionMatrix = function() {};
    this.lookAt = function() {};
  },
  CanvasTexture: function() {},
  BufferGeometry: function() {
    this.setAttribute = function() {};
  },
  BufferAttribute: function() {},
  PointsMaterial: function() {
    this.opacity = 1;
  },
  Points: function() {
    this.rotation = { x: 0, y: 0, z: 0 };
    this.material = { opacity: 1, color: { setRGB: function() {} } };
    this.geometry = { attributes: { position: { array: [], needsUpdate: false } } };
  },
  Clock: function() {
    this.getElapsedTime = function() { return 0; };
    this.getDelta = function() { return 0; };
  },
  AdditiveBlending: 2,
};
`;

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
  console.log("Starting R60-T025 Carousel Solar System deterministic test...");
  const results = {
    taskId: "R60-T025",
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

    // Lock viewport at 1280x800 as specified in requirement
    const viewport = { width: 1280, height: 800 };
    const context = await browser.newContext({
      viewport,
      reducedMotion: "reduce", // Test prefers-reduced-motion behavior: 'auto'
    });

    const page = await context.newPage();

    // Track intercepted CDN calls
    const interceptedCalls = [];

    // Intercept external CDN calls with local stubs for deterministic offline execution
    await page.route("**/*", async (route) => {
      const url = route.request().url();
      if (url.includes("cdnjs.cloudflare.com") || url.includes("three.min.js")) {
        interceptedCalls.push({ type: "threejs-cdn", url });
        await route.fulfill({
          status: 200,
          contentType: "application/javascript",
          body: THREE_MOCK_STUB,
        });
      } else if (url.includes("fonts.googleapis.com") || url.includes("fonts.gstatic.com")) {
        interceptedCalls.push({ type: "google-fonts", url });
        await route.fulfill({
          status: 200,
          contentType: "text/css",
          body: "",
        });
      } else {
        await route.continue();
      }
    });

    const targetUrl = `http://127.0.0.1:${port}/public/Carousel%20Solar%20System/index.html`;
    await page.goto(targetUrl, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(100);

    // Check 1: Source anchors exist (#theme-toggle, #prev, #next)
    const anchors = await page.evaluate(() => {
      return {
        themeToggle: !!document.getElementById("theme-toggle"),
        prevBtn: !!document.getElementById("prev"),
        nextBtn: !!document.getElementById("next"),
      };
    });

    const anchorsPassed =
      anchors.themeToggle && anchors.prevBtn && anchors.nextBtn;

    results.checks.push({
      name: "Source anchors exist (#theme-toggle, #prev, #next)",
      passed: anchorsPassed,
      data: anchors,
    });
    console.log(`Source anchors check: ${anchorsPassed ? "PASS" : "FAIL"}`);

    // Check 2: CDN calls were intercepted
    const cdnIntercepted = interceptedCalls.some((c) => c.type === "threejs-cdn");
    results.checks.push({
      name: "External CDN calls (three.js) intercepted with local stub",
      passed: cdnIntercepted,
      data: { interceptedCallsCount: interceptedCalls.length, interceptedCalls },
    });
    console.log(`CDN stub interception check: ${cdnIntercepted ? "PASS" : "FAIL"}`);

    // Check 3: Viewport is locked at 1280x800
    const currentViewport = page.viewportSize();
    const viewportCorrect =
      currentViewport.width === 1280 && currentViewport.height === 800;
    results.checks.push({
      name: "Viewport locked at 1280x800",
      passed: viewportCorrect,
      data: currentViewport,
    });
    console.log(`Viewport check (1280x800): ${viewportCorrect ? "PASS" : "FAIL"}`);

    // Check 4: Initial active slide is Sun (index 0)
    const initialSlideState = await page.evaluate(() => {
      const slides = Array.from(document.querySelectorAll(".slide"));
      const activeSlide = document.querySelector(".slide.active");
      const activeIndex = slides.indexOf(activeSlide);
      const activeMini = document.querySelector(".mini-planet.active");
      return {
        totalSlides: slides.length,
        activeIndex,
        activeSlideClass: activeSlide?.className,
        activeMiniIndex: activeMini?.getAttribute("data-index"),
      };
    });

    const initialSlideCorrect =
      initialSlideState.activeIndex === 0 &&
      initialSlideState.activeMiniIndex === "0";

    results.checks.push({
      name: "Initial slide is active at index 0 (Sun)",
      passed: initialSlideCorrect,
      data: initialSlideState,
    });
    console.log(`Initial slide check: ${initialSlideCorrect ? "PASS" : "FAIL"}`);

    // Check 5: Click #next and assert deterministic slide transition to Mercury (index 1)
    console.log("Clicking #next button...");
    await page.click("#next");
    await page.waitForTimeout(50);

    const nextSlideState = await page.evaluate(() => {
      const slides = Array.from(document.querySelectorAll(".slide"));
      const activeSlide = document.querySelector(".slide.active");
      const activeIndex = slides.indexOf(activeSlide);
      const activeMini = document.querySelector(".mini-planet.active");
      const sunSlide = slides[0];
      const mercurySlide = slides[1];

      return {
        activeIndex,
        activeSlideClass: activeSlide?.className,
        activeMiniIndex: activeMini?.getAttribute("data-index"),
        sunIsActive: sunSlide.classList.contains("active"),
        mercuryIsActive: mercurySlide.classList.contains("active"),
      };
    });

    const transitionToMercuryPassed =
      nextSlideState.activeIndex === 1 &&
      nextSlideState.activeMiniIndex === "1" &&
      !nextSlideState.sunIsActive &&
      nextSlideState.mercuryIsActive;

    results.checks.push({
      name: "Clicking #next transitions deterministically to index 1 (Mercury)",
      passed: transitionToMercuryPassed,
      data: nextSlideState,
    });
    console.log(
      `Transition to slide 1 check: ${transitionToMercuryPassed ? "PASS" : "FAIL"}`
    );

    // Check 6: Click #next again to reach Venus (index 2), then #prev back to Mercury (index 1)
    console.log("Clicking #next again, then #prev...");
    await page.click("#next");
    await page.waitForTimeout(50);
    const venusIndex = await page.evaluate(() => {
      const slides = Array.from(document.querySelectorAll(".slide"));
      return slides.indexOf(document.querySelector(".slide.active"));
    });

    await page.click("#prev");
    await page.waitForTimeout(50);
    const backToMercuryIndex = await page.evaluate(() => {
      const slides = Array.from(document.querySelectorAll(".slide"));
      return slides.indexOf(document.querySelector(".slide.active"));
    });

    const bidirectionalNavigationPassed =
      venusIndex === 2 && backToMercuryIndex === 1;

    results.checks.push({
      name: "Bidirectional navigation (#next -> Venus -> #prev -> Mercury) is deterministic",
      passed: bidirectionalNavigationPassed,
      data: { venusIndex, backToMercuryIndex },
    });
    console.log(
      `Bidirectional navigation check: ${bidirectionalNavigationPassed ? "PASS" : "FAIL"}`
    );

    // Check 7: No duplicate showSlide declaration in index.js source
    const indexJsSource = fs.readFileSync(
      path.join(rootDir, "public/Carousel Solar System/index.js"),
      "utf-8"
    );
    const showSlideMatches = indexJsSource.match(/function\s+showSlide\s*\(/g);
    const singleDeclaration = showSlideMatches && showSlideMatches.length === 1;

    results.checks.push({
      name: "Single showSlide function declaration in index.js (duplicate removed)",
      passed: singleDeclaration,
      data: { declarationsFound: showSlideMatches ? showSlideMatches.length : 0 },
    });
    console.log(`Single showSlide declaration check: ${singleDeclaration ? "PASS" : "FAIL"}`);

    // Check 8: prefers-reduced-motion logic present in showSlide
    const hasReducedMotionCheck =
      indexJsSource.includes("prefers-reduced-motion") &&
      indexJsSource.includes("behavior:");

    results.checks.push({
      name: "showSlide respects prefers-reduced-motion for window.scrollTo behavior",
      passed: hasReducedMotionCheck,
      data: { hasReducedMotionCheck },
    });
    console.log(
      `prefers-reduced-motion support check: ${hasReducedMotionCheck ? "PASS" : "FAIL"}`
    );

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
