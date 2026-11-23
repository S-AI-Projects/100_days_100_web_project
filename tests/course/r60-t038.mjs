import assert from 'node:assert/strict';
import { run } from './harness.mjs';

const payload = '<img src=x onerror="window.__injected=1">';
await run('R60-T038', async ({ origin, fresh, record, screenshot }) => {
  const { context, page } = await fresh();
  await context.addInitScript(() => { window.__injected = 0; });
  await context.route('**/SQLVisulizer/js/data/sampleData.js', async (route) => {
    const response = await route.fetch();
    const source = await response.text();
    assert.ok(source.includes("'Alice Johnson'"), 'Fixture row exists');
    await route.fulfill({ response, body: source.replace("'Alice Johnson'", JSON.stringify(payload)) });
  });
  await page.goto(`${origin}/public/SQLVisulizer/index.html`);
  await page.locator('#table-list .table-item').first().click();
  record('Fixture cell rendered literally', payload, await page.locator('#modal-body td').filter({ hasText: payload }).innerText());
  record('No fixture-created image in table', 0, await page.locator('#modal-body img').count());
  await page.locator('.modal-close').click();
  const sql = `SELECT name FROM employees WHERE name = '${payload}'`;
  await page.locator('#sql-editor').fill(sql);
  record('Highlight preserves text', sql, (await page.locator('#editor-highlight').textContent()).trimEnd());
  record('No injected element in editor', 0, await page.locator('#editor-highlight img').count());
  await page.locator('#save-query').click();
  await page.locator('#sql-editor').fill('SELECT * FROM departments');
  await page.locator('#load-query').click();
  record('Saved query round trip', sql, await page.locator('#sql-editor').inputValue());
  await page.locator('#run-query').click();
  await page.locator('#step-indicator').waitFor();
  for (let i = 0; i < 10 && await page.locator('#step-next').isEnabled(); i++) await page.locator('#step-next').click();
  record('Result text matches fixture', payload, await page.locator('#viz-content td').filter({ hasText: payload }).innerText());
  record('No injected element in result', 0, await page.locator('#viz-content img').count());
  record('No handler executed', 0, await page.evaluate(() => window.__injected));
  record('No unexpected x request', 0, await page.locator('img[src="x"]').count());
  await screenshot(page, 'literal-result');
});
