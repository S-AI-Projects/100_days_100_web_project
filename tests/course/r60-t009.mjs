#!/usr/bin/env node
/**
 * R60-T009 — Motion and focus preferences for public/Stydy-Sync.
 *
 * Run from the repository root:
 *   npm --prefix tests/course ci                              # once
 *   npx --prefix tests/course playwright install chromium     # once, if needed
 *   node tests/course/r60-t009.mjs [--label=latest]
 *
 * The page is a static landing page (#p1 badge, #p2 headline, #p3 intro,
 * #p4 "Start Now" link). It has no keyframe animations, but it does move:
 * html { scroll-behavior: smooth }, 0.25–0.5s transitions, and hover
 * transforms (cards lift 6px, buttons 2–3px, hero image scales 1.03).
 *
 * In fresh Chromium contexts at 1280×800 and 390×844 this check asserts:
 *   - prefers-reduced-motion: reduce → no smooth scroll, near-zero
 *     transitions, no hover movement, and all information/controls still
 *     visible and usable;
 *   - prefers-reduced-motion: no-preference → the original motion is kept;
 *   - keyboard focus: every Tab stop (forward AND backward) shows a focus
 *     indicator with ≥ 3:1 contrast against what is behind it, and is not
 *     hidden under the sticky header;
 *   - the static layout of #p1–#p4 (order, columns/stacking, sizes).
 * Fails on any uncaught page error. Writes work/R60-T009/results-<label>.json
 * and exits 1 if any check failed. No permission/hardware feature is used.
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
const PAGE_PATH = '/public/Stydy-Sync/index.html';
const EVIDENCE_DIR = join(ROOT, 'work', 'R60-T009');
const label = (process.argv.find((a) => a.startsWith('--label=')) || '--label=latest').split('=')[1];
const WIDTHS = [{ width: 1280, height: 800 }, { width: 390, height: 844 }];

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png' };

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

/**
 * Describe the focus indicator of document.activeElement and whether it is
 * visible: Chromium's own ring ('auto') counts; otherwise an outline (≥2px) or
 * a box-shadow ring (≥2px spread) whose colour has ≥3:1 contrast with the
 * colour behind the element. Also reports whether the sticky header covers it.
 */
const FOCUS_PROBE = () => {
  const el = document.activeElement;
  const parse = (c) => { const m = (c.match(/[\d.]+/g) || [0, 0, 0, 0]).map(Number); return { r: m[0], g: m[1], b: m[2], a: m[3] === undefined ? 1 : m[3] }; };
  const over = (t, b) => ({ r: t.r * t.a + b.r * (1 - t.a), g: t.g * t.a + b.g * (1 - t.a), b: t.b * t.a + b.b * (1 - t.a), a: 1 });
  const lum = ({ r, g, b }) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
  // colour behind the element = its ancestors' backgrounds over white
  const chain = []; for (let n = el.parentElement; n; n = n.parentElement) chain.unshift(n);
  let behind = { r: 255, g: 255, b: 255, a: 1 };
  for (const n of chain) behind = over(parse(getComputedStyle(n).backgroundColor), behind);
  const cs = getComputedStyle(el);
  const outlineW = parseFloat(cs.outlineWidth) || 0;
  let ringContrast = 0; let kind = 'none';
  if (cs.outlineStyle === 'auto') { kind = 'browser-auto'; ringContrast = 21; }
  else if (cs.outlineStyle !== 'none' && outlineW >= 2) { kind = 'outline'; ringContrast = contrast(over(parse(cs.outlineColor), behind), behind); }
  if (cs.boxShadow && cs.boxShadow !== 'none') {
    // each shadow: "rgba(...) 0px 0px 0px 3px"; take rings with spread ≥ 2px
    for (const part of cs.boxShadow.split(/,(?![^()]*\))/)) {
      const color = (part.match(/rgba?\([^)]*\)/) || [''])[0];
      const nums = part.replace(color, '').trim().split(/\s+/).map(parseFloat);
      const spread = nums[3] || 0;
      if (color && spread >= 2) {
        const c = contrast(over(parse(color), behind), behind);
        if (c > ringContrast) { ringContrast = c; kind = 'box-shadow'; }
      }
    }
  }
  const r = el.getBoundingClientRect();
  const header = document.querySelector('header');
  const hb = header.getBoundingClientRect().bottom;
  const inHeader = header.contains(el);
  return {
    who: el.id ? `#${el.id}` : `${el.tagName.toLowerCase()}:${(el.textContent || el.getAttribute('placeholder') || '').trim().slice(0, 24)}`,
    focusVisible: el.matches(':focus-visible'),
    kind,
    ringContrast: Math.round(ringContrast * 100) / 100,
    coveredByStickyHeader: !inHeader && r.top < hb - 1,
    inViewport: r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth,
  };
};

