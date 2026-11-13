#!/usr/bin/env node
/**
 * R60-T006 — Feature-support fallback regression for public/dropdown_navbar.
 *
 * Run from the repository root:
 *   npm --prefix tests/course ci                              # once
 *   npx --prefix tests/course playwright install chromium     # once, if needed
 *   node tests/course/r60-t006.mjs [--label=latest] [--online]
 *
 * Feature under test: the "glass" navbar and dropdown panels (#navbar,
 * #grocery-dd, …) use CSS `backdrop-filter`. The page is styled by the Tailwind
 * Play CDN (https://cdn.tailwindcss.com), which is also a runtime dependency.
 *
 * Paths (each in a fresh browser context; images/fonts are stubbed):
 *   present   — Tailwind via a local fixture (tests/course/fixtures/r60-t006/
 *               tailwind.css, built from the page's own config with Tailwind
 *               v3.4.17) and the browser's real backdrop-filter support.
 *   absent    — same, but backdrop-filter is stubbed as unsupported: the page
 *               (and fixture CSS) is served with the property renamed so
 *               Chromium cannot apply it or match it in @supports, and
 *               CSS.supports() reports false for it.
 *   no-tailwind — the Tailwind CDN request fails (offline / blocked).
 *   mobile    — present path at 390×844 (hamburger menu).
 *   --online  — OPTIONAL, labelled separately: the real CDN instead of the
 *               fixture (needs internet; not part of the required run).
 *
 * Asserts rendered DOM, click effects and computed styles; fails on any
 * uncaught page error. Writes work/R60-T006/results-<label>.json and exits 1
 * if any check failed. No permission-gated or hardware feature is involved.
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
const PAGE_PATH = '/public/dropdown_navbar/index.html';
const FIXTURE_CSS = join(HERE, 'fixtures', 'r60-t006', 'tailwind.css');
const EVIDENCE_DIR = join(ROOT, 'work', 'R60-T006');
const label = (process.argv.find((a) => a.startsWith('--label=')) || '--label=latest').split('=')[1];
const ONLINE = process.argv.includes('--online');
const DESKTOP = { width: 1280, height: 800 };
const MOBILE = { width: 390, height: 844 };
const PIXEL = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp' };

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
function expectOk(cond, msg, actual) {
  if (!cond) { const e = new assert.AssertionError({ message: msg }); e.actualValue = actual; throw e; }
  return actual;
}

/** Renames backdrop-filter so the browser treats it as an unknown (unsupported) property. */
const withoutBackdropFilter = (text) => text.replace(/backdrop-filter/g, 'x-unsupported-backdrop-filter');
const UNSUPPORTED_STUB = `(() => {
  const real = CSS.supports.bind(CSS);
  CSS.supports = (...args) => (String(args[0]).includes('backdrop-filter') ? false : real(...args));
})();`;

const DROPDOWNS = ['grocery-dd', 'mobile-dd', 'appliances-dd', 'vehicle-dd', 'travel-dd', 'fashion-dd', 'user-menu'];

const isShown = (page, id) => page.evaluate((i) => {
  const el = document.getElementById(i);
  const cs = getComputedStyle(el); const r = el.getBoundingClientRect();
  return cs.display !== 'none' && cs.visibility !== 'hidden' && r.width > 0 && r.height > 0;
}, id);
const openMenus = (page) => page.evaluate((ids) => ids.filter((i) => {
  const el = document.getElementById(i); const cs = getComputedStyle(el); const r = el.getBoundingClientRect();
  return cs.display !== 'none' && cs.visibility !== 'hidden' && r.width > 0 && r.height > 0;
}), DROPDOWNS);
const panelStyle = (page, selector) => page.evaluate((sel) => {
  const el = document.querySelector(sel); const cs = getComputedStyle(el);
  const m = cs.backgroundColor.match(/[\d.]+/g).map(Number);
  return { backdropFilter: cs.backdropFilter, background: cs.backgroundColor, alpha: m[3] === undefined ? 1 : m[3] };
}, selector);
/** Contrast of a link against its panel when the panel sits over white (worst case for a see-through panel). */
const linkContrastOverWhite = (page, linkSel, panelSel) => page.evaluate(([l, p]) => {
  const parse = (c) => { const m = c.match(/[\d.]+/g).map(Number); return { r: m[0], g: m[1], b: m[2], a: m[3] === undefined ? 1 : m[3] }; };
  const over = (t, b) => ({ r: t.r * t.a + b.r * (1 - t.a), g: t.g * t.a + b.g * (1 - t.a), b: t.b * t.a + b.b * (1 - t.a), a: 1 });
  const lum = ({ r, g, b }) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const bg = over(parse(getComputedStyle(document.querySelector(p)).backgroundColor), { r: 255, g: 255, b: 255, a: 1 });
  const fg = over(parse(getComputedStyle(document.querySelector(l)).color), bg);
  const [a, b] = [lum(fg), lum(bg)].sort((x, y) => y - x);
  return Math.round(((a + 0.05) / (b + 0.05)) * 100) / 100;
}, [linkSel, panelSel]);

