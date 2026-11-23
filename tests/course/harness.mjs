import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { once } from 'node:events';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { chromium } from 'playwright';

const require = createRequire(import.meta.url);
export const root = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const types = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp' };

// This is the documented static server for these checks. Binding port 0 avoids
// collisions; awaiting listen and a successful HTTP response establishes readiness.
async function staticServer() {
  const server = createServer(async (req, res) => {
    try {
      if (req.url === '/favicon.ico') { res.writeHead(204); res.end(); return; }
      const path = resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname));
      assert.ok(path.startsWith(root + sep), 'Path must remain inside the checkout');
      const body = await readFile(path.endsWith(sep) ? path + 'index.html' : path);
      res.writeHead(200, { 'Content-Type': types[extname(path)] || 'application/octet-stream' });
      res.end(body);
    } catch {
      res.writeHead(404); res.end('Not found');
    }
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  return { origin: `http://127.0.0.1:${server.address().port}`, close: () => new Promise((done) => { server.closeAllConnections(); server.close(done); }) };
}

async function viteServer() {
  const server = await staticServer();
  const port = Number(new URL(server.origin).port);
  await server.close();
  const cwd = resolve(root, 'public/SnapScribe');
  const child = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], { cwd, stdio: ['ignore', 'pipe', 'pipe'] });
  let logs = '';
  child.stdout.on('data', (s) => { logs += s; });
  child.stderr.on('data', (s) => { logs += s; });
  const close = async () => {
    if (child.exitCode === null) { child.kill('SIGTERM'); await once(child, 'exit'); }
  };
  try {
    for (let attempt = 0; attempt < 150; attempt++) {
      if (child.exitCode !== null) throw new Error(`Vite exited: ${logs}`);
      try { if ((await fetch(server.origin)).ok) return { origin: server.origin, close }; } catch { /* wait for Vite */ }
      await new Promise((done) => setTimeout(done, 100));
    }
    throw new Error(`Vite did not become ready: ${logs}`);
  } catch (err) { await close(); throw err; }
}

export async function run(task, check, { vite = false } = {}) {
  const evidence = resolve(root, 'work', task);
  const phase = process.env.COURSE_PHASE || 'after';
  assert.ok(['baseline', 'after'].includes(phase));
  await mkdir(evidence, { recursive: true });
  let server, browser;
  const contexts = [];
  const observations = [];
  const errors = [];
  const report = { task, phase, time: new Date().toISOString(), node: process.version, playwright: require('playwright/package.json').version, observations };
  try {
    server = await (vite ? viteServer() : staticServer());
    assert.equal((await fetch(server.origin + (vite ? '/' : '/README.md'))).status, 200, 'Server ready');
    browser = await chromium.launch();
    report.chromium = browser.version();
    const fresh = async (options = {}) => {
      const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, locale: 'en-US', timezoneId: 'UTC', serviceWorkers: 'block', ...options });
      contexts.push(context);
      // No public services are needed. Each task explicitly supplies functional
      // fixtures before navigation; decorative third-party CSS/scripts are empty.
      await context.route('**/*', async (route) => {
        if (new URL(route.request().url()).origin === server.origin) return route.continue();
        const type = route.request().resourceType();
        if (['stylesheet', 'script', 'font', 'image'].includes(type)) return route.fulfill({ status: 200, contentType: type === 'script' ? 'text/javascript' : type === 'stylesheet' ? 'text/css' : 'application/octet-stream', body: '' });
        errors.push(`Unexpected external request: ${route.request().url()}`);
        await route.abort();
      });
      const page = await context.newPage();
      page.on('pageerror', (err) => errors.push(err.message));
      page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
      page.setDefaultTimeout(10000);
      return { context, page };
    };
    const record = (name, expected, actual) => {
      observations.push({ name, expected, actual });
      assert.deepEqual(actual, expected, name);
    };
    const screenshot = async (page, name) => page.screenshot({ path: resolve(evidence, `${phase}-${name}.png`), fullPage: true, animations: 'disabled' });
    await check({ origin: server.origin, fresh, record, screenshot, evidence, observations });
    assert.deepEqual(errors, [], 'No unexpected page or console errors');
    report.status = 'passed';
    console.log(`${task}: passed (${observations.length} checks)`);
  } catch (err) {
    report.status = 'failed'; report.error = err.stack; report.pageErrors = errors;
    for (const [i, context] of contexts.entries()) {
      for (const [j, page] of context.pages().entries()) await page.screenshot({ path: resolve(evidence, `${phase}-failure-${i}-${j}.png`), fullPage: true }).catch(() => {});
    }
    throw err;
  } finally {
    await Promise.all(contexts.map((c) => c.close()));
    await browser?.close();
    await server?.close();
    await writeFile(resolve(evidence, `${phase}.json`), JSON.stringify(report, null, 2) + '\n');
  }
}
