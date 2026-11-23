import { run } from './harness.mjs';

const movie = { Response: 'True', imdbID: 'tt-fixture', Title: 'Local Movie', Year: '2026', Poster: 'N/A', Genre: 'Drama', imdbRating: '8.0', Runtime: '90 min' };
await run('R60-T039', async ({ origin, fresh, record, screenshot }) => {
  for (const width of [360, 1280]) {
    for (const reducedMotion of ['no-preference', 'reduce']) {
      const { context, page } = await fresh({ viewport: { width, height: 800 }, reducedMotion });
      let resolveRequest;
      const requestGate = new Promise((done) => { resolveRequest = done; });
      await context.route('https://www.omdbapi.com/**', async (route) => { await requestGate; await route.fulfill({ json: movie }); });
      await context.route('https://via.placeholder.com/**', (route) => route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="60" height="90"><rect width="60" height="90" fill="#334155"/></svg>' }));
      await page.goto(`${origin}/public/movie-watchlist/index.html`);
      const prefix = `${width}/${reducedMotion}`;
      await page.locator('#search-input').fill('Local Movie');
      await page.keyboard.press('Tab');
      record(`${prefix}: Tab reaches search button`, 'search-btn', await page.evaluate(() => document.activeElement.id));
      const focus = await page.locator('#search-btn').evaluate((e) => { const s = getComputedStyle(e); return { style: s.outlineStyle, width: parseFloat(s.outlineWidth), color: s.outlineColor }; });
      record(`${prefix}: focus visible`, true, focus.style !== 'none' && focus.width >= 2 && focus.color !== 'rgba(0, 0, 0, 0)');
      await page.keyboard.press('Enter');
      await page.locator('.spinner').waitFor();
      const spinner = await page.locator('.spinner').evaluate((e) => getComputedStyle(e).animationName);
      record(`${prefix}: spinner motion preference`, reducedMotion === 'reduce' ? 'none' : 'spin', spinner);
      resolveRequest();
      await page.locator('#add-to-list-btn').waitFor();
      const animation = await page.locator('.movie-card').evaluate((e) => getComputedStyle(e).animationName);
      record(`${prefix}: card motion preference`, reducedMotion === 'reduce' ? 'none' : 'fadeInUp', animation);
      await page.locator('#add-to-list-btn').click();
      record(`${prefix}: added movie`, 'Local Movie', await page.locator('.watch-item h3').innerText());
      await page.locator('.btn-watch').click();
      record(`${prefix}: watched toggle works`, true, await page.locator('.btn-watch').evaluate((e) => e.classList.contains('is-watched')));
      record(`${prefix}: stats available`, ['1', '1', '8.0'], await page.locator('#stats-bar .stat-value').allTextContents());
      await screenshot(page, `${width}-${reducedMotion}`);
      await page.locator('.btn-del').click();
      await page.getByText('Your watchlist is empty.', { exact: true }).waitFor();
      record(`${prefix}: removal works`, 0, await page.locator('.watch-item').count());
      await context.close();
    }
  }
});
