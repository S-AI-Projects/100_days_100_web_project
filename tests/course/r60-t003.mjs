#!/usr/bin/env node
/**
 * R60-T003 — Empty / error-state regression for public/Escape_Room.
 *
 * Run from the repository root:
 *   npm --prefix tests/course ci                              # once
 *   npx --prefix tests/course playwright install chromium     # once, if needed
 *   node tests/course/r60-t003.mjs [--label=latest]
 *
 * The page is a static game: the whole lab scene is one background image
 * (images/image.png) with invisible clue buttons placed on top, and it uses two
 * Google Fonts. So, as the task asks for static examples, the fixtures are
 * failed assets, plus the one "empty result" the page has (an empty command):
 *
 *   Fixture A  "assets-missing": images/image.png answers 404 and the Google
 *              Fonts requests fail. Expect a dark readable backdrop, a visible
 *              status message, outlined + labelled clue locations, readable
 *              timer/TERMINAL text, and the game still playable.
 *   Fixture A2 "empty-command": pressing Enter on an empty terminal prompt.
 *              Expect a "no command" message (not "access denied"), then a
 *              valid code (98770) recovers and unlocks the next clue.
 *   Fixture B  "assets-restored": the image is served normally. Expect no
 *              fallback message/outlines and the scene image in use.
 *
 * Timers run on Playwright's fake clock (no 20s typewriter wait). The check
 * fails on any uncaught page error; the browser's own "Failed to load
 * resource" console line for the deliberately failed fixture URLs is expected
 * and is the only console error ignored. Exit code 1 if any check fails.
 * No permission-gated or hardware feature is used by the page.
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
const PAGE_PATH = '/public/Escape_Room/index.html';
const SCENE_IMAGE = '/public/Escape_Room/images/image.png';
const EVIDENCE_DIR = join(ROOT, 'work', 'R60-T003');
const label = (process.argv.find((a) => a.startsWith('--label=')) || '--label=latest').split('=')[1];
const VIEWPORT = { width: 1280, height: 800 };

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.json': 'application/json',
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

/**
 * WCAG contrast of an element's text against the colour actually behind it,
 * found by compositing every ancestor's background-colour over the body's
 * (white if the body is transparent). Background images are ignored, which is
 * exactly the "image failed to load" situation this check is about.
 */
