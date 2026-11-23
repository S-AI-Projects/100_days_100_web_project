import { run } from './harness.mjs';

await run('R60-T034', async ({ origin, fresh, record, screenshot }) => {
  const { context, page } = await fresh();
  await page.clock.install({ time: new Date('2026-01-01T12:00:00Z') });
  await context.addInitScript(() => {
    Math.random = () => 0.5; // dice roll = 4, no snake/ladder on square 5
    // The test never opens or requests audio hardware.
    const param = { setValueAtTime() {}, exponentialRampToValueAtTime() {}, value: 0 };
    window.AudioContext = class {
      currentTime = 0; destination = {};
      createOscillator() { return { frequency: param, connect() {}, start() {}, stop() {} }; }
      createGain() { return { gain: param, connect() {} }; }
    };
  });
  await page.goto(`${origin}/public/snakeladder/index.html`);
  await page.locator('#p1-name').fill('Ayushi');
  await page.locator('#p2-name').fill('Guest');
  await page.evaluate(() => { startGame(); startGame(); });
  await page.clock.runFor(150);
  record('Double start creates one history entry', 1, await page.locator('#history-log .log-entry').count());
  record('Exactly two player tokens', 2, await page.locator('#board-grid > div > div').count());
  record('One canvas', 1, await page.locator('#game-canvas').count());
  record('Player name', 'Ayushi', await page.locator('#p1-display-name').innerText());
  for (let i = 0; i < 2; i++) {
    await page.evaluate(() => { restartGame(); restartGame(); });
    await page.clock.runFor(150);
    record(`Restart ${i}: one log`, 1, await page.locator('#history-log .log-entry').count());
    record(`Restart ${i}: two tokens`, 2, await page.locator('#board-grid > div > div').count());
    record(`Restart ${i}: moves reset`, '0', await page.locator('#p1-moves').innerText());
    await page.locator('#roll-btn').click();
    await page.clock.runFor(2000);
    record(`Restart ${i}: one roll increments once`, '1', await page.locator('#p1-moves').innerText());
    record(`Restart ${i}: one move to square 5`, '5', await page.locator('#p1-pos').innerText());
    record(`Restart ${i}: turn changes once`, 'Guest', await page.locator('#turn-name').innerText());
  }
  await page.evaluate(() => { launchConfetti(); launchConfetti(); });
  record('Repeated celebration has 120 pieces', 120, await page.locator('.confetti-piece').count());
  await page.clock.runFor(4100);
  record('Celebration cleans up', 0, await page.locator('.confetti-piece').count());
  await screenshot(page, 'restarted');
  await context.close(); // destroys test-owned clocks, listeners and timers
});
