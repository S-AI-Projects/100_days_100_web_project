# R60-T008 evidence — keep fixture text as text, public/ImageCompressor

Course evidence only — remove `work/` before any upstream PR.

Command: `node tests/course/r60-t008.mjs --label=<baseline|after>`
Tools: Node v22.23.4, Playwright 1.63.0, Chromium 153.0.8010.12, Linux, 1280×900.

Anchors:
- `#globalStats` / `#totalSavedStat`: the "Saved: …" badge in the header.
- `#themeToggleBtn` / `#themeIcon`: the theme button and its icon.

## Traced user text

The page has no text box. The user-controlled text is the uploaded file name, which `js/main.js` and `js/ui.js` insert in three places:
1. the queue list (`renderQueue`, via `innerHTML`);
2. toasts (`showToast`, via `innerHTML`);
3. the modal title (`#modalFilename`, via `textContent`, which was already safe).

Fixture files were uploaded through the real file input. No permission or hardware is involved, and no real-device run was done.

| Fixture | Name | Type |
| --- | --- | --- |
| A | `<img src=x onerror="window.__pwned=(window.__pwned\|\|0)+1">photo.png` | real 8×8 PNG |
| B | `<b data-injected="1">notes</b>.txt` | text/plain (rejected, so a "Skipped" toast is shown) |

The CDN scripts (Phosphor icons, JSZip, SortableJS) and fonts are stubbed as empty responses.

## Baseline: 4/11 pass, exit 1 → After: 11/11 pass, exit 0

| Check | Expected | Baseline | After |
| --- | --- | --- | --- |
| start state clean | nothing injected | pass | pass |
| "Skipped" toast shows name as text | `Skipped <b data-injected="1">notes</b>.txt - Invalid format` | **fail**: `Skipped notes.txt - …` (a real `<b>` was created) | pass |
| toast: no injected element | 0 injected; toast = `<i>` + `<span>` | **fail**: `[data-injected]` element exists | pass |
| queue shows name as text | full name | **fail**: only `photo.png` visible | pass |
| `.item-name` has no child elements | 0 | **fail**: 1 (`<img>`) | pass |
| no injected element / handler run | `__pwned` 0, no request for `/x` | **fail**: `onerror` ran (`__pwned` = 2), `/x` requested | pass |
| `#globalStats` / `#totalSavedStat` render as text | visible, plain `N Bytes` | pass | pass |
| rich-HTML contract (icons stay elements) | toast = icon + text span | **fail**: toast span contained `<b>` | pass |
| modal title shows name as text | full name, 0 children | pass (already `textContent`) | pass |
| `#themeToggleBtn` / `#themeIcon` | light + `ph ph-moon`, then dark + `ph ph-sun` | pass | pass |
| no page errors | none | **fail**: 404s for `x` from the injected `<img>` | pass |

Full expected-vs-actual values: `results-baseline.json` and `results-after.json`. The screenshots `queue-*.png` support review only.
