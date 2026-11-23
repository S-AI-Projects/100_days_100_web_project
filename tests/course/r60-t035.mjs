import { run } from './harness.mjs';

const events = [
  { year: 1969, title: 'Moon landing fixture', category: 'Space', era: 'Modern', importance: 5, description: 'Local lunar fixture.', image: 'images/space.svg' },
  { year: -2560, title: 'Pyramid fixture', category: 'Civilization', era: 'Ancient', importance: 4, description: 'Local ancient fixture.', image: 'images/ancient.svg' },
];
await run('R60-T035', async ({ origin, fresh, record, screenshot }) => {
  const states = [];
  for (let i = 0; i < 2; i++) {
    const { context, page } = await fresh();
    await page.clock.install({ time: new Date('2026-01-01T12:00:00Z') });
    await context.addInitScript(() => {
      let seed = 123;
      Math.random = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
    });
    await context.route('**/Chronosphere/events.json', (route) => route.fulfill({ json: events }));
    await page.goto(`${origin}/public/Chronosphere/index.html`);
    await page.locator('#timelineContainer .card').last().waitFor({ state: 'attached' });
    record(`Context ${i}: ordered fixture titles`, ['Moon landing fixture', 'Pyramid fixture'], await page.locator('#timelineContainer .card .title').allTextContents());
    record(`Context ${i}: years`, ['1969 CE', '2560 BCE'], await page.locator('#timelineContainer .year').allTextContents());
    await page.locator('#aboutLink').click();
    record(`Context ${i}: about opens`, 'false', await page.locator('#aboutModal').getAttribute('aria-hidden'));
    record(`Context ${i}: about title visible`, true, await page.locator('#aboutTitle').isVisible());
    await page.locator('#aboutClose').click();
    record(`Context ${i}: about closes`, 'true', await page.locator('#aboutModal').getAttribute('aria-hidden'));
    await page.locator('#search').fill('Moon landing');
    record(`Context ${i}: filter preserves one card`, 1, await page.locator('#timelineContainer .card:visible').count());
    await page.locator('#search').fill('');
    const images = await page.locator('#timelineContainer img').evaluateAll(async (items) => {
      await Promise.all(items.map((img) => img.decode()));
      return items.map((img) => ({ alt: img.alt, width: img.naturalWidth, height: img.naturalHeight }));
    });
    record(`Context ${i}: local images loaded`, true, images.every((img) => img.width > 0 && img.height > 0));
    states.push({ titles: await page.locator('#timelineContainer .title').allTextContents(), years: await page.locator('#timelineContainer .year').allTextContents(), about: await page.locator('#aboutModal').getAttribute('aria-hidden'), images });
    await screenshot(page, `context-${i}`);
    await context.close();
  }
  record('Two fresh contexts have identical asserted DOM', states[0], states[1]);
});
