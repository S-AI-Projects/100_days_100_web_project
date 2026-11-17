## Description
This pull request addresses DOM lifecycle protection, idempotent repeated initialization, and duplicate event handler prevention for **Boredom Buster** (`public/BordemBuster`) as specified in task `R60-T014`.

Prior to this change:
- `public/BordemBuster/index.html` contained an inline `<script>` with 3 duplicate click listeners on `#fetchBtn` and 2 on `#againBtn`, without any initialization idempotency guards or cleanup mechanisms.
- Repeated calls to initialization or repeated user interactions led to multiplied listeners, race conditions in active `setTimeout` timers, and potential element proliferation.
- A disconnected copy of `script.js` was present in the directory without being linked from `index.html`.

This PR consolidates and hardens the application logic within `public/BordemBuster/script.js`, introduces robust DOM lifecycle management via `window.BoredomBuster.init()` and `window.BoredomBuster.cleanup()`, utilizes `AbortController` to cleanly detach handlers, implements active timer tracking to prevent dangling timeouts, ensures DOM node count stability, and adds an automated Playwright regression test suite.

## Related Issue
Fixes #14

## Type of Change
- [x] Bug fix (non-breaking change resolving lifecycle and duplicate handler issues)
- [x] New feature / Code health (idempotent initialization, cleanup/teardown architecture)
- [x] Automated tests (Playwright browser regression test suite)
- [x] Documentation update (README with lifecycle documentation and test instructions)

## Changes Made
1. **`public/BordemBuster/index.html`**:
   - Removed legacy, duplicated inline script block.
   - Linked consolidated and hardened `script.js` before `</body>`.
   - Verified presence of target anchors: `#themeBtn`, `#category`, `#participants`, `#budget`.
2. **`public/BordemBuster/script.js`**:
   - Implemented `window.BoredomBuster` lifecycle API exposing `init()`, `cleanup()`, `isInitialized()`, `getActiveTimers()`, and `getState()`.
   - Added idempotency guard in `init()`: cleanly calls `cleanup(false)` before re-attaching to prevent duplicate listeners or multiplied intervals.
   - Bound all event listeners using `{ signal: abortController.signal }` for clean one-step teardown.
   - Added active timer tracking (`setManagedTimeout`, `clearManagedTimeout`, `clearAllTimers`) to guarantee zero dangling timeouts during rapid fetch actions or cleanup.
   - Wrapped `localStorage` access in safe try-catch wrapper with memory fallback for sandboxed/restricted environments.
3. **`public/BordemBuster/style.css`**:
   - Added missing `.tab-panel` display rules and `.filter-row` styling to ensure history and favourites tab switching renders seamlessly.
4. **`public/BordemBuster/README.md`**:
   - Documented the DOM lifecycle architecture, idempotent initialization, timer cleanup, and automated test execution.
5. **`tests/course/r60-t014.mjs`**:
   - Created headless Chromium Playwright regression test validating:
     - Anchor presence and valid configuration (`#themeBtn`, `#category`, `#participants`, `#budget`).
     - Initial DOM baseline and structural count stability (exactly 1 result card, 4 badges, 0 dangling timers).
     - Idempotent repeated initialization (calling `init()` 5 times leaves exactly 1 handler per button and zero duplicate DOM nodes).
     - Rapid repeated interaction handling (rapid clicks on `#fetchBtn`, `#favBtn`, `#completeBtn` update state cleanly without stacking timers or duplicating DOM).
     - Teardown & cleanup validation (detaches listeners, clears all timers, resets initialized state).
     - Re-initialization after cleanup restoring functionality.
     - Zero uncaught runtime page errors or console errors.
     - README documentation verification.
6. **`work/R60-T014/`**:
   - Saved test results (`results-latest.json`) and task records (`baseline.json`).

## Screenshots/Recordings
N/A — Focuses on headless DOM lifecycle, event listener detachment, and timer cancellation logic. Visual appearance is fully preserved.

## Testing
- **Test Framework**: Playwright (Chromium headless) on Node.js v26.13.1 (macOS).
- **Execution Command**:
  ```bash
  node tests/course/r60-t014.mjs
  ```
- **Results**:
  - Source anchors check: **PASS**
  - Initial DOM baseline check: **PASS**
  - Repeat initialization check (5x): **PASS**
  - Rapid repeated interactions check: **PASS**
  - Cleanup/teardown check: **PASS**
  - Re-initialization check: **PASS**
  - Runtime errors check: **PASS** (0 page errors, 0 console errors)
  - Documentation check: **PASS**
  - Exit Code: **0**

## Checklist
- [x] My code follows the repository's coding style guidelines.
- [x] I have tested the changes locally and verified all checks pass.
- [x] I have documented the changes and test instructions in `README.md`.
- [x] No unrelated or extraneous files are included in this commit.
- [x] Work is committed to the designated branch `student/e26b07f0564/R60-T014` (not `Main`).
