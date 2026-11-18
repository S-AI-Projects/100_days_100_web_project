import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const URL = 'http://localhost:3000/public/the_cube/';
const THREE = readFileSync('node_modules/three/build/three.min.js', 'utf8');
const ALL = ['stats', 'prefs', 'back', 'theme', 'reset'];

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

// Waits until exactly the `shown` buttons are visible and clickable,
// and every other button is hidden and not clickable. Returns that state.
async function expectButtons(page, shown) {
  await page.waitForFunction(({ shown, ALL }) => ALL.every(name => {
    const s = getComputedStyle(document.querySelector(`.btn--${name}`));
    return shown.includes(name)
      ? s.pointerEvents === 'all' && parseFloat(s.opacity) > 0.99
      : s.pointerEvents === 'none' && s.opacity === '0';
  }), { shown, ALL }, { timeout: 8000 });

  return page.evaluate(ALL => Object.fromEntries(ALL.map(name => {
    const s = getComputedStyle(document.querySelector(`.btn--${name}`));
    return [name, s.pointerEvents === 'all' && parseFloat(s.opacity) > 0.99];
  })), ALL);
}

let browser;
try {
  await waitForServer();
  browser = await chromium.launch();

  const results = [];

  for (let round = 1; round <= 2; round++) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const page = await context.newPage();

    const pageErrors = [];
    page.on('pageerror', err => pageErrors.push(err.message));

    // Local fixture: three.js is served from node_modules, everything else external is blocked
    await page.route('**/*', route => {
      const url = route.request().url();
      if (url.includes('cdnjs.cloudflare.com') && url.includes('three.min.js')) {
        return route.fulfill({ contentType: 'application/javascript', body: THREE });
      }
      if (url.startsWith('http://localhost:3000/')) return route.continue();
      return route.abort();
    });

    await page.goto(URL);
    const states = {};

    states.menu = await expectButtons(page, ['stats', 'prefs']);
    for (const name of ['stats', 'prefs']) {
      const box = await page.locator(`.btn--${name}`).boundingBox();
      assert.ok(box.width > 0 && box.height > 0);
      assert.ok(box.x >= 0 && box.y >= 0 && box.x + box.width <= 1280 && box.y + box.height <= 720);
    }
    await page.click('.btn--prefs');
    states.prefs = await expectButtons(page, ['back', 'theme']);
    await page.waitForTimeout(3000);
    await page.click('.btn--theme');
    states.theme = await expectButtons(page, ['back', 'reset']);
    await page.waitForTimeout(3000);
    await page.click('.btn--back');
    states.backToPrefs = await expectButtons(page, ['back', 'theme']);
    await page.waitForTimeout(3000);
    await page.click('.btn--back');
    states.backToMenu = await expectButtons(page, ['stats', 'prefs']);
    assert.deepEqual(states.menu, { stats: true, prefs: true, back: false, theme: false, reset: false });
    assert.deepEqual(states.prefs, { stats: false, prefs: false, back: true, theme: true, reset: false });
    assert.deepEqual(states.theme, { stats: false, prefs: false, back: true, theme: false, reset: true });
    assert.deepEqual(states.backToPrefs, states.prefs);
    assert.deepEqual(states.backToMenu, states.menu);

    assert.deepEqual(pageErrors, []);
    results.push(states);
    console.log(`PASS: round ${round}`);
    await context.close();
  }

  assert.deepEqual(results[0], results[1]);
  console.log('PASS: both fresh contexts gave the same state');
} finally {
  if (browser) await browser.close();
  server.kill();
}