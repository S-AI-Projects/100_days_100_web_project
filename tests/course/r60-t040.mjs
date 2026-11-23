import assert from 'node:assert/strict';
import { run } from './harness.mjs';

await run('R60-T040', async ({ origin, fresh, record, screenshot }) => {
  const { context, page } = await fresh();
  await page.goto(`${origin}/public/StatisticsDashboard/index.html`);
  const exercise = async (p) => {
    await p.locator('#totalGamesInput').fill('10');
    await p.locator('#xWinsInput').fill('6');
    await p.locator('#oWinsInput').fill('3');
    await p.locator('#drawsInput').fill('1');
    const values = await p.locator('#totalGamesDisplay,#xWinsDisplay,#oWinsDisplay,#drawsDisplay,#winRateX').allTextContents();
    assert.deepEqual(values, ['10', '6', '3', '1', '60.0%'], 'Input events must update the rendered summary');
    return values;
  };
  record('Real page responds to input', ['10', '6', '3', '1', '60.0%'], await exercise(page));
  await page.locator('#saveStats').click();
  record('Saved feedback', 'Statistics saved successfully.', await page.locator('#messageBox').innerText());
  await page.reload();
  record('Saved values survive reload', ['10', '6', '3', '1', '60.0%'], await page.locator('#totalGamesDisplay,#xWinsDisplay,#oWinsDisplay,#drawsDisplay,#winRateX').allTextContents());
  await screenshot(page, 'correct');
  const { context: brokenContext, page: broken } = await fresh();
  let mutated = false;
  await brokenContext.route('**/StatisticsDashboard/script.js', async (route) => {
    const response = await route.fetch();
    const source = await response.text();
    const anchor = 'input.addEventListener("input",';
    assert.equal(source.split(anchor).length - 1, 1, 'Exactly one event-binding mutation');
    mutated = true;
    await route.fulfill({ response, body: source.replace(anchor, 'input.addEventListener("course-disabled-input",') });
  });
  await broken.goto(`${origin}/public/StatisticsDashboard/index.html`);
  await assert.rejects(() => exercise(broken), (err) => err.code === 'ERR_ASSERTION' && err.message.includes('Input events must update the rendered summary'));
  record('Broken fixture was actually served', true, mutated);
  record('Mutation leaves summary stale', ['0', '0', '0', '0', '0%'], await broken.locator('#totalGamesDisplay,#xWinsDisplay,#oWinsDisplay,#drawsDisplay,#winRateX').allTextContents());
  await screenshot(broken, 'mutation');
  await brokenContext.close();
  page.once('dialog', (dialog) => dialog.accept());
  await page.locator('#resetStats').click();
  record('Real page resets all summary fields', ['0', '0', '0', '0', '0%'], await page.locator('#totalGamesDisplay,#xWinsDisplay,#oWinsDisplay,#drawsDisplay,#winRateX').allTextContents());
  await context.close();
});
