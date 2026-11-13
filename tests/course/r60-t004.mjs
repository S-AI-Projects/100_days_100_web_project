#!/usr/bin/env node
/**
 * R60-T004 — Repeat-initialization / DOM lifecycle regression for
 * public/TodoList-React-TS-Tailwind (React 18 + Vite, mounted into #root).
 *
 * Run from the repository root:
 *   npm --prefix public/TodoList-React-TS-Tailwind ci          # the app's own dependencies
 *   npm --prefix tests/course ci                               # pinned Playwright
 *   npx --prefix tests/course playwright install chromium      # once, if needed
 *   node tests/course/r60-t004.mjs [--label=latest]
 *
 * What it does
 *   1. Starts the app's documented dev server (`npm run dev`, i.e. Vite) on a
 *      free port, waits until it answers, and always stops it (whole process
 *      group) on success or failure.
 *   2. In a fresh Chromium context, counts listeners added to window, document
 *      and #root, and setInterval timers created by the app's own source files
 *      (/src/), via an init script.
 *   3. Initializes the app twice (load + reload with saved state; React
 *      StrictMode also mounts effects twice in dev) and interacts repeatedly,
 *      asserting exactly one intended update each time and no duplicated
 *      listeners, timers or DOM nodes.
 *   4. Fails on any uncaught page error or console.error (React's duplicate-key
 *      warning is a console.error).
 *   5. Writes expected-vs-actual results, inputs and tool versions to
 *      work/R60-T004/results-<label>.json and exits 1 if any check failed.
 *
 * No permission-gated or hardware feature is used. window.print (Export
 * button) is not exercised.
 */
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { mkdir, writeFile, access } from 'node:fs/promises';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import os from 'node:os';
import { chromium } from 'playwright';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..', '..');
const APP_DIR = join(ROOT, 'public', 'TodoList-React-TS-Tailwind');
const EVIDENCE_DIR = join(ROOT, 'work', 'R60-T004');
const label = (process.argv.find((a) => a.startsWith('--label=')) || '--label=latest').split('=')[1];
const VIEWPORT = { width: 1280, height: 900 };

// ---------------------------------------------------------------- server
const freePort = () => new Promise((ok, fail) => {
  const s = createServer();
  s.once('error', fail);
  s.listen(0, '127.0.0.1', () => { const { port } = s.address(); s.close(() => ok(port)); });
});

let devServer = null;
async function startDevServer() {
  try { await access(join(APP_DIR, 'node_modules', '.bin', 'vite')); } catch {
    throw new Error('App dependencies missing: run `npm --prefix public/TodoList-React-TS-Tailwind ci` first.');
  }
  const port = await freePort();
  const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  devServer = spawn(npm, ['run', 'dev', '--', '--port', String(port), '--strictPort', '--host', '127.0.0.1'], {
    cwd: APP_DIR, stdio: ['ignore', 'pipe', 'pipe'], detached: process.platform !== 'win32', shell: process.platform === 'win32',
  });
  let log = '';
  devServer.stdout.on('data', (d) => { log += d; });
  devServer.stderr.on('data', (d) => { log += d; });
  const url = `http://127.0.0.1:${port}/`;
  const until = Date.now() + 30_000;
  while (Date.now() < until) {
    if (devServer.exitCode !== null) throw new Error(`dev server exited early:\n${log}`);
    try { if ((await fetch(url)).ok) return url; } catch { /* not yet */ }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`dev server not ready at ${url}:\n${log}`);
}

