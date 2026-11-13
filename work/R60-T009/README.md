# R60-T009 evidence — motion and focus preferences, public/Stydy-Sync

Course evidence only — remove `work/` before any upstream PR.

Command: `node tests/course/r60-t009.mjs --label=<baseline|after>`
Tools: Node v22.23.4, Playwright 1.63.0, Chromium 153.0.8010.12, Linux.

Anchors (hero section):
- `#p1`: the "Very proud to introduce" badge.
- `#p2`: the headline.
- `#p3`: the intro paragraph.
- `#p4`: the "Start Now" link.

Inputs:
- Viewports 1280×800 and 390×844.
- `reducedMotion: reduce` and `no-preference`, in fresh contexts.
- Tab through every stop from the top, and Shift+Tab through every stop from the bottom. The check waits for any scrolling to stop before measuring.
- Font Awesome and Google Fonts are stubbed. No permission or hardware feature is used, and no real-device run was done.

Focus rule: the element matches `:focus-visible` and has either Chromium's own ring, or an outline/box-shadow ring of at least 2px with at least 3:1 contrast against the colour behind it. It must also not be under the sticky header.

## Baseline: 7/15 pass, exit 1 → After: 15/15 pass, exit 0

| Check (each at 1280 and 390) | Expected | Baseline | After |
| --- | --- | --- | --- |
| reduce: no smooth scroll / transitions | `auto`, ≤ 0.01s, 0 animations | **fail**: `smooth`, 0.5s | pass |
| reduce: no hover movement (card, Start Now, hero image) | `none` | **fail**: translateY(-6px), translateY(-3px), scale(1.03) | pass |
| reduce: information and controls usable | 9 key elements visible, opacity 1 | pass | pass |
| focus visible, Tab forward | every stop | **fail**: `#name` (email) ring 1.15:1 | pass |
| focus visible, Shift+Tab backward | every stop, not under the header | **fail**: email 1.15:1; at 1280, Submit and email also under the sticky header | pass |
| static layout `#p1`–`#p4` | ordered; 1280: text left of image, `#p2` 57.6px; 390: stacked, centred, `#p2` 32px | pass | pass |
| no-preference keeps motion | `smooth`, 0.5s, card hover −6px | pass | pass |
| no page errors | none | pass | pass |

Full expected-vs-actual values: `results-baseline.json` and `results-after.json`. The screenshots `focus-email-*` and `focus-startnow-backward-*` support review only.
