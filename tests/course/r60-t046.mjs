import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const PORT = 4173;
// Trailing slash: serve redirects /index.html, which breaks relative style.css/script.js paths.
const PAGE_URL = `http://127.0.0.1:${PORT}/public/Time-Capsule/`;
const EXPECTED_ERR = 'Storage is not available';

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

// Stub: window.localStorage throws SecurityError while window.__blockStorage is true.
async function stubStorage(page, blocked) {
  await page.addInitScript((initialBlocked) => {
    window.__blockStorage = initialBlocked;
    const orig = Object.getOwnPropertyDescriptor(window, 'localStorage');
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get() {
        if (window.__blockStorage) throw new DOMException('The operation is insecure.', 'SecurityError');
        return orig.get.call(window);
      },
    });
  }, blocked);
}

async function seal(page, text) {
  await page.fill('#message', text);
  await page.click('button[type=submit]');
}

let browser;
try {
  await waitForServer();
  browser = await chromium.launch();

  // 1. Feature present: capsule is sealed and stored
  {
    const context = await browser.newContext(); // fresh context
    const page = await context.newPage();
    const pageErrors = [];
    page.on('pageerror', (e) => pageErrors.push(e));
    await stubStorage(page, false);
    await page.goto(PAGE_URL);
    await seal(page, 'hello future me');
    await page.waitForSelector('#capsuleReveal:not(.hidden)');
    assert.equal(await page.textContent('#err'), '', 'supported: no error text');
    assert.equal(await page.inputValue('#message'), '', 'supported: message box is cleared');
    assert.ok((await page.textContent('#revealTime')).startsWith('Your message will be revealed at:'), 'supported: reveal time shown');
    const stored = JSON.parse(await page.evaluate(() => window.localStorage.getItem('capsules')));
    assert.equal(stored.length, 1, 'supported: one capsule stored');
    assert.equal(stored[0].message, 'hello future me', 'supported: stored message matches');
    assert.equal(pageErrors.length, 0, `supported: unexpected page errors: ${pageErrors.join(', ')}`);
    await context.close();
  }

  // 2. Feature absent: readable fallback, nothing pretends to be sealed, then recovery
  {
    const context = await browser.newContext();
    const page = await context.newPage();
    const pageErrors = [];
    page.on('pageerror', (e) => pageErrors.push(e));
    await stubStorage(page, true);
    await page.goto(PAGE_URL);
    await seal(page, 'hello future me');
    await page.waitForFunction(() => document.querySelector('#err').textContent !== '');
    assert.ok((await page.textContent('#err')).includes(EXPECTED_ERR), 'unsupported: readable fallback text shown');
    assert.ok(await page.locator('#capsuleReveal.hidden').count(), 'unsupported: capsule is not shown as sealed');
    assert.equal(await page.inputValue('#message'), 'hello future me', 'unsupported: message is kept');
    assert.equal(pageErrors.length, 0, `unsupported: unexpected page errors: ${pageErrors.join(', ')}`);

    // Recovery: storage restored, same page, same message
    await page.evaluate(() => { window.__blockStorage = false; });
    await page.click('button[type=submit]');
    await page.waitForSelector('#capsuleReveal:not(.hidden)');
    assert.equal(await page.textContent('#err'), '', 'recovery: error text is cleared');
    assert.equal(await page.inputValue('#message'), '', 'recovery: message box is cleared');
    const stored = JSON.parse(await page.evaluate(() => window.localStorage.getItem('capsules')));
    assert.equal(stored.length, 1, 'recovery: capsule stored after storage is restored');
    assert.equal(pageErrors.length, 0, `recovery: unexpected page errors: ${pageErrors.join(', ')}`);
    await context.close();
  }

  console.log('PASS');
} catch (err) {
  console.error('FAIL', err);
  process.exitCode = 1;
} finally {
  if (browser) await browser.close();
  server.kill();
}
