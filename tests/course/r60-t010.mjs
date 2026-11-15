#!/usr/bin/env node
/**
 * R60-T010 — Interaction regression for public/CyberPulse-AI (PhishGuard AI Terminal).
 *
 * Run from the repository root:
 *   npm --prefix tests/course ci                              # once
 *   npx --prefix tests/course playwright install chromium     # once, if needed
 *   node tests/course/r60-t010.mjs [--label=latest]
 *
 * Main visible behaviour (anchors):
 *   #matrix-canvas  full-window "matrix rain" background, redrawn on a timer
 *   #bootLog        four boot lines written on load
 *   #scanPanel      the scanner panel: #scanForm + live log + results
 *   #scanForm       submitting a URL runs the rule-based scan: a 5-line live
 *                   log, then the verdict / score / confidence / reasons grid
 *
 * The check runs the same behavioural assertions against:
 *   correct   — the page as it is in the repository (must pass);
 *   M1        — TEMPORARY FIXTURE: the submit binding is broken in the served
 *               script.js ('submit' -> 'sumbit', a one-letter typo), so the
 *               form falls back to a native submit / page reload;
 *   M2        — TEMPORARY FIXTURE: the `.result-grid[hidden] { display:none }`
 *               rule is removed from the served style.css, so the results grid
 *               shows "SAFE SIGNAL 0/100" before any scan.
 * Mutations are applied only to the HTTP responses inside this test; the files
 * on disk are never changed (also asserted). Each mutation must fail the
 * intended assertion for the intended reason and nothing else.
 *
 * Math.random is seeded (matrix rain), fonts are stubbed, no permission or
 * hardware feature is involved. Fails on any uncaught page error in the
 * correct scenario. Writes work/R60-T010/results-<label>.json; exit 1 on failure.
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
const APP = '/public/CyberPulse-AI';
const PAGE_PATH = `${APP}/index.html`;
const EVIDENCE_DIR = join(ROOT, 'work', 'R60-T010');
const label = (process.argv.find((a) => a.startsWith('--label=')) || '--label=latest').split('=')[1];

const BOOT_LINES = [
  '[ OK ] loading threat-signature database...',
  '[ OK ] initializing heuristic engine...',
  '[ OK ] calibrating AI explanation module...',
  '> PhishGuard AI Terminal ready.',
];
const PHISHY_URL = 'http://secure-login.bank-verify.example.com@192.168.0.1';
const SAFE_URL = 'https://example.com';

/** Temporary fixtures: { file, from, to } applied to the served response only. */
const MUTATIONS = {
  // targets: the assertions that MUST fail (all others must still pass); reason: text the first target's failure must contain
  M1: { file: `${APP}/script.js`, from: "form.addEventListener('submit'", to: "form.addEventListener('sumbit'", targets: ['submit-runs-scan-and-shows-threat-verdict', 'second-scan-safe-url-replaces-result'], reason: 'submit was not handled', kind: 'event binding' },
  M2: { file: `${APP}/style.css`, from: /\.result-grid\[hidden\]\s*\{[^}]*\}/, to: '', targets: ['results-hidden-before-any-scan'], reason: 'a verdict is shown before any scan', kind: 'style rule' },
};

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css' };

