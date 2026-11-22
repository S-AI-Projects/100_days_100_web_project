import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { chromium } from 'playwright';

const PORT = 4173;
const URL = `http://127.0.0.1:${PORT}/public/fake-hacker-terminal/`;
const server = spawn(process.execPath, ['node_modules/serve/build/main.js', '.', '-l', String(PORT)], { stdio: 'ignore' });

let browser;
try {
  for (let i = 0; i < 50; i++) { try { if ((await fetch(URL)).ok) break; } catch {} await new Promise(r => setTimeout(r, 200)); }
  browser = await chromium.launch();
  const out = { tool: `playwright chromium ${browser.version()}`, node: process.version, cases: {} };
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  const failed = [];
  page.on('requestfailed', (r) => failed.push(r.url()));
  page.on('response', (r) => { if (r.status() >= 400) failed.push(`${r.status()} ${r.url()}`); });
  await page.goto(URL);
  const text = () => page.locator('#output').innerText();
  for (const cmd of ['', '   ', 'xyz', 'constructor', 'help']) {
    await page.fill('#commandInput', cmd);
    await page.press('#commandInput', 'Enter');
    out.cases[JSON.stringify(cmd)] = { outputTail: (await text()).slice(-200), inputAfter: await page.inputValue('#commandInput') };
  }
  out.pageErrors = errors;
  out.failedRequests = failed;
  writeFileSync('work/R60-T043/baseline.json', JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 2));
} finally {
  if (browser) await browser.close();
  server.kill();
}