/** Wait until any (smooth) scrolling has stopped, then for focus transitions (0.25s) to finish. */
async function settle(page) {
  let last = -1;
  for (let i = 0; i < 30; i++) {
    const y = await page.evaluate(() => window.scrollY);
    if (y === last) break;
    last = y;
    await page.waitForTimeout(60);
  }
  await page.waitForTimeout(300);
}

async function tabAll(page, key, max = 80) {
  const stops = [];
  for (let i = 0; i < max; i++) {
    await page.keyboard.press(key);
    await settle(page);
    const isBody = await page.evaluate(() => document.activeElement === document.body);
    if (isBody) break;
    const s = await page.evaluate(FOCUS_PROBE);
    if (stops.length && stops[0].who === s.who && i > 2) break; // wrapped
    stops.push(s);
  }
  return stops;
}
const badStops = (stops) => stops.filter((s) => !s.focusVisible || s.ringContrast < 3 || s.coveredByStickyHeader || !s.inViewport);

// ---------------------------------------------------------------- run
let server; let browser; let BASE; let chromiumVersion = 'n/a';
const pageErrors = [];

async function openPage(viewport, reducedMotion) {
  const context = await browser.newContext({ viewport, reducedMotion, colorScheme: 'light' });
  await context.route((url) => !url.href.startsWith(BASE), (route) => route.fulfill({ status: 200, contentType: 'text/css', body: '' })); // Font Awesome + Google Fonts
  context.on('weberror', (e) => pageErrors.push(`[${viewport.width}/${reducedMotion}] pageerror: ${e.error().message}`));
  context.on('console', (m) => { if (m.type() === 'error') pageErrors.push(`[${viewport.width}/${reducedMotion}] console.error: ${m.text()}`); });
  const page = await context.newPage();
  await page.goto(`${BASE}${PAGE_PATH}`, { waitUntil: 'load' });
  return { context, page };
}

const MOTION_SAMPLES = ['.card', '.s1', '.i1', '.khabar form button'];
const motionState = (page) => page.evaluate((sels) => ({
  scrollBehavior: getComputedStyle(document.documentElement).scrollBehavior,
  maxTransitionSeconds: Math.max(...sels.map((s) => {
    const el = document.querySelector(s); if (!el) return 0;
    return Math.max(...getComputedStyle(el).transitionDuration.split(',').map((d) => parseFloat(d) * (d.includes('ms') ? 0.001 : 1)));
  })),
  keyframeAnimations: [...document.querySelectorAll('*')].filter((e) => getComputedStyle(e).animationName !== 'none').length,
}), MOTION_SAMPLES);

async function hoverTransform(page, hoverSel, targetSel = hoverSel) {
  await page.locator(hoverSel).first().scrollIntoViewIfNeeded();
  await page.locator(hoverSel).first().hover();
  await page.waitForTimeout(700); // longer than any transition
  const t = await page.locator(targetSel).first().evaluate((el) => getComputedStyle(el).transform);
  await page.mouse.move(1, 1);
  return t;
}

