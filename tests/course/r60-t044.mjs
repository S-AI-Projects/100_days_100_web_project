import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';

const URL = 'http://localhost:3000/public/dictionary-app/';

const server = spawn('node_modules/.bin/serve', ['.', '-p', '3000'], { stdio: 'ignore' });

async function waitForServer() {
  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch(URL);
      if (res.ok) return;
    } catch {}
    await new Promise(r => setTimeout(r, 500));
  }
  throw new Error('Server did not start in time');
}

let browser;
try {
  await waitForServer();

  browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  const pageErrors = [];
  page.on('pageerror', err => pageErrors.push(err.message));

  await page.goto(URL);

  for (let round = 1; round <= 2; round++) {
    await page.click('#sidebarToggle');
    assert.equal(await page.locator('#sidebar').evaluate(el => el.classList.contains('open')), true);
    await page.waitForFunction(() => document.getElementById("sidebar").getBoundingClientRect().left === 0);

    assert.equal(await page.locator('#historyList li').count(), 1);
    assert.equal(await page.locator('#favouritesList li').count(), 1);
    assert.equal(await page.locator('.sidebar-overlay').count(), 1);

    await page.click('.sidebar-overlay');
    assert.equal(await page.locator('#sidebar').evaluate(el => el.classList.contains('open')), false);
    await page.waitForFunction(() => document.getElementById("sidebar").getBoundingClientRect().right <= 0);
    console.log(`PASS: round ${round}`);
  }

  assert.deepEqual(pageErrors, []);
  console.log('PASS: no page errors');
} finally {
  if (browser) await browser.close();
  server.kill();
}
