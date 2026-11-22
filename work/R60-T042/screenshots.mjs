import { spawn } from 'node:child_process';
import { chromium } from 'playwright';
const PORT = 4173;
const URL = `http://127.0.0.1:${PORT}/public/boardgame-companion/`;
const server = spawn(process.execPath, ['node_modules/serve/build/main.js', '.', '-l', String(PORT)], { stdio: 'ignore' });
let browser;
try {
  for (let i = 0; i < 50; i++) { try { if ((await fetch(URL)).ok) break; } catch {} await new Promise(r => setTimeout(r, 200)); }
  browser = await chromium.launch();
  for (const [w, h] of [[360, 800], [1280, 800]]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h } });
    const page = await ctx.newPage();
    await page.goto(URL);
    await page.screenshot({ path: `work/R60-T042/screenshot-${w}.png`, fullPage: true });
    await ctx.close();
  }
} finally {
  if (browser) await browser.close();
  server.kill();
}
