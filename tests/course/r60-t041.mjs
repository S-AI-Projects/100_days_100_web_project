import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const PORT = 4173;
const PAGE_URL = `http://127.0.0.1:${PORT}/public/Travel_booking_website/`;

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
  const context = await browser.newContext();
  const page = await context.newPage();

  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(e));

  await page.goto(PAGE_URL);

  const box = page.locator('#chatbot-box');

  // press a key until the element with this id has focus
  async function pressUntilFocused(id, key = 'Tab', max = 100) {
    for (let i = 0; i < max; i++) {
      await page.keyboard.press(key);
      const activeId = await page.evaluate(() => document.activeElement.id);
      if (activeId === id) return;
    }
    throw new Error(`#${id} not reached with ${key}`);
  }

  // focus must be visible (real focus ring, not removed)
  async function assertFocusVisible(id) {
    const info = await page.evaluate(() => {
      const el = document.activeElement;
      const s = getComputedStyle(el);
      return {
        id: el.id,
        focusVisible: el.matches(':focus-visible'),
        outlineStyle: s.outlineStyle,
        outlineWidth: parseFloat(s.outlineWidth),
      };
    });
    assert.equal(info.id, id);
    assert.ok(info.focusVisible, `#${id} is not :focus-visible`);
    assert.notEqual(info.outlineStyle, 'none', `#${id} outline removed`);
    assert.ok(info.outlineWidth > 0, `#${id} outline width is 0`);
  }

  // no positive tabindex anywhere on the page
  const positive = await page.evaluate(
    () => [...document.querySelectorAll('[tabindex]')].filter((e) => e.tabIndex > 0).length
  );
  assert.equal(positive, 0, 'Positive tabindex found');

  // baseline: chat box starts hidden
  assert.equal(await box.isVisible(), false, 'Chat box should start hidden');

  // toggle: reach with Tab, focus visible, Enter opens, Enter closes, Space opens
  await pressUntilFocused('chat-toggle');
  await assertFocusVisible('chat-toggle');
  await page.keyboard.press('Enter');
  assert.equal(await box.isVisible(), true, 'Enter on toggle should open chat');
  await page.keyboard.press('Enter');
  assert.equal(await box.isVisible(), false, 'Enter on toggle should close chat');
  await page.keyboard.press('Space');
  assert.equal(await box.isVisible(), true, 'Space on toggle should open chat');

  // close button: reached by Tab from toggle, focus visible
  await pressUntilFocused('close-chat', 'Tab', 10);
  await assertFocusVisible('close-chat');

  // export button: reached by Tab, focus visible, Space downloads the file
  await pressUntilFocused('export-chat', 'Tab', 10);
  await assertFocusVisible('export-chat');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.keyboard.press('Space'),
  ]);
  assert.equal(download.suggestedFilename(), 'travel-chat.txt');

  // back to close button with Shift+Tab, Enter closes the chat
  await pressUntilFocused('close-chat', 'Shift+Tab', 10);
  await page.keyboard.press('Enter');
  assert.equal(await box.isVisible(), false, 'Enter on close should hide chat');

  assert.equal(pageErrors.length, 0, 'Unexpected page errors');
  console.log('PASS');
} catch (err) {
  console.error('FAIL', err);
  process.exitCode = 1;
} finally {
  if (browser) await browser.close();
  server.kill();
}