async function stopDevServer() {
  if (!devServer || devServer.exitCode !== null) return;
  const exited = new Promise((r) => devServer.once('exit', r));
  try {
    if (process.platform === 'win32') spawn('taskkill', ['/pid', String(devServer.pid), '/T', '/F']);
    else process.kill(-devServer.pid, 'SIGTERM'); // whole group: npm + vite
  } catch { /* already gone */ }
  await Promise.race([exited, new Promise((r) => setTimeout(r, 5000))]);
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

/** Counts live listeners on window/document/#root and intervals created from /src/ code. */
const LIFECYCLE_PROBE = `(() => {
  const listeners = new Map();
  const targetName = (t) => t === window ? 'window' : t === document ? 'document' : (t && t.id === 'root') ? '#root' : null;
  const add = EventTarget.prototype.addEventListener, remove = EventTarget.prototype.removeEventListener;
  EventTarget.prototype.addEventListener = function (type, fn, opts) {
    const n = targetName(this);
    if (n && !type.startsWith('__playwright')) { const k = n + ':' + type; listeners.set(k, (listeners.get(k) || 0) + 1); }
    return add.call(this, type, fn, opts);
  };
  EventTarget.prototype.removeEventListener = function (type, fn, opts) {
    const n = targetName(this);
    if (n && !type.startsWith('__playwright')) { const k = n + ':' + type; listeners.set(k, (listeners.get(k) || 0) - 1); }
    return remove.call(this, type, fn, opts);
  };
  const appIntervals = new Set();
  const si = window.setInterval, ci = window.clearInterval;
  window.setInterval = function (...a) { const id = si.apply(this, a); if (/\\/src\\//.test(new Error().stack || '')) appIntervals.add(id); return id; };
  window.clearInterval = function (id) { appIntervals.delete(id); return ci.call(this, id); };
  window.__lifecycle = () => ({
    listenerTotal: [...listeners.values()].reduce((a, b) => a + b, 0),
    listeners: Object.fromEntries([...listeners].filter(([, v]) => v !== 0).sort()),
    appIntervals: appIntervals.size,
  });
})();`;

const CARD = '.Todolist > div:has(.TodoIcons)';
const ADD_INPUT = 'input[placeholder="Add Item..."]';
const stored = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('TodoListItems') || '[]'));
const cardTitles = (page) => page.$$eval(CARD, (cards) => cards.map((c) => c.querySelector('.font-medium').textContent));
async function addByEnter(page, title) { await page.fill(ADD_INPUT, title); await page.press(ADD_INPUT, 'Enter'); }
async function waitForApp(page) { await page.waitForSelector('header h1:has-text("Todolist")'); await page.waitForTimeout(150); }

// ---------------------------------------------------------------- run
let browser; let chromiumVersion = 'n/a'; let appUrl;
const pageErrors = [];

async function newPage(seed) {
  const context = await browser.newContext({ viewport: VIEWPORT, reducedMotion: 'reduce' });
  await context.addInitScript(LIFECYCLE_PROBE);
  if (seed) await context.addInitScript(seed);
  await context.route((url) => !url.href.startsWith(appUrl), (route) => route.fulfill({ status: 204, body: '' })); // remote favicon
  context.on('weberror', (e) => pageErrors.push(`pageerror: ${e.error().message}`));
  context.on('console', (m) => { if (m.type() === 'error') pageErrors.push(`console.error: ${m.text().slice(0, 200)}`); });
  const page = await context.newPage();
  return { context, page };
}

