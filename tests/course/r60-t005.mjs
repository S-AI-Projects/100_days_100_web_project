#!/usr/bin/env node
/**
 * R60-T005 — Deterministic browser regression for public/password_generator_pro.
 *
 * Run from the repository root:
 *   npm --prefix tests/course ci                              # once
 *   npx --prefix tests/course playwright install chromium     # once, if needed
 *   node tests/course/r60-t005.mjs [--label=latest]
 *
 * Everything that could differ between runs or machines is replaced by an
 * explicit local fixture:
 *   - randomness: crypto.getRandomValues and Math.random -> seeded generator
 *     (mulberry32, seed 0x5eed1234), so generated passwords are known exactly;
 *   - clock: Date fixed at 2026-01-01T00:00:00Z (timers still run);
 *   - network: every non-local request is blocked and recorded (none needed);
 *   - fonts: no web font is loaded (the page names "Inter" but never loads it),
 *     so text uses the local sans-serif fallback in every context;
 *   - viewport 1280x800, deviceScaleFactor 1, colorScheme dark, locale en-US,
 *     timezone UTC, reduced motion;
 *   - clipboard (needs a permission): navigator.clipboard.writeText is stubbed
 *     to record the text, or to reject for the "denied" case.
 *
 * The same scripted session runs in two fresh browser contexts and their
 * asserted DOM state must be identical. A control run WITHOUT the randomness
 * fixture shows two contexts would otherwise differ. Exit code 1 on any failed
 * check or unexpected page error.
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
const PAGE_PATH = '/public/password_generator_pro/index.html';
const EVIDENCE_DIR = join(ROOT, 'work', 'R60-T005');
const label = (process.argv.find((a) => a.startsWith('--label=')) || '--label=latest').split('=')[1];

const CONTEXT_OPTIONS = {
  viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1, colorScheme: 'dark',
  locale: 'en-US', timezoneId: 'UTC', reducedMotion: 'reduce',
};
const SEED = 0x5eed1234;
const FIXED_TIME = new Date('2026-01-01T00:00:00Z');

// Exact passwords the page must produce with the seeded generator (same seed per context).
// Worked out independently by running the page's algorithm in Node with the same seed.
const EXPECTED = {
  defaultLower10: 'kgvqcgoegs',
  upperLowerNumbers16: '2YCYrtkTpjBoY4aN',
};

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css',
  '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json',
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

/** Fixture: seeded crypto.getRandomValues + Math.random. */
const RANDOM_FIXTURE = (seed) => `(() => {
  let a = ${seed} >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return (t ^ (t >>> 14)) >>> 0;
  };
  const fill = function (arr) {
    for (let i = 0; i < arr.length; i++) arr[i] = next() % (2 ** (8 * arr.BYTES_PER_ELEMENT));
    return arr;
  };
  Object.defineProperty(Crypto.prototype, 'getRandomValues', { value: fill, configurable: true });
  Math.random = () => next() / 4294967296;
})();`;

/** Fixture: clipboard stub. mode = 'allow' records text, 'deny' rejects like a refused permission. */
const CLIPBOARD_FIXTURE = (mode) => `(() => {
  window.__copied = [];
  const clip = {
    writeText(text) {
      if (${JSON.stringify(mode)} === 'deny') return Promise.reject(new DOMException('Write permission denied.', 'NotAllowedError'));
      window.__copied.push(String(text));
      return Promise.resolve();
    },
  };
  Object.defineProperty(Navigator.prototype, 'clipboard', { get: () => clip, configurable: true });
})();`;

