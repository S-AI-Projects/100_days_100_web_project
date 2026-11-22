import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const PORT = 4173;
// Trailing slash is required: `serve` redirects /index.html to the folder URL,
// and relative style.css/script.js only resolve correctly from the folder URL.
const PAGE_URL = `http://127.0.0.1:${PORT}/public/boardgame-companion/`;
const WIDTHS = [
  [360, 800],
  [1280, 800],
];
const KEY = [
  '.game-container',
  '#player1-card',
  '#p1-score',
  '#player2-card',
  '#p2-score',
  '#roll-btn',
];
const TRIVIA_KEY = ['#trivia-box', '#reveal-btn'];
const ANSWER_KEY = ['#answer-block', '#correct-btn', '#wrong-btn'];

const server = spawn(
  process.execPath,
  ['node_modules/serve/build/main.js', '.', '-l', String(PORT)],
  { stdio: 'ignore' }
);

async function waitForServer() {
  for (let i = 0; i < 50; i++) {
    try {
      const res = await fetch(PAGE_URL);
      if (res.ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error('Server did not become ready');
}

async function box(page, sel) {
  const b = await page.locator(sel).boundingBox();
  assert.ok(b, `${sel} is not visible`);
  return b;
}

async function assertNoHorizontalOverflow(page, w, label) {
  const { sw, cw } = await page.evaluate(() => ({
    sw: document.documentElement.scrollWidth,
    cw: document.documentElement.clientWidth,
  }));
  assert.ok(sw <= cw, `[${w}] ${label}: page scrolls horizontally (${sw} > ${cw})`);
}

async function assertInsideViewport(page, w, sels, label) {
  for (const sel of sels) {
    const b = await box(page, sel);
    assert.ok(
      b.x >= -0.5 && b.x + b.width <= w + 0.5,
      `[${w}] ${label}: ${sel} is clipped (x=${b.x}, width=${b.width})`
    );
  }
}

async function assertTextFits(page, w, sels, label) {
  for (const sel of sels) {
    const fits = await page.locator(sel).evaluate((e) => e.scrollWidth <= e.clientWidth);
    assert.ok(fits, `[${w}] ${label}: content of ${sel} is clipped`);
  }
}

let browser;
try {
  await waitForServer();
  browser = await chromium.launch();

  for (const [w, h] of WIDTHS) {
    // Fresh browser context per width
    const context = await browser.newContext({ viewport: { width: w, height: h } });
    const page = await context.newPage();

    const pageErrors = [];
    page.on('pageerror', (e) => pageErrors.push(e));

    // Stub the trivia network call
    await page.route('**/opentdb.com/**', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          response_code: 0,
          results: [{ question: 'Stub question?', correct_answer: 'Stub answer' }],
        }),
      })
    );

    await page.goto(PAGE_URL);

    // Styles must actually be applied (guards against wrong asset paths)
    const maxWidth = await page.locator('.game-container').evaluate((e) => getComputedStyle(e).maxWidth);
    assert.equal(maxWidth, '600px', `[${w}] style.css was not applied`);

    // Initial state
    await assertNoHorizontalOverflow(page, w, 'initial');
    await assertInsideViewport(page, w, KEY, 'initial');
    await assertTextFits(page, w, ['#player1-card', '#player2-card'], 'initial');

    // Content order: players side by side, left to right; then top to bottom
    const p1 = await box(page, '#player1-card');
    const p2 = await box(page, '#player2-card');
    assert.ok(p1.x + p1.width <= p2.x + 0.5, `[${w}] Player 1 card must be left of Player 2 card`);
    const h1 = await box(page, 'h1');
    const dice = await box(page, '#dice');
    const roll = await box(page, '#roll-btn');
    assert.ok(h1.y < p1.y && p1.y < dice.y && dice.y < roll.y, `[${w}] vertical content order is wrong`);

    // The scores sit inside their own cards
    for (const [card, score] of [['#player1-card', '#p1-score'], ['#player2-card', '#p2-score']]) {
      const c = await box(page, card);
      const s = await box(page, score);
      assert.ok(s.x >= c.x - 0.5 && s.x + s.width <= c.x + c.width + 0.5, `[${w}] ${score} is outside ${card}`);
    }

    // No intentionally scrollable regions exist on this page
    const scrollRegions = await page.evaluate(() =>
      [...document.querySelectorAll('*')].filter((e) => {
        const o = getComputedStyle(e).overflowX;
        return o === 'auto' || o === 'scroll';
      }).length
    );
    assert.equal(scrollRegions, 0, `[${w}] unexpected scroll region found`);

    // Roll -> trivia appears
    await page.click('#roll-btn');
    await page.waitForSelector('#trivia-box:not(.hidden)');
    await page.waitForFunction(() => document.querySelector('#question-text').textContent === 'Stub question?');
    await assertNoHorizontalOverflow(page, w, 'after roll');
    await assertInsideViewport(page, w, TRIVIA_KEY, 'after roll');
    const trivia = await box(page, "#trivia-box");
    const rollNow = await box(page, "#roll-btn");
    assert.ok(trivia.y > rollNow.y, `[${w}] trivia must come after the roll button`);

    // Reveal -> answer and scoring buttons usable
    await page.click('#reveal-btn');
    await page.waitForSelector('#answer-block:not(.hidden)');
    assert.equal(await page.textContent('#answer-text'), 'Answer: Stub answer');
    await assertNoHorizontalOverflow(page, w, 'after reveal');
    await assertInsideViewport(page, w, ANSWER_KEY, 'after reveal');

    // Correct -> Player 1 scores, turn passes to Player 2
    await page.click('#correct-btn');
    assert.equal(await page.textContent('#p1-score'), '1');
    assert.equal(await page.textContent('#p2-score'), '0');
    assert.ok(await page.locator('#player2-card.active').count(), `[${w}] turn did not pass to Player 2`);
    assert.equal(await page.locator('#player1-card.active').count(), 0);
    await assertNoHorizontalOverflow(page, w, 'after scoring');

    assert.equal(pageErrors.length, 0, `[${w}] Unexpected page errors: ${pageErrors.join(', ')}`);
    console.log(`PASS ${w}x${h}`);
    await context.close();
  }
  console.log('PASS');
} catch (err) {
  console.error('FAIL', err);
  process.exitCode = 1;
} finally {
  if (browser) await browser.close();
  server.kill();
}