async function main() {
  appUrl = await startDevServer();
  browser = await chromium.launch();
  chromiumVersion = browser.version();

  // ---------- Initialization twice (load, then reload with saved state)
  {
    const { context, page } = await newPage();
    await page.goto(appUrl);
    await waitForApp(page);
    const first = await page.evaluate(() => window.__lifecycle());

    await check('init-renders-app-once', { rootChildren: 1, headers: 1, addInputs: 1, filters: 1 }, async () => {
      const actual = await page.evaluate(() => ({
        rootChildren: document.getElementById('root').children.length,
        headers: document.querySelectorAll('#root header').length,
        addInputs: document.querySelectorAll('#root input[placeholder="Add Item..."]').length,
        filters: document.querySelectorAll('#root select').length,
      }));
      return expectEqual(actual, { rootChildren: 1, headers: 1, addInputs: 1, filters: 1 }, 'app DOM duplicated on first init');
    });

    await addByEnter(page, 'Buy milk');
    await addByEnter(page, 'Write report');
    const beforeReload = await stored(page);

    await page.reload();
    await waitForApp(page);
    const second = await page.evaluate(() => window.__lifecycle());

    await check('reinit-restores-each-todo-once', { titles: ['Buy milk', 'Write report'], storedCount: 2 }, async () => {
      const titles = await cardTitles(page);
      const after = await stored(page);
      return expectEqual({ titles, storedCount: after.length }, { titles: beforeReload.map((t) => t.title), storedCount: 2 }, 'todos duplicated or lost after re-initialization');
    });

    await check('reinit-same-listeners-and-no-app-timers', { sameListenersAsFirstInit: true, appIntervals: 0 }, async () => {
      const actual = { sameListenersAsFirstInit: JSON.stringify(first.listeners) === JSON.stringify(second.listeners), appIntervals: second.appIntervals, firstTotal: first.listenerTotal, secondTotal: second.listenerTotal };
      expectOk(actual.sameListenersAsFirstInit && actual.appIntervals === 0, 'listeners/timers differ after second initialization', { ...actual, first: first.listeners, second: second.listeners });
      return actual;
    });

    // ---------- Repeated interactions: one update each, no listener growth
    await check('repeat-add-same-title-adds-exactly-one-each', { added: 2, cards: 4 }, async () => {
      await addByEnter(page, 'Stretch');
      await addByEnter(page, 'Stretch');
      const items = await stored(page);
      const cards = await page.locator(CARD).count();
      return expectEqual({ added: items.filter((t) => t.title === 'Stretch').length, cards }, { added: 2, cards: 4 }, 'repeat add did not add exactly one todo per action');
    });

    await check('repeat-toggle-complete-flips-one-todo', { afterFirst: [true, false], afterSecond: [false, false] }, async () => {
      const first2 = (await stored(page)).slice(0, 2).map((t) => t.id);
      const card = page.locator(CARD).first().locator('.font-medium');
      await card.click();
      const a = (await stored(page)).filter((t) => first2.includes(t.id)).map((t) => t.checked);
      await card.click();
      const b = (await stored(page)).filter((t) => first2.includes(t.id)).map((t) => t.checked);
      return expectEqual({ afterFirst: a, afterSecond: b }, { afterFirst: [true, false], afterSecond: [false, false] }, 'toggle changed the wrong number of todos');
    });

    await check('repeat-theme-toggle-and-filter-no-growth', { darkAfter4Toggles: 'true', cardsAfterFilters: 4, listenerTotalUnchanged: true, appIntervals: 0 }, async () => {
      const before = await page.evaluate(() => window.__lifecycle());
      const themeBtn = page.locator('header button').nth(1);
      for (let i = 0; i < 4; i++) await themeBtn.click();
      for (const v of ['tags', 'all', 'tags', 'all']) await page.selectOption('#root select', v);
      const after = await page.evaluate(() => window.__lifecycle());
      const actual = {
        darkAfter4Toggles: await page.evaluate(() => localStorage.getItem('DarkMode')),
        cardsAfterFilters: await page.locator(CARD).count(),
        listenerTotalUnchanged: before.listenerTotal === after.listenerTotal,
        appIntervals: after.appIntervals,
      };
      return expectEqual(actual, { darkAfter4Toggles: 'true', cardsAfterFilters: 4, listenerTotalUnchanged: true, appIntervals: 0 }, 'repeated toggles changed state or grew listeners');
    });

    await page.screenshot({ path: join(EVIDENCE_DIR, `reinit-${label}.png`) }).catch(() => {});
    await context.close();
  }

  // ---------- Two todos added in the same millisecond
  {
    const { context, page } = await newPage();
    await page.clock.setFixedTime(new Date('2026-01-01T10:00:00Z')); // Date.now() does not advance between the two adds
    await page.goto(appUrl);
    await waitForApp(page);
    await check('same-millisecond-adds-get-unique-ids', { uniqueIds: 2, cards: 2 }, async () => {
      await addByEnter(page, 'Alpha');
      await addByEnter(page, 'Beta');
      const items = await stored(page);
      return expectEqual({ uniqueIds: new Set(items.map((t) => t.id)).size, cards: await page.locator(CARD).count() }, { uniqueIds: 2, cards: 2 }, `ids: ${items.map((t) => t.id).join(', ')}`);
    });
    await check('same-millisecond-toggle-one-changes-one', { Alpha: true, Beta: false }, async () => {
      await page.locator(CARD, { hasText: 'Alpha' }).locator('.font-medium').click();
      const items = await stored(page);
      return expectEqual(Object.fromEntries(items.map((t) => [t.title, t.checked])), { Alpha: true, Beta: false }, 'clicking one todo completed both');
    });
    await page.screenshot({ path: join(EVIDENCE_DIR, `same-ms-click-alpha-${label}.png`) }).catch(() => {});
    await context.close();
  }

  // ---------- Saved data that already contains a repeated id (from older versions)
  {
    const seed = `if (location.protocol.startsWith('http') && !sessionStorage.getItem('seeded')) {
      sessionStorage.setItem('seeded', '1');
      localStorage.setItem('TodoListItems', JSON.stringify([
        { id: 'tl1767261600000', title: 'Old one', pinned: false, checked: false, recurring: false, tag: 'personal' },
        { id: 'tl1767261600000', title: 'Old two', pinned: false, checked: false, recurring: false, tag: 'personal' }
      ]));
    }`;
    const { context, page } = await newPage(seed);
    await page.goto(appUrl);
    await waitForApp(page);
    await check('saved-duplicate-ids-render-and-toggle-once', { cards: 2, toggled: { 'Old one': true, 'Old two': false } }, async () => {
      const cards = await page.locator(CARD).count();
      await page.locator(CARD, { hasText: 'Old one' }).locator('.font-medium').click();
      const items = await stored(page);
      return expectEqual({ cards, toggled: Object.fromEntries(items.map((t) => [t.title, t.checked])) }, { cards: 2, toggled: { 'Old one': true, 'Old two': false } }, 'saved todos with a shared id toggle together');
    });
    await context.close();
  }

  // ---------- Daily reset of recurring todos runs once per day, even across re-inits
  {
    const seed = `if (location.protocol.startsWith('http') && !sessionStorage.getItem('seeded')) {
      sessionStorage.setItem('seeded', '1');
      localStorage.setItem('todoLastUpdateDate', 'yesterday');
      localStorage.setItem('TodoListItems', JSON.stringify([
        { id: 'tl-daily', title: 'Daily walk', pinned: false, checked: true, recurring: true, tag: 'personal' }
      ]));
    }`;
    const { context, page } = await newPage(seed);
    await page.goto(appUrl);
    await waitForApp(page);
    await check('daily-reset-once-per-day-across-reinit', { afterFirstInit: false, afterUserChecks: true, afterReinitSameDay: true }, async () => {
      const afterFirstInit = (await stored(page))[0].checked;
      await page.locator(CARD).first().locator('.font-medium').click();
      const afterUserChecks = (await stored(page))[0].checked;
      await page.reload();
      await waitForApp(page);
      const afterReinitSameDay = (await stored(page))[0].checked;
      return expectEqual({ afterFirstInit, afterUserChecks, afterReinitSameDay }, { afterFirstInit: false, afterUserChecks: true, afterReinitSameDay: true }, 'daily reset ran the wrong number of times');
    });
    await context.close();
  }

  await check('no-page-errors', [], async () => expectEqual(pageErrors, [], 'page errors / console errors'));
}

