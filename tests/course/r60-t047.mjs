import { chromium } from "playwright";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import { mkdir, readFile, writeFile } from "node:fs/promises";

const baseURL = "http://127.0.0.1:4173/public/MS-Paint-Clone/";
const server = spawn(process.execPath, [
  "node_modules/serve/build/main.js", ".", "-l", "4173"
], { stdio: "ignore" });

let browser;
const errors = [];
const failedRequests = [];

try {
  let ready = false;

  for (let i = 0; i < 50; i++) {
    try {
      const response = await fetch(baseURL);
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

  page.on("pageerror", error => errors.push(error.message));
  page.on("requestfailed", request =>
    failedRequests.push(`${request.url()}: ${request.failure()?.errorText}`)
  );

  await page.goto(baseURL, { waitUntil: "networkidle" });

  const visible = async selector => {
    const locator = page.locator(selector);
    assert.equal(await locator.count(), 1, `${selector} must exist exactly once`);
    await locator.waitFor({ state: "visible" });
  };

  for (const selector of [
    "#tool-group", "#btn-brush", "#btn-eraser", "#btn-fill",
    "#paint-canvas"
  ]) {
    await visible(selector);
  }

  assert.equal(await page.locator("#tool-group").evaluate(
    el => getComputedStyle(el).display
  ), "flex");

  assert.equal(await page.locator("#btn-brush").getAttribute("data-tool"), "brush");
  assert.equal(await page.locator("#btn-eraser").getAttribute("data-tool"), "eraser");
  assert.equal(await page.locator("#btn-fill").getAttribute("data-tool"), "fill");
  assert.ok(await page.locator("#btn-brush").evaluate(
    el => el.classList.contains("active")
  ));

  const canvas = page.locator("#paint-canvas");
  const bounds = await canvas.boundingBox();
  assert.ok(bounds && bounds.width > 0 && bounds.height > 0);

  const pixel = (x, y) => canvas.evaluate((el, point) => {
    return [...el.getContext("2d").getImageData(
      point.x, point.y, 1, 1
    ).data];
  }, { x, y });

  const draw = async (x1, y1, x2, y2) => {
    await page.mouse.move(bounds.x + x1, bounds.y + y1);
    await page.mouse.down();
    await page.mouse.move(bounds.x + x2, bounds.y + y2, { steps: 8 });
    await page.mouse.up();
  };

  const initial = await pixel(150, 100);
  assert.deepEqual(initial, [255, 255, 255, 255]);

  await page.screenshot({
    path: "work/R60-T047/initial.png"
  });

  // Brush: draw a dark stroke.
  await page.locator("#btn-brush").click();
  await draw(100, 100, 200, 100);

  assert.ok(await page.locator("#btn-brush").evaluate(
    el => el.classList.contains("active")
  ));

  const brushPixel = await pixel(150, 100);
  assert.deepEqual(brushPixel, [26, 26, 46, 255]);

  // Eraser: erase the same stroke.
  await page.locator("#btn-eraser").click();
  await draw(100, 100, 200, 100);

  assert.ok(await page.locator("#btn-eraser").evaluate(
    el => el.classList.contains("active")
  ));

  const erasedPixel = await pixel(150, 100);
  assert.deepEqual(erasedPixel, [255, 255, 255, 255]);

  // Draw a closed square to create a bounded fill region.
  await page.locator("#btn-brush").click();
  await draw(300, 200, 400, 200);
  await draw(400, 200, 400, 300);
  await draw(400, 300, 300, 300);
  await draw(300, 300, 300, 200);

  // Fill the enclosed region.
  await page.locator("#color-picker").evaluate(el => {
    el.value = "#e94560";
    el.dispatchEvent(new Event("input", { bubbles: true }));
  });

  await page.locator("#btn-fill").click();
  await page.mouse.click(bounds.x + 350, bounds.y + 250);

  assert.ok(await page.locator("#btn-fill").evaluate(
    el => el.classList.contains("active")
  ));

  const filledPixel = await pixel(350, 250);
  assert.deepEqual(filledPixel, [233, 69, 96, 255]);

  const outsidePixel = await pixel(500, 400);
  assert.deepEqual(outsidePixel, [255, 255, 255, 255]);

  await page.screenshot({
    path: "work/R60-T047/after-interaction.png"
  });

  assert.deepEqual(errors, [], "Unexpected page errors");
  assert.deepEqual(failedRequests, [], "Unexpected failed requests");

  const result = {
    page: baseURL,
    checks: {
      anchorsVisible: true,
      toolGroupDisplay: "flex",
      initialBrushActive: true,
      brushPixel: { expected: [26, 26, 46, 255], actual: brushPixel },
      eraserPixel: { expected: [255, 255, 255, 255], actual: erasedPixel },
      fillPixel: { expected: [233, 69, 96, 255], actual: filledPixel },
      outsideFill: { expected: [255, 255, 255, 255], actual: outsidePixel }
    },
    errors,
    failedRequests,
    versions: {
      node: process.version,
      playwright: JSON.parse(
        await readFile("node_modules/playwright/package.json", "utf8")
      ).version,
      serve: JSON.parse(
        await readFile("node_modules/serve/package.json", "utf8")
      ).version
    }
  };

  await mkdir("work/R60-T047", { recursive: true });
  await writeFile(
    "work/R60-T047/after.json",
    JSON.stringify(result, null, 2) + "\n"
  );

  console.log(JSON.stringify(result, null, 2));
} finally {
  if (browser) await browser.close();
  server.kill("SIGTERM");
}
