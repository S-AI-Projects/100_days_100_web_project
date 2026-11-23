import { run } from './harness.mjs';

const caption = 'A local caption fixture, ready to copy.';
await run('R60-T036', async ({ origin, fresh, record, screenshot }) => {
  for (const mode of ['supported', 'absent', 'rejected']) {
    const { context, page } = await fresh();
    await context.addInitScript(({ mode, caption }) => {
      localStorage.setItem('caption_logs', JSON.stringify([{ captionId: 'fixture-1', caption, tone: 'fun', platform: 'instagram' }]));
      window.__copies = [];
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: mode === 'absent' ? undefined : { async writeText(text) {
          if (mode === 'rejected') throw new DOMException('Fixture denied', 'NotAllowedError');
          window.__copies.push(text);
        } },
      });
    }, { mode, caption });
    await page.goto(origin);
    await page.locator('.log-caption-text').waitFor();
    record(`${mode}: caption remains readable`, caption, await page.locator('.log-caption-text').innerText());
    await page.getByTitle('Copy caption').click();
    const expected = mode === 'supported' ? 'Copied to clipboard!' : mode === 'absent' ? 'Clipboard is unavailable. Select the caption text and copy it manually.' : 'Could not copy. Select the caption text and copy it manually.';
    await page.getByText(expected, { exact: true }).waitFor();
    record(`${mode}: useful feedback`, true, await page.getByText(expected, { exact: true }).isVisible());
    record(`${mode}: write results`, mode === 'supported' ? [caption] : [], await page.evaluate(() => window.__copies));
    record(`${mode}: caption stays available`, caption, await page.locator('.log-caption-text').innerText());
    await screenshot(page, mode);
    await context.close();
  }
}, { vite: true });