// ---------------------------------------------------------------- server
let activeMutation = null; let mutationApplied = false;
function startServer() {
  const server = createServer(async (req, res) => {
    try {
      const urlPath = decodeURIComponent(new URL(req.url, 'http://x').pathname);
      const file = normalize(join(ROOT, urlPath));
      if (!file.startsWith(ROOT)) { res.writeHead(403).end(); return; }
      const s = await stat(file);
      const target = s.isDirectory() ? join(file, 'index.html') : file;
      let body = await readFile(target);
      if (activeMutation && urlPath === activeMutation.file) {
        const text = body.toString('utf8');
        const mutated = text.replace(activeMutation.from, activeMutation.to);
        mutationApplied = mutated !== text;
        body = Buffer.from(mutated);
      }
      res.writeHead(200, { 'content-type': MIME[extname(target)] || 'application/octet-stream', 'cache-control': 'no-store' });
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
function record(name, expected, outcome) {
  results.push({ name, status: outcome.pass ? 'pass' : 'fail', expected, actual: outcome.actual, ...(outcome.pass ? {} : { error: outcome.reason }) });
}

const SEED_RANDOM = `(() => { let a = 0x1234abcd; Math.random = () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; })();`;

/**
 * The behavioural assertions. Returns { name: { pass, actual, reason } } so the
 * same assertions can be run against the correct page and each mutation.
 */
async function behaviour(scenario) {
  const out = {};
  const errors = [];
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: 'no-preference' });
  await context.addInitScript(SEED_RANDOM);
  await context.route((url) => !url.href.startsWith(BASE), (route) => route.fulfill({ status: 200, contentType: 'text/css', body: '' }));
  context.on('weberror', (e) => errors.push(`pageerror: ${e.error().message}`));
  context.on('console', (m) => { if (m.type() === 'error') errors.push(`console.error: ${m.text()}`); });
  const page = await context.newPage();
  await page.goto(`${BASE}${PAGE_PATH}`, { waitUntil: 'load' });
  await page.waitForTimeout(400);
  const startUrl = page.url();

  const run = async (name, fn) => {
    try { out[name] = { pass: true, actual: await fn() }; } catch (e) { out[name] = { pass: false, actual: e.actualValue ?? null, reason: String(e.message || e).split('\n')[0] }; }
  };
  const fail = (msg, actual) => { const e = new Error(msg); e.actualValue = actual; throw e; };

  await run('matrix-canvas-fills-window-and-draws', async () => {
    const c = await page.evaluate(() => {
      const cv = document.getElementById('matrix-canvas'); const r = cv.getBoundingClientRect();
      const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data;
      let lit = 0; for (let i = 0; i < d.length; i += 4 * 211) if (d[i + 1] > 60) lit++;
      return { buffer: [cv.width, cv.height], css: [Math.round(r.width), Math.round(r.height)], lit, pointerEvents: getComputedStyle(cv).pointerEvents };
    });
    if (c.buffer[0] !== 1280 || c.buffer[1] !== 800 || c.lit < 10) fail(`canvas not drawing full-window: ${JSON.stringify(c)}`, c);
    return c;
  });

  await run('boot-log-four-lines', async () => {
    const lines = await page.$$eval('#bootLog > div', (ds) => ds.map((d) => d.textContent));
    try { assert.deepEqual(lines, BOOT_LINES); } catch { fail(`boot log: ${JSON.stringify(lines)}`, lines); }
    return lines;
  });

  await run('results-hidden-before-any-scan', async () => {
    const s = await page.evaluate(() => ({
      resultGridDisplay: getComputedStyle(document.getElementById('resultGrid')).display,
      emptyStateShown: getComputedStyle(document.getElementById('emptyState')).display !== 'none',
      verdictTextVisible: document.getElementById('verdictText').getBoundingClientRect().height > 0,
    }));
    if (s.resultGridDisplay !== 'none' || !s.emptyStateShown || s.verdictTextVisible) fail(`a verdict is shown before any scan (result grid display: ${s.resultGridDisplay})`, s);
    return s;
  });

  await page.screenshot({ path: join(EVIDENCE_DIR, `${scenario}-before-scan-${label}.png`) }).catch(() => {});

  await run('empty-submit-does-not-scan', async () => {
    await page.locator('#scanBtn').click();
    await page.waitForTimeout(300);
    const s = await page.evaluate(() => ({ liveLogLines: document.querySelectorAll('#liveLog > div').length, inputInvalid: !document.getElementById('urlInput').checkValidity() }));
    if (s.liveLogLines !== 0 || !s.inputInvalid) fail('empty input started a scan', s);
    return s;
  });

  await run('submit-runs-scan-and-shows-threat-verdict', async () => {
    await page.locator('#urlInput').fill(PHISHY_URL);
    await page.locator('#urlInput').press('Enter'); // a real form submission
    await page.waitForTimeout(80);
    const during = await page.evaluate(() => ({ buttonDisabled: document.getElementById('scanBtn').disabled })).catch(() => ({ buttonDisabled: null }));
    await page.waitForTimeout(1600);
    const s = await page.evaluate(() => ({
      liveLog: [...document.querySelectorAll('#liveLog > div')].map((d) => d.textContent),
      lastLogClass: document.querySelector('#liveLog > div:last-child')?.className || null,
      resultGridDisplay: getComputedStyle(document.getElementById('resultGrid')).display,
      verdict: document.getElementById('verdictText').textContent,
      verdictClass: document.getElementById('verdictBadge').className,
      score: document.getElementById('scoreValue').textContent,
      fillWidth: document.getElementById('scoreFill').style.width,
      confidence: document.getElementById('confidenceValue').textContent,
      reasons: document.querySelectorAll('#explainList li').length,
      emptyStateShown: getComputedStyle(document.getElementById('emptyState')).display !== 'none',
      buttonEnabledAfter: !document.getElementById('scanBtn').disabled,
    }));
    const actual = { ...s, buttonDisabledDuringScan: during.buttonDisabled, pageReloaded: page.url() !== startUrl, url: page.url() };
    const ok = !actual.pageReloaded && during.buttonDisabled === true && s.liveLog.length === 5 && s.liveLog[0] === `> scanning target: ${PHISHY_URL}`
      && s.lastLogClass === 'log-bad' && s.resultGridDisplay === 'grid' && s.verdict === 'THREAT DETECTED' && s.verdictClass === 'verdict-badge verdict--threat'
      && s.score === '100' && s.fillWidth === '100%' && s.confidence === '95%' && s.reasons === 5 && !s.emptyStateShown && s.buttonEnabledAfter;
    if (!ok) fail(actual.pageReloaded ? `submit was not handled: the page reloaded (${actual.url}) and no verdict appeared` : `scan result wrong: ${JSON.stringify(actual)}`, actual);
    return actual;
  });

  await run('second-scan-safe-url-replaces-result', async () => {
    await page.locator('#urlInput').fill(SAFE_URL);
    await page.locator('#scanBtn').click();
    await page.waitForTimeout(1700);
    const s = await page.evaluate(() => ({
      verdict: document.getElementById('verdictText').textContent,
      score: document.getElementById('scoreValue').textContent,
      confidence: document.getElementById('confidenceValue').textContent,
      reasons: [...document.querySelectorAll('#explainList li')].map((l) => l.textContent),
      liveLogLines: document.querySelectorAll('#liveLog > div').length,
    }));
    const ok = s.verdict === 'SAFE SIGNAL' && s.score === '0' && s.confidence === '95%' && s.reasons.length === 1
      && s.reasons[0] === 'No suspicious patterns detected in keywords, structure, or protocol.' && s.liveLogLines === 5;
    if (!ok) fail(`second scan wrong: ${JSON.stringify(s)}`, s);
    return s;
  });

  await page.screenshot({ path: join(EVIDENCE_DIR, `${scenario}-after-scans-${label}.png`) }).catch(() => {});
  await context.close();
  out['no-page-errors'] = errors.length ? { pass: false, actual: errors, reason: errors.join(' | ') } : { pass: true, actual: [] };
  return out;
}

// ---------------------------------------------------------------- run
let server; let browser; let BASE; let chromiumVersion = 'n/a';

async function main() {
  server = await startServer();
  BASE = `http://127.0.0.1:${server.address().port}`;
  await waitForReady(`${BASE}${PAGE_PATH}`);
  browser = await chromium.launch();
  chromiumVersion = browser.version();

  // 1. correct page: every assertion must pass
  activeMutation = null;
  const correct = await behaviour('correct');
  for (const [name, o] of Object.entries(correct)) record(`correct-${name}`, 'pass on the unmodified page', o);

  // 2. each temporary fixture must fail its target assertion (and only that one)
  for (const [id, m] of Object.entries(MUTATIONS)) {
    activeMutation = m; mutationApplied = false;
    const mutated = await behaviour(id);
    activeMutation = null;
    const failedNames = Object.entries(mutated).filter(([, o]) => !o.pass).map(([n]) => n).filter((n) => n !== 'no-page-errors');
    const target = mutated[m.targets[0]];
    const rightReason = !!target && !target.pass && String(target.reason).includes(m.reason);
    const exactlyTargets = JSON.stringify([...failedNames].sort()) === JSON.stringify([...m.targets].sort());
    const pass = mutationApplied && rightReason && exactlyTargets;
    record(`mutation-${id}-${m.kind.replace(' ', '-')}-caught`, { fixtureApplied: true, failedAssertions: m.targets, reasonContains: m.reason }, {
      pass,
      actual: { fixtureApplied: mutationApplied, failedAssertions: failedNames, targetReason: target?.reason ?? null },
      reason: !mutationApplied ? `fixture could not be applied (pattern not found in ${m.file})`
        : !rightReason ? `"${m.targets[0]}" did not fail for the intended reason (${target?.reason ?? 'it passed'})`
          : `expected exactly ${JSON.stringify(m.targets)} to fail, got: ${JSON.stringify(failedNames)}`,
    });
  }

  // 3. the application on disk contains no mutation
  const [js, css] = await Promise.all([readFile(join(ROOT, MUTATIONS.M1.file), 'utf8'), readFile(join(ROOT, MUTATIONS.M2.file), 'utf8')]);
  const clean = { submitBinding: js.includes("form.addEventListener('submit'") && !js.includes("'sumbit'"), hiddenRule: MUTATIONS.M2.from.test(css) };
  record('application-files-contain-no-mutation', { submitBinding: true, hiddenRule: true }, { pass: clean.submitBinding && clean.hiddenRule, actual: clean, reason: `source on disk: ${JSON.stringify(clean)}` });
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
  task: 'R60-T010', label, page: PAGE_PATH, date: new Date().toISOString(),
  tools: { node: process.version, playwright: (await import('playwright/package.json', { with: { type: 'json' } })).default.version, chromium: chromiumVersion, os: `${os.type()} ${os.release()}` },
  inputs: {
    viewport: '1280x800', urls: { phishy: PHISHY_URL, safe: SAFE_URL },
    mutations: Object.fromEntries(Object.entries(MUTATIONS).map(([k, m]) => [k, { kind: m.kind, file: m.file, change: `${String(m.from)} -> ${JSON.stringify(m.to)}`, mustFail: m.targets, reasonContains: m.reason }])),
    stubs: 'Math.random seeded (matrix rain); Google Fonts stubbed',
  },
  summary: { total: results.length, passed: results.length - failed.length, failed: failed.length, fatal: fatal ? String(fatal.stack || fatal) : null },
  results,
};
await writeFile(join(EVIDENCE_DIR, `results-${label}.json`), JSON.stringify(report, null, 2)).catch(() => {});

for (const r of results) console.log(`${r.status === 'pass' ? 'PASS' : 'FAIL'}  ${r.name}${r.error ? `\n      ${r.error.split('\n')[0]}` : ''}`);
console.log(`\n${report.summary.passed}/${results.length} checks passed -> work/R60-T010/results-${label}.json`);
if (fatal) console.error('FATAL:', fatal);
process.exit(fatal || failed.length ? 1 : 0);
