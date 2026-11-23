import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "../../");
const reportDir = path.join(rootDir, "work/R60-T028");
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
  console.log("Starting R60-T028 Personal Website safe text rendering verification...");
  const results = {
    taskId: "R60-T028",
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

    const targetUrl = `http://127.0.0.1:${port}/public/Personal_website/index.html`;
    await page.goto(targetUrl, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(100);

    // Check 1: Source anchors exist (#about, #experience, #projects, #projects-container)
    const anchors = await page.evaluate(() => {
      return {
        about: !!document.getElementById("about"),
        experience: !!document.getElementById("experience"),
        projects: !!document.getElementById("projects"),
        projectsContainer: !!document.getElementById("projects-container"),
      };
    });

    const anchorsPassed =
      anchors.about &&
      anchors.experience &&
      anchors.projects &&
      anchors.projectsContainer;

    results.checks.push({
      name: "Source anchors exist (#about, #experience, #projects, #projects-container)",
      passed: anchorsPassed,
      data: anchors,
    });
    console.log(`Source anchors check: ${anchorsPassed ? "PASS" : "FAIL"}`);

    // Check 2: Dynamic Project Card Insertion with XSS Vector Payload
    const xssPayload = '<img src=x onerror="window.__xss_fired=true">';
    console.log(`Inserting dynamic project card with XSS payload: ${xssPayload}`);

    const cardInsertionResult = await page.evaluate((payload) => {
      if (typeof window.addProjectCard !== "function") {
        return { error: "window.addProjectCard is not defined" };
      }

      const card = window.addProjectCard({
        title: payload,
        description: 'Testing safe text rendering against script injection <script>window.__script_fired=true</script>',
      });

      const container = document.getElementById("projects-container");
      const insertedCard = container ? container.lastElementChild : null;
      const spawnedImgs = insertedCard ? insertedCard.querySelectorAll("img") : [];
      const spawnedScripts = insertedCard ? insertedCard.querySelectorAll("script") : [];
      const h3Text = insertedCard?.querySelector("h3")?.textContent;
      const h3InnerHtml = insertedCard?.querySelector("h3")?.innerHTML;

      return {
        cardCreated: !!card,
        isLastChild: insertedCard === card,
        spawnedImgsCount: spawnedImgs.length,
        spawnedScriptsCount: spawnedScripts.length,
        h3Text,
        h3InnerHtml,
        xssFired: window.__xss_fired,
        scriptFired: window.__script_fired,
      };
    }, xssPayload);

    // Wait a brief tick to allow any asynchronous onerror handlers to fire if broken
    await page.waitForTimeout(150);

    const xssFlagAfterWait = await page.evaluate(() => window.__xss_fired);

    const cardInsertionPassed =
      cardInsertionResult.cardCreated &&
      cardInsertionResult.spawnedImgsCount === 0 &&
      cardInsertionResult.spawnedScriptsCount === 0 &&
      cardInsertionResult.h3Text === xssPayload &&
      cardInsertionResult.xssFired === undefined &&
      xssFlagAfterWait === undefined;

    results.checks.push({
      name: "Dynamic card insertion renders payload strictly as text (window.__xss_fired is undefined, no img spawned)",
      passed: cardInsertionPassed,
      data: {
        cardInsertionResult,
        xssFlagAfterWait,
      },
    });
    console.log(`Card insertion XSS neutralization check: ${cardInsertionPassed ? "PASS" : "FAIL"}`);

    // Check 3: Form Submission with XSS Payload
    console.log("Submitting contact form with XSS payload...");
    await page.fill("#name", xssPayload);
    await page.fill("#email", "tester@example.com");
    await page.fill("#message", "Testing safe message rendering");
    await page.click(".submit-btn");
    await page.waitForTimeout(100);

    const formResult = await page.evaluate((payload) => {
      const feedback = document.querySelector(".form-feedback");
      const spawnedImgs = feedback ? feedback.querySelectorAll("img") : [];
      const feedbackText = feedback ? feedback.textContent : "";
      return {
        hasFeedback: !!feedback,
        spawnedImgsCount: spawnedImgs.length,
        feedbackText,
        containsPayloadAsText: feedbackText.includes(payload),
        xssFired: window.__xss_fired,
      };
    }, xssPayload);

    const formSubmissionPassed =
      formResult.hasFeedback &&
      formResult.spawnedImgsCount === 0 &&
      formResult.containsPayloadAsText &&
      formResult.xssFired === undefined;

    results.checks.push({
      name: "Form submission renders user input strictly as text (no img spawned, window.__xss_fired is undefined)",
      passed: formSubmissionPassed,
      data: formResult,
    });
    console.log(`Form submission XSS neutralization check: ${formSubmissionPassed ? "PASS" : "FAIL"}`);

    // Check 4: Documentation verification in README.md
    const readmeContent = fs.readFileSync(
      path.join(rootDir, "public/Personal_website/README.md"),
      "utf-8"
    );

    const docsVerified =
      readmeContent.includes("Safe Text Rendering Contract") &&
      readmeContent.includes("textContent") &&
      readmeContent.includes("#projects-container") &&
      readmeContent.includes("window.__xss_fired");

    results.checks.push({
      name: "README.md documents safe text rendering contract and testing steps",
      passed: docsVerified,
      data: { docsVerified },
    });
    console.log(`README safe text contract documentation check: ${docsVerified ? "PASS" : "FAIL"}`);

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
