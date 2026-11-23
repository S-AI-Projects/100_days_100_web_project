# R60-T049 after the fix

Changes: script.js (starfield draws once and stops looping when reduced motion is on), style.css (prefers-reduced-motion rule). No focus-style change was needed: the browser default outline is already visible.

| Check | Expected | Actual |
|---|---|---|
| Starfield frames stop | same count | 0 and 0 (no new frames) |
| No infinite CSS animations | none | none |
| #setup-screen, #sound-toggle-btn, #start-quest-btn visible; #best-score-display text matches "N / N" | yes | yes at 360px and 1280px |
| Every Tab stop shows a focus outline | yes | yes at 360px and 1280px |
| No sideways scrolling (360px and 1280px) | none | none |
| Enter on a category card and a difficulty button changes the active one | yes | yes |
| Quiz screen: question text loads, 4 options visible, Tab reaches all 4 with an outline (360px and 1280px) | yes | yes |
| Results screen after a full play-through: restart button, share button, rank and score visible | yes | yes |
| Test exits non-zero on failure | exit code 1 | exit code 1 (outlines removed on purpose, then restored) |
| Page errors | 0 | 0 |

Command: node tests/course/r60-t049.mjs  -> PASS
