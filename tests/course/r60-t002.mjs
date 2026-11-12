#!/usr/bin/env node
/**
 * R60-T002 — Responsive-layout regression for public/hft-liquidity-sandbox.
 *
 * Run from the repository root:
 *   npm --prefix tests/course ci                              # once
 *   npx --prefix tests/course playwright install chromium     # once, if needed
 *   node tests/course/r60-t002.mjs [--label=latest]
 *
 * What it does
 *   1. Starts a local static HTTP server (no extra dependency) and waits until
 *      the page answers 200.
 *   2. For 360x800 and 1280x800, opens the page in a fresh Chromium context.
 *      Math.random is seeded and timers run on Playwright's fake clock, so the
 *      order-book simulation is deterministic.
 *   3. Asserts on the rendered DOM and computed layout: one copy of the page,
 *      no unintended horizontal overflow, the four metrics
 *      (#lastPriceMetric, #spreadMetric, #depthMetric, #latencyMetric) and the
 *      controls text are visible and not clipped, the canvas is usable and
 *      reacts to a click, content order is sensible, and both widths show the
 *      same content.
 *   4. Fails on any uncaught page error or console.error.
 *   5. Writes expected-vs-actual results, inputs and tool versions to
 *      work/R60-T002/results-<label>.json (+ screenshots) and exits 1 if any
 *      check failed.
 *
 * The page uses no permission-gated or hardware feature, so nothing needs a
 * device stub.
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
const PAGE_PATH = '/public/hft-liquidity-sandbox/index.html';
const EVIDENCE_DIR = join(ROOT, 'work', 'R60-T002');
const label = (process.argv.find((a) => a.startsWith('--label=')) || '--label=latest').split('=')[1];
const WIDTHS = [
  { width: 360, height: 800 },
  { width: 1280, height: 800 },
];
const METRICS = ['lastPriceMetric', 'spreadMetric', 'depthMetric', 'latencyMetric'];

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml',
};

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

/** Seeded Math.random (mulberry32) so the simulated order book is the same every run. */
const SEED_SCRIPT = `(() => {
  let a = 0x2f6b1c3d;
  Math.random = function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
})();`;

/** Is the element (or its descendant) the thing actually painted at a point, i.e. not clipped or covered? */
const visibleAt = (page, selector, fx = 0.5, fy = 0.5) => page.evaluate(([sel, fx, fy]) => {
  const el = document.querySelector(sel);
  el.scrollIntoView({ block: 'center', inline: 'nearest' });
  const r = el.getBoundingClientRect();
  const x = r.left + r.width * fx; const y = r.top + r.height * fy;
  const hit = document.elementFromPoint(x, y);
  return {
    rect: [Math.round(r.left), Math.round(r.top), Math.round(r.right), Math.round(r.bottom)],
    insideViewport: r.left >= -1 && r.right <= innerWidth + 1 && r.top >= -1 && r.bottom <= innerHeight + 1,
    painted: !!hit && (hit === el || el.contains(hit)),
    textFits: el.scrollWidth <= el.clientWidth + 1,
  };
}, [selector, fx, fy]);

// ---------------------------------------------------------------- run
let server; let browser; let BASE; let chromiumVersion = 'n/a';
const pageErrors = [];
const visibleTextByWidth = {};

