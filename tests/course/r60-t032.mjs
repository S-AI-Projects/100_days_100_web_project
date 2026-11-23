import assert from 'node:assert/strict';
import { run } from './harness.mjs';

await run('R60-T032', async ({ origin, fresh, record, screenshot }) => {
  const content = [];
  for (const width of [360, 1280]) {
    const { context, page } = await fresh({ viewport: { width, height: 800 } });
    await page.goto(`${origin}/public/word-to-pdf/index.html`);
    await page.locator('#btnBrowse').waitFor();
    const layout = await page.evaluate(() => {
      const selectors = ['.app-header', '#themeToggle', '#dropzone', '#btnBrowse', '#settingsCard', '#pdfFilename', '#btnPrintPdf', '#btnDownloadPdf', '.workspace-right', '.preview-header', '#btnZoomIn', '#btnZoomOut'];
      return {
        viewport: innerWidth, document: document.documentElement.scrollWidth,
        controls: selectors.map((s) => { const e = document.querySelector(s); const r = e.getBoundingClientRect(); return { selector: s, left: r.left, right: r.right, width: r.width, client: e.clientWidth, scroll: e.scrollWidth }; }),
        left: document.querySelector('.workspace-left').getBoundingClientRect().toJSON(),
        right: document.querySelector('.workspace-right').getBoundingClientRect().toJSON(),
        headings: [...document.querySelectorAll('h1,h2,h3')].map((e) => e.textContent.trim()),
      };
    });
    record(`${width}: document fits`, true, layout.document <= width + 1);
    for (const r of layout.controls) {
      record(`${width}: ${r.selector} inside viewport`, true, r.left >= -1 && r.right <= width + 1 && r.width > 0);
      record(`${width}: ${r.selector} content not clipped`, true, r.scroll <= r.client + 1);
    }
    record(`${width}: content order`, true, width === 360 ? layout.right.top >= layout.left.bottom - 1 : layout.right.left >= layout.left.right - 1);
    content.push(layout.headings);
    record(`${width}: intentional preview scroll is labelled`, 'Scrollable document preview', await page.locator('#previewBody').getAttribute('aria-label'));
    await page.locator('#themeToggle').click();
    record(`${width}: theme works`, 'light', await page.locator('html').getAttribute('data-theme'));
    const [chooser] = await Promise.all([page.waitForEvent('filechooser'), page.locator('#btnBrowse').press('Enter')]);
    record(`${width}: browse activates native file input`, true, Boolean(chooser));
    await screenshot(page, `${width}`);
    await context.close();
  }
  record('Both widths contain the same headings', content[0], content[1]);
  assert.ok(content[0].length > 3);
});
