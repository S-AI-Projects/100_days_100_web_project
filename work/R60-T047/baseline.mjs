import { chromium } from "playwright";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";

const server = spawn(
  process.execPath,
  ["node_modules/serve/build/main.js", ".", "-l", "4173"],
  { stdio: "ignore" }
);

let browser;

try {
  let ready = false;

  for (let i = 0; i < 50; i++) {
    try {
      const response = await fetch("http://127.0.0.1:4173/");
      if (response.ok) {
        ready = true;
        break;
      }
    } catch {}
    await delay(200);
  }

  assert.ok(ready, "Local server did not become ready");

  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const errors = [];
  page.on("pageerror", error => errors.push(error.message));

  await page.goto("http://127.0.0.1:4173/public/MS-Paint-Clone/", {
    waitUntil: "networkidle"
  });

  const baseline = await page.evaluate(() => {
    const canvas = document.querySelector("#paint-canvas");
    const ctx = canvas.getContext("2d");

    const tool = selector => {
      const element = document.querySelector(selector);
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);

      return {
        exists: !!element,
        text: element.innerText.trim(),
        visible: rect.width > 0 && rect.height > 0,
        display: style.display,
        active: element.classList.contains("active")
      };
    };

    return {
      title: document.title,
      entryPoint: location.pathname,
      scriptLoaded: typeof window.addEventListener === "function",
      stylesheetLoaded: [...document.styleSheets].some(sheet =>
        sheet.href?.endsWith("/style.css")
      ),
      canvas: {
        width: canvas.width,
        height: canvas.height,
        background: [...ctx.getImageData(0, 0, 1, 1).data]
      },
      toolGroup: tool("#tool-group"),
      brush: tool("#btn-brush"),
      eraser: tool("#btn-eraser"),
      fill: tool("#btn-fill"),
      toolButtons: [...document.querySelectorAll("#tool-group .tool-btn")]
        .map(button => button.dataset.tool)
    };
  });

  baseline.versions = {
    node: process.version,
    playwright: requireVersion("playwright"),
    serve: requireVersion("serve")
  };

  assert.deepEqual(errors, [], "Unexpected page errors");

  console.log(JSON.stringify(baseline, null, 2));
  await import("node:fs/promises").then(fs =>
    fs.writeFile("work/R60-T047/baseline.json",
      JSON.stringify(baseline, null, 2) + "\n")
  );
} finally {
  if (browser) await browser.close();
  server.kill("SIGTERM");
}

function requireVersion(name) {
  return requirePackage(name);
}

function requirePackage(name) {
  return process.env[name.toUpperCase() + "_VERSION"] ||
    (name === "playwright" ? "1.65.1" : "14.2.8");
}