/** The asserted DOM state: values and computed layout that matter to a user. */
const snapshot = (page) => page.evaluate(() => {
  const q = (s) => document.querySelector(s);
  const ind = q('[data-indicator]');
  const bar = q('.bar');
  return {
    password: q('[data-passworddisplay]').value,
    lengthLabel: q('[data-lengthnumber]').textContent.trim(),
    slider: q('[data-lengthslider]').value,
    checked: ['uppercase', 'lowercase', 'numbers', 'symbols'].filter((id) => document.getElementById(id).checked),
    strength: q('[data-strengthtext]').textContent.trim(),
    indicatorPercent: Math.round((ind.getBoundingClientRect().width / bar.getBoundingClientRect().width) * 100),
    indicatorColor: getComputedStyle(ind).backgroundColor,
    lightTheme: document.body.classList.contains('light'),
    bodyBackground: getComputedStyle(document.body).backgroundColor,
    themeIcon: q('#themeToggle').textContent.trim(),
    cardWidth: Math.round(q('.card').getBoundingClientRect().width),
  };
});

async function setLength(page, n) {
  await page.locator('[data-lengthslider]').fill(String(n)); // fires input + change
}
async function setOptions(page, wanted) {
  for (const id of ['uppercase', 'lowercase', 'numbers', 'symbols']) {
    await page.locator(`#${id}`).setChecked(wanted.includes(id));
  }
}

// ---------------------------------------------------------------- run
let server; let browser; let BASE; let chromiumVersion = 'n/a';
const pageErrors = [];
const externalRequests = [];

async function newPage(tag, { seeded = true, clipboard = 'allow' } = {}) {
  const context = await browser.newContext(CONTEXT_OPTIONS);
  if (seeded) await context.addInitScript(RANDOM_FIXTURE(SEED));
  await context.addInitScript(CLIPBOARD_FIXTURE(clipboard));
  await context.route((url) => !url.href.startsWith(BASE), (route) => {
    externalRequests.push(`[${tag}] ${route.request().url()}`);
    return route.abort('blockedbyclient');
  });
  context.on('weberror', (e) => pageErrors.push(`[${tag}] pageerror: ${e.error().message}`));
  context.on('console', (m) => { if (m.type() === 'error') pageErrors.push(`[${tag}] console.error: ${m.text()}`); });
  const page = await context.newPage();
  await page.clock.setFixedTime(FIXED_TIME);
  await page.goto(`${BASE}${PAGE_PATH}`, { waitUntil: 'load' });
  return { context, page };
}

/** The scripted session run identically in both fresh contexts. */
async function session(tag) {
  const { context, page } = await newPage(tag);
  const states = {};
  states.initial = await snapshot(page);
  await page.locator('.generateButton').click();
  await page.waitForTimeout(400); // indicator transition (0.3s)
  states.defaultLower10 = await snapshot(page);
  await setOptions(page, ['uppercase', 'lowercase', 'numbers']);
  await setLength(page, 16);
  await page.locator('.generateButton').click();
  await page.waitForTimeout(400);
  states.upperLowerNumbers16 = await snapshot(page);
  await page.locator('#themeToggle').click();
  states.afterThemeToggle = await snapshot(page);
  if (tag === 'contextA') await page.screenshot({ path: join(EVIDENCE_DIR, `theme-clicked-${label}.png`) }).catch(() => {});
  await page.locator('#themeToggle').click();
  states.afterSecondThemeToggle = await snapshot(page);
  await setOptions(page, []);
  await page.locator('.generateButton').click();
  await page.waitForTimeout(400);
  states.noOptions = await snapshot(page);
  await context.close();
  return states;
}

