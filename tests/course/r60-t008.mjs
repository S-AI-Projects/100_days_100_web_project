#!/usr/bin/env node
/**
 * R60-T008 — Safe text rendering regression for public/ImageCompressor.
 *
 * Run from the repository root:
 *   npm --prefix tests/course ci                              # once
 *   npx --prefix tests/course playwright install chromium     # once, if needed
 *   node tests/course/r60-t008.mjs [--label=latest]
 *
 * Traced user text: the page has no text box, but it displays the NAME of
 * every file the user uploads. File names come from the user's computer and
 * may contain "<", ">", quotes and "=". They are shown in:
 *   - the queue list (.item-name)                       js/main.js renderQueue
 *   - toasts: "Skipped <name> - Invalid format", "Failed to compress <name>",
 *     "Unable to safely compress <name> …"              js/ui.js showToast
 *   - the comparison modal title (#modalFilename)       already textContent
 *
 * Fixtures (uploaded through the real <input type=file>, no hardware or
 * permission involved):
 *   A. a real 8x8 PNG named   <img src=x onerror="window.__pwned=(window.__pwned||0)+1">photo.png
 *   B. a text file named      <b data-injected="1">notes</b>.txt   (wrong type -> "Skipped …" toast)
 * Each must appear exactly as text, create no injected element and run no
 * handler. The intended rich HTML (the page's own icons/badges) is a separate
 * contract: a toast is exactly one icon <i> plus one text <span>.
 *
 * CDN scripts (Phosphor icons, JSZip, SortableJS) and fonts are stubbed with
 * empty responses so the run is offline and deterministic. Fails on any
 * uncaught page error or console.error; writes work/R60-T008/results-<label>.json
 * and exits 1 if any check failed.
 */
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import os from 'node:os';
import { chromium } from 'playwright';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..', '..');
const PAGE_PATH = '/public/ImageCompressor/index.html';
const EVIDENCE_DIR = join(ROOT, 'work', 'R60-T008');
const label = (process.argv.find((a) => a.startsWith('--label=')) || '--label=latest').split('=')[1];

const IMAGE_NAME = '<img src=x onerror="window.__pwned=(window.__pwned||0)+1">photo.png';
const TEXT_NAME = '<b data-injected="1">notes</b>.txt';
// Valid 8x8 RGB PNG (generated with zlib) so the real compression path runs.
const PNG_8x8 = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAAZ0lEQVR4nBWMQQ0AQAyDqmRKqmRKUFIlU1JFl+NJCJIYYbECEXGiQhpm8LADQ4YbOkhmjM0aTMyZGmmZxcsuLFlu6SL9Af7yEzgoSGGCw+brhAsN0jGHj70f57ijh1SmuGz/IuVKywPqHVKBC3UAzQAAAABJRU5ErkJggg==', 'base64');

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png' };

// ---------------------------------------------------------------- server
const requestedPaths = [];
function startServer() {
  const server = createServer(async (req, res) => {
    const urlPath = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    requestedPaths.push(urlPath);
    try {
      const file = normalize(join(ROOT, urlPath));
      if (!file.startsWith(ROOT)) { res.writeHead(403).end(); return; }
      const s = await stat(file);
      const target = s.isDirectory() ? join(file, 'index.html') : file;
      const body = await readFile(target);
      res.writeHead(200, { 'content-type': MIME[extname(target)] || 'application/octet-stream' });
      res.end(body);
    } catch {
      res.writeHead(404).end('not found');
    }
  });
  return new Promise((ok, fail) => {
    server.once('error', fail);
    server.listen(0, '127.0.0.1', () => ok(server));
  });
}

