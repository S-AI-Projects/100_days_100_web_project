## Description
This PR resolves issue #12 (R60-T012) for `public/mini carrom`. It protects the layout across two target viewports: 360×800 (mobile) and 1280×800 (desktop). It eliminates unintended horizontal page overflow (reduced from 470px to 360px), prevents clipped controls in the carrom control panel by neatly reorganizing action buttons, and resolves an overlapping fixed back button on small screens. Source anchors `#modeScreen`, `#gameScreen`, `#card0`, and `#pname0` are fully preserved and validated via automated Playwright regression tests.

## Related Issue
Fixes: #12

## Type of Change
* [x] Bug Fix
* [ ] New Feature
* [x] UI/UX Improvement
* [ ] Performance Improvement
* [x] Tests
* [x] Documentation
* [ ] Refactoring / Maintenance
* [ ] CI/CD

## Changes Made
- In `public/mini carrom/index.html`:
  - Reorganized control panel rows into dedicated Power and Action rows (`#shootBtn`, `#resetBtn`, `#menuBtn`) to eliminate mobile row clipping.
  - Preserved all source anchors (`#modeScreen`, `#gameScreen`, `#card0`, `#pname0`).
- In `public/mini carrom/style.css`:
  - Added responsive styling under `@media (max-width: 600px)`:
    - Positioned `.project-back-button` statically on mobile to prevent overlapping `h1` header.
    - Adjusted board wrapper padding and box-shadow on narrow viewports to avoid viewport edge collisions.
    - Added flex action group styling (`.ctrl-actions`) with prominent Shoot button and balanced Reset/Menu buttons.
    - Ensured zero unintended horizontal overflow (`scrollWidth <= clientWidth`).
- In `public/mini carrom/README.md`:
  - Added documentation of responsive viewport behavior at 360×800 and 1280×800, along with automated test commands.
- In `tests/course/r60-t012.mjs`:
  - Implemented automated Playwright test suite verifying source anchors, absence of horizontal overflow at both 360×800 and 1280×800, unclipped controls, and clean layout rendering.
  - Automatically captures visual evidence screenshots at both tested resolutions.
- In `work/R60-T012/`:
  - Recorded detailed test results in `results-latest.json` and baseline findings in `baseline.json`.
  - Saved full-page layout screenshots: `screenshot-360.png` and `screenshot-1280.png`.

## Screenshots / Recordings
- **Mobile View (360×800)**: Clean, unclipped layout with back button above header and zero horizontal scroll (`work/R60-T012/screenshot-360.png`).
- **Desktop View (1280×800)**: Centered layout with fixed navigation and full board presentation (`work/R60-T012/screenshot-1280.png`).

## Testing
Ran Playwright automated regression suite locally:
```bash
node tests/course/r60-t012.mjs
```
Result: All 6 checks passed with exit code 0.

## Checklist
* [x] I have tested my changes locally.
* [x] I have added or updated tests, if needed.
* [x] I have updated documentation, if needed.
* [x] I have followed the project's coding guidelines.
* [x] I have run the relevant tests and checks.
* [x] I have addressed previous review feedback, if applicable.

## Additional Notes
- Preserved source anchors: `#modeScreen`, `#gameScreen`, `#card0`, `#pname0`.
- Baseline overflow and changed metrics recorded in `work/R60-T012/baseline.json` and `work/R60-T012/results-latest.json`.
