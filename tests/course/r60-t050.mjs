import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const PORT = 4173;
const PAGE_URL = `http://127.0.0.1:${PORT}/public/Discord%20project/`;

const server = spawn(
  process.execPath,
  ['node_modules/serve/build/main.js', '.', '-l', String(PORT)],
  { stdio: 'ignore' }
);

async function waitForServer() {
  for (let i = 0; i < 50; i++) {
    try {
      const res = await fetch(PAGE_URL);
      if (res.ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error('Server did not become ready');
}

async function checkHover(page, name, before, after, index = 0) {
  const btn = page.getByRole('button', { name, exact: true }).nth(index);
  const bg = () => btn.evaluate((el) => getComputedStyle(el).backgroundColor);
  assert.equal(await bg(), before, `"${name}": wrong colour before hover`);
  await btn.hover();
  await page.waitForTimeout(500);
  assert.equal(await bg(), after, `"${name}": hover colour did not change as expected`);
  await page.mouse.move(0, 0);
}

let browser;
try {
  await waitForServer();
  browser = await chromium.launch();

  // Correct page
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(e));
  await page.goto(PAGE_URL, { waitUntil: 'load' });

  // Event effect: hover colours
  await checkHover(page, 'Open Discord', 'rgb(255, 255, 255)', 'rgb(96, 165, 250)');
  await checkHover(page, 'Download for Windows', 'rgb(255, 255, 255)', 'rgb(96, 165, 250)');
  await checkHover(page, 'Download for Windows', 'rgb(255, 255, 255)', 'rgb(29, 78, 216)', 1);
  await checkHover(page, 'Open Discord in your browser', 'rgb(0, 0, 0)', 'rgb(96, 165, 250)');

  // DOM: images and anchors
  const imgs = await page.evaluate(() =>
    [...document.querySelectorAll('img')].map((i) => i.complete && i.naturalWidth > 0)
  );
  assert.equal(imgs.length, 8, 'Expected 8 images');
  assert.ok(imgs.every(Boolean), 'Some images did not load');
  const hrefs = await page.evaluate(() =>
    [...document.querySelectorAll('a')].map((a) => a.getAttribute('href'))
  );
  assert.equal(hrefs.length, 36, 'Expected 36 anchors');
  assert.ok(hrefs.every(Boolean), 'Some anchors have no href');

  // Computed layout: the two hero buttons sit side by side
  const first = await page.getByRole('button', { name: 'Download for Windows', exact: true }).first().boundingBox();
  const second = await page.getByRole('button', { name: 'Open Discord in your browser', exact: true }).boundingBox();
  assert.ok(Math.abs(first.y - second.y) < 2, 'Hero buttons are not on the same row');
  assert.ok(second.x > first.x, 'Hero buttons are in the wrong order');

  assert.equal(pageErrors.length, 0, 'Unexpected page errors');
  await context.close();

  // Mutated copy: one style rule is broken in the browser only (no repo file changes)
  const mContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const mPage = await mContext.newPage();
  await mPage.goto(PAGE_URL, { waitUntil: 'load' });
  await mPage.addStyleTag({ content: 'button:hover { background-color: rgb(255, 255, 255) !important; }' });
  let failedForRightReason = false;
  try {
    await checkHover(mPage, 'Open Discord', 'rgb(255, 255, 255)', 'rgb(96, 165, 250)');
  } catch (e) {
    failedForRightReason = e instanceof assert.AssertionError && /hover colour did not change/.test(e.message);
  }
  assert.ok(failedForRightReason, 'The broken hover rule was not caught for the hover reason');
  await mContext.close();

  console.log('PASS');
} catch (err) {
  console.error('FAIL', err);
  process.exitCode = 1;
} finally {
  if (browser) await browser.close();
  server.kill();
}