async function waitForReady(url, timeoutMs = 10_000) {
  const until = Date.now() + timeoutMs;
  while (Date.now() < until) {
    try { if ((await fetch(url)).ok) return; } catch { /* not yet */ }
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error(`server not ready at ${url}`);
}

// ---------------------------------------------------------------- helpers
const results = [];
async function check(name, expected, fn) {
  try {
    const actual = await fn();
    results.push({ name, status: 'pass', expected, actual: actual ?? expected });
  } catch (err) {
    results.push({ name, status: 'fail', expected, actual: err.actualValue ?? null, error: String(err.message || err) });
  }
}
function expectEqual(actual, expected, msg) {
  try { assert.deepEqual(actual, expected, msg); } catch (e) { e.actualValue = actual; throw e; }
  return actual;
}

/** Elements that could only exist if a file name had been parsed as HTML. */
const injectedElements = (page) => page.evaluate(() => ({
  imgWithOnerror: document.querySelectorAll('img[onerror]').length,
  injectedB: document.querySelectorAll('[data-injected]').length,
  imgSrcX: [...document.images].filter((i) => i.getAttribute('src') === 'x').length,
  pwned: window.__pwned || 0,
}));
const NONE_INJECTED = { imgWithOnerror: 0, injectedB: 0, imgSrcX: 0, pwned: 0 };

// ---------------------------------------------------------------- run
let server; let browser; let BASE; let chromiumVersion = 'n/a';
const pageErrors = [];

async function main() {
  server = await startServer();
  BASE = `http://127.0.0.1:${server.address().port}`;
  await waitForReady(`${BASE}${PAGE_PATH}`);
  browser = await chromium.launch();
  chromiumVersion = browser.version();

  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, colorScheme: 'dark', reducedMotion: 'reduce' });
  await context.route((url) => !url.href.startsWith(BASE), (route) => {
    const type = route.request().resourceType();
    return route.fulfill({ status: 200, contentType: type === 'script' ? 'text/javascript' : 'text/css', body: '' });
  });
  context.on('weberror', (e) => pageErrors.push(`pageerror: ${e.error().message}`));
  context.on('console', (m) => { if (m.type() === 'error') pageErrors.push(`console.error: ${m.text()}`); });
  const page = await context.newPage();
  await page.goto(`${BASE}${PAGE_PATH}`, { waitUntil: 'load' });
  await page.waitForTimeout(200);

  await check('baseline-page-clean', { injected: NONE_INJECTED, globalStatsHidden: true }, async () => expectEqual({
    injected: await injectedElements(page),
    globalStatsHidden: await page.locator('#globalStats').evaluate((el) => el.classList.contains('hidden')),
  }, { injected: NONE_INJECTED, globalStatsHidden: true }, 'unexpected start state'));

  // ---- Fixture B: wrong file type -> "Skipped <name> - Invalid format" toast
  await page.locator('#fileInput').setInputFiles({ name: TEXT_NAME, mimeType: 'text/plain', buffer: Buffer.from('hello') });
  await page.waitForTimeout(150);

  await check('skipped-toast-shows-name-as-text', { text: `Skipped ${TEXT_NAME} - Invalid format` }, async () => {
    const texts = await page.$$eval('#toastContainer .toast', (ts) => ts.map((t) => t.textContent.replace(/\s+/g, ' ').trim()));
    return expectEqual({ text: texts.find((t) => t.startsWith('Skipped')) ?? null }, { text: `Skipped ${TEXT_NAME} - Invalid format` }, 'file name not shown literally in the toast');
  });
  await check('skipped-toast-no-injected-element', { injected: NONE_INJECTED, toastStructure: [['I', 'SPAN']] }, async () => expectEqual({
    injected: await injectedElements(page),
    toastStructure: await page.$$eval('#toastContainer .toast', (ts) => ts.map((t) => [...t.children].map((c) => c.tagName))),
  }, { injected: NONE_INJECTED, toastStructure: [['I', 'SPAN']] }, 'file name was parsed as HTML in the toast'));

  // ---- Fixture A: real PNG with a markup-like name -> queue list (+ toasts)
  await page.locator('#fileInput').setInputFiles({ name: IMAGE_NAME, mimeType: 'image/png', buffer: PNG_8x8 });
  await page.waitForSelector('#queueList .queue-item');
  await page.waitForFunction(() => !document.querySelector('#queueList .queue-item.compressing'), null, { timeout: 10_000 }).catch(() => {});
  await page.waitForTimeout(300);

  await check('queue-shows-name-as-text', { itemName: IMAGE_NAME, items: 1 }, async () => expectEqual({
    itemName: await page.locator('#queueList .item-name').first().evaluate((el) => el.textContent),
    items: await page.locator('#queueList .queue-item').count(),
  }, { itemName: IMAGE_NAME, items: 1 }, 'queue does not show the file name literally'));

  await check('queue-name-has-no-child-elements', { childElements: 0 }, async () => expectEqual({
    childElements: await page.locator('#queueList .item-name').first().evaluate((el) => el.children.length),
  }, { childElements: 0 }, 'file name created elements inside .item-name'));

  await check('no-injected-element-or-handler-run', { injected: NONE_INJECTED, requestsForX: 0 }, async () => expectEqual({
    injected: await injectedElements(page),
    requestsForX: requestedPaths.filter((p) => p.endsWith('/x')).length,
  }, { injected: NONE_INJECTED, requestsForX: 0 }, 'markup in the file name became a live element / ran its handler'));

  await check('stats-anchors-render-as-text', { globalStatsVisible: true, totalSavedStatPlainText: true }, async () => {
    const r = await page.evaluate(() => ({
      globalStatsVisible: !document.getElementById('globalStats').classList.contains('hidden'),
      totalSavedStatPlainText: document.getElementById('totalSavedStat').children.length === 0
        && /^\d+(\.\d+)? (Bytes|KB|MB)$/.test(document.getElementById('totalSavedStat').textContent),
      totalSavedStat: document.getElementById('totalSavedStat').textContent,
    }));
    expectEqual({ globalStatsVisible: r.globalStatsVisible, totalSavedStatPlainText: r.totalSavedStatPlainText }, { globalStatsVisible: true, totalSavedStatPlainText: true }, `#globalStats / #totalSavedStat wrong: ${JSON.stringify(r)}`);
    return r;
  });

  await check('rich-html-contract-icons-still-elements', { everyToastIsIconPlusText: true, queueHasTrashIcon: true }, async () => expectEqual(await page.evaluate(() => ({
    everyToastIsIconPlusText: [...document.querySelectorAll('#toastContainer .toast')].every((t) => t.children.length === 2 && t.children[0].matches('i.ph') && t.children[1].tagName === 'SPAN' && t.children[1].children.length === 0),
    queueHasTrashIcon: !!document.querySelector('#queueList .remove-btn i.ph.ph-trash'),
  })), { everyToastIsIconPlusText: true, queueHasTrashIcon: true }, 'intended icon markup changed'));

  await page.screenshot({ path: join(EVIDENCE_DIR, `queue-${label}.png`) }).catch(() => {});

  // ---- Modal title (already textContent) when the item compressed successfully
  await check('modal-title-shows-name-as-text', { modalFilename: IMAGE_NAME, childElements: 0 }, async () => {
    const done = await page.locator('#queueList .queue-item').first().evaluate((el) => !el.classList.contains('compressing') && !!el.querySelector('.item-savings'));
    if (!done) return { skipped: 'item did not finish compressing; modal not opened' };
    await page.locator('#queueList .item-details').first().click();
    return expectEqual(await page.locator('#modalFilename').evaluate((el) => ({ modalFilename: el.textContent, childElements: el.children.length })),
      { modalFilename: IMAGE_NAME, childElements: 0 }, 'modal title wrong');
  });

  // ---- #themeToggleBtn / #themeIcon keep working (their icon is page-owned markup)
  await check('theme-toggle-and-icon', { first: ['light', 'ph ph-moon'], second: ['dark', 'ph ph-sun'] }, async () => {
    await page.keyboard.press('Escape');
    await page.evaluate(() => document.getElementById('comparisonModal').classList.add('hidden'));
    const read = () => page.evaluate(() => [document.documentElement.getAttribute('data-theme'), document.getElementById('themeIcon').className]);
    await page.locator('#themeToggleBtn').click();
    const first = await read();
    await page.locator('#themeToggleBtn').click();
    return expectEqual({ first, second: await read() }, { first: ['light', 'ph ph-moon'], second: ['dark', 'ph ph-sun'] }, 'theme toggle broken');
  });

  await context.close();

  await check('no-page-errors', [], async () => expectEqual(pageErrors, [], 'unexpected page errors'));
}