// ---------------------------------------------------------------- run
let server; let browser; let BASE; let chromiumVersion = 'n/a'; let fixtureCss;
const pageErrors = { required: [], noTailwind: [] };

/**
 * mode: 'present' | 'absent' | 'no-tailwind' | 'online'
 */
async function openPage(mode, viewport = DESKTOP) {
  const context = await browser.newContext({ viewport, reducedMotion: 'reduce' });
  const bucket = mode === 'no-tailwind' ? pageErrors.noTailwind : pageErrors.required;
  context.on('weberror', (e) => bucket.push(`[${mode}] pageerror: ${e.error().message}`));
  context.on('console', (m) => {
    if (m.type() !== 'error' || /Failed to load resource/.test(m.text())) return;
    bucket.push(`[${mode}] console.error: ${m.text().slice(0, 200)}`);
  });
  if (mode === 'absent') await context.addInitScript(UNSUPPORTED_STUB);

  await context.route('**/*', async (route) => {
    const url = route.request().url();
    if (url.startsWith(BASE)) {
      if (mode === 'absent' && url.includes(PAGE_PATH)) {
        const html = await readFile(join(ROOT, PAGE_PATH), 'utf8');
        return route.fulfill({ status: 200, contentType: 'text/html', body: withoutBackdropFilter(html) });
      }
      return route.continue();
    }
    if (url.startsWith('https://cdn.tailwindcss.com')) {
      if (mode === 'no-tailwind') return route.abort('internetdisconnected');
      if (mode === 'online') return route.continue();
      const css = mode === 'absent' ? withoutBackdropFilter(fixtureCss) : fixtureCss;
      // Stand-in for the Play CDN: defines window.tailwind and injects the prebuilt CSS.
      const js = `window.tailwind = window.tailwind || {}; (function(){var s=document.createElement('style');s.setAttribute('data-fixture','tailwind');s.textContent=${JSON.stringify(css)};document.head.appendChild(s);})();`;
      return route.fulfill({ status: 200, contentType: 'text/javascript', body: js });
    }
    if (route.request().resourceType() === 'image') return route.fulfill({ status: 200, contentType: 'image/png', body: PIXEL });
    if (mode === 'online' && /fonts\.(googleapis|gstatic)\.com/.test(url)) return route.continue();
    return route.fulfill({ status: 200, contentType: 'text/css', body: '' }); // fonts and anything else
  });

  const page = await context.newPage();
  await page.goto(`${BASE}${PAGE_PATH}`, { waitUntil: 'load' });
  await page.waitForTimeout(mode === 'online' ? 1500 : 300);
  return { context, page };
}

/** Shared dropdown behaviour checks for a desktop page. */
async function dropdownChecks(prefix, page) {
  await check(`${prefix}-menus-closed-on-load`, [], async () => expectEqual(await openMenus(page), [], 'dropdown panels visible before any click'));

  await check(`${prefix}-grocery-opens-grocery-dd`, { open: ['grocery-dd'], links: ['grocery.html#fresh-produce', 'grocery.html#dairy-eggs', 'grocery.html#beverages'] }, async () => {
    await page.locator('button#grocery').click();
    const links = await page.$$eval('#grocery-dd a', (as) => as.map((a) => a.getAttribute('href')));
    return expectEqual({ open: await openMenus(page), links }, { open: ['grocery-dd'], links: ['grocery.html#fresh-produce', 'grocery.html#dairy-eggs', 'grocery.html#beverages'] }, '#grocery did not open exactly #grocery-dd');
  });

  await check(`${prefix}-mobile-switches-then-outside-click-closes`, { afterMobile: ['mobile-dd'], afterOutside: [] }, async () => {
    await page.locator('button#mobile').click();
    const afterMobile = await openMenus(page);
    await page.mouse.click(640, 700);
    return expectEqual({ afterMobile, afterOutside: await openMenus(page) }, { afterMobile: ['mobile-dd'], afterOutside: [] }, 'switching / closing menus failed');
  });
}

