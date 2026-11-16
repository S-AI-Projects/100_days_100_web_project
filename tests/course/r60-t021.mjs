import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "../../");
const reportDir = path.join(rootDir, "work/R60-T021");
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

function parseRgb(colorStr) {
  if (!colorStr) return { r: 56, g: 189, b: 248, a: 1 };
  const m = colorStr.match(
    /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)/,
  );
  if (m) {
    return {
      r: parseInt(m[1], 10),
      g: parseInt(m[2], 10),
      b: parseInt(m[3], 10),
      a: m[4] !== undefined ? parseFloat(m[4]) : 1,
    };
  }
  return { r: 56, g: 189, b: 248, a: 1 };
}

function getLuminance(r, g, b) {
  const [rs, gs, bs] = [r, g, b].map((val) => {
    const s = val / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function getContrast(rgb1, rgb2) {
  const l1 = getLuminance(rgb1.r, rgb1.g, rgb1.b);
  const l2 = getLuminance(rgb2.r, rgb2.g, rgb2.b);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

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
  console.log("Starting R60-T021 verification...");
  const results = {
    taskId: "R60-T021",
    timestamp: new Date().toISOString(),
    passed: false,
    checks: [],
    details: {},
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

    const targetUrl = `http://127.0.0.1:${port}/public/Planet_gesture_formation/index.html`;
    console.log(`Navigating to ${targetUrl}`);
    await page.goto(targetUrl, { waitUntil: "domcontentloaded" });

    // Check 1: Source Anchors Exist (#app, #scene, #navbar, #gestureIndicator)
    const anchors = await page.evaluate(() => {
      const app = document.getElementById("app");
      const scene = document.getElementById("scene");
      const navbar = document.getElementById("navbar");
      const gestureIndicator = document.getElementById("gestureIndicator");
      return {
        app: !!app,
        scene: !!scene,
        navbar: !!navbar,
        gestureIndicator: !!gestureIndicator,
      };
    });

    const allAnchorsExist =
      anchors.app &&
      anchors.scene &&
      anchors.navbar &&
      anchors.gestureIndicator;
    results.checks.push({
      name: "Source anchors exist (#app, #scene, #navbar, #gestureIndicator)",
      passed: allAnchorsExist,
      data: anchors,
    });
    console.log(
      `[Check 1] Source anchors exist: ${allAnchorsExist ? "PASS" : "FAIL"}`,
    );

    // Check 2: Skip link exists before #scene
    const skipLinkCheck = await page.evaluate(() => {
      const skipLink = document.querySelector("a.skip-link");
      const scene = document.getElementById("scene");
      if (!skipLink || !scene) {
        return { exists: false, beforeScene: false, href: "", text: "" };
      }
      const beforeScene = !!(
        skipLink.compareDocumentPosition(scene) &
        Node.DOCUMENT_POSITION_FOLLOWING
      );
      return {
        exists: true,
        beforeScene,
        href: skipLink.getAttribute("href"),
        text: skipLink.textContent.trim(),
      };
    });

    const skipLinkValid =
      skipLinkCheck.exists &&
      skipLinkCheck.beforeScene &&
      skipLinkCheck.href === "#scene" &&
      skipLinkCheck.text === "Skip to Canvas";

    results.checks.push({
      name: 'Skip link before #scene (<a href="#scene" class="skip-link">Skip to Canvas</a>)',
      passed: skipLinkValid,
      data: skipLinkCheck,
    });
    console.log(
      `[Check 2] Skip link before #scene: ${skipLinkValid ? "PASS" : "FAIL"}`,
    );

    // Check 3: Dropdown triggers are accessible buttons
    const triggersCheck = await page.evaluate(() => {
      const cameraBtn = document.getElementById("cameraNavItem");
      const instructionsBtn = document.getElementById("instructionsNavItem");
      return {
        cameraBtn: {
          exists: !!cameraBtn,
          tagName: cameraBtn ? cameraBtn.tagName : null,
          type: cameraBtn ? cameraBtn.getAttribute("type") : null,
          ariaExpanded: cameraBtn
            ? cameraBtn.getAttribute("aria-expanded")
            : null,
        },
        instructionsBtn: {
          exists: !!instructionsBtn,
          tagName: instructionsBtn ? instructionsBtn.tagName : null,
          type: instructionsBtn ? instructionsBtn.getAttribute("type") : null,
          ariaExpanded: instructionsBtn
            ? instructionsBtn.getAttribute("aria-expanded")
            : null,
        },
      };
    });

    const triggersAreButtons =
      triggersCheck.cameraBtn.exists &&
      triggersCheck.cameraBtn.tagName === "BUTTON" &&
      triggersCheck.instructionsBtn.exists &&
      triggersCheck.instructionsBtn.tagName === "BUTTON";

    results.checks.push({
      name: "Dropdown triggers (#cameraNavItem, #instructionsNavItem) are keyboard-accessible buttons",
      passed: triggersAreButtons,
      data: triggersCheck,
    });
    console.log(
      `[Check 3] Dropdown triggers are buttons: ${triggersAreButtons ? "PASS" : "FAIL"}`,
    );

    // Check 4: No positive tabindex exists
    const positiveTabindex = await page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll("*"));
      return elements
        .filter((el) => {
          const attr = el.getAttribute("tabindex");
          if (attr === null) return false;
          const num = parseInt(attr, 10);
          return !isNaN(num) && num > 0;
        })
        .map((el) => ({
          tagName: el.tagName,
          id: el.id,
          tabindex: el.getAttribute("tabindex"),
        }));
    });

    const noPositiveTabindex = positiveTabindex.length === 0;
    results.checks.push({
      name: "No positive tabindex exists",
      passed: noPositiveTabindex,
      data: { count: positiveTabindex.length, items: positiveTabindex },
    });
    console.log(
      `[Check 4] No positive tabindex: ${noPositiveTabindex ? "PASS" : "FAIL"}`,
    );

    // Check 5: Initial state — skip link hidden offscreen
    const skipInitiallyHidden = await page.evaluate(() => {
      const link = document.querySelector(".skip-link");
      const rect = link.getBoundingClientRect();
      return rect.top < 0 || rect.bottom <= 0;
    });

    results.checks.push({
      name: "Skip link is initially hidden offscreen before focus",
      passed: skipInitiallyHidden,
      data: { skipInitiallyHidden },
    });
    console.log(
      `[Check 5] Skip link initially hidden: ${skipInitiallyHidden ? "PASS" : "FAIL"}`,
    );

    // Check 6: Tab reaches skip link, becomes visible, has visible focus indicator (>= 3:1 contrast)
    await page.keyboard.press("Tab");
    const tab1 = await page.evaluate(() => {
      const active = document.activeElement;
      const skip = document.querySelector(".skip-link");
      const rect = active.getBoundingClientRect();
      const style = window.getComputedStyle(active);
      return {
        isSkipLink: active === skip,
        tagName: active.tagName,
        className: active.className,
        rect: {
          top: rect.top,
          bottom: rect.bottom,
          width: rect.width,
          height: rect.height,
        },
        outline: style.outline,
        outlineWidth: style.outlineWidth,
        outlineStyle: style.outlineStyle,
        outlineColor: style.outlineColor,
        visibility: style.visibility,
        display: style.display,
      };
    });

    const skipVisibleOnFocus =
      tab1.isSkipLink &&
      tab1.rect.top >= 0 &&
      tab1.rect.width > 0 &&
      tab1.rect.height > 0 &&
      tab1.visibility !== "hidden" &&
      tab1.display !== "none";

    const skipContrast = getContrast(parseRgb(tab1.outlineColor), {
      r: 8,
      g: 10,
      b: 18,
    });
    const skipFocusHasContrast =
      tab1.outlineStyle !== "none" &&
      parseFloat(tab1.outlineWidth) >= 1 &&
      skipContrast >= 3.0;

    results.checks.push({
      name: "Tab reaches skip link, which becomes visible on focus with high-contrast indicator",
      passed: skipVisibleOnFocus && skipFocusHasContrast,
      data: {
        skipVisibleOnFocus,
        skipFocusHasContrast,
        tab1,
        contrastRatio: skipContrast,
      },
    });
    console.log(
      `[Check 6] Skip link visible on focus (contrast ${skipContrast.toFixed(2)}:1): ${skipVisibleOnFocus && skipFocusHasContrast ? "PASS" : "FAIL"}`,
    );

    // Check 7: Tab reaches #cameraNavItem button with visible focus
    await page.keyboard.press("Tab");
    const tab2 = await page.evaluate(() => {
      const active = document.activeElement;
      const cameraBtn = document.getElementById("cameraNavItem");
      const rect = active.getBoundingClientRect();
      const style = window.getComputedStyle(active);
      return {
        isCameraBtn: active === cameraBtn,
        tagName: active.tagName,
        id: active.id,
        rect: {
          top: rect.top,
          bottom: rect.bottom,
          width: rect.width,
          height: rect.height,
        },
        outlineWidth: style.outlineWidth,
        outlineStyle: style.outlineStyle,
        outlineColor: style.outlineColor,
      };
    });

    const cameraContrast = getContrast(parseRgb(tab2.outlineColor), {
      r: 8,
      g: 10,
      b: 18,
    });
    const cameraFocusValid =
      tab2.isCameraBtn &&
      tab2.outlineStyle !== "none" &&
      parseFloat(tab2.outlineWidth) >= 1 &&
      cameraContrast >= 3.0;

    results.checks.push({
      name: "Tab reaches #cameraNavItem button with visible focus indicator",
      passed: cameraFocusValid,
      data: { tab2, contrastRatio: cameraContrast },
    });
    console.log(
      `[Check 7] Camera button focused with visible focus (contrast ${cameraContrast.toFixed(2)}:1): ${cameraFocusValid ? "PASS" : "FAIL"}`,
    );

    // Check 8: Activating #cameraNavItem (Enter) expands dropdown and reveals #trackingToggle
    await page.keyboard.press("Enter");
    await page.waitForTimeout(50);
    const cameraExpandedState = await page.evaluate(() => {
      const cameraBtn = document.getElementById("cameraNavItem");
      return cameraBtn.getAttribute("aria-expanded");
    });

    await page.keyboard.press("Tab");
    const tab3 = await page.evaluate(() => {
      const active = document.activeElement;
      const toggle = document.getElementById("trackingToggle");
      const rect = active.getBoundingClientRect();
      const style = window.getComputedStyle(active);
      return {
        isToggle: active === toggle,
        tagName: active.tagName,
        id: active.id,
        type: active.type,
        checked: active.checked,
        outlineWidth: style.outlineWidth,
        outlineStyle: style.outlineStyle,
        outlineColor: style.outlineColor,
      };
    });

    const toggleContrast = getContrast(parseRgb(tab3.outlineColor), {
      r: 12,
      g: 14,
      b: 25,
    });
    const toggleFocusValid =
      cameraExpandedState === "true" &&
      tab3.isToggle &&
      tab3.outlineStyle !== "none" &&
      parseFloat(tab3.outlineWidth) >= 1 &&
      toggleContrast >= 3.0;

    results.checks.push({
      name: "Tab reaches #trackingToggle input with visible focus when camera dropdown is open",
      passed: toggleFocusValid,
      data: { cameraExpandedState, tab3, contrastRatio: toggleContrast },
    });
    console.log(
      `[Check 8] Tracking toggle reached with visible focus (contrast ${toggleContrast.toFixed(2)}:1): ${toggleFocusValid ? "PASS" : "FAIL"}`,
    );

    // Check 9: Space key toggles #trackingToggle checkbox
    const beforeCheck = tab3.checked;
    await page.keyboard.press("Space");
    const afterCheck = await page.evaluate(
      () => document.getElementById("trackingToggle").checked,
    );
    const spaceTogglesCheckbox = beforeCheck !== afterCheck;

    results.checks.push({
      name: "Space key toggles #trackingToggle checkbox state",
      passed: spaceTogglesCheckbox,
      data: { beforeCheck, afterCheck },
    });
    console.log(
      `[Check 9] Space key toggles checkbox (${beforeCheck} -> ${afterCheck}): ${spaceTogglesCheckbox ? "PASS" : "FAIL"}`,
    );

    // Check 10: Tab reaches #instructionsNavItem button with visible focus
    await page.keyboard.press("Tab");
    const tab4 = await page.evaluate(() => {
      const active = document.activeElement;
      const instructionsBtn = document.getElementById("instructionsNavItem");
      const rect = active.getBoundingClientRect();
      const style = window.getComputedStyle(active);
      return {
        isInstructionsBtn: active === instructionsBtn,
        tagName: active.tagName,
        id: active.id,
        rect: {
          top: rect.top,
          bottom: rect.bottom,
          width: rect.width,
          height: rect.height,
        },
        outlineWidth: style.outlineWidth,
        outlineStyle: style.outlineStyle,
        outlineColor: style.outlineColor,
      };
    });

    const instructionsContrast = getContrast(parseRgb(tab4.outlineColor), {
      r: 8,
      g: 10,
      b: 18,
    });
    const instructionsFocusValid =
      tab4.isInstructionsBtn &&
      tab4.outlineStyle !== "none" &&
      parseFloat(tab4.outlineWidth) >= 1 &&
      instructionsContrast >= 3.0;

    results.checks.push({
      name: "Tab reaches #instructionsNavItem button with visible focus indicator",
      passed: instructionsFocusValid,
      data: { tab4, contrastRatio: instructionsContrast },
    });
    console.log(
      `[Check 10] Instructions button focused with visible focus (contrast ${instructionsContrast.toFixed(2)}:1): ${instructionsFocusValid ? "PASS" : "FAIL"}`,
    );

    // Check 11: Enter key opens instructions dropdown and updates aria-expanded
    await page.keyboard.press("Enter");
    await page.waitForTimeout(50);
    const instructionsExpanded = await page.evaluate(() => {
      const btn = document.getElementById("instructionsNavItem");
      const dropdown = document.getElementById("instructionsDropdown");
      const cs = window.getComputedStyle(dropdown);
      return {
        ariaExpanded: btn.getAttribute("aria-expanded"),
        visibility: cs.visibility,
        opacity: cs.opacity,
      };
    });

    const instructionsOpened =
      instructionsExpanded.ariaExpanded === "true" &&
      instructionsExpanded.visibility === "visible";
    results.checks.push({
      name: 'Enter key on #instructionsNavItem opens dropdown and sets aria-expanded="true"',
      passed: instructionsOpened,
      data: instructionsExpanded,
    });
    console.log(
      `[Check 11] Instructions dropdown opened via Enter: ${instructionsOpened ? "PASS" : "FAIL"}`,
    );

    // Check 12: Escape closes dropdowns
    await page.keyboard.press("Escape");
    await page.waitForTimeout(50);
    const escapeClosed = await page.evaluate(() => {
      const parent = document
        .getElementById("instructionsNavItem")
        .closest(".nav-item");
      return !parent.classList.contains("active");
    });

    results.checks.push({
      name: "Escape key closes open dropdown menu",
      passed: escapeClosed,
      data: { escapeClosed },
    });
    console.log(
      `[Check 12] Escape key closes dropdown: ${escapeClosed ? "PASS" : "FAIL"}`,
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
