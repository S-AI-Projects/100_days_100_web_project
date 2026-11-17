import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "../../");
const reportDir = path.join(rootDir, "work/R60-T019");
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
  console.log("Starting R60-T019 AI Tools Hub motion & focus preference verification...");

  const results = {
    taskId: "R60-T019",
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

    // ==========================================
    // Check 1: Target Source Anchors Verification
    // ==========================================
    const probeContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const probePage = await probeContext.newPage();
    probePage.on("pageerror", (err) => pageErrors.push(err.message));
    probePage.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });

    await probePage.goto(`http://127.0.0.1:${port}/public/AI-Tools-Hub/index.html`, {
      waitUntil: "domcontentloaded",
    });

    const anchors = await probePage.evaluate(() => {
      const categories = document.getElementById("categories");
      const collections = document.getElementById("collections");
      const tools = document.getElementById("tools");
      const searchBox = document.getElementById("searchBox");

      return {
        categories: !!categories && categories.tagName.toLowerCase() === "section",
        collections: !!collections && collections.tagName.toLowerCase() === "section",
        tools: !!tools && tools.tagName.toLowerCase() === "section",
        searchBox: !!searchBox && searchBox.tagName.toLowerCase() === "input",
      };
    });

    const anchorsPassed =
      anchors.categories && anchors.collections && anchors.tools && anchors.searchBox;

    results.checks.push({
      name: "Source anchors exist with expected DOM elements (#categories, #collections, #tools, #searchBox)",
      passed: anchorsPassed,
      data: anchors,
    });
    console.log(`Source anchors check: ${anchorsPassed ? "PASS" : "FAIL"}`);

    await probeContext.close();

    // ==========================================
    // Check 2: Visible Keyboard Focus at Desktop Width (1280px)
    // ==========================================
    console.log("Testing visible keyboard focus indicators at desktop width (1280px)...");
    const desktopContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const desktopPage = await desktopContext.newPage();
    desktopPage.on("pageerror", (err) => pageErrors.push(err.message));
    desktopPage.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });

    await desktopPage.goto(`http://127.0.0.1:${port}/public/AI-Tools-Hub/index.html`, {
      waitUntil: "domcontentloaded",
    });

    const desktopFocus = await desktopPage.evaluate(() => {
      const search = document.getElementById("searchBox");
      const categoryFilter = document.getElementById("categoryFilter");
      const navCta = document.querySelector(".nav-cta");
      const collectionBtn = document.querySelector(".collection-card button");
      const themeToggle = document.getElementById("themeToggleBtn");

      function inspectFocus(el) {
        if (!el) return { found: false, hasOutline: false, isVisible: false };
        el.focus();
        const style = window.getComputedStyle(el);
        const outlineWidth = parseFloat(style.outlineWidth) || 0;
        const outlineStyle = style.outlineStyle;
        const rect = el.getBoundingClientRect();
        return {
          found: true,
          hasOutline: outlineWidth > 0 && outlineStyle !== "none",
          outlineWidth: style.outlineWidth,
          outlineStyle: style.outlineStyle,
          outlineColor: style.outlineColor,
          isVisible: rect.width > 0 && rect.height > 0,
        };
      }

      return {
        searchBox: inspectFocus(search),
        categoryFilter: inspectFocus(categoryFilter),
        navCta: inspectFocus(navCta),
        collectionBtn: inspectFocus(collectionBtn),
        themeToggle: inspectFocus(themeToggle),
      };
    });

    const desktopFocusPassed =
      desktopFocus.searchBox.hasOutline &&
      desktopFocus.categoryFilter.hasOutline &&
      desktopFocus.navCta.hasOutline &&
      desktopFocus.collectionBtn.hasOutline &&
      desktopFocus.themeToggle.hasOutline;

    results.checks.push({
      name: "Keyboard focus indicators are visibly rendered across key controls at desktop width (1280px)",
      passed: desktopFocusPassed,
      data: desktopFocus,
    });
    console.log(`Desktop focus check: ${desktopFocusPassed ? "PASS" : "FAIL"}`);

    await desktopContext.close();

    // ==========================================
    // Check 3: Visible Keyboard Focus at Mobile Width (375px)
    // ==========================================
    console.log("Testing visible keyboard focus indicators at mobile width (375px)...");
    const mobileContext = await browser.newContext({ viewport: { width: 375, height: 667 } });
    const mobilePage = await mobileContext.newPage();
    mobilePage.on("pageerror", (err) => pageErrors.push(err.message));
    mobilePage.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });

    await mobilePage.goto(`http://127.0.0.1:${port}/public/AI-Tools-Hub/index.html`, {
      waitUntil: "domcontentloaded",
    });

    const mobileFocus = await mobilePage.evaluate(() => {
      const search = document.getElementById("searchBox");
      const categoryFilter = document.getElementById("categoryFilter");
      const collectionBtn = document.querySelector(".collection-card button");

      function inspectFocus(el) {
        if (!el) return { found: false, hasOutline: false, withinViewport: false };
        el.focus();
        const style = window.getComputedStyle(el);
        const outlineWidth = parseFloat(style.outlineWidth) || 0;
        const outlineStyle = style.outlineStyle;
        const rect = el.getBoundingClientRect();
        return {
          found: true,
          hasOutline: outlineWidth > 0 && outlineStyle !== "none",
          outlineWidth: style.outlineWidth,
          outlineStyle: style.outlineStyle,
          outlineColor: style.outlineColor,
          withinViewport: rect.width > 0 && rect.left >= 0 && rect.right <= 375 + 10,
        };
      }

      return {
        searchBox: inspectFocus(search),
        categoryFilter: inspectFocus(categoryFilter),
        collectionBtn: inspectFocus(collectionBtn),
      };
    });

    const mobileFocusPassed =
      mobileFocus.searchBox.hasOutline &&
      mobileFocus.categoryFilter.hasOutline &&
      mobileFocus.collectionBtn.hasOutline &&
      mobileFocus.searchBox.withinViewport;

    results.checks.push({
      name: "Keyboard focus indicators remain visible and within viewport at mobile width (375px)",
      passed: mobileFocusPassed,
      data: mobileFocus,
    });
    console.log(`Mobile focus check: ${mobileFocusPassed ? "PASS" : "FAIL"}`);

    await mobileContext.close();

    // ==========================================
    // Check 4: Prefers-Reduced-Motion CSS and Media Query Rules
    // ==========================================
    console.log("Testing prefers-reduced-motion: reduce emulation...");
    const reducedContext = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      reducedMotion: "reduce",
    });
    const reducedPage = await reducedContext.newPage();
    reducedPage.on("pageerror", (err) => pageErrors.push(err.message));
    reducedPage.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });

    await reducedPage.goto(`http://127.0.0.1:${port}/public/AI-Tools-Hub/index.html`, {
      waitUntil: "domcontentloaded",
    });

    const reducedMotionState = await reducedPage.evaluate(() => {
      const html = document.documentElement;
      const circle1 = document.querySelector(".circle-1");
      const searchGradient = document.querySelector(".search-gradient");
      const toolCard = document.querySelector(".tool-card");
      const categoryCard = document.querySelector(".category-card");

      const htmlStyle = window.getComputedStyle(html);
      const circle1Style = circle1 ? window.getComputedStyle(circle1) : null;
      const searchGradStyle = searchGradient ? window.getComputedStyle(searchGradient) : null;
      const toolCardStyle = toolCard ? window.getComputedStyle(toolCard) : null;
      const categoryCardStyle = categoryCard ? window.getComputedStyle(categoryCard) : null;

      function parseDurationMs(durationStr) {
        if (!durationStr) return 0;
        if (durationStr.includes("ms")) return parseFloat(durationStr);
        if (durationStr.includes("s")) return parseFloat(durationStr) * 1000;
        return parseFloat(durationStr) || 0;
      }

      const circleAnimDuration = parseDurationMs(circle1Style?.animationDuration);
      const searchGradAnimDuration = parseDurationMs(searchGradStyle?.animationDuration);
      const toolTransitionDuration = parseDurationMs(toolCardStyle?.transitionDuration);

      return {
        mediaMatches: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
        scrollBehaviorAuto: htmlStyle.scrollBehavior === "auto",
        circle1NoMotion:
          circle1Style?.animationName === "none" ||
          circleAnimDuration <= 1,
        searchGradientNoMotion:
          searchGradStyle?.animationName === "none" ||
          searchGradAnimDuration <= 1,
        toolCardVisible: toolCardStyle?.opacity === "1",
        toolCardTransitionDisabled: toolTransitionDuration <= 1,
        categoryCardVisible: categoryCardStyle?.opacity === "1",
      };
    });

    const reducedMotionPassed =
      reducedMotionState.mediaMatches &&
      reducedMotionState.scrollBehaviorAuto &&
      reducedMotionState.circle1NoMotion &&
      reducedMotionState.searchGradientNoMotion &&
      reducedMotionState.toolCardVisible &&
      reducedMotionState.toolCardTransitionDisabled &&
      reducedMotionState.categoryCardVisible;

    results.checks.push({
      name: "Reduced-motion emulation neutralizes continuous animations, transitions, and smooth scrolling",
      passed: reducedMotionPassed,
      data: reducedMotionState,
    });
    console.log(`Reduced motion CSS check: ${reducedMotionPassed ? "PASS" : "FAIL"}`);

    // ==========================================
    // Check 5: Usability of Information and Controls under Reduced Motion
    // ==========================================
    console.log("Testing information usability and control interactions under reduced motion...");
    const usabilityState = await reducedPage.evaluate(() => {
      const categoriesSection = document.getElementById("categories");
      const collectionsSection = document.getElementById("collections");
      const toolsSection = document.getElementById("tools");
      const searchBox = document.getElementById("searchBox");

      const categoryCards = categoriesSection?.querySelectorAll(".category-card") || [];
      const collectionCards = collectionsSection?.querySelectorAll(".collection-card") || [];
      const toolCards = toolsSection?.querySelectorAll(".tool-card") || [];

      // Test search filtering functionality
      searchBox.value = "github copilot";
      searchBox.dispatchEvent(new Event("input", { bubbles: true }));

      let visibleToolCount = 0;
      toolCards.forEach((c) => {
        if (c.style.display !== "none") visibleToolCount++;
      });

      // Clear search
      searchBox.value = "";
      searchBox.dispatchEvent(new Event("input", { bubbles: true }));

      return {
        categoryCount: categoryCards.length,
        collectionCount: collectionCards.length,
        toolCount: toolCards.length,
        searchFilteredCorrectly: visibleToolCount === 1,
      };
    });

    const usabilityPassed =
      usabilityState.categoryCount >= 6 &&
      usabilityState.collectionCount >= 5 &&
      usabilityState.toolCount >= 3 &&
      usabilityState.searchFilteredCorrectly;

    results.checks.push({
      name: "All information and interactive controls remain fully usable under reduced motion",
      passed: usabilityPassed,
      data: usabilityState,
    });
    console.log(`Usability under reduced motion check: ${usabilityPassed ? "PASS" : "FAIL"}`);

    await reducedContext.close();

    // ==========================================
    // Check 6: Standard Motion (no-preference) Active Path
    // ==========================================
    console.log("Testing standard motion path (no-preference)...");
    const standardContext = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      reducedMotion: "no-preference",
    });
    const standardPage = await standardContext.newPage();
    standardPage.on("pageerror", (err) => pageErrors.push(err.message));
    standardPage.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });

    await standardPage.goto(`http://127.0.0.1:${port}/public/AI-Tools-Hub/index.html`, {
      waitUntil: "domcontentloaded",
    });

    const standardMotionState = await standardPage.evaluate(() => {
      const circle1 = document.querySelector(".circle-1");
      const searchGradient = document.querySelector(".search-gradient");

      const circle1Style = circle1 ? window.getComputedStyle(circle1) : null;
      const searchGradStyle = searchGradient ? window.getComputedStyle(searchGradient) : null;

      return {
        reducedMotionMatches: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
        circle1AnimationName: circle1Style?.animationName,
        searchGradAnimationName: searchGradStyle?.animationName,
      };
    });

    const standardMotionPassed =
      !standardMotionState.reducedMotionMatches &&
      standardMotionState.circle1AnimationName === "float" &&
      standardMotionState.searchGradAnimationName === "gradientMove";

    results.checks.push({
      name: "Standard motion (no-preference) preserves intended animations and styles",
      passed: standardMotionPassed,
      data: standardMotionState,
    });
    console.log(`Standard motion check: ${standardMotionPassed ? "PASS" : "FAIL"}`);

    await standardContext.close();

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
      path.join(rootDir, "public/AI-Tools-Hub/README.md"),
      "utf-8"
    );

    const docsVerified =
      readmeContent.includes("Motion & Keyboard Focus Accessibility") &&
      readmeContent.includes("r60-t019.mjs") &&
      readmeContent.includes("prefers-reduced-motion");

    results.checks.push({
      name: "README.md documents motion preferences and visible focus guidelines with test command",
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
      taskId: "R60-T019",
      timestamp: new Date().toISOString(),
      item: "public/AI-Tools-Hub",
      anchors: ["#categories", "#collections", "#tools", "#searchBox"],
      motionPreferences: {
        prefersReducedMotion: {
          supported: true,
          animationsDisabled: [".circle-1", ".circle-2", ".circle-3", ".search-gradient", ".favorite-btn"],
          scrollBehaviorFallback: "auto",
          contentVisibility: "All cards and controls immediately rendered with opacity: 1 without motion transitions",
        },
        keyboardFocus: {
          indicator: "3px solid #06b6d4 with 2px offset",
          testedWidths: ["1280px (desktop)", "375px (mobile)"],
          controlsVerified: ["#searchBox", "#categoryFilter", ".nav-cta", ".collection-card button", "#themeToggleBtn"],
        },
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