const contrastOf = (page, selector) => page.evaluate((sel) => {
  const parse = (c) => { const m = c.match(/[\d.]+/g) || [0, 0, 0, 0]; return { r: +m[0], g: +m[1], b: +m[2], a: m[3] === undefined ? 1 : +m[3] }; };
  const over = (top, bot) => ({ r: top.r * top.a + bot.r * (1 - top.a), g: top.g * top.a + bot.g * (1 - top.a), b: top.b * top.a + bot.b * (1 - top.a), a: 1 });
  const lum = ({ r, g, b }) => {
    const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const el = document.querySelector(sel);
  const chain = [];
  for (let n = el; n && n !== document.documentElement; n = n.parentElement) chain.unshift(n);
  let bg = { r: 255, g: 255, b: 255, a: 1 }; // browser canvas
  for (const n of chain) bg = over(parse(getComputedStyle(n).backgroundColor), bg);
  const fg = over(parse(getComputedStyle(el).color), bg);
  const [L1, L2] = [lum(fg), lum(bg)].sort((a, b) => b - a);
  return { ratio: Math.round(((L1 + 0.05) / (L2 + 0.05)) * 100) / 100, fg: getComputedStyle(el).color, bg: `rgb(${Math.round(bg.r)}, ${Math.round(bg.g)}, ${Math.round(bg.b)})` };
}, selector);

const isShown = (page, selector) => page.evaluate((sel) => {
  const el = document.querySelector(sel);
  if (!el) return false;
  const cs = getComputedStyle(el); const r = el.getBoundingClientRect();
  return cs.display !== 'none' && cs.visibility !== 'hidden' && +cs.opacity > 0 && r.width > 0 && r.height > 0;
}, selector);

// ---------------------------------------------------------------- run
let server; let browser; let BASE; let chromiumVersion = 'n/a';
const pageErrors = [];

async function openGame({ imageMissing }) {
  const context = await browser.newContext({ viewport: VIEWPORT, reducedMotion: 'reduce' });
  const tag = imageMissing ? 'assets-missing' : 'assets-restored';
  context.on('weberror', (e) => pageErrors.push(`[${tag}] pageerror: ${e.error().message}`));
  context.on('console', (m) => {
    if (m.type() !== 'error') return;
    if (/Failed to load resource/.test(m.text())) return; // the fixture's own 404 / blocked font
    pageErrors.push(`[${tag}] console.error: ${m.text()}`);
  });
  // Fonts: fail them in fixture A, serve empty CSS in fixture B (offline + deterministic).
  await context.route(/fonts\.(googleapis|gstatic)\.com/, (route) => (imageMissing
    ? route.abort('failed')
    : route.fulfill({ status: 200, contentType: 'text/css', body: '' })));
  if (imageMissing) {
    await context.route((url) => url.pathname === SCENE_IMAGE, (route) => route.fulfill({ status: 404, body: 'missing' }));
  }
  context.on('dialog', (d) => d.dismiss()); // the game uses alert() on win / time-up
  const page = await context.newPage();
  await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') });
  await page.goto(`${BASE}${PAGE_PATH}`, { waitUntil: 'load' });
  await page.clock.runFor(200);
  return { context, page };
}

/** Open the terminal and let the typewriter finish (fake clock). */
async function openTerminal(page) {
  await page.locator('.b2').click();
  await page.clock.runFor(30_000);
  await page.locator('.answer').waitFor({ state: 'visible', timeout: 2000 });
}

async function submit(page, text) {
  const input = page.locator('.answer');
  await input.fill(text);
  await input.press('Enter');
  return page.evaluate(() => {
    const msgs = [...document.querySelectorAll('.content > div')];
    return msgs.length ? msgs[msgs.length - 1].innerText.trim() : '';
  });
}

async function main() {
  server = await startServer();
  BASE = `http://127.0.0.1:${server.address().port}`;
  await waitForReady(`${BASE}${PAGE_PATH}`);
  browser = await chromium.launch();
  chromiumVersion = browser.version();

  // ===================== Fixture A: scene image 404 + fonts fail
  {
    const { context, page } = await openGame({ imageMissing: true });

    await check('A-backdrop-is-dark-not-blank', { bodyBackgroundIsDark: true }, async () => {
      const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
      const m = bg.match(/[\d.]+/g).map(Number);
      const dark = (m[3] === undefined || m[3] > 0.9) && m[0] + m[1] + m[2] < 120;
      return expectOk(dark, `body background-color is ${bg} (white page shows through when the image is missing)`, { bodyBackgroundColor: bg, bodyBackgroundIsDark: dark });
    });

    await check('A-status-message-explains-missing-image', { visible: true, mentionsImage: true, role: 'status' }, async () => {
      const s = await page.evaluate(() => {
        const el = document.querySelector('[role="status"]');
        return el ? { text: el.innerText.trim(), role: el.getAttribute('role') } : null;
      });
      const visible = s ? await isShown(page, '[role="status"]') : false;
      const actual = { visible, mentionsImage: !!s && /image/i.test(s.text), role: s?.role ?? null, text: s?.text ?? null };
      expectOk(actual.visible && actual.mentionsImage, 'no visible status message about the missing scene image', actual);
      return actual;
    });

    await check('A-intro-text-readable', { headingContrastAtLeast: 4.5, startButtonVisible: true }, async () => {
      const heading = await contrastOf(page, '.heading');
      const startVisible = await isShown(page, '.b1');
      const actual = { heading, startButtonVisible: startVisible };
      expectOk(heading.ratio >= 4.5 && startVisible, 'intro heading unreadable or START hidden', actual);
      return actual;
    });

    await check('A-heading-uses-readable-fallback-font', { webFontLoaded: false, fitsContainer: true }, async () => {
      const r = await page.evaluate(() => {
        const h = document.querySelector('.heading'); const c = document.querySelector('.container');
        return {
          webFontLoaded: [...document.fonts].some((f) => /Orbitron/.test(f.family) && f.status === 'loaded'),
          family: getComputedStyle(h).fontFamily,
          fitsContainer: h.getBoundingClientRect().right <= c.getBoundingClientRect().right + 1 && h.scrollWidth <= h.clientWidth + 1,
          textWidth: Math.round(h.getBoundingClientRect().width),
        };
      });
      return expectEqual({ webFontLoaded: r.webFontLoaded, fitsContainer: r.fitsContainer }, { webFontLoaded: false, fitsContainer: true }, `fallback font layout: ${JSON.stringify(r)}`) && r;
    });

    await page.locator('.b1').click();
    await page.clock.runFor(1500);

    await check('A-timer-and-terminal-button-readable', { minContrast: 4.5 }, async () => {
      const timer = await contrastOf(page, '.timer');
      const terminalBtn = await contrastOf(page, '.b2');
      const actual = { timer, terminalBtn };
      expectOk(timer.ratio >= 4.5 && terminalBtn.ratio >= 4.5, `timer ${timer.ratio}:1, TERMINAL ${terminalBtn.ratio}:1 against ${timer.bg}`, actual);
      return actual;
    });

    await check('A-first-clue-location-outlined-and-labelled', { visible: true, outlined: true, minSize: 24, labelShown: true }, async () => {
      const r = await page.evaluate(() => {
        const el = document.querySelector('.hotspot.document');
        const cs = getComputedStyle(el); const b = el.getBoundingClientRect();
        const border = (cs.borderTopColor.match(/[\d.]+/g) || []).map(Number);
        const after = getComputedStyle(el, '::after').content;
        return {
          display: cs.display, w: Math.round(b.width), h: Math.round(b.height),
          borderAlpha: border[3] === undefined ? 1 : border[3], borderWidth: parseFloat(cs.borderTopWidth),
          label: after && after !== 'none' && after !== 'normal' ? after.replace(/^"|"$/g, '') : '',
        };
      });
      const actual = { visible: r.display !== 'none', outlined: r.borderAlpha >= 0.6 && r.borderWidth >= 1, minSize: Math.min(r.w, r.h), labelShown: /document/i.test(r.label), raw: r };
      expectOk(actual.visible && actual.outlined && actual.minSize >= 24 && actual.labelShown, `clue location not findable without the scene image: ${JSON.stringify(r)}`, actual);
      return actual;
    });

    await openTerminal(page);

    await check('A2-empty-command-shows-empty-state', { message: '> NO COMMAND ENTERED…', notAccessDenied: true }, async () => {
      const msg = await submit(page, '   ');
      const actual = { message: msg, notAccessDenied: !/ACCESS DENIED/.test(msg) };
      expectOk(/NO COMMAND ENTERED/.test(msg) && actual.notAccessDenied, `empty command answered with: "${msg}"`, actual);
      return actual;
    });

    await check('A2-valid-code-recovers', { message: 'ACCESS GRANTED…', pcHotspotShown: true }, async () => {
      const msg = await submit(page, '98770');
      const pcShown = await page.evaluate(() => getComputedStyle(document.querySelector('.hotspot.pc')).display !== 'none');
      const actual = { message: msg, pcHotspotShown: pcShown };
      expectOk(/ACCESS GRANTED/.test(msg) && pcShown, 'valid code did not unlock the next clue', actual);
      return actual;
    });

    await page.locator('.b3').click();
    await page.screenshot({ path: join(EVIDENCE_DIR, `assets-missing-${label}.png`) }).catch(() => {});
    await context.close();
  }

  // ===================== Fixture B: assets restored
  {
    const { context, page } = await openGame({ imageMissing: false });
    await page.clock.runFor(500);

    await check('B-restored-scene-image-in-use-no-fallback', { imageLoaded: true, statusMessage: null, fallbackClass: false }, async () => {
      const r = await page.evaluate(async (src) => {
        const img = new Image(); img.src = src;
        try { await img.decode(); } catch { /* not loaded */ }
        return {
          imageLoaded: img.naturalWidth > 0,
          bodyBackgroundImage: getComputedStyle(document.body).backgroundImage.includes('images/image.png'),
          statusMessage: document.querySelector('[role="status"]')?.innerText.trim() || null,
          fallbackClass: document.body.classList.contains('scene-missing'),
        };
      }, SCENE_IMAGE);
      expectOk(r.bodyBackgroundImage, 'scene image no longer set on body', r);
      return expectEqual({ imageLoaded: r.imageLoaded, statusMessage: r.statusMessage, fallbackClass: r.fallbackClass },
        { imageLoaded: true, statusMessage: null, fallbackClass: false }, 'fallback shown although the image loaded') && r;
    });

    await page.locator('.b1').click();
    await page.clock.runFor(1500);
    await check('B-restored-clue-locations-stay-hidden-puzzle', { documentOutlineAlphaBelow: 0.6, label: '' }, async () => {
      // The pulse hint on the first clue is part of the original game; the fallback outline must not be.
      const r = await page.evaluate(() => {
        const el = document.querySelector('.hotspot.document');
        const after = getComputedStyle(el, '::after').content;
        const border = (getComputedStyle(el).borderTopColor.match(/[\d.]+/g) || []).map(Number);
        return { borderAlpha: border[3] === undefined ? 1 : border[3], label: after && after !== 'none' && after !== 'normal' ? after : '' };
      });
      expectOk(r.borderAlpha < 0.6 && r.label === '', 'fallback outlines/labels leak into the normal game', r);
      return r;
    });

    await openTerminal(page);
    await check('B-restored-empty-then-valid-command', { empty: 'NO COMMAND ENTERED', valid: 'ACCESS GRANTED' }, async () => {
      const empty = await submit(page, '');
      const valid = await submit(page, '98770');
      const actual = { empty, valid };
      expectOk(/NO COMMAND ENTERED/.test(empty) && /ACCESS GRANTED/.test(valid), 'empty/valid command handling differs with assets restored', actual);
      return actual;
    });

    await page.locator('.b3').click();
    await page.screenshot({ path: join(EVIDENCE_DIR, `assets-restored-${label}.png`) }).catch(() => {});
    await context.close();
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
  task: 'R60-T003', label, page: PAGE_PATH, date: new Date().toISOString(),
  tools: { node: process.version, playwright: (await import('playwright/package.json', { with: { type: 'json' } })).default.version, chromium: chromiumVersion, os: `${os.type()} ${os.release()}` },
  inputs: {
    viewport: `${VIEWPORT.width}x${VIEWPORT.height}`,
    fixtures: {
      'assets-missing': `${SCENE_IMAGE} -> HTTP 404; fonts.googleapis.com / fonts.gstatic.com -> request failed`,
      'empty-command': 'Enter on a blank terminal prompt, then "98770"',
      'assets-restored': 'scene image served from disk; fonts -> empty CSS (offline)',
    },
    clock: 'Playwright fake clock (typewriter fast-forwarded 30s)',
  },
  summary: { total: results.length, passed: results.length - failed.length, failed: failed.length, fatal: fatal ? String(fatal.stack || fatal) : null },
  results,
};
await writeFile(join(EVIDENCE_DIR, `results-${label}.json`), JSON.stringify(report, null, 2)).catch(() => {});

for (const r of results) console.log(`${r.status === 'pass' ? 'PASS' : 'FAIL'}  ${r.name}${r.error ? `\n      ${r.error.split('\n')[0]}` : ''}`);
console.log(`\n${report.summary.passed}/${results.length} checks passed -> work/R60-T003/results-${label}.json`);
if (fatal) console.error('FATAL:', fatal);
process.exit(fatal || failed.length ? 1 : 0);