let fatal = null;
try {
  await mkdir(EVIDENCE_DIR, { recursive: true });
  await main();
} catch (err) {
  fatal = err;
} finally {
  await browser?.close().catch(() => {});
  await stopDevServer();
}

// Cleanup itself is checked: the dev server must be gone.
const serverStopped = !devServer || devServer.exitCode !== null || devServer.signalCode !== null;
results.push({ name: 'cleanup-dev-server-stopped', status: serverStopped ? 'pass' : 'fail', expected: true, actual: serverStopped });

const failed = results.filter((r) => r.status === 'fail');
const report = {
  task: 'R60-T004', label, app: 'public/TodoList-React-TS-Tailwind', date: new Date().toISOString(),
  tools: {
    node: process.version,
    playwright: (await import('playwright/package.json', { with: { type: 'json' } })).default.version,
    chromium: chromiumVersion,
    server: 'npm run dev (vite, React StrictMode dev build)',
    os: `${os.type()} ${os.release()}`,
  },
  inputs: {
    viewport: `${VIEWPORT.width}x${VIEWPORT.height}`,
    actions: ['add "Buy milk" + "Write report", reload', 'add "Stretch" twice', 'toggle first todo twice', 'theme toggle x4, filter tags/all x2',
      'fixed clock 2026-01-01T10:00:00Z: add "Alpha" + "Beta"', 'seeded storage: two todos sharing id tl1767261600000',
      'seeded storage: recurring checked todo, lastUpdate "yesterday", then check + reload'],
    probe: 'counts listeners on window/document/#root and setInterval timers created from /src/',
  },
  summary: { total: results.length, passed: results.length - failed.length, failed: failed.length, fatal: fatal ? String(fatal.stack || fatal) : null },
  results,
};
await writeFile(join(EVIDENCE_DIR, `results-${label}.json`), JSON.stringify(report, null, 2)).catch(() => {});

for (const r of results) console.log(`${r.status === 'pass' ? 'PASS' : 'FAIL'}  ${r.name}${r.error ? `\n      ${r.error.split('\n')[0]}` : ''}`);
console.log(`\n${report.summary.passed}/${results.length} checks passed -> work/R60-T004/results-${label}.json`);
if (fatal) console.error('FATAL:', fatal);
process.exit(fatal || failed.length ? 1 : 0);
