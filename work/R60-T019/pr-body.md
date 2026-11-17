## Description
This pull request implements comprehensive support for `prefers-reduced-motion` and visible keyboard focus indicators across **AI Tools Hub** (`public/AI-Tools-Hub`), completing task `R60-T019` for [Issue #19](https://github.com/S-AI-Projects/100_days_100_web_project/issues/19).

Prior to this change:
- Continuous floating animations (`.circle-1`, `.circle-2`, `.circle-3`), infinite gradient sweeps (`.search-gradient`), pulsing button animations, and staggered card entrance animations ran unconditionally without respecting the user's OS-level `prefers-reduced-motion` setting.
- Smooth scrolling (`scrollIntoView` and CSS `scroll-behavior: smooth`) was forced across all viewports and user preferences.
- The search input (`#searchBox`) explicitly set `outline: none;` without providing a focus replacement, stripping keyboard users of visible focus indication.
- Focus outlines across other controls had low contrast or narrow element selectors that did not reliably cover inputs, selects, or custom buttons.

This PR introduces robust accessibility and motion-preference features:
1. **`prefers-reduced-motion` Integration**:
   - Added CSS `@media (prefers-reduced-motion: reduce)` rules neutralizing infinite floating background blobs, gradient shifts, pulse animations, and UI transitions.
   - Set `scroll-behavior: auto !important;` in CSS and dynamically switched JavaScript `scrollIntoView` behavior to `'auto'` when reduced motion is preferred.
   - In `script.js`, ensured `initAnimations()` leaves all cards immediately visible (`opacity: 1`, `transform: none`, `transition: none`) without staggered entrance motion when reduced motion is active.
   - Attached dynamic `change` listener to `window.matchMedia('(prefers-reduced-motion: reduce)')` to adapt immediately if user preferences change at runtime.
2. **High-Contrast Visible Keyboard Focus**:
   - Defined high-contrast focus outlines (`outline: 3px solid #06b6d4` with `outline-offset: 2px` and dark backing contrast) across all interactive elements (`a:focus-visible`, `button:focus-visible`, `input:focus-visible`, `select:focus-visible`, `[tabindex]:focus-visible`).
   - Explicitly styled `#searchBox` and `#categoryFilter` on focus, replacing `outline: none;`.
   - Verified focus indicator visibility and boundary fit at both desktop (1280px) and mobile (375px) viewports.
3. **Preservation of Functionality**:
   - All tool cards, categories, smart collections, search filtering, theme toggling, and interactive buttons remain fully functional and responsive across both motion modes.
4. **Automated Regression Suite**:
   - An automated Playwright test suite (`tests/course/r60-t019.mjs`) verifies source anchors, focus visibility at 1280px and 375px, reduced-motion neutralization, control usability, standard motion preservation, and zero console/runtime errors.

## Related Issue
Fixes #19

## Type of Change
- [x] Bug fix / Accessibility enhancements (motion reduction & high-contrast keyboard focus)
- [x] Code health / Usability (responsive controls and accessible interactive styling)
- [x] Automated tests (Playwright browser regression test suite)
- [x] Documentation update (README with motion & focus guidelines and test command)

## Changes Made
1. **`public/AI-Tools-Hub/style.css`**:
   - Added high-contrast `:focus-visible` styling (`3px solid #06b6d4` with `outline-offset: 2px`) for all interactive elements (`a`, `button`, `input`, `select`, `textarea`, `[tabindex]`).
   - Provided explicit `:focus` and `:focus-visible` styles on `.search-gradient input` (`#searchBox`) and `.filter select` (`#categoryFilter`).
   - Added responsive adjustments under `@media (max-width: 600px)` ensuring search and filter controls remain within viewport bounds without clipping.
   - Added `@media (prefers-reduced-motion: reduce)` rules disabling continuous animations (`.circle-1`, `.circle-2`, `.circle-3`, `.search-gradient`, `.favorite-btn`), transitioning `scroll-behavior` to `auto`, and neutralizing card translations.
2. **`public/AI-Tools-Hub/script.js`**:
   - Added `isMotionReduced()` helper detecting `window.matchMedia('(prefers-reduced-motion: reduce)').matches`.
   - Updated `initAnimations()` to keep cards immediately visible without entrance animations or hidden states when reduced motion is preferred.
   - Added `change` event listener on `matchMedia` to dynamically update animation states if OS motion preferences toggle.
   - Updated anchor smooth scrolling and `renderCollection()` smooth scrolling to use `'auto'` under reduced motion.
   - Added `aria-label="Toggle color theme"` to `#themeToggleBtn`.
   - Exposed `window.AIToolsHub` for testability and inspection.
3. **`public/AI-Tools-Hub/README.md`**:
   - Documented motion reduction support, keyboard focus accessibility, and automated test command.
4. **`tests/course/r60-t019.mjs`**:
   - Built Playwright test suite validating:
     - Target source anchors presence (`#categories`, `#collections`, `#tools`, `#searchBox`).
     - Visible keyboard focus indicators across controls at desktop width (1280px).
     - Visible keyboard focus indicators and viewport bounds at mobile width (375px).
     - Reduced-motion emulation: disabled animations, `scroll-behavior: auto`, card visibility without transitions.
     - Information and interactive control usability under reduced motion (search filtering, categories, collections).
     - Standard motion (no-preference) active path preserving intended animations.
     - 0 uncaught runtime page errors or console errors.
     - README documentation verification.
5. **`work/R60-T019/`**:
   - Saved test results in `results-latest.json` and task baseline in `baseline.json`.

## Screenshots/Recordings
N/A — Existing design layout and animations are preserved for users without motion restrictions; accessible high-contrast focus rings and reduced-motion states activate according to user preferences.

## Testing
- **Test Framework**: Playwright (Chromium headless) on Node.js v26.13.1 (macOS).
- **Execution Command**:
  ```bash
  node tests/course/r60-t019.mjs
  ```
- **Results**:
  - Source anchors check: **PASS**
  - Desktop focus (1280px) check: **PASS**
  - Mobile focus (375px) check: **PASS**
  - Reduced-motion CSS check: **PASS**
  - Usability under reduced motion check: **PASS**
  - Standard motion check: **PASS**
  - Page & console errors check: **PASS** (0 errors)
  - README documentation check: **PASS**
  - Exit Code: **0**

## Checklist
- [x] My code follows the repository's coding style guidelines.
- [x] I have tested the changes locally and verified all checks pass with exit code 0.
- [x] I have documented the changes and test instructions in `README.md`.
- [x] Reduced-motion emulation leaves all information and controls usable; keyboard focus indicators remain visible at both tested widths (1280px and 375px).
- [x] No unrelated or extraneous files are included in this commit.
- [x] Work is committed to the designated branch `student/e26b07f0564/R60-T019` (not `Main`).
