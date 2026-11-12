# R60-T002 evidence — layout at two widths, public/hft-liquidity-sandbox

Course evidence only — remove `work/` before any upstream PR.

Command: `node tests/course/r60-t002.mjs --label=<baseline|after>`
Tools: Node v22.23.4, Playwright 1.63.0, Chromium 153.0.8010.12, Linux.
Inputs: viewports 360×800 and 1280×800, `prefers-reduced-motion: reduce`, seeded `Math.random`, Playwright fake clock (500 ms before checks), one click at 25% canvas height.
No permission-gated or hardware feature is used, so nothing else is stubbed; no optional real-device run was done.

## Baseline (original files): 7/22 pass, exit 1

Root cause: `index.html`, `styles.css` and `app.js` each contained **two copies** of the code pasted together.

- `index.html` had two full pages in one file, so every element and ID appeared twice.
- `app.js` failed to parse (`SyntaxError: Unexpected token '}'`, line 240). The chart was never drawn, the metrics never updated, and clicks did nothing.
- In `styles.css`, rules leaked into each other. For example, the controls paragraph got the panel's padding and background.
- The grid used `290px 1fr` with `width: 100vw` and `body { overflow: hidden }`, and had no small-screen rules.

| Check | Expected | 360 baseline | 1280 baseline | After (both) |
| --- | --- | --- | --- | --- |
| single copy of page | 1 container, 1 canvas, each id once | **fail** (2 of each) | **fail** (2 of each) | pass |
| no unintended horizontal overflow | page width = screen | **fail** (812px wide, hidden by `overflow:hidden`) | pass | pass |
| 4 metrics visible, not clipped | inside screen & painted | **fail** (start at x = −139px, unreachable) | pass | pass |
| controls text visible, no raw `**` | yes | **fail** (off-screen, raw `**`) | **fail** (raw `**`) | pass |
| canvas usable and drawn | sized to its box, pixels drawn | **fail** (300×150 buffer, blank) | **fail** (blank) | pass |
| canvas click adds 150 lots | +150 | **fail** (0 → 0) | **fail** (0 → 0) | pass |
| content order | metrics in order; stacked (360) / side by side (1280) | **fail** | pass | pass |
| same content at both widths | same headings/labels | pass | | pass |
| no page errors | none | **fail** (SyntaxError) | | pass |

Full expected-vs-actual values: `results-baseline.json` and `results-after.json`. The screenshots `layout-<width>-<label>.png` support review only. Intentional scroll regions: none horizontal. The desktop sidebar scrolls vertically only when the window is shorter than its content.
