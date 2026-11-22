# R60-T047 — MS Paint Clone

## Page and setup
- Entry point: public/MS-Paint-Clone/index.html
- Local command: npm run dev
- Local URL: http://localhost:3000/public/MS-Paint-Clone/
- Browser test: node tests/course/r60-t047.mjs

## Baseline
- Brush is initially active.
- Tool group is visible and uses flex layout.
- Brush, Eraser, and Fill controls are present and visible.
- Canvas initializes at 1200 × 596 with a white background.
- Baseline measurements: baseline.json
- Baseline capture script: baseline.mjs

## Browser walkthrough and results
- Brush draws the expected dark pixel: [26, 26, 46, 255].
- Eraser restores the pixel to white: [255, 255, 255, 255].
- Fill colours the enclosed region: [233, 69, 96, 255].
- Pixel outside the filled region remains white.
- No page errors or failed requests were reported.
- Detailed results: after.json
- Screenshots: initial.png and after-interaction.png
- Test output: run.txt

## Tool versions
- Node.js: v24.16.0
- Playwright: 1.65.1
- serve: 14.2.8

## Source changes
- No application source-code changes were necessary; the baseline behaviour was correct.
- README documentation and a browser regression test were added.
