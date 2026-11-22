import { spawn } from 'node:child_process';
import { chromium } from 'playwright';
const PORT = 4173;
const URL = `http://127.0.0.1:${PORT}/public/boardgame-companion/`;
const server = spawn(process.execPath, ['node_modules/serve/build/main.js', '.', '-l', String(PORT)], { stdio: 'ignore' });
for (let i = 0; i < 50; i++) { try { if ((await fetch(URL)).ok) break; } catch {} await new Promise(r => setTimeout(r, 200)); }
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.on('response', r => console.log(r.status(), r.headers()['content-type'], r.url()));
await page.goto(URL);
console.log(await page.evaluate(() => {
  const b = getComputedStyle(document.body), c = getComputedStyle(document.querySelector('.game-container'));
  return JSON.stringify({ bodyDisplay: b.display, bodyBg: b.backgroundColor, containerMaxWidth: c.maxWidth, sheets: document.styleSheets.length });
}));
await browser.close(); server.kill();
