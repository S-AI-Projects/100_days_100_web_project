# R60-T049 baseline (before the fix)

Page: public/cosmic-quiz-quest/ (opened with a trailing slash so script.js and style.css load)
Emulation: prefers-reduced-motion: reduce

| Check | Expected | Actual |
|---|---|---|
| Starfield (#starfield) animation frames stop | same count after 600 ms | 40 then 76 (kept animating) |
| No infinite CSS animations | none | 5: logo icon, #start-quest-btn, #new-high-score-banner, star-spin-icon, #restart-quest-btn |
| Keyboard focus outline visible (360px and 1280px) | visible | visible (browser default outline already works) |
| No sideways scrolling (360px and 1280px) | none | none |
| Enter on a category card and a difficulty button changes the active one | yes | yes |
| Quiz screen: question text loads, 4 options visible, Tab reaches all 4 with an outline (360px and 1280px) | yes | yes |
| Results screen after a full play-through: restart button, share button, rank and score visible | yes | yes |
