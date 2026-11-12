# R60-T003 evidence — empty/error display, public/Escape_Room

Course evidence only — remove `work/` before any upstream PR.

Command: `node tests/course/r60-t003.mjs --label=<baseline|after>`
Tools: Node v22.23.4, Playwright 1.63.0, Chromium 153.0.8010.12, Linux, 1280×800.
The page is static, so the fixtures are failed assets (as the task asks), plus the page's one "empty result", an empty terminal command:

| Fixture | Input |
| --- | --- |
| assets-missing | `images/image.png` → HTTP 404; fonts.googleapis.com / fonts.gstatic.com → request failed |
| empty-command | Enter on a blank prompt, then the valid code `98770` |
| assets-restored | image served normally; fonts → empty CSS (offline) |

Timers use Playwright's fake clock. No permission-gated or hardware feature is used, and no real-device run was done.
The only console error ignored is the browser's own "Failed to load resource" line for the deliberately failed fixture URLs.

## Baseline: 6/12 pass, exit 1 → After: 12/12 pass, exit 0

| Check | Expected | Baseline | After |
| --- | --- | --- | --- |
| A backdrop dark, not blank | dark body colour | **fail**: body `rgba(0,0,0,0)`, so a white page | pass (`#04100a`) |
| A status message about missing image | visible `role="status"` | **fail**: none | pass |
| A intro text readable | heading ≥ 4.5:1 | pass | pass |
| A heading uses readable fallback font | web font not loaded, text fits | pass | pass |
| A timer + TERMINAL readable | ≥ 4.5:1 | **fail**: timer 1.08:1, TERMINAL 1.45:1 (white on near-white) | pass |
| A first clue location outlined + labelled | outline, ≥ 24px, label | **fail**: faint 0.3 border, no label | pass |
| A2 empty command → empty state | "NO COMMAND ENTERED" | **fail**: "ACCESS DENIED…" | pass |
| A2 valid code recovers | ACCESS GRANTED + next clue | pass | pass |
| B restored: image used, no fallback | no status, no class | pass | pass |
| B restored: no outlines/labels leak | border < 0.6, no label | pass | pass |
| B restored: empty then valid command | NO COMMAND / ACCESS GRANTED | **fail** | pass |
| no page errors | none | pass | pass |

Full expected-vs-actual values: `results-baseline.json` and `results-after.json`. The screenshots `assets-missing-*.png` and `assets-restored-*.png` support review only.