async function runWidth(vp) {
  const W = vp.width;
  const context = await browser.newContext({ viewport: vp, reducedMotion: 'reduce' });
  await context.addInitScript(SEED_SCRIPT);
  context.on('weberror', (e) => pageErrors.push(`[${W}] pageerror: ${e.error().message}`));
  context.on('console', (m) => { if (m.type() === 'error') pageErrors.push(`[${W}] console.error: ${m.text()}`); });
  const page = await context.newPage();
  await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') });
  await page.goto(`${BASE}${PAGE_PATH}`, { waitUntil: 'load' });
  await page.clock.runFor(500); // let the simulation tick and draw a few frames

  await check(`${W}-single-copy-of-page`, { containers: 1, canvases: 1, ids: [1, 1, 1, 1] }, async () => {
    const actual = await page.evaluate((ids) => ({
      containers: document.querySelectorAll('.terminal-container').length,
      canvases: document.querySelectorAll('canvas').length,
      ids: ids.map((id) => document.querySelectorAll(`#${id}`).length),
    }), METRICS);
    return expectEqual(actual, { containers: 1, canvases: 1, ids: [1, 1, 1, 1] }, 'page content is duplicated');
  });

  await check(`${W}-no-unintended-horizontal-overflow`, { pageScrollWidth: W, outside: [] }, async () => {
    const actual = await page.evaluate(() => {
      // An element inside a labelled, horizontally scrollable region is an intentional scroller.
      const inIntentionalScroller = (el) => {
        for (let p = el.parentElement; p; p = p.parentElement) {
          const ox = getComputedStyle(p).overflowX;
          if ((ox === 'auto' || ox === 'scroll') && (p.getAttribute('aria-label') || p.getAttribute('aria-labelledby'))) return true;
        }
        return false;
      };
      const outside = [...document.body.querySelectorAll('*')]
        .filter((el) => {
          const r = el.getBoundingClientRect();
          if (r.width === 0 || r.height === 0) return false;
          return (r.left < -1 || r.right > innerWidth + 1) && !inIntentionalScroller(el);
        })
        .map((el) => `${el.tagName.toLowerCase()}${el.id ? '#' + el.id : el.className ? '.' + String(el.className).split(' ')[0] : ''}`);
      return { pageScrollWidth: document.documentElement.scrollWidth, outside: [...new Set(outside)].slice(0, 12) };
    });
    return expectEqual(actual, { pageScrollWidth: W, outside: [] }, 'content is wider than the screen');
  });

  for (const id of METRICS) {
    await check(`${W}-metric-${id}-visible-not-clipped`, { insideViewport: true, painted: true, textFits: true }, async () => {
      const v = await visibleAt(page, `#${id}`);
      expectEqual({ insideViewport: v.insideViewport, painted: v.painted, textFits: v.textFits },
        { insideViewport: true, painted: true, textFits: true }, `#${id} at ${JSON.stringify(v.rect)}`);
      return v;
    });
  }

  await check(`${W}-controls-text-visible-not-clipped`, { top: true, bottom: true, noMarkdownStars: true }, async () => {
    const top = await visibleAt(page, '.instruction-pad h3');
    const bottom = await visibleAt(page, '.instruction-pad p', 0.2, 0.9);
    const noMarkdownStars = !(await page.locator('.instruction-pad').first().innerText()).includes('**');
    const actual = { top: top.painted && top.insideViewport, bottom: bottom.painted && bottom.insideViewport, noMarkdownStars };
    return expectEqual(actual, { top: true, bottom: true, noMarkdownStars: true }, `controls text clipped or raw markdown (${JSON.stringify({ top, bottom })})`);
  });

  const minCanvas = W < 700 ? { w: W - 60, h: 280 } : { w: 600, h: 500 };
  await check(`${W}-canvas-usable-and-drawn`, { minWidth: minCanvas.w, minHeight: minCanvas.h, bufferMatchesCss: true, drawn: true }, async () => {
    await page.locator('#tradingCanvas').first().scrollIntoViewIfNeeded();
    const c = await page.evaluate(() => {
      const cv = document.getElementById('tradingCanvas');
      const r = cv.getBoundingClientRect();
      const css = { w: Math.round(r.width), h: Math.round(r.height) };
      // Count pixels that are clearly not the dark background (depth shading / text).
      let lit = 0;
      try {
        const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data;
        for (let i = 0; i < d.length; i += 4 * 97) if (d[i + 3] > 0 && d[i] + d[i + 1] + d[i + 2] > 60) lit++;
      } catch { lit = -1; }
      return { css, buffer: { w: cv.width, h: cv.height }, lit };
    });
    const actual = {
      css: c.css, buffer: c.buffer, lit: c.lit,
      bufferMatchesCss: Math.abs(c.css.w - c.buffer.w) <= 3 && Math.abs(c.css.h - c.buffer.h) <= 3,
      drawn: c.lit > 20,
    };
    expectOk(c.css.w >= minCanvas.w && c.css.h >= minCanvas.h && actual.bufferMatchesCss && actual.drawn,
      `canvas too small, stretched or blank: ${JSON.stringify(actual)}`, actual);
    return actual;
  });

  await check(`${W}-canvas-click-adds-liquidity`, { depthIncreaseAtLeast: 150 }, async () => {
    const box = await page.locator('#tradingCanvas').first().boundingBox();
    const before = await page.evaluate(() => parseInt(document.getElementById('depthMetric').textContent, 10));
    await page.mouse.click(box.x + box.width / 2, box.y + box.height * 0.25); // upper half -> sell wall
    await page.clock.runFor(32); // two animation frames, no simulator tick (100ms interval)
    const after = await page.evaluate(() => parseInt(document.getElementById('depthMetric').textContent, 10));
    const actual = { before, after, increase: after - before };
    expectOk(Number.isFinite(before) && after - before >= 150 && after - before <= 160, `click did not add the 150-lot wall: ${JSON.stringify(actual)}`, actual);
    return actual;
  });

  await check(`${W}-content-order`, W < 700 ? 'metrics in order, stacked above the chart' : 'metrics in order, sidebar left of the chart', async () => {
    const o = await page.evaluate((ids) => {
      window.scrollTo(0, 0);
      const r = (el) => el.getBoundingClientRect();
      const panel = r(document.querySelector('.telemetry-panel'));
      const canvas = r(document.getElementById('tradingCanvas'));
      const tops = ids.map((id) => Math.round(r(document.getElementById(id)).top));
      return { panel: [Math.round(panel.left), Math.round(panel.top), Math.round(panel.right), Math.round(panel.bottom)],
        canvas: [Math.round(canvas.left), Math.round(canvas.top), Math.round(canvas.right), Math.round(canvas.bottom)], tops };
    }, METRICS);
    const inOrder = o.tops.every((t, i) => i === 0 || t > o.tops[i - 1]);
    const arranged = W < 700 ? o.panel[3] <= o.canvas[1] : o.panel[2] <= o.canvas[0] && o.canvas[1] < 200;
    expectOk(inOrder && arranged, `unexpected order/arrangement: ${JSON.stringify(o)}`, o);
    return o;
  });

  visibleTextByWidth[W] = await page.evaluate(() => [...document.querySelectorAll('h2, h3, .metric-box .label, .viewport-header .title-text')]
    .map((e) => e.textContent.trim()));

  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: join(EVIDENCE_DIR, `layout-${W}-${label}.png`), fullPage: true }).catch(() => {});
  await context.close();
}

