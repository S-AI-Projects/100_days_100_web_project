import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { chromium } from 'playwright';

const PORT = 4173;
const URL = `http://127.0.0.1:${PORT}/public/Time-Capsule/`;
const server = spawn(process.execPath, ['node_modules/serve/build/main.js', '.', '-l', String(PORT)], { stdio: 'ignore' });

let browser;
try {
  for (let i = 0; i < 50; i++) { try { if ((await fetch(URL)).ok) break; } catch {} await new Promise(r => setTimeout(r, 200)); }
  browser = await chromium.launch();
  const out = { tool: `playwright chromium ${browser.version()}`, node: process.version, cases: {} };

  async function run(name, blockStorage) {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    if (blockStorage) {
      await page.addInitScript(() => {
        Object.defineProperty(window, 'localStorage', {
          get() { throw new DOMException('The operation is insecure.', 'SecurityError'); },
        });
      });
    }
    await page.goto(URL);
    await page.fill('#message', 'hello future me');
    await page.click('button[type=submit]');
    await page.waitForTimeout(300);
    out.cases[name] = {
      capsuleRevealClass: await page.getAttribute('#capsuleReveal', 'class'),
      revealTime: await page.textContent('#revealTime'),
      errText: await page.textContent('#err'),
      messageAfterSubmit: await page.inputValue('#message'),
      storedCapsules: blockStorage ? 'n/a' : await page.evaluate(() => localStorage.getItem('capsules')),
      pageErrors: errors,
    };
    await ctx.close();
  }

  await run('supported', false);
  await run('storage-blocked', true);
  writeFileSync('work/R60-T046/after.json', JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 2));
} finally {
  if (browser) await browser.close();
  server.kill();
}