async function main() {
  server = await startServer();
  BASE = `http://127.0.0.1:${server.address().port}`;
  await waitForReady(`${BASE}${PAGE_PATH}`);
  browser = await chromium.launch();
  chromiumVersion = browser.version();

  for (const vp of WIDTHS) {
    const W = vp.width;

    // ---------- reduced motion
    {
      const { context, page } = await openPage(vp, 'reduce');
      await check(`${W}-reduce-no-smooth-scroll-or-transitions`, { scrollBehavior: 'auto', maxTransitionSeconds: '<= 0.01', keyframeAnimations: 0 }, async () => {
        const m = await motionState(page);
        expectOk(m.scrollBehavior === 'auto' && m.maxTransitionSeconds <= 0.01 && m.keyframeAnimations === 0, `motion not reduced: ${JSON.stringify(m)}`, m);
        return m;
      });
      await check(`${W}-reduce-no-hover-movement`, { card: 'none', startNow: 'none', heroImage: 'none' }, async () => expectEqual({
        card: await hoverTransform(page, '.card'),
        startNow: await hoverTransform(page, '.s1'),
        heroImage: await hoverTransform(page, '.img-cont', '.i1'),
      }, { card: 'none', startNow: 'none', heroImage: 'none' }, 'elements still move on hover with reduced motion'));
      await check(`${W}-reduce-information-and-controls-usable`, 'all key content visible, opacity 1, controls enabled', async () => {
        const r = await page.evaluate(() => {
          const sels = ['#p1', '#p2', '#p3', '#p4', '#p5', '.card h4', '.review .name', '#name', '.khabar form button'];
          return sels.map((s) => {
            const el = document.querySelector(s); const cs = getComputedStyle(el); const b = el.getBoundingClientRect();
            return { s, visible: cs.display !== 'none' && cs.visibility !== 'hidden' && +cs.opacity === 1 && b.width > 0 && b.height > 0, disabled: !!el.disabled };
          });
        });
        const bad = r.filter((x) => !x.visible || x.disabled);
        return expectOk(bad.length === 0, `hidden/disabled with reduced motion: ${bad.map((x) => x.s).join(', ')}`, r) && r.length;
      });

      // keyboard focus (forward and backward)
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
      const forward = await tabAll(page, 'Tab');
      await check(`${W}-focus-visible-every-tab-stop-forward`, { stops: '> 5', invisibleOrHidden: [] }, async () => {
        const bad = badStops(forward);
        expectOk(forward.length > 5 && bad.length === 0, `focus not visible on: ${bad.map((b) => `${b.who} (${b.kind}, ${b.ringContrast}:1${b.coveredByStickyHeader ? ', under header' : ''})`).join('; ')}`, { stops: forward.length, bad });
        return { stops: forward.length, includesStartNow: forward.some((s) => s.who === '#p4'), includesEmail: forward.some((s) => s.who === '#name') };
      });
      await page.evaluate(() => { document.activeElement?.blur(); window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' }); });
      await page.waitForTimeout(100);
      const backward = await tabAll(page, 'Shift+Tab');
      await check(`${W}-focus-visible-every-tab-stop-backward`, { invisibleOrHidden: [] }, async () => {
        const bad = badStops(backward);
        expectOk(bad.length === 0, `focus hidden/invisible going backwards: ${bad.map((b) => `${b.who} (${b.kind}, ${b.ringContrast}:1${b.coveredByStickyHeader ? ', under sticky header' : ''})`).join('; ')}`, { stops: backward.length, bad });
        return { stops: backward.length };
      });

      // static layout of #p1–#p4
      await page.evaluate(() => { document.activeElement?.blur(); window.scrollTo({ top: 0, behavior: 'instant' }); });
      await check(`${W}-static-layout-p1-p4`, W > 900 ? 'p1 above p2 above p3 above p4; text left of image; #p2 57.6px' : 'p1 above p2 above p3 above p4; centred; image below text; #p2 32px', async () => {
        const L = await page.evaluate(() => {
          const r = (s) => document.querySelector(s).getBoundingClientRect();
          return {
            tops: ['#p1', '#p2', '#p3', '#p4'].map((s) => Math.round(r(s).top)),
            p2FontPx: parseFloat(getComputedStyle(document.querySelector('#p2')).fontSize),
            textRight: Math.round(r('.content .text').right), imageLeft: Math.round(r('.image').left),
            textBottom: Math.round(r('.content .text').bottom), imageTop: Math.round(r('.image').top),
            p2Centered: getComputedStyle(document.querySelector('.content')).textAlign === 'center',
            pageScrollWidth: document.documentElement.scrollWidth,
          };
        });
        const ordered = L.tops.every((t, i) => i === 0 || t > L.tops[i - 1]);
        const arranged = W > 900 ? L.textRight <= L.imageLeft && L.p2FontPx === 57.6 : L.textBottom <= L.imageTop && L.p2Centered && L.p2FontPx === 32;
        expectOk(ordered && arranged && L.pageScrollWidth <= W, `layout changed: ${JSON.stringify(L)}`, L);
        return L;
      });
      // Evidence: focus the email field by keyboard, then step back onto "Start Now" (#p4).
      await page.locator('#name').focus();
      await page.keyboard.press('Tab');
      await page.keyboard.press('Shift+Tab');
      await settle(page);
      await page.screenshot({ path: join(EVIDENCE_DIR, `focus-email-${W}-${label}.png`) }).catch(() => {});
      await page.evaluate(() => { document.activeElement?.blur(); window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' }); });
      await page.locator('#p5').focus();
      await page.keyboard.press('Shift+Tab');
      await settle(page);
      await page.screenshot({ path: join(EVIDENCE_DIR, `focus-startnow-backward-${W}-${label}.png`) }).catch(() => {});
      await context.close();
    }

    // ---------- no preference: motion kept
    {
      const { context, page } = await openPage(vp, 'no-preference');
      await check(`${W}-no-preference-motion-kept`, { scrollBehavior: 'smooth', maxTransitionSeconds: 0.5, cardHover: 'matrix(1, 0, 0, 1, 0, -6)' }, async () => {
        const m = await motionState(page);
        const cardHover = await hoverTransform(page, '.card');
        return expectEqual({ scrollBehavior: m.scrollBehavior, maxTransitionSeconds: m.maxTransitionSeconds, cardHover },
          { scrollBehavior: 'smooth', maxTransitionSeconds: 0.5, cardHover: 'matrix(1, 0, 0, 1, 0, -6)' }, 'default motion changed');
      });
      await context.close();
    }
  }

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
  task: 'R60-T009', label, page: PAGE_PATH, date: new Date().toISOString(),
  tools: { node: process.version, playwright: (await import('playwright/package.json', { with: { type: 'json' } })).default.version, chromium: chromiumVersion, os: `${os.type()} ${os.release()}` },
  inputs: {
    viewports: WIDTHS.map((v) => `${v.width}x${v.height}`),
    reducedMotion: ['reduce', 'no-preference'],
    keyboard: 'Tab through all stops from the top; Shift+Tab through all stops from the bottom',
    focusRule: ':focus-visible and (browser auto ring, or outline/box-shadow ring ≥2px with ≥3:1 contrast vs the colour behind) and not under the sticky header',
    stubs: 'Font Awesome and Google Fonts CSS → empty (offline)',
  },
  summary: { total: results.length, passed: results.length - failed.length, failed: failed.length, fatal: fatal ? String(fatal.stack || fatal) : null },
  results,
};
await writeFile(join(EVIDENCE_DIR, `results-${label}.json`), JSON.stringify(report, null, 2)).catch(() => {});

for (const r of results) console.log(`${r.status === 'pass' ? 'PASS' : 'FAIL'}  ${r.name}${r.error ? `\n      ${r.error.split('\n')[0]}` : ''}`);
console.log(`\n${report.summary.passed}/${results.length} checks passed -> work/R60-T009/results-${label}.json`);
if (fatal) console.error('FATAL:', fatal);
process.exit(fatal || failed.length ? 1 : 0);
