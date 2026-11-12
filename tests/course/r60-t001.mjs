#!/usr/bin/env node
/**
 * R60-T001 — Keyboard interaction regression for public/ecommerce-website.
 *
 * Run from the repository root:
 *   npm --prefix tests/course ci        # once: installs the pinned Playwright
 *   npx --prefix tests/course playwright install chromium   # once, if no Chromium yet
 *   node tests/course/r60-t001.mjs [--label=latest]
 *
 * What it does
 *   1. Starts a local static HTTP server for the repo (no extra dependency) and
 *      waits until public/ecommerce-website/index.html answers 200.
 *   2. Opens the page in a fresh Chromium context. Every non-local request
 *      (Google Fonts, unpkg icon script, Unsplash images) is stubbed so the run
 *      is deterministic and works offline.
 *   3. Checks Tab traversal, visible focus, accessible names and keyboard
 *      activation (Enter / Space / typing / Escape) of the real controls in
 *      #app: #main-nav (logo, links, mobile menu), #global-search,
 *      #theme-toggle, wishlist/cart, hero buttons and category cards.
 *   4. Fails on any uncaught page error or console.error.
 *   5. Writes expected-vs-actual results and tool versions to
 *      work/R60-T001/results-<label>.json and exits 1 if any check failed.
 *
 * No permission-gated or hardware feature is used by this page, so nothing
 * needs a device stub; localStorage starts empty in the fresh context.
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
const PAGE_PATH = '/public/ecommerce-website/index.html';
const EVIDENCE_DIR = join(ROOT, 'work', 'R60-T001');
const label = (process.argv.find((a) => a.startsWith('--label=')) || '--label=latest').split('=')[1];

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.webp': 'image/webp',
};
// 1x1 transparent PNG used for stubbed remote images.
const PIXEL = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');

// ---------------------------------------------------------------- server
function startServer() {
  const server = createServer(async (req, res) => {
    try {
      const urlPath = decodeURIComponent(new URL(req.url, 'http://x').pathname);
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
    try {
      const r = await fetch(url);
      if (r.ok) return;
    } catch { /* not yet */ }
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
/** assert.deepEqual that keeps the actual value for the evidence file. */
function expectEqual(actual, expected, msg) {
  try { assert.deepEqual(actual, expected, msg); } catch (e) { e.actualValue = actual; throw e; }
  return actual;
}
function expectOk(cond, msg, actual) {
  if (!cond) { const e = new assert.AssertionError({ message: msg }); e.actualValue = actual; throw e; }
  return actual;
}

/** Short, stable description of the currently focused element. */
const describeActive = (page) => page.evaluate(() => {
  const el = document.activeElement;
  if (!el || el === document.body) return 'BODY';
  if (el.id) return `#${el.id}`;
  const name = el.getAttribute('aria-label') || el.textContent.trim().replace(/\s+/g, ' ');
  return `${el.tagName.toLowerCase()}.${[...el.classList][0] || ''}:${name}`;
});

/** Computed focus indicator of the focused element (outline or box-shadow). */
const focusStyle = (page) => page.evaluate(() => {
  const el = document.activeElement;
  const cs = getComputedStyle(el);
  return {
    focusVisible: el.matches(':focus-visible'),
    outlineStyle: cs.outlineStyle,
    outlineWidth: parseFloat(cs.outlineWidth) || 0,
    boxShadow: cs.boxShadow,
  };
});
// 'auto' is the browser's own focus ring; a fully transparent shadow does not count.
const hasVisibleIndicator = (s) => s.focusVisible && (
  s.outlineStyle === 'auto' ||
  (s.outlineStyle !== 'none' && s.outlineWidth >= 2) ||
  (!!s.boxShadow && s.boxShadow !== 'none' && !/^rgba\([^)]*,\s*0\)/.test(s.boxShadow)));

/** Tab from the top of the document and return the first n focus stops. */
async function tabStops(page, n) {
  await page.evaluate(() => { document.activeElement?.blur(); window.scrollTo(0, 0); });
  const stops = [];
  for (let i = 0; i < n; i++) {
    await page.keyboard.press('Tab');
    stops.push({ who: await describeActive(page), style: await focusStyle(page) });
  }
  return stops;
}

async function openFresh(context, hash = '') {
  const page = await context.newPage();
  await page.goto(`${BASE}${PAGE_PATH}${hash}`, { waitUntil: 'load' });
  // The demo shows a loading overlay for ~1.5s; wait until it is gone.
  await page.waitForFunction(() => document.getElementById('loading-screen')?.classList.contains('hidden'));
  return page;
}

