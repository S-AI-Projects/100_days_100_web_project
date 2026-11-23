import { run } from './harness.mjs';

await run('R60-T033', async ({ origin, fresh, record, screenshot }) => {
  const { context, page } = await fresh();
  // A fresh localStorage context is the empty-result fixture. The app simulates
  // its market locally; no fictional stock API is introduced.
  await page.clock.install({ time: new Date('2026-01-01T12:00:00Z') });
  await context.addInitScript(() => { Math.random = () => 0.5; });
  await page.goto(`${origin}/public/stock-market-simulator/index.html`);
  record('Empty holdings', 'No holdings yet', await page.locator('#portfolio').innerText());
  record('Empty transaction history', 'No transactions yet', await page.locator('#history').innerText());
  record('Empty news', 'No recent news', await page.locator('#marketNews').innerText());
  record('Initial balance', '₹100000.00', await page.locator('#balance').innerText());
  record('Initial portfolio value', '₹0.00', await page.locator('#portfolioValue').innerText());
  record('Initial profit/loss', '₹0.00', await page.locator('#pl').innerText());
  await screenshot(page, 'empty');
  page.on('dialog', async (dialog) => {
    if (dialog.type() === 'prompt') await dialog.accept('2');
    else await dialog.accept();
  });
  await page.locator('#market tr').first().locator('.buy').click();
  record('Recovery creates one holding', 1, await page.locator('#portfolio .portfolio-item').count());
  record('Recovery creates one transaction', 1, await page.locator('#history .history-item').count());
  record('Purchase balance', '₹99650.00', await page.locator('#balance').innerText());
  record('Purchase portfolio value', '₹350.00', await page.locator('#portfolioValue').innerText());
  record('Purchase preserves profit/loss', '₹0.00', await page.locator('#pl').innerText());
  await screenshot(page, 'recovered');
  await page.reload();
  record('Holding survives reload', 1, await page.locator('#portfolio .portfolio-item').count());
  await page.locator('#market tr').first().locator('.sell').click();
  record('Selling all shares restores empty state', 'No holdings yet', await page.locator('#portfolio').innerText());
  record('Sale restores balance', '₹100000.00', await page.locator('#balance').innerText());
});
