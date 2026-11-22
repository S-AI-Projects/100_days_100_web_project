import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const PORT = 4173;
// Trailing slash: serve redirects /index.html, which breaks relative style.css/script.js paths.
const PAGE_URL = `http://127.0.0.1:${PORT}/public/fake-hacker-terminal/`;
const NOT_FOUND = 'Command not found';
// Empty and whitespace-only input, an unknown command, and names that exist on Object.prototype.
const BAD_INPUTS = ['', '   ', 'xyz', 'constructor', '__proto__'];

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

async function submit(page, cmd) {
  await page.fill('#commandInput', cmd);
  await page.press('#commandInput', 'Enter');
}

const responses = (page) => page.locator('#output .response');
const lastResponse = (page) => responses(page).last().innerText();

let browser;
try {
  await waitForServer();
  browser = await chromium.launch();
  // Fresh browser context
  const context = await browser.newContext();
  const page = await context.newPage();

  const pageErrors = [];
  const failedRequests = [];
  page.on('pageerror', (e) => pageErrors.push(e));
  page.on('requestfailed', (r) => failedRequests.push(r.url()));
  page.on('response', (r) => {
    if (r.status() >= 400) failedRequests.push(`${r.status()} ${r.url()}`);
  });

  await page.goto(PAGE_URL);
  assert.equal(await responses(page).count(), 0, 'no responses before any command');

  // Empty/error states: each bad input adds exactly one readable "not found" response
  for (const cmd of BAD_INPUTS) {
    const before = await responses(page).count();
    await submit(page, cmd);
    assert.equal(await responses(page).count(), before + 1, `[${JSON.stringify(cmd)}] adds one response`);
    const text = await lastResponse(page);
    assert.ok(text.includes(NOT_FOUND), `[${JSON.stringify(cmd)}] shows "${NOT_FOUND}", got: ${text}`);
    assert.ok(!/native code|\[object/.test(text), `[${JSON.stringify(cmd)}] must not leak JS internals, got: ${text}`);
    assert.equal(await page.inputValue('#commandInput'), '', `[${JSON.stringify(cmd)}] input is cleared`);
  }

  // Recovery: valid commands still work after the errors
  await submit(page, 'help');
  assert.ok((await lastResponse(page)).includes('Available Commands'), 'help works after errors');
  await submit(page, 'pwd');
  assert.ok((await lastResponse(page)).includes('/home/sapna/projects'), 'pwd works after errors');

  // clear empties the output, and an error after clear is still readable
  await submit(page, 'clear');
  assert.equal(await responses(page).count(), 0, 'clear empties the output');
  await submit(page, 'xyz');
  assert.ok((await lastResponse(page)).includes(NOT_FOUND), 'error state works after clear');

  assert.equal(failedRequests.length, 0, `Unexpected failed requests: ${failedRequests.join(', ')}`);
  assert.equal(pageErrors.length, 0, `Unexpected page errors: ${pageErrors.join(', ')}`);
  console.log('PASS');
} catch (err) {
  console.error('FAIL', err);
  process.exitCode = 1;
} finally {
  if (browser) await browser.close();
  server.kill();
}