async function main() {
  fixtureCss = await readFile(FIXTURE_CSS, 'utf8');
  server = await startServer();
  BASE = `http://127.0.0.1:${server.address().port}`;
  await waitForReady(`${BASE}${PAGE_PATH}`);
  browser = await chromium.launch();
  chromiumVersion = browser.version();

  // ===== present: backdrop-filter supported
  {
    const { context, page } = await openPage('present');
    await check('ids-grocery-and-mobile-unique', { grocery: 1, mobile: 1 }, async () => expectEqual(await page.evaluate(() => ({
      grocery: document.querySelectorAll('[id="grocery"]').length, mobile: document.querySelectorAll('[id="mobile"]').length,
    })), { grocery: 1, mobile: 1 }, '#grocery / #mobile used by more than one element'));

    await dropdownChecks('present', page);

    await check('present-glass-uses-backdrop-filter', { supports: true, navbar: { backdropFilter: 'blur(12px)', alpha: 0.8 }, panel: { backdropFilter: 'blur(12px)', alpha: 0.8 } }, async () => {
      await page.locator('button#grocery').click();
      const nav = await panelStyle(page, '#navbar');
      const panel = await panelStyle(page, '#grocery-dd > .glass');
      const supports = await page.evaluate(() => CSS.supports('backdrop-filter', 'blur(1px)'));
      return expectEqual({ supports, navbar: { backdropFilter: nav.backdropFilter, alpha: nav.alpha }, panel: { backdropFilter: panel.backdropFilter, alpha: panel.alpha } },
        { supports: true, navbar: { backdropFilter: 'blur(12px)', alpha: 0.8 }, panel: { backdropFilter: 'blur(12px)', alpha: 0.8 } }, 'supported glass look changed');
    });
    await page.screenshot({ path: join(EVIDENCE_DIR, `present-grocery-open-${label}.png`) }).catch(() => {});
    await context.close();
  }

  // ===== absent: backdrop-filter stubbed as unsupported
  {
    const { context, page } = await openPage('absent');
    await check('absent-stub-in-effect', { supports: false, navbarBackdropFilter: 'none' }, async () => expectEqual(await page.evaluate(() => ({
      supports: CSS.supports('backdrop-filter', 'blur(1px)'), navbarBackdropFilter: getComputedStyle(document.getElementById('navbar')).backdropFilter,
    })), { supports: false, navbarBackdropFilter: 'none' }, 'backdrop-filter stub not applied'));

    await dropdownChecks('absent', page);

    await check('absent-glass-falls-back-to-solid-panels', { navbarAlphaAtLeast: 0.95, panelAlphaAtLeast: 0.95, linkContrastAtLeast: 7 }, async () => {
      await page.locator('button#grocery').click();
      const nav = await panelStyle(page, '#navbar');
      const panel = await panelStyle(page, '#grocery-dd > .glass');
      const contrast = await linkContrastOverWhite(page, '#grocery-dd a', '#grocery-dd > .glass');
      const actual = { navbar: nav, panel, linkContrastOverWhite: contrast };
      expectOk(nav.alpha >= 0.95 && panel.alpha >= 0.95 && contrast >= 7, `no @supports fallback: panel alpha ${panel.alpha}, link contrast over white ${contrast}:1`, actual);
      return actual;
    });
    await page.screenshot({ path: join(EVIDENCE_DIR, `absent-grocery-open-${label}.png`) }).catch(() => {});
    await context.close();
  }

  // ===== mobile (present path, hamburger)
  {
    const { context, page } = await openPage('present', MOBILE);
    await check('mobile-hamburger-and-submenu', { desktopNavHidden: true, menuShown: true, grocerySubmenuShown: true }, async () => {
      const desktopNavHidden = !(await isShown(page, 'grocery'));
      await page.locator('#mobile-menu-toggle').click();
      const menuShown = await isShown(page, 'mobile-menu-content');
      await page.locator('#mobile-grocery-btn').click();
      return expectEqual({ desktopNavHidden, menuShown, grocerySubmenuShown: await isShown(page, 'mobile-grocery-dd') },
        { desktopNavHidden: true, menuShown: true, grocerySubmenuShown: true }, 'mobile menu broken');
    });
    await context.close();
  }

  await check('no-page-errors-required-paths', [], async () => expectEqual(pageErrors.required, [], 'unexpected page errors'));

  // ===== no-tailwind: the CDN cannot load
  {
    const { context, page } = await openPage('no-tailwind');
    await check('no-tailwind-explicit-notice-and-no-error', { pageErrors: [], noticeShown: true }, async () => {
      const notice = await page.evaluate(() => document.querySelector('[role="status"]')?.textContent.trim() || null);
      const actual = { pageErrors: pageErrors.noTailwind, noticeShown: !!notice && /Tailwind/i.test(notice), notice };
      expectOk(actual.pageErrors.length === 0 && actual.noticeShown, 'Tailwind failure is not handled explicitly', actual);
      return actual;
    });
    await check('no-tailwind-menus-closed-and-work', { onLoad: [], afterGroceryClick: ['grocery-dd'] }, async () => {
      const onLoad = await openMenus(page);
      let afterGroceryClick = null;
      try { await page.locator('button#grocery').click({ timeout: 2000 }); afterGroceryClick = await openMenus(page); } catch (e) { afterGroceryClick = `click failed: ${e.message.split('\n')[0]}`; }
      return expectEqual({ onLoad, afterGroceryClick }, { onLoad: [], afterGroceryClick: ['grocery-dd'] }, 'menus unusable without Tailwind');
    });
    await check('no-tailwind-icons-stay-small', { largestIconPx: '<= 24' }, async () => {
      const largest = await page.$$eval('#navbar svg', (svgs) => Math.max(...svgs.map((s) => Math.round(s.getBoundingClientRect().height))));
      expectOk(largest <= 24, `navbar icons ${largest}px tall without Tailwind`, { largestIconPx: largest });
      return { largestIconPx: largest };
    });
    await page.screenshot({ path: join(EVIDENCE_DIR, `no-tailwind-${label}.png`) }).catch(() => {});
    await context.close();
  }

  // ===== optional: real CDN (labelled separately)
  if (ONLINE) {
    const { context, page } = await openPage('online');
    await dropdownChecks('optional-online', page);
    await context.close();
  }
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
  task: 'R60-T006', label, page: PAGE_PATH, date: new Date().toISOString(),
  tools: { node: process.version, playwright: (await import('playwright/package.json', { with: { type: 'json' } })).default.version, chromium: chromiumVersion, tailwindFixture: 'tailwindcss v3.4.17 CLI, page config (tests/course/fixtures/r60-t006/)', os: `${os.type()} ${os.release()}` },
  inputs: {
    viewports: { desktop: `${DESKTOP.width}x${DESKTOP.height}`, mobile: `${MOBILE.width}x${MOBILE.height}` },
    paths: {
      present: 'Tailwind fixture + native backdrop-filter',
      absent: 'Tailwind fixture + backdrop-filter renamed to x-unsupported-backdrop-filter in page and fixture CSS; CSS.supports() returns false for it',
      'no-tailwind': 'https://cdn.tailwindcss.com request fails',
      mobile: 'present path at 390x844',
      online: ONLINE ? 'OPTIONAL: real CDN (run with --online)' : 'not run (optional, use --online)',
    },
    stubs: 'images -> 1x1 PNG, fonts -> empty CSS',
  },
  summary: { total: results.length, passed: results.length - failed.length, failed: failed.length, fatal: fatal ? String(fatal.stack || fatal) : null },
  results,
};
await writeFile(join(EVIDENCE_DIR, `results-${label}.json`), JSON.stringify(report, null, 2)).catch(() => {});

for (const r of results) console.log(`${r.status === 'pass' ? 'PASS' : 'FAIL'}  ${r.name}${r.error ? `\n      ${r.error.split('\n')[0]}` : ''}`);
console.log(`\n${report.summary.passed}/${results.length} checks passed -> work/R60-T006/results-${label}.json`);
if (fatal) console.error('FATAL:', fatal);
process.exit(fatal || failed.length ? 1 : 0);
