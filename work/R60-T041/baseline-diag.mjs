import { spawn } from 'node:child_process';
import { chromium } from 'playwright';

const PORT = 4174;
const URL = `http://127.0.0.1:${PORT}/public/Travel_booking_website/`;
const server = spawn(process.execPath, ['node_modules/serve/build/main.js', '.', '-l', String(PORT)], { stdio: 'ignore' });
for (let i = 0; i < 50; i++) {
  try { if ((await fetch(URL)).ok) break; } catch {}
  await new Promise((r) => setTimeout(r, 200));
}
const browser = await chromium.launch();
const page = await (await browser.newContext()).newPage();
page.on('response', (r) => { if (r.url().endsWith('.css')) console.log('CSS', r.status(), r.url()); });
await page.goto(URL);
console.log(await page.evaluate(() => {
  const el = document.getElementById('chatbot-box');
  const s = getComputedStyle(el);
  return JSON.stringify({ display: s.display, visibility: s.visibility, inlineStyle: el.getAttribute('style'), width: s.width, height: s.height });
}));
await browser.close();
server.kill();
