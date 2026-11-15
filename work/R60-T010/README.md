# R60-T010 evidence — catch a plausible UI regression, public/CyberPulse-AI

Course evidence only — remove `work/` before any upstream PR.

Command: `node tests/course/r60-t010.mjs --label=<baseline|after>`
Tools: Node v22.23.4, Playwright 1.63.0, Chromium 153.0.8010.12, Linux, 1280×800. `Math.random` is seeded (matrix rain) and Google Fonts are stubbed. No permission or hardware feature is used, and no real-device run was done.

## Main visible behaviour (recorded)

- `#matrix-canvas`: 1280×800 drawing buffer with visible glyphs.
- `#bootLog`: exactly the 4 boot lines.
- `#scanPanel` before any scan: only "awaiting input…" is shown, with no result grid.
- An empty submit does not scan (the input is `required`).
- `#scanForm`, submitted with Enter on `http://secure-login.bank-verify.example.com@192.168.0.1`:
  - the page does not reload and the button is disabled during the scan;
  - the 5-line live log ends with `log-bad`;
  - the result is THREAT DETECTED (`verdict--threat`), score 100, fill 100%, confidence 95%, 5 reasons;
  - the button is re-enabled afterwards.
- A second scan of `https://example.com` replaces the result: SAFE SIGNAL, 0, 95%, 1 reason.

## Deliberate mutations (temporary test fixtures only)

| Fixture | Kind | Change, in the served file only | Must fail | Intended reason |
| --- | --- | --- | --- | --- |
| M1 | event binding | `script.js`: `addEventListener('submit'` → `'sumbit'` | both scan assertions | "submit was not handled: the page reloaded … and no verdict appeared" |
| M2 | style rule | `style.css`: remove `.result-grid[hidden] { display: none; }` | results-hidden-before-any-scan | "a verdict is shown before any scan (result grid display: grid)" |

The files on disk are checked to contain the real binding and rule (`application-files-contain-no-mutation`).

## Baseline: 6/10, exit 1 → After: 10/10, exit 0

On the original page, the `hidden` attribute on `#resultGrid` was overridden by `.result-grid { display: grid }`. Before any scan, the page therefore already showed "🟢 SAFE SIGNAL · 0/100 · 0%" next to "awaiting input…".

| Check | Baseline | After |
| --- | --- | --- |
| correct: matrix canvas draws full-window | pass | pass |
| correct: boot log 4 lines | pass | pass |
| correct: results hidden before any scan | **fail**: result grid `display: grid` | pass |
| correct: empty submit does not scan | pass | pass |
| correct: submit runs scan, THREAT DETECTED | pass | pass |
| correct: second scan SAFE SIGNAL | pass | pass |
| correct: no page errors | pass | pass |
| mutation M1 (event binding) caught | **fail**: the results-hidden check also failed, because of the existing bug | pass: exactly the 2 scan checks fail, for the intended reason |
| mutation M2 (style rule) caught | **fail**: the rule did not exist yet | pass: exactly results-hidden fails, for the intended reason |
| application files contain no mutation | **fail**: `hiddenRule: false` | pass |

The `README.md` in this folder previously described a different project ("Expense Tracker"). It now documents this page.
Full expected-vs-actual values: `results-baseline.json` and `results-after.json`. The screenshots `<scenario>-before-scan-*.png` and `<scenario>-after-scans-*.png` (scenario = `correct`, `M1`, `M2`) support review only.
