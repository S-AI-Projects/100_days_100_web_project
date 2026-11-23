import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const PORT = 4173;
const PAGE_URL = `http://127.0.0.1:${PORT}/public/cosmic-quiz-quest/`;
const WIDTHS = [360, 1280];

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

let browser;
try {
  await waitForServer();
  browser = await chromium.launch();

  for (const width of WIDTHS) {
    const label = `[${width}px]`;
    const context = await browser.newContext({
      reducedMotion: 'reduce',
      viewport: { width, height: 800 },
    });
    const page = await context.newPage();

    const pageErrors = [];
    page.on('pageerror', (e) => pageErrors.push(e));

    await page.addInitScript(() => {
      window.__raf = 0;
      const orig = window.requestAnimationFrame.bind(window);
      window.requestAnimationFrame = (cb) => {
        window.__raf++;
        return orig(cb);
      };
    });

    await page.goto(PAGE_URL);

    // Check 1: starfield loop stops with reduced motion
    await page.waitForTimeout(600);
    const first = await page.evaluate(() => window.__raf);
    await page.waitForTimeout(600);
    const second = await page.evaluate(() => window.__raf);
    assert.equal(second, first, `${label} Starfield keeps animating`);

    // Check 2: no infinite CSS animations
    const infinite = await page.evaluate(() =>
      [...document.querySelectorAll('*')]
        .filter((el) => {
          const s = getComputedStyle(el);
          return s.animationName !== 'none' && s.animationIterationCount === 'infinite';
        })
        .map((el) => el.id || el.className || el.tagName)
    );
    assert.deepEqual(infinite, [], `${label} Infinite CSS animations: ${infinite.join(', ')}`);

    // Check 3: information and controls stay usable
    assert.ok(await page.locator('#setup-screen').isVisible(), `${label} setup screen hidden`);
    assert.ok(await page.locator('#sound-toggle-btn').isVisible(), `${label} sound button hidden`);
    assert.ok(await page.locator('#start-quest-btn').isVisible(), `${label} start button hidden`);
    const best = await page.locator('#best-score-display').innerText();
    assert.match(best, /^\d+ \/ \d+$/, `${label} best score text wrong: ${best}`);

    // Check 4: every keyboard-focused element shows a visible focus outline
    const seen = [];
    for (let i = 0; i < 8; i++) {
      await page.keyboard.press('Tab');
      const info = await page.evaluate(() => {
        const el = document.activeElement;
        const s = getComputedStyle(el);
        const r = el.getBoundingClientRect();
        return {
          id: el.id,
          label: el.id || el.className || el.tagName,
          focusVisible: el.matches(':focus-visible'),
          outlineStyle: s.outlineStyle,
          outlineWidth: parseFloat(s.outlineWidth),
          inView: r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight,
        };
      });
      seen.push(info.id);
      assert.ok(info.focusVisible, `${label} ${info.label} not focus-visible`);
      assert.ok(info.inView, `${label} ${info.label} focused but not in view`);
      assert.ok(
        info.outlineStyle !== 'none' && info.outlineWidth > 0,
        `${label} ${info.label} has no visible focus outline`
      );
    }
    assert.ok(seen.includes('sound-toggle-btn'), `${label} keyboard never reached sound toggle`);
    assert.ok(seen.includes('start-quest-btn'), `${label} keyboard never reached start button`);

    // Check 5: computed layout - no sideways scrolling
    const overflow = await page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      view: document.documentElement.clientWidth,
    }));
    assert.ok(overflow.scroll <= overflow.view, `${label} page scrolls sideways (${overflow.scroll} > ${overflow.view})`);

    // Check 6: event effects - Enter on a card and a difficulty button changes the active one
    await page.locator('[data-category="nature"]').focus();
    await page.keyboard.press('Enter');
    assert.match(await page.locator('[data-category="nature"]').getAttribute('class'), /active/, `${label} nature card not active`);
    assert.doesNotMatch(await page.locator('[data-category="cosmos"]').getAttribute('class'), /active/, `${label} cosmos card still active`);
    await page.locator('[data-difficulty="hard"]').focus();
    await page.keyboard.press('Enter');
    assert.match(await page.locator('[data-difficulty="hard"]').getAttribute('class'), /active/, `${label} hard button not active`);
    assert.doesNotMatch(await page.locator('[data-difficulty="easy"]').getAttribute('class'), /active/, `${label} easy button still active`);

    // Check 7: quiz screen and results screen stay usable and keyboard-reachable
    await page.locator('#start-quest-btn').focus();
    await page.keyboard.press('Enter');
    await page.locator('#quiz-screen').waitFor({ state: 'visible' });
    const qText = await page.locator('#question-text').innerText();
    assert.ok(qText.length > 0 && !qText.includes('Loading'), `${label} question text not loaded: ${qText}`);
    const options = page.locator('#options-container .option-card');
    assert.equal(await options.count(), 4, `${label} expected 4 options`);
    for (let i = 0; i < 4; i++) {
      assert.ok(await options.nth(i).isVisible(), `${label} option ${i} hidden`);
    }
    let optionFocusCount = 0;
    for (let i = 0; i < 6; i++) {
      await page.keyboard.press('Tab');
      const f = await page.evaluate(() => {
        const el = document.activeElement;
        const st = getComputedStyle(el);
        return {
          isOption: el.classList.contains('option-card'),
          fv: el.matches(':focus-visible'),
          style: st.outlineStyle,
          width: parseFloat(st.outlineWidth),
          label: el.id || el.className || el.tagName,
        };
      });
      assert.ok(f.fv && f.style !== 'none' && f.width > 0, `${label} ${f.label} has no visible focus outline on quiz screen`);
      if (f.isOption) optionFocusCount++;
      if (optionFocusCount === 4) break;
    }
    assert.equal(optionFocusCount, 4, `${label} keyboard did not reach all 4 options`);
    const total = parseInt((await page.locator('#question-number').innerText()).match(/of (\d+)/)[1], 10);
    for (let q = 0; q < total; q++) {
      await options.nth(0).click();
      await page.locator('#next-question-btn:not([disabled])').waitFor();
      await page.locator('#next-question-btn').click();
    }
    await page.locator('#results-screen').waitFor({ state: 'visible' });
    for (const id of ['#restart-quest-btn', '#share-score-btn', '#final-rank-title']) {
      assert.ok(await page.locator(id).isVisible(), `${label} ${id} hidden on results screen`);
    }
    assert.match(await page.locator('#final-score-fraction').innerText(), /^\d+ \/ \d+$/, `${label} final score text wrong`);

    assert.equal(pageErrors.length, 0, `${label} Unexpected page errors`);
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
