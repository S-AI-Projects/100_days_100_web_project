## Description
This pull request implements an interaction regression test suite and UI state hardening for **CountDown Timer** (`public/CountDown Timer`), completing task `R60-T020` for [Issue #20](https://github.com/S-AI-Projects/100_days_100_web_project/issues/20).

Prior to this change:
- Critical interactive controls lacked automated regression verification across their visible lifecycle states.
- The fullscreen toggle relied strictly on `document.fullscreenElement` without checking `fullscreen-mode` class state, causing an interaction lock where headless browsers or environments without hardware display permission could never exit fullscreen once entered.
- Header icon buttons lacked explicit `aria-label` attributes for accessibility.
- A typo in `style.css` resulted in an invalid 7-digit hex color code (`#5555777`).

This PR addresses these issues and satisfies all task requirements:
1. **Source Anchors Verified**: Preserved and verified all target source anchors: `#app`, `#statsBtn`, `#fullscreenBtn`, and `#themeBtn`.
2. **Recorded Visible Behavior**:
   - Theme toggle: clicking `#themeBtn` toggles `html[data-theme]` between `dark` and `light` and updates button emoji between `☀️` and `🌙`.
   - Session stats dialog: clicking `#statsBtn` opens `#statsOverlay` (removes `.hidden`, sets `display: flex`), while clicking `.close-btn` closes the dialog (`display: none`).
   - Fullscreen mode: clicking `#fullscreenBtn` toggles `body.fullscreen-mode`, adjusting timer scale and layout width cleanly across all environments.
   - Timer lifecycle: preset pills update time display, `#startPauseBtn` transitions between start and pause, and `#resetBtn` restores initial time.
3. **Plausible UI Regression Fixture & Assertion**:
   - The test suite includes a temporary fixture route with a severed `#themeBtn` event binding.
   - The behavioral assertion reliably catches the severed binding (detecting that `data-theme` remained `dark` instead of toggling to `light`), distinguishing the broken and correct states.
   - The final production application in `public/CountDown Timer` contains **no mutation**.
4. **Code Quality & Accessibility**:
   - Fixed `--text-3: #555577;` in `style.css`.
   - Added descriptive `aria-label` attributes to icon buttons in `index.html`.
   - Updated `README.md` with source anchor and regression test documentation.

## Related Issue
Fixes #20

## Type of Change
- [x] Bug fix / Interaction hardening (reliable fullscreen toggle and valid hex color variable)
- [x] Code health / Accessibility (added `aria-label`s on icon buttons)
- [x] Automated tests (Playwright browser regression test suite with mutation verification)
- [x] Documentation update (README with interaction architecture and test command)

## Changes Made
1. **`public/CountDown Timer/style.css`**:
   - Fixed invalid 7-digit hex color code on line 11 (`--text-3: #555577;`).
2. **`public/CountDown Timer/index.html`**:
   - Added accessible `aria-label` attributes to `#statsBtn`, `#fullscreenBtn`, `#themeBtn`, and `#keyboardBtn`.
   - Preserved all required target source anchors: `#app`, `#statsBtn`, `#fullscreenBtn`, `#themeBtn`.
3. **`public/CountDown Timer/script.js`**:
   - Improved `toggleFullscreen()` to check `body.classList.contains('fullscreen-mode')` alongside native `fullscreenElement`, ensuring fullscreen mode can always be entered and exited cleanly in headless and permission-restricted browser environments.
   - Exposed `window.FocusTimer` for testability and inspection.
4. **`public/CountDown Timer/README.md`**:
   - Documented the interaction architecture, source anchors, and automated regression test execution.
5. **`tests/course/r60-t020.mjs`**:
   - Implemented automated Playwright test suite validating:
     - Target source anchors exist and have required DOM structure (`#app`, `#statsBtn`, `#fullscreenBtn`, `#themeBtn`).
     - Production page theme toggle interaction.
     - Production page session stats dialog open and close states.
     - Production page fullscreen toggle interaction.
     - Production page timer lifecycle (presets, start, pause, reset).
     - Deliberate regression fixture with severed event binding, asserting that the broken state is caught for the intended behavioral reason.
     - 0 uncaught runtime page errors or console errors.
     - README documentation verification.
6. **`work/R60-T020/`**:
   - Saved test results in `results-latest.json` and task baseline in `baseline.json`.

## Screenshots/Recordings
N/A — Existing UI and timer layout are preserved; improvements focus on event handling, accessibility labels, and regression verification.

## Testing
- **Test Framework**: Playwright (Chromium headless) on Node.js v26.13.1 (macOS).
- **Execution Command**:
  ```bash
  node tests/course/r60-t020.mjs
  ```
- **Results**:
  - Source anchors check: **PASS**
  - Theme toggle check: **PASS**
  - Stats overlay check: **PASS**
  - Fullscreen check: **PASS**
  - Timer lifecycle check: **PASS**
  - Deliberate mutation regression catch check: **PASS**
  - Page & console errors check: **PASS** (0 errors)
  - README documentation check: **PASS**
  - Exit Code: **0**

## Checklist
- [x] My code follows the repository's coding style guidelines.
- [x] I have tested the changes locally and verified all checks pass with exit code 0.
- [x] I have documented the changes and test instructions in `README.md`.
- [x] The correct page passes and the deliberate fixture mutation fails for the intended behavioral reason; the final application contains no mutation.
- [x] No unrelated or extraneous files are included in this commit.
- [x] Work is committed to the designated branch `student/e26b07f0564/R60-T020` (not `Main`).
