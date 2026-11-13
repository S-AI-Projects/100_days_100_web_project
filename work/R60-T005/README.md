# R60-T005 evidence — deterministic browser test, public/password_generator_pro

Course evidence only — remove `work/` before any upstream PR.

Command: `node tests/course/r60-t005.mjs --label=<baseline|after>`
Tools: Node v22.23.4, Playwright 1.63.0, Chromium 153.0.8010.12, Linux.

Anchors:
- `#uppercase`, `#lowercase`, `#numbers`: character-set checkboxes.
- `#themeToggle`: the ☀️ header button. In the original page it had no handler.

## Fixtures (inputs)

| Source of variation | Fixture |
| --- | --- |
| `crypto.getRandomValues`, `Math.random` | seeded mulberry32, seed `0x5eed1234` |
| clock | `Date` fixed at 2026-01-01T00:00:00Z |
| network | all non-local requests blocked and recorded (none needed) |
| fonts | no web font loaded; local sans-serif fallback |
| clipboard (permission) | `writeText` stub: records text (allow) or rejects `NotAllowedError` (deny) |
| screen / locale | 1280×800, DPR 1, dark scheme, en-US, UTC, reduced motion |

Expected passwords (`kgvqcgoegs`, `2YCYrtkTpjBoY4aN`) were computed independently by running the page's algorithm in Node with the same seed, and they match the browser output.
A control run without the randomness fixture shows that two fresh contexts produce different passwords. That is why the fixture is needed.
No real-device run was done.

## Baseline: 8/12 pass, exit 1 → After: 12/12 pass, exit 0

| Check | Expected | Baseline | After |
| --- | --- | --- | --- |
| initial state | empty, length 10, lowercase only, Weak, card 380px | pass | pass |
| seeded default password exact | `kgvqcgoegs`, Weak, 25% | pass | pass |
| seeded upper+lower+numbers 16 exact | `2YCYrtkTpjBoY4aN`, Medium, 75% | pass | pass |
| no options → message | "Select options!", 0% | pass | pass |
| `#themeToggle` switches and back | light + 🌙, then dark + ☀️ | **fail**: nothing happens (no handler) | pass |
| two fresh contexts identical DOM state | A === B at every step | pass | pass |
| copy writes exact password | stub received `kgvqcgoegs` | pass | pass |
| copy success feedback | ✅ | **fail**: no feedback | pass |
| copy denied handled | no page error, ⚠️, password selected | **fail**: uncaught `NotAllowedError` | pass |
| no external requests / web fonts | [] / 0 | pass | pass |
| control: unseeded contexts differ | true | pass | pass |
| no page errors | none | **fail**: `Write permission denied.` | pass |

Full expected-vs-actual values: `results-baseline.json` and `results-after.json`. The screenshots `theme-clicked-*.png` (taken right after clicking `#themeToggle`) support review only.
