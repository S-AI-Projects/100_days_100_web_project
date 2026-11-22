import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const PORT = 4173;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const TEXT_URL = `${BASE_URL}/public/glassmorphism_login_page/text-rendering-example.html`;
const EVIDENCE_DIR = 'work/R60-T048';

const server = spawn(
    process.execPath,
    ['node_modules/serve/build/main.js', '.', '-l', String(PORT)],
    { stdio: 'ignore' }
);

let browser;

async function waitForServer() {
    for (let attempt = 0; attempt < 50; attempt++) {
        try {
            const response = await fetch(TEXT_URL);
            if (response.ok) return;
        } catch {
            // The server may still be starting.
        }

        await new Promise(resolve => setTimeout(resolve, 200));
    }

    throw new Error('Local server did not become ready');
}

try {
    await mkdir(`${EVIDENCE_DIR}/changed`, { recursive: true });
    await waitForServer();

    browser = await chromium.launch();
    const context = await browser.newContext();
    const page = await context.newPage();
    const pageErrors = [];

    page.on('pageerror', error => pageErrors.push(error.message));

    // Companion example: user-supplied content must remain plain text.
    await page.goto(TEXT_URL);

    const fixture = '[image](https://github.com/S-AI-Projects/100_days_100_web_project/issues/x) <img src=x onerror="window.fixtureHandlerRan=true">';
    await page.locator('#fixtureText').fill(fixture);
    await page.locator('#renderText').click();

    const output = page.locator('#renderedText');

    assert.equal(await output.textContent(), fixture);
    assert.equal(await output.locator('*').count(), 0);
    assert.equal(await page.locator('img').count(), 0);
    assert.equal(
        await page.evaluate(() => window.fixtureHandlerRan),
        undefined
    );

    const renderedLayout = await output.evaluate(element => {
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();

        return {
            display: style.display,
            width: Math.round(rect.width),
            height: Math.round(rect.height)
        };
    });

    assert.notEqual(renderedLayout.display, 'none');
    assert.ok(renderedLayout.width > 0);
    assert.ok(renderedLayout.height > 0);

    await page.screenshot({
        path: `${EVIDENCE_DIR}/changed/text-rendering.png`,
        fullPage: true
    });

    assert.deepEqual(pageErrors, [], 'Unexpected browser page errors');

    const evidence = {
        input: fixture,
        expected: {
            renderedText: fixture,
            injectedElements: 0,
            handlerExecuted: false,
            pageErrors: []
        },
        actual: {
            renderedText: await output.textContent(),
            injectedElements: await output.locator('*').count(),
            handlerExecuted: await page.evaluate(() => window.fixtureHandlerRan === true),
            pageErrors,
            renderedLayout
        },
        versions: {
            node: process.version,
            npm: '11.13.0',
            playwright: '1.65.1',
            serve: '14.2.8',
            chromium: browser.version()
        }
    };

    await writeFile(
        `${EVIDENCE_DIR}/changed/results.json`,
        JSON.stringify(evidence, null, 2)
    );

    console.log('PASS: R60-T048 browser regression checks');
    console.log(JSON.stringify(evidence, null, 2));
} catch (error) {
    console.error('FAIL: R60-T048 browser regression checks');
    console.error(error);
    process.exitCode = 1;
} finally {
    try {
        if (browser) await browser.close();
    } finally {
        server.kill();
    }
}