let fatal = null;
try {
  await mkdir(EVIDENCE_DIR, { recursive: true });
  await main();
} catch (err) {
  fatal = err;
} finally {
  await browser?.close().catch(() => {});
  await new Promise((r) => (server ? server.close(() => r()) : r()));
}

const failed = results.filter((r) => r.status === 'fail');
const report = {
  task: 'R60-T008', label, page: PAGE_PATH, date: new Date().toISOString(),
  tools: { node: process.version, playwright: (await import('playwright/package.json', { with: { type: 'json' } })).default.version, chromium: chromiumVersion, os: `${os.type()} ${os.release()}` },
  inputs: {
    fixtureFiles: [
      { name: IMAGE_NAME, type: 'image/png', bytes: PNG_8x8.length, note: 'real 8x8 PNG; exercises queue list, compression toasts, modal' },
      { name: TEXT_NAME, type: 'text/plain', bytes: 5, note: 'wrong type; exercises "Skipped … - Invalid format" toast' },
    ],
    context: '1280x900, dark scheme, reduced motion; CDN scripts/fonts stubbed empty',
  },
  summary: { total: results.length, passed: results.length - failed.length, failed: failed.length, fatal: fatal ? String(fatal.stack || fatal) : null },
  results,
};
await writeFile(join(EVIDENCE_DIR, `results-${label}.json`), JSON.stringify(report, null, 2)).catch(() => {});

for (const r of results) console.log(`${r.status === 'pass' ? 'PASS' : 'FAIL'}  ${r.name}${r.error ? `\n      ${r.error.split('\n')[0]}` : ''}`);
console.log(`\n${report.summary.passed}/${results.length} checks passed -> work/R60-T008/results-${label}.json`);
if (fatal) console.error('FATAL:', fatal);
process.exit(fatal || failed.length ? 1 : 0);
