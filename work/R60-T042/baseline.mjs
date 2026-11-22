import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { chromium } from 'playwright';

const PORT = 4173;
const URL = `http://127.0.0.1:${PORT}/public/boardgame-companion/`;
const server = spawn(process.execPath, ['node_modules/serve/build/main.js', '.', '-l', String(PORT)], { stdio: 'ignore' });

async function ready() {
  for (let i = 0; i < 50; i++) {
    try { if ((await fetch(URL)).ok) return; } catch {}
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error('Server not ready');
}

let browser;
try {
  await ready();
  browser = await chromium.launch();
  const out = { tool: `playwright chromium ${browser.version()}`, node: process.version, widths: {} };
  for (const [w, h] of [[360, 800], [1280, 800]]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h } });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    await page.goto(URL);
    out.widths[w] = await page.evaluate(() => {
      const d = document.documentElement;
      const r = (s) => { const b = document.querySelector(s).getBoundingClientRect(); return { left: b.left, right: b.right, top: b.top, width: b.width }; };
      const box = (s) => { const e = document.querySelector(s); return { scrollWidth: e.scrollWidth, clientWidth: e.clientWidth }; };
      return {
        docScrollWidth: d.scrollWidth,
        docClientWidth: d.clientWidth,
        container: r('.game-container'),
        p1: r('#player1-card'), p2: r('#player2-card'),
        p1Score: r('#p1-score'), p2Score: r('#p2-score'),
        p1Box: box('#player1-card'), p2Box: box('#player2-card'),
        rollBtn: r('#roll-btn'),
      };
    });
    out.widths[w].pageErrors = errors;
    await ctx.close();
  }
  writeFileSync('work/R60-T042/baseline.json', JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 2));
} finally {
  if (browser) await browser.close();
  server.kill();
}
