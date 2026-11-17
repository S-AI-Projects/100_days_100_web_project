## Description
This PR resolves issue #11 (R60-T011) for `public/mood-tracker-dashboard`. It introduces full keyboard accessibility, including a skip-to-content link, logical Tab sequence across interactive controls, prominent `:focus-visible` indicators (>= 3:1 contrast ratio), and verifies keyboard activation with `Enter` and `Space`. All source anchors (`#mainMood`, `#totalEntries`, `#greatCount`, `#goodCount`) are preserved and verified via Playwright regression checks.

## Related Issue
Fixes: #11

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
- In `public/mood-tracker-dashboard/index.html`:
  - Added `.skip-link` pointing to `#mainContent`.
  - Updated container wrapper to `<main id="mainContent" class="container" tabindex="-1">`.
  - Added explicit `type="button"` and `aria-label` attributes to all mood buttons.
  - Preserved all source anchors (`#mainMood`, `#totalEntries`, `#greatCount`, `#goodCount`).
- In `public/mood-tracker-dashboard/style.css`:
  - Added styles for `.skip-link` (hidden off-screen until focused, then visible with high-contrast outline).
  - Added high-contrast `:focus-visible` outlines (`3px solid #b3004b !important; outline-offset: 4px !important;`) on `.buttons button`.
  - Scoped button transitions to avoid transitioning focus outline properties.
- In `public/mood-tracker-dashboard/README.md`:
  - Added sections documenting accessibility features and automated test commands.
- In `tests/course/r60-t011.mjs`:
  - Created automated Playwright test suite validating source anchors, tab order, focus outlines, keyboard activation (Enter/Space), and zero console/page errors.
- In `work/R60-T011/`:
  - Recorded test report in `results-latest.json` and baseline data in `baseline.json`.

## Screenshots / Recordings
- **Skip-to-Content Link**: Becomes visible at the top of the page upon initial Tab navigation.
- **Focus Indicators**: Focused controls clearly display a 3px deep-magenta outline with 4px offset against the pastel background.

## Testing
Ran Playwright automated regression suite locally:
```bash
node tests/course/r60-t011.mjs
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
- Preserved source anchors: `#mainMood`, `#totalEntries`, `#greatCount`, `#goodCount`.
- Full test results saved to `work/R60-T011/results-latest.json`.