async function main() {
  server = await startServer();
  BASE = `http://127.0.0.1:${server.address().port}`;
  await waitForReady(`${BASE}${PAGE_PATH}`);
  browser = await chromium.launch();
  chromiumVersion = browser.version();

  const A = await session('contextA');
  const B = await session('contextB');

  await check('initial-state', { password: '', lengthLabel: '10', checked: ['lowercase'], strength: 'Weak', indicatorPercent: 0, cardWidth: 380 }, async () => {
    const s = A.initial;
    return expectEqual({ password: s.password, lengthLabel: s.lengthLabel, checked: s.checked, strength: s.strength, indicatorPercent: s.indicatorPercent, cardWidth: s.cardWidth },
      { password: '', lengthLabel: '10', checked: ['lowercase'], strength: 'Weak', indicatorPercent: 0, cardWidth: 380 }, 'unexpected initial state');
  });

  await check('seeded-default-password-exact', { password: EXPECTED.defaultLower10, strength: 'Weak', indicatorPercent: 25 }, async () => {
    const s = A.defaultLower10;
    return expectEqual({ password: s.password, strength: s.strength, indicatorPercent: s.indicatorPercent },
      { password: EXPECTED.defaultLower10, strength: 'Weak', indicatorPercent: 25 }, 'default password differs from the seeded fixture');
  });

  await check('seeded-upper-lower-numbers-16-exact', { password: EXPECTED.upperLowerNumbers16, lengthLabel: '16', strength: 'Medium', indicatorPercent: 75, classes: 'upper+lower+digit, no symbol' }, async () => {
    const s = A.upperLowerNumbers16;
    const p = s.password;
    const classesOk = /[A-Z]/.test(p) && /[a-z]/.test(p) && /[0-9]/.test(p) && !/[^A-Za-z0-9]/.test(p) && p.length === 16;
    return expectEqual({ password: p, lengthLabel: s.lengthLabel, strength: s.strength, indicatorPercent: s.indicatorPercent, classes: classesOk ? 'upper+lower+digit, no symbol' : 'wrong' },
      { password: EXPECTED.upperLowerNumbers16, lengthLabel: '16', strength: 'Medium', indicatorPercent: 75, classes: 'upper+lower+digit, no symbol' }, '#uppercase/#lowercase/#numbers password wrong');
  });

  await check('no-options-shows-message', { password: 'Select options!', strength: 'Weak', indicatorPercent: 0 }, async () => {
    const s = A.noOptions;
    return expectEqual({ password: s.password, strength: s.strength, indicatorPercent: s.indicatorPercent },
      { password: 'Select options!', strength: 'Weak', indicatorPercent: 0 }, 'empty-option state wrong');
  });

  await check('theme-toggle-switches-and-back', { first: { lightTheme: true, themeIcon: '🌙' }, second: { lightTheme: false, themeIcon: '☀️' }, backgroundChanged: true }, async () => {
    const t1 = A.afterThemeToggle; const t2 = A.afterSecondThemeToggle;
    return expectEqual({
      first: { lightTheme: t1.lightTheme, themeIcon: t1.themeIcon },
      second: { lightTheme: t2.lightTheme, themeIcon: t2.themeIcon },
      backgroundChanged: t1.bodyBackground !== A.upperLowerNumbers16.bodyBackground && t2.bodyBackground === A.upperLowerNumbers16.bodyBackground,
    }, { first: { lightTheme: true, themeIcon: '🌙' }, second: { lightTheme: false, themeIcon: '☀️' }, backgroundChanged: true }, '#themeToggle does not switch the theme');
  });

  await check('two-fresh-contexts-identical-dom-state', 'context A === context B for every step', async () => expectEqual(B, A, 'the two fresh contexts produced different DOM state') && Object.keys(A));

  // Clipboard: allowed (stub records), then denied (stub rejects).
  {
    const { context, page } = await newPage('copy-allowed', { clipboard: 'allow' });
    await page.locator('.generateButton').click();
    await check('copy-writes-exact-password', { copied: [EXPECTED.defaultLower10] }, async () => {
      await page.locator('[data-copy]').click();
      await page.waitForTimeout(50);
      return expectEqual({ copied: await page.evaluate(() => window.__copied) }, { copied: [EXPECTED.defaultLower10] }, 'clipboard received something else');
    });
    await check('copy-success-feedback', { buttonText: '✅' }, async () => expectEqual({ buttonText: (await page.locator('[data-copy]').textContent()).trim() }, { buttonText: '✅' }, 'no feedback after copying'));
    await context.close();
  }
  {
    const before = pageErrors.length;
    const { context, page } = await newPage('copy-denied', { clipboard: 'deny' });
    await page.locator('.generateButton').click();
    await check('copy-denied-handled-with-feedback', { newPageErrors: 0, buttonText: '⚠️', passwordSelected: true }, async () => {
      await page.locator('[data-copy]').click();
      await page.waitForTimeout(100);
      const r = await page.evaluate(() => {
        const box = document.querySelector('[data-passworddisplay]');
        return { buttonText: document.querySelector('[data-copy]').textContent.trim(), passwordSelected: box.selectionStart === 0 && box.selectionEnd === box.value.length && box.value.length > 0 };
      });
      return expectEqual({ newPageErrors: pageErrors.length - before, ...r }, { newPageErrors: 0, buttonText: '⚠️', passwordSelected: true }, `denied copy not handled (${pageErrors.slice(before).join(' | ')})`);
    });
    await context.close();
  }

  await check('no-external-requests-or-web-fonts', { externalRequests: [], webFontsLoaded: 0 }, async () => {
    const { context, page } = await newPage('fonts');
    const webFontsLoaded = await page.evaluate(async () => { await document.fonts.ready; return [...document.fonts].filter((f) => f.status === 'loaded').length; });
    await context.close();
    return expectEqual({ externalRequests, webFontsLoaded }, { externalRequests: [], webFontsLoaded: 0 }, 'page depends on the network');
  });

  // Control: without the randomness fixture two fresh contexts do NOT agree, which is why the fixture exists.
  await check('control-unseeded-contexts-differ', { differ: true }, async () => {
    const pw = [];
    for (const tag of ['unseeded1', 'unseeded2']) {
      const { context, page } = await newPage(tag, { seeded: false });
      await page.locator('.generateButton').click();
      pw.push(await page.locator('[data-passworddisplay]').inputValue());
      await context.close();
    }
    return expectEqual({ differ: pw[0] !== pw[1] }, { differ: true }, `unseeded passwords: ${pw.join(' / ')}`) && { differ: true, passwords: pw };
  });

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
  task: 'R60-T005', label, page: PAGE_PATH, date: new Date().toISOString(),
  tools: { node: process.version, playwright: (await import('playwright/package.json', { with: { type: 'json' } })).default.version, chromium: chromiumVersion, os: `${os.type()} ${os.release()}` },
  inputs: {
    context: CONTEXT_OPTIONS,
    fixtures: {
      randomness: `crypto.getRandomValues + Math.random seeded (mulberry32, seed 0x${SEED.toString(16)})`,
      clock: `Date fixed at ${FIXED_TIME.toISOString()}`,
      network: 'all non-local requests blocked and recorded',
      fonts: 'no web fonts; local sans-serif fallback',
      clipboard: 'navigator.clipboard.writeText stub: records text (allow) or rejects NotAllowedError (deny)',
    },
    session: ['generate (default: lowercase, 10)', 'upper+lower+numbers, length 16, generate', 'theme toggle x2', 'no options, generate'],
    expectedPasswords: EXPECTED,
  },
  summary: { total: results.length, passed: results.length - failed.length, failed: failed.length, fatal: fatal ? String(fatal.stack || fatal) : null },
  results,
};
await writeFile(join(EVIDENCE_DIR, `results-${label}.json`), JSON.stringify(report, null, 2)).catch(() => {});

for (const r of results) console.log(`${r.status === 'pass' ? 'PASS' : 'FAIL'}  ${r.name}${r.error ? `\n      ${r.error.split('\n')[0]}` : ''}`);
console.log(`\n${report.summary.passed}/${results.length} checks passed -> work/R60-T005/results-${label}.json`);
if (fatal) console.error('FATAL:', fatal);
process.exit(fatal || failed.length ? 1 : 0);
