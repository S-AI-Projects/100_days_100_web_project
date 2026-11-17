## Description
This PR resolves issue #13 (R60-T013) for `public/Missionaries&Cannibals`. It exercises and verifies empty and error state handling across the game: testing an asset-failure fixture (blocked external fonts with robust system-font fallback), empty bank displays (`Empty` indicator), empty scoreboard placeholder (`—`), empty boat movement attempt validation (`At least one passenger needed to sail!`), and game over/outnumbered error state recovery. Source anchors `#theme-toggle`, `#instructions-btn`, `#move-count`, and `#timer-chip` are preserved and verified via automated Playwright regression tests.

## Related Issue
Fixes: #13

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
- In `public/Missionaries&Cannibals/script.js`:
  - Initialized `state = defaultState()` on load so characters, counts, and initial move stats display cleanly from the start.
  - Added safe `try...catch` storage protection with memory fallback for `localStorage` (`getBest`, `saveBest`) to prevent uncaught runtime errors in restricted storage environments.
  - Preserved all source anchors (`#theme-toggle`, `#instructions-btn`, `#move-count`, `#timer-chip`).
- In `public/Missionaries&Cannibals/styles.css`:
  - Enhanced body and heading typography fallback chain with `system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif` for clean font rendering when external fonts are blocked/offline.
- In `public/Missionaries&Cannibals/README.md`:
  - Added documentation covering empty displays, input validation error warnings, font fallback resilience, and the automated test command.
- In `tests/course/r60-t013.mjs`:
  - Implemented automated Playwright test suite with a failed-asset fixture (aborted external fonts), empty bank badges, empty best score placeholder, empty boat move validation and recovery, outnumbered error state, and zero console/page errors.
- In `work/R60-T013/`:
  - Saved full test report in `results-latest.json` and baseline findings in `baseline.json`.

## Screenshots / Recordings
- **Empty & Error States**:
  - Right bank shows `"Empty"` badge before crossing.
  - Attempting to sail an empty boat shows `"At least one passenger needed to sail!"` warning.
  - System font fallback activates seamlessly when external font network requests are aborted.

## Testing
Ran Playwright automated regression suite locally:
```bash
node tests/course/r60-t013.mjs
```
Result: All 8 checks passed with exit code 0.

## Checklist
* [x] I have tested my changes locally.
* [x] I have added or updated tests, if needed.
* [x] I have updated documentation, if needed.
* [x] I have followed the project's coding guidelines.
* [x] I have run the relevant tests and checks.
* [x] I have addressed previous review feedback, if applicable.

## Additional Notes
- Preserved source anchors: `#theme-toggle`, `#instructions-btn`, `#move-count`, `#timer-chip`.
- Verified recovery from empty boat validation and game over error states.
- Full test results saved to `work/R60-T013/results-latest.json`.
