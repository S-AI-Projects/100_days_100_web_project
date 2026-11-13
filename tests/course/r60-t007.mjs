#!/usr/bin/env node
/**
 * R60-T007 — Executable walkthrough for public/Glassmorphism-Generator.
 *
 * Run from the repository root:
 *   npm --prefix tests/course ci                              # once
 *   npx --prefix tests/course playwright install chromium     # once, if needed
 *   node tests/course/r60-t007.mjs [--label=latest] [--update-docs-screenshot]
 *
 * The walkthrough lives in public/Glassmorphism-Generator/README.md between
 * <!-- walkthrough:start --> and <!-- walkthrough:end -->. This check parses
 * that table and executes it in a fresh Chromium context, so the documented
 * selectors and expected outputs must agree with the current page.
 *
 * Action column (one code span):
 *   open WxH | viewport WxH | fill <selector> <value> | click <selector>
 * Expected column (one or more code spans):
 *   text <sel> = <exact text>
 *   css <sel> <property> = <exact computed value>
 *   value <sel> contains <text>
 *   class <sel> has|lacks <class>
 *   left-of <selA> <selB>      above <selA> <selB>
 *   copied contains <text>     (clipboard is stubbed; it needs a permission)
 *
 * The page is static, so a local HTTP server serves the repo (the README also
 * documents `npm run dev`). Fails on any uncaught page error or console.error.
 * Writes work/R60-T007/results-<label>.json and exits 1 if any check failed.
 */
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile, stat, access } from 'node:fs/promises';
import { extname, join, normalize, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import os from 'node:os';
import { chromium } from 'playwright';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..', '..');
const APP_DIR = join(ROOT, 'public', 'Glassmorphism-Generator');
const README = join(APP_DIR, 'README.md');
const PAGE_PATH = '/public/Glassmorphism-Generator/index.html';
const EVIDENCE_DIR = join(ROOT, 'work', 'R60-T007');
const label = (process.argv.find((a) => a.startsWith('--label=')) || '--label=latest').split('=')[1];
const UPDATE_DOCS_SCREENSHOT = process.argv.includes('--update-docs-screenshot');
const DOCS_SCREENSHOT_STEP = 4;

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml' };

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
function expectOk(cond, msg, actual) {
  if (!cond) { const e = new assert.AssertionError({ message: msg }); e.actualValue = actual; throw e; }
  return actual;
}

const codeSpans = (cell) => [...cell.matchAll(/`([^`]+)`/g)].map((m) => m[1].trim());

/** Parse the walkthrough table out of the README. */
function parseWalkthrough(md) {
  const m = md.match(/<!-- walkthrough:start -->([\s\S]*?)<!-- walkthrough:end -->/);
  if (!m) return null;
  return m[1].split('\n')
    .filter((line) => /^\|\s*\d+\s*\|/.test(line))
    .map((line) => {
      const cells = line.split('|').slice(1, -1).map((c) => c.trim());
      return { step: Number(cells[0]), description: cells[1], action: codeSpans(cells[2])[0], expected: codeSpans(cells[3]) };
    });
}

/** Clipboard stub: writeText records the text (the real API needs a permission). */
const CLIPBOARD_STUB = `(() => {
  window.__copied = [];
  const clip = { writeText(t) { window.__copied.push(String(t)); return Promise.resolve(); } };
  Object.defineProperty(Navigator.prototype, 'clipboard', { get: () => clip, configurable: true });
})();`;

async function runAction(page, action) {
  let m;
  if ((m = action.match(/^(open|viewport) (\d+)x(\d+)$/))) {
    await page.setViewportSize({ width: Number(m[2]), height: Number(m[3]) });
    if (m[1] === 'open') await page.goto(`${BASE}${PAGE_PATH}`, { waitUntil: 'load' });
  } else if ((m = action.match(/^fill (\S+) (.+)$/))) {
    await page.locator(m[1]).fill(m[2]);
  } else if ((m = action.match(/^click (\S+)$/))) {
    await page.locator(m[1]).click();
  } else {
    throw new Error(`unknown action: ${action}`);
  }
  await page.waitForTimeout(200); // the card has a 0.1s transition
}

/** Evaluate one documented expectation; returns { ok, actual }. */
async function evaluateExpectation(page, exp) {
  let m;
  if ((m = exp.match(/^text (\S+) = (.+)$/))) {
    const actual = (await page.locator(m[1]).textContent()).trim();
    return { ok: actual === m[2], actual };
  }
  if ((m = exp.match(/^css (\S+) (\S+) = (.+)$/))) {
    const actual = await page.locator(m[1]).evaluate((el, prop) => getComputedStyle(el).getPropertyValue(prop).trim(), m[2]);
    return { ok: actual === m[3], actual };
  }
  if ((m = exp.match(/^value (\S+) contains (.+)$/))) {
    const actual = await page.locator(m[1]).inputValue();
    return { ok: actual.includes(m[2]), actual };
  }
  if ((m = exp.match(/^class (\S+) (has|lacks) (\S+)$/))) {
    const has = await page.locator(m[1]).evaluate((el, c) => el.classList.contains(c), m[3]);
    return { ok: m[2] === 'has' ? has : !has, actual: `${m[3]} ${has ? 'present' : 'absent'}` };
  }
  if ((m = exp.match(/^(left-of|above) (\S+) (\S+)$/))) {
    const a = await page.locator(m[2]).boundingBox();
    const b = await page.locator(m[3]).boundingBox();
    const ok = m[1] === 'left-of' ? a.x + a.width <= b.x + 1 : a.y + a.height <= b.y + 1;
    return { ok, actual: { [m[2]]: a, [m[3]]: b } };
  }
  if ((m = exp.match(/^copied contains (.+)$/))) {
    const copied = await page.evaluate(() => window.__copied);
    return { ok: copied.some((t) => t.includes(m[1])), actual: copied };
  }
  return { ok: false, actual: `unknown expectation syntax: ${exp}` };
}

// ---------------------------------------------------------------- run
let server; let browser; let BASE; let chromiumVersion = 'n/a';
const pageErrors = [];

async function main() {
  const md = await readFile(README, 'utf8');
  const steps = parseWalkthrough(md);

  // ----- documentation checks
  await check('readme-has-entry-point-and-setup-command', { entryPoint: true, setupCommand: true }, async () => {
    const actual = { entryPoint: md.includes('public/Glassmorphism-Generator/index.html'), setupCommand: /npm run dev/.test(md) };
    return expectOk(actual.entryPoint && actual.setupCommand, 'README does not document the entry point and setup command', actual);
  });
  await check('readme-code-fences-balanced', { unclosedFences: 0 }, async () => {
    const fences = (md.match(/^\s*```/gm) || []).length;
    return expectOk(fences % 2 === 0, `README has an unclosed code block (${fences} fences)`, { fences, unclosedFences: fences % 2 });
  });
  await check('readme-walkthrough-present', { steps: '>= 5', everyStepHasActionAndExpectation: true }, async () => {
    const actual = { steps: steps ? steps.length : 0, everyStepHasActionAndExpectation: !!steps && steps.every((s) => s.action && s.expected.length > 0) };
    return expectOk(actual.steps >= 5 && actual.everyStepHasActionAndExpectation, 'README has no executable walkthrough', actual);
  });
  await check('readme-screenshot-exists', 'every image the README references exists', async () => {
    const refs = [...md.matchAll(/!\[[^\]]*\]\(((?!https?:)[^)]+)\)/g)].map((m) => m[1]);
    const missing = [];
    for (const r of refs) { try { await access(join(APP_DIR, r)); } catch { if (!(UPDATE_DOCS_SCREENSHOT && r.includes('walkthrough'))) missing.push(r); } }
    return expectOk(refs.length > 0 && missing.length === 0, `missing images: ${missing.join(', ') || '(no screenshot referenced)'}`, { refs, missing });
  });

  // ----- execute the walkthrough
  server = await startServer();
  BASE = `http://127.0.0.1:${server.address().port}`;
  await waitForReady(`${BASE}${PAGE_PATH}`);
  browser = await chromium.launch();
  chromiumVersion = browser.version();

  if (!steps || steps.length === 0) {
    results.push({ name: 'walkthrough-executed', status: 'fail', expected: 'all documented steps pass', actual: null, error: 'no walkthrough in README to execute' });
    return;
  }

  const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce', colorScheme: 'light' });
  await context.addInitScript(CLIPBOARD_STUB);
  await context.route((url) => !url.href.startsWith(BASE), (route) => route.abort('blockedbyclient'));
  context.on('weberror', (e) => pageErrors.push(`pageerror: ${e.error().message}`));
  context.on('console', (m) => { if (m.type() === 'error') pageErrors.push(`console.error: ${m.text()}`); });
  const page = await context.newPage();

  for (const s of steps) {
    await check(`walkthrough-step-${s.step}`, { action: s.action, expected: s.expected }, async () => {
      await runAction(page, s.action);
      const outcomes = [];
      for (const exp of s.expected) outcomes.push({ expectation: exp, ...(await evaluateExpectation(page, exp)) });
      const failedOnes = outcomes.filter((o) => !o.ok);
      expectOk(failedOnes.length === 0, `step ${s.step} (${s.description}): ${failedOnes.map((f) => `"${f.expectation}" got ${JSON.stringify(f.actual)}`).join('; ')}`, outcomes);
      return outcomes;
    });
    await page.screenshot({ path: join(EVIDENCE_DIR, `step-${s.step}-${label}.png`) }).catch(() => {});
    if (s.step === DOCS_SCREENSHOT_STEP && UPDATE_DOCS_SCREENSHOT) {
      await mkdir(join(APP_DIR, 'docs'), { recursive: true });
      await page.screenshot({ path: join(APP_DIR, 'docs', `walkthrough-step${DOCS_SCREENSHOT_STEP}.png`) });
    }
  }
  await context.close();

  await check('no-page-errors', [], async () => expectOk(pageErrors.length === 0, 'unexpected page errors', pageErrors));
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
  task: 'R60-T007', label, page: PAGE_PATH, date: new Date().toISOString(),
  tools: { node: process.version, playwright: (await import('playwright/package.json', { with: { type: 'json' } })).default.version, chromium: chromiumVersion, os: `${os.type()} ${os.release()}` },
  inputs: {
    walkthroughSource: 'public/Glassmorphism-Generator/README.md (walkthrough:start … walkthrough:end)',
    context: 'fresh Chromium context, 1280x800 then 390x844, light colour scheme, reduced motion',
    stubs: 'navigator.clipboard.writeText records text (clipboard needs a permission); non-local requests blocked (none needed)',
  },
  summary: { total: results.length, passed: results.length - failed.length, failed: failed.length, fatal: fatal ? String(fatal.stack || fatal) : null },
  results,
};
await writeFile(join(EVIDENCE_DIR, `results-${label}.json`), JSON.stringify(report, null, 2)).catch(() => {});

for (const r of results) console.log(`${r.status === 'pass' ? 'PASS' : 'FAIL'}  ${r.name}${r.error ? `\n      ${r.error.split('\n')[0]}` : ''}`);
console.log(`\n${report.summary.passed}/${results.length} checks passed -> work/R60-T007/results-${label}.json`);
if (fatal) console.error('FATAL:', fatal);
process.exit(fatal || failed.length ? 1 : 0);