// ---------------------------------------------------------------- run
let server; let browser; let BASE; let chromiumVersion = 'n/a';
const pageErrors = [];
const stubbed = new Set();

async function main() {
  server = await startServer();
  BASE = `http://127.0.0.1:${server.address().port}`;
  await waitForReady(`${BASE}${PAGE_PATH}`);

  browser = await chromium.launch();
  chromiumVersion = browser.version();
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' });
  await context.route((url) => !url.href.startsWith(BASE), (route) => {
    const u = new URL(route.request().url());
    stubbed.add(u.host);
    const type = route.request().resourceType();
    if (type === 'image') return route.fulfill({ status: 200, contentType: 'image/png', body: PIXEL });
    if (type === 'script') return route.fulfill({ status: 200, contentType: 'text/javascript', body: '' });
    if (type === 'stylesheet') return route.fulfill({ status: 200, contentType: 'text/css', body: '' });
    return route.fulfill({ status: 204, body: '' });
  });
  context.on('weberror', (e) => pageErrors.push(`pageerror: ${e.error().message}`));
  context.on('console', (m) => { if (m.type() === 'error') pageErrors.push(`console.error: ${m.text()}`); });

  const page = await openFresh(context);

  // 1. No positive tabindex anywhere.
  await check('no-positive-tabindex', [], async () => {
    const bad = await page.$$eval('[tabindex]', (els) =>
      els.filter((e) => parseInt(e.getAttribute('tabindex'), 10) > 0).map((e) => e.outerHTML.slice(0, 80)));
    return expectEqual(bad, [], 'elements with tabindex > 0');
  });

  // 2. Desktop Tab order through #main-nav.
  const EXPECTED_HEADER = [
    'a.logo:Luxe home', 'a.nav-link:Home', 'a.nav-link:Shop', 'a.nav-link:Orders', 'a.nav-link:Contact',
    '#global-search', '#theme-toggle', 'button.icon-btn:Wishlist', 'button.icon-btn:Cart',
  ];
  const headerStops = await tabStops(page, EXPECTED_HEADER.length);
  await check('desktop-header-tab-order', EXPECTED_HEADER, async () =>
    expectEqual(headerStops.map((s) => s.who), EXPECTED_HEADER, 'Tab order through #main-nav'));

  // 3. Visible focus on every header stop.
  await check('desktop-header-visible-focus', 'every stop: :focus-visible + outline >= 2px or box-shadow', async () => {
    const missing = headerStops.filter((s) => !hasVisibleIndicator(s.style));
    return expectOk(missing.length === 0, `no visible focus on: ${missing.map((m) => m.who).join(', ')}`, headerStops);
  });

  // 4. Accessible names for header controls.
  await check('accessible-names', 'every focusable control in #main-nav and the home view has a name', async () => {
    const unnamed = await page.$$eval('#main-nav a, #main-nav button, #main-nav input, #view-home a, #view-home button', (els) => els
      .filter((e) => {
        const label = e.getAttribute('aria-label') || (e.labels && e.labels[0]?.textContent) || (e.tagName !== 'INPUT' && e.textContent);
        return !(label && label.trim());
      })
      .map((e) => e.outerHTML.slice(0, 90)));
    return expectEqual(unnamed, [], 'unnamed controls');
  });

  // 5. Logo activates with Enter (from another view).
  await check('logo-enter-goes-home', { hash: '#home', active: 'view-home' }, async () => {
    await page.goto(`${BASE}${PAGE_PATH}#shop`);
    await page.waitForFunction(() => document.getElementById('view-shop').classList.contains('active'));
    await page.locator('#main-nav .logo').focus();
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => document.getElementById('view-home').classList.contains('active'), null, { timeout: 2000 }).catch(() => {});
    const actual = await page.evaluate(() => ({ hash: location.hash, active: document.querySelector('.view.active')?.id }));
    return expectEqual(actual, { hash: '#home', active: 'view-home' });
  });

  // 6. Nav links activate with Enter.
  for (const [text, view] of [['Shop', 'shop'], ['Orders', 'orders'], ['Contact', 'contact'], ['Home', 'home']]) {
    await check(`nav-link-enter-${view}`, { hash: `#${view}`, active: `view-${view}`, navActive: text }, async () => {
      await page.locator('#main-nav .nav-link', { hasText: text }).focus();
      await page.keyboard.press('Enter');
      await page.waitForFunction((v) => document.getElementById(`view-${v}`)?.classList.contains('active'), view, { timeout: 2000 }).catch(() => {});
      const actual = await page.evaluate(() => ({
        hash: location.hash,
        active: document.querySelector('.view.active')?.id,
        navActive: document.querySelector('.nav-link.active')?.textContent.trim(),
      }));
      return expectEqual(actual, { hash: `#${view}`, active: `view-${view}`, navActive: text });
    });
  }

  // 7. Search is operable by typing.
  await check('search-typing-filters-shop', { hash: '#shop', allMatch: true, count: '>0' }, async () => {
    await page.locator('#global-search').focus();
    await page.keyboard.type('watch');
    await page.waitForFunction(() => location.hash === '#shop');
    const r = await page.$$eval('#main-shop-grid .product-card', (cards) => cards.map((c) => ({
      title: c.querySelector('.product-title').textContent.toLowerCase(),
      cat: c.querySelector('.product-category').textContent.toLowerCase(),
    })));
    const actual = { hash: await page.evaluate(() => location.hash), allMatch: r.every((p) => p.title.includes('watch') || p.cat.includes('watch')), count: r.length };
    expectOk(actual.hash === '#shop' && actual.allMatch && actual.count > 0, 'search did not filter the shop grid', actual);
    await page.locator('#global-search').fill('');
    await page.locator('#global-search').dispatchEvent('input');
    return actual;
  });

  // 8. Theme toggle: Enter and Space.
  await check('theme-toggle-enter-and-space', ['theme-dark', 'theme-light'], async () => {
    const btn = page.locator('#theme-toggle');
    // Read the theme token rather than the animated background colour.
    const token = () => getComputedStyle(document.body).getPropertyValue('--bg-body').trim();
    const bg0 = await page.evaluate(token);
    await btn.focus();
    await page.keyboard.press('Enter');
    const afterEnter = await page.evaluate(() => ({ cls: document.body.className, bg: getComputedStyle(document.body).getPropertyValue('--bg-body').trim(), stored: localStorage.getItem('luxe_theme') }));
    await page.keyboard.press('Space');
    const afterSpace = await page.evaluate(() => document.body.className);
    expectOk(afterEnter.bg !== bg0 && afterEnter.stored === 'theme-dark', 'Enter did not change the rendered theme', { bg0, afterEnter });
    return expectEqual([afterEnter.cls.trim(), afterSpace.trim()], ['theme-dark', 'theme-light']);
  });

  // 9. Wishlist / cart open with Enter, close with Escape.
  for (const [labelText, id] of [['Wishlist', 'wishlist-sidebar'], ['Cart', 'cart-sidebar']]) {
    await check(`${id}-enter-opens-escape-closes`, { opened: true, inViewport: true, closed: true }, async () => {
      await page.locator(`#main-nav button[aria-label="${labelText}"]`).focus();
      await page.keyboard.press('Enter');
      await page.waitForTimeout(450); // sidebar slide transition
      const open = await page.evaluate((i) => {
        const el = document.getElementById(i); const b = el.getBoundingClientRect();
        return { opened: el.classList.contains('active'), inViewport: b.left >= 0 && b.right <= innerWidth + 1 };
      }, id);
      await page.keyboard.press('Escape');
      const closed = await page.evaluate((i) => !document.getElementById(i).classList.contains('active'), id);
      return expectEqual({ ...open, closed }, { opened: true, inViewport: true, closed: true });
    });
  }

  // 10. Home view: hero buttons and category cards.
  await page.goto(`${BASE}${PAGE_PATH}#home`);
  await page.waitForFunction(() => document.getElementById('view-home').classList.contains('active'));

  await check('hero-view-trending-enter-scrolls', { scrolled: true }, async () => {
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.getByRole('button', { name: 'View Trending' }).focus();
    await page.keyboard.press('Enter');
    await page.waitForTimeout(300);
    const top = await page.evaluate(() => Math.round(document.getElementById('featured').getBoundingClientRect().top));
    return expectOk(top < 200 && top > -200, `#featured top is ${top}px after activation`, { featuredTop: top });
  });

  await check('category-cards-in-tab-order-with-visible-focus', 4, async () => {
    await page.reload();
    await page.waitForFunction(() => document.getElementById('loading-screen')?.classList.contains('hidden'));
    const stops = await tabStops(page, 16);
    const cards = stops.filter((s) => s.who.startsWith('a.category-card'));
    const visible = cards.filter((s) => hasVisibleIndicator(s.style)).length;
    return expectEqual(visible, 4, `category cards reachable with visible focus (stops: ${stops.map((s) => s.who).join(' | ')})`);
  });

  await check('category-card-enter-filters-shop', { hash: '#shop', filter: 'electronics', allMatch: true }, async () => {
    await page.goto(`${BASE}${PAGE_PATH}#home`);
    await page.waitForFunction(() => document.getElementById('view-home').classList.contains('active'));
    await page.locator('.category-card', { hasText: 'Tech' }).focus();
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => location.hash === '#shop', null, { timeout: 2000 }).catch(() => {});
    const actual = await page.evaluate(() => ({
      hash: location.hash,
      filter: document.getElementById('category-filter').value,
      allMatch: [...document.querySelectorAll('#main-shop-grid .product-category')].every((c) => c.textContent.trim() === 'electronics'),
    }));
    return expectEqual(actual, { hash: '#shop', filter: 'electronics', allMatch: true });
  });

  // Supporting screenshots for review (assertions above are what decide pass/fail).
  await page.close();
  const shot = await openFresh(context, '#home');
  await tabStops(shot, 7); // focus lands on #theme-toggle
  await shot.locator('#main-nav').screenshot({ path: join(EVIDENCE_DIR, `focus-header-${label}.png`) }).catch(() => {});
  await shot.keyboard.press('Tab');
  await shot.locator('.category-card').first().focus();
  await shot.locator('.categories').screenshot({ path: join(EVIDENCE_DIR, `focus-category-${label}.png`) }).catch(() => {});
  await shot.close();

  // 11. Mobile width: menu button.
  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  await mobile.route((url) => !url.href.startsWith(BASE), (route) => route.fulfill({ status: 204, body: '' }));
  mobile.on('weberror', (e) => pageErrors.push(`pageerror (mobile): ${e.error().message}`));
  const m = await openFresh(mobile, '#home');
  const MOBILE_EXPECTED = {
    named: true, expandedAfterEnter: 'true', linksVisible: true,
    focusAfterOpen: 'a.nav-link:Home', escapeClosed: true, focusAfterEscape: 'button.icon-btn:Menu', navigated: '#shop',
  };
  await check('mobile-menu-keyboard', MOBILE_EXPECTED, async () => {
    const btn = m.locator('.mobile-menu-btn');
    const named = !!(await btn.getAttribute('aria-label'));
    await m.keyboard.press('Tab'); // put the page in keyboard modality
    await btn.focus();
    const fs = await focusStyle(m);
    await m.keyboard.press('Enter');
    const expandedAfterEnter = await btn.getAttribute('aria-expanded');
    const linksVisible = await m.evaluate(() => {
      const n = document.querySelector('.nav-links');
      return getComputedStyle(n).display !== 'none' && n.getBoundingClientRect().height > 0;
    });
    const focusAfterOpen = await describeActive(m);
    await m.keyboard.press('Escape');
    const escapeClosed = await m.evaluate(() => !document.querySelector('.nav-links').classList.contains('active'));
    const focusAfterEscape = await describeActive(m);
    await m.keyboard.press('Enter'); // reopen from the button
    await m.locator('.nav-links .nav-link', { hasText: 'Shop' }).focus();
    await m.keyboard.press('Enter');
    await m.waitForFunction(() => location.hash === '#shop', null, { timeout: 2000 }).catch(() => {});
    const navigated = await m.evaluate(() => location.hash);
    const actual = { named, expandedAfterEnter, linksVisible, focusAfterOpen, escapeClosed, focusAfterEscape, navigated };
    expectOk(hasVisibleIndicator(fs), 'mobile menu button has no visible focus', { ...actual, focus: fs });
    return expectEqual(actual, MOBILE_EXPECTED);
  });
  await mobile.close();

  // 12. No unexpected page errors during the whole run.
  await check('no-page-errors', [], async () => expectEqual(pageErrors, [], 'page errors'));
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
  task: 'R60-T001', label, page: PAGE_PATH, date: new Date().toISOString(),
  tools: { node: process.version, playwright: (await import('playwright/package.json', { with: { type: 'json' } })).default.version, chromium: chromiumVersion, os: `${os.type()} ${os.release()}` },
  inputs: { viewport: ['1280x800', '390x844 (mobile check)'], reducedMotion: 'reduce', stubbedHosts: [...stubbed].sort(), keys: ['Tab', 'Enter', 'Space', 'Escape', 'typed text "watch"'] },
  summary: { total: results.length, passed: results.length - failed.length, failed: failed.length, fatal: fatal ? String(fatal.stack || fatal) : null },
  results,
};
await writeFile(join(EVIDENCE_DIR, `results-${label}.json`), JSON.stringify(report, null, 2)).catch(() => {});

for (const r of results) console.log(`${r.status === 'pass' ? 'PASS' : 'FAIL'}  ${r.name}${r.error ? `\n      ${r.error.split('\n')[0]}` : ''}`);
console.log(`\n${report.summary.passed}/${results.length} checks passed -> work/R60-T001/results-${label}.json`);
if (fatal) console.error('FATAL:', fatal);
process.exit(fatal || failed.length ? 1 : 0);
