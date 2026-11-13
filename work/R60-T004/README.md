# R60-T004 evidence — repeat initialization, public/TodoList-React-TS-Tailwind

Course evidence only — remove `work/` before any upstream PR.

Command: `node tests/course/r60-t004.mjs --label=<baseline|after>`
Tools: Node v22.23.4, Playwright 1.63.0, Chromium 153.0.8010.12, Vite 6 dev server (`npm run dev`, React StrictMode), Linux, 1280×900.
`#root` is the React 18 mount point for `<App />` (Header, Todolist, Settings).
The probe counts listeners on window, document and #root, and `setInterval` timers created from `/src/`.
No permission-gated or hardware feature is used (Export / `window.print` is not exercised), and no real-device run was done.

## Baseline: 8/12 pass, exit 1 → After: 12/12 pass, exit 0

Already correct before the change, so it is now covered by the test:
- One render into #root, with the same listeners after re-initialization.
- No app timers.
- Each todo restored once after reload.
- Repeated add / toggle / theme / filter actions each cause exactly one update.
- The daily reset of recurring todos runs once per day across re-inits.

Defect found: todo ids were `'tl' + Date.now()`.

| Check | Expected | Baseline | After |
| --- | --- | --- | --- |
| init renders app once | 1 root child, 1 header/input/filter | pass | pass |
| re-init restores each todo once | same 2 titles, 2 stored | pass | pass |
| re-init same listeners, no app timers | identical listener map, 0 intervals | pass | pass |
| repeat add same title | +1 per action | pass | pass |
| repeat toggle complete | flips one todo each time | pass | pass |
| theme ×4 + filter ×4 | state restored, no listener growth | pass | pass |
| same-millisecond adds get unique ids | 2 distinct ids | **fail**: both `tl1767261600000` | pass |
| same-millisecond: toggle one changes one | Alpha ✓, Beta ✗ | **fail**: both completed | pass |
| saved duplicate ids render and toggle once | Old one ✓, Old two ✗ | **fail**: both completed | pass |
| daily reset once per day across re-init | false → true → stays true | pass | pass |
| no page errors | none | **fail**: React "two children with the same key" | pass |
| cleanup: dev server stopped | stopped | pass | pass |

Full expected-vs-actual values: `results-baseline.json` and `results-after.json`. The screenshots `same-ms-click-alpha-*.png` (only "Alpha" was clicked) and `reinit-*.png` support review only.
