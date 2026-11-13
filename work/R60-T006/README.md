# R60-T006 evidence — unsupported feature fallback, public/dropdown_navbar

Course evidence only — remove `work/` before any upstream PR.

Command: `node tests/course/r60-t006.mjs --label=<baseline|after>` (add `--online` for the optional real-CDN run).
Tools: Node v22.23.4, Playwright 1.63.0, Chromium 153.0.8010.12, Linux, 1280×800 and 390×844.
Tailwind fixture: `tests/course/fixtures/r60-t006/tailwind.css`, built with the tailwindcss v3.4.17 CLI from the page's own config (the command is in `tailwind.config.cjs`).

Anchors:
- `#navbar`: glass navigation bar.
- `#grocery` and `#mobile`: dropdown buttons.
- `#grocery-dd`: the Grocery dropdown panel.

Feature demonstrated: glassmorphism via CSS `backdrop-filter`. The page also depends on the Tailwind Play CDN.

## Paths (inputs)

| Path | Setup |
| --- | --- |
| present | Tailwind fixture + Chromium's real `backdrop-filter` |
| absent (stub) | page and fixture CSS served with `backdrop-filter` renamed to an unknown property, so it cannot apply or match `@supports`; `CSS.supports()` returns false for it |
| no-tailwind | the `https://cdn.tailwindcss.com` request fails |
| mobile | present path at 390×844 |
| optional online | real CDN, only with `--online`; labelled `optional-online-*`; not run for this evidence |

Images are served as a 1×1 PNG and fonts as empty CSS. No permission-gated or hardware feature is involved.

## Baseline: 10/15 pass, exit 1 → After: 15/15 pass, exit 0

| Check | Expected | Baseline | After |
| --- | --- | --- | --- |
| `#grocery` / `#mobile` unique | 1 each | **fail**: 2 each (button + section) | pass |
| present: menus closed on load | none open | pass | pass |
| present: `#grocery` opens `#grocery-dd` (3 exact links) | yes | pass | pass |
| present: `#mobile` switches, outside click closes | yes | pass | pass |
| present: glass uses backdrop-filter | blur(12px), alpha 0.8 | pass | pass |
| absent: stub in effect | supports=false, computed none | pass | pass |
| absent: menus open/switch/close (×3) | same as present | pass | pass |
| absent: glass falls back to solid panels | alpha ≥ 0.95, link contrast ≥ 7:1 over white | **fail**: alpha 0.8, no `@supports` fallback (contrast 7.73:1) | pass |
| mobile hamburger + submenu | shown | pass | pass |
| no page errors (required paths) | none | pass | pass |
| no-tailwind: explicit notice, no error | notice, 0 errors | **fail**: `tailwind is not defined`, no notice | pass |
| no-tailwind: menus closed and work | [] then [grocery-dd] | **fail**: all 7 menus open on load | pass |
| no-tailwind: icons stay small | ≤ 24px | **fail**: 1262px | pass |

Full expected-vs-actual values: `results-baseline.json` and `results-after.json`. The screenshots `present-*`, `absent-*` and `no-tailwind-*` support review only.