async function main() {
  server = await startServer();
  BASE = `http://127.0.0.1:${server.address().port}`;
  await waitForReady(`${BASE}${PAGE_PATH}`);
  browser = await chromium.launch();
  chromiumVersion = browser.version();

  for (const vp of WIDTHS) await runWidth(vp);

  await check('same-content-at-both-widths', 'identical headings and labels', async () => {
    const [a, b] = WIDTHS.map((vp) => visibleTextByWidth[vp.width]);
    expectEqual(a, b, 'the two widths show different content');
    return a;
  });

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
  task: 'R60-T002', label, page: PAGE_PATH, date: new Date().toISOString(),
  tools: { node: process.version, playwright: (await import('playwright/package.json', { with: { type: 'json' } })).default.version, chromium: chromiumVersion, os: `${os.type()} ${os.release()}` },
  inputs: { viewports: WIDTHS.map((v) => `${v.width}x${v.height}`), reducedMotion: 'reduce', randomSeed: '0x2f6b1c3d (mulberry32)', clock: 'Playwright fake clock, 500ms run before checks', click: 'canvas centre-x, 25% height' },
  summary: { total: results.length, passed: results.length - failed.length, failed: failed.length, fatal: fatal ? String(fatal.stack || fatal) : null },
  results,
};
await writeFile(join(EVIDENCE_DIR, `results-${label}.json`), JSON.stringify(report, null, 2)).catch(() => {});

for (const r of results) console.log(`${r.status === 'pass' ? 'PASS' : 'FAIL'}  ${r.name}${r.error ? `\n      ${r.error.split('\n')[0]}` : ''}`);
console.log(`\n${report.summary.passed}/${results.length} checks passed -> work/R60-T002/results-${label}.json`);
if (fatal) console.error('FATAL:', fatal);
process.exit(fatal || failed.length ? 1 : 0);
