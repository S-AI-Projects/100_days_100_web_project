## Description
This pull request introduces graceful browser feature-support fallbacks and automated regression testing for the **Website Personalizer** (`public/WebsitePersonalizer`), completing task `R60-T016` for [Issue #16](https://github.com/S-AI-Projects/100_days_100_web_project/issues/16).

Prior to this change:
- The application assumed full availability of modern browser APIs and CSS specifications (`matchMedia`, `navigator.clipboard`, CSS `color-mix()`, `backdrop-filter`) without explicit fallback paths.
- Unsupported browser environments had no explicit mechanism to handle absent capabilities, potentially failing silently, dropping styles, or leaving users without access to essential export functionality.

This PR implements explicit, documented feature-support and feature-absent paths:
1. `matchMedia` preference detection: When supported, offers "Auto — match system preference"; when unsupported, explicitly disables the control with clear `(Unsupported)` fallback messaging while leaving manual options fully functional.
2. `navigator.clipboard` token export: When supported, copies CSS tokens directly to the clipboard; when unsupported, opens an accessible manual export drawer with the generated tokens and explicit copy instructions.
3. CSS `@supports` fallbacks: Adds `@supports not (color: color-mix(in srgb, red, blue))` and `@supports not (backdrop-filter: blur(12px))` rules to ensure opaque/rgba fallbacks on legacy rendering engines.
4. An automated Playwright regression test suite (`tests/course/r60-t016.mjs`) validates both feature-present and feature-absent execution paths.

## Related Issue
Fixes #16

## Type of Change
- [x] Bug fix / Fallback enhancement (explicit handling of absent browser features)
- [x] Code health / Accessibility (disabled control states, aria labels, and fallback drawers)
- [x] Automated tests (Playwright browser regression test suite)
- [x] Documentation update (README with feature fallback architecture and test instructions)

## Changes Made
1. **`public/WebsitePersonalizer/index.html`**:
   - Added `nav-actions` containing "Export CSS" and "Repersonalize" buttons.
   - Added accessible `#export-drawer` with `#export-textarea` and `#export-feedback` for manual copy fallback.
   - Preserved all source anchors: `#quiz-phase`, `#progress-fill`, `#progress-label`, `#card-stack`.
2. **`public/WebsitePersonalizer/script.js`**:
   - Added `isFeatureSupported()` helper checking `matchMedia`, `clipboard`, and `colorMix`.
   - Updated quiz mode question with "Auto — match system preference" marked with `requires: 'matchMedia'`.
   - Disabled unsupported quiz options with `disabled-feature` styling and explicit `(Unsupported)` text.
   - Handled `copyConfigBtn` click: copies directly if clipboard API is supported, or gracefully reveals the export drawer with manual copy guidance if unsupported.
   - Updated `applyTheme()` with fallback shape gradient and box-shadow when `color-mix` is unsupported.
   - Exposed `window.WebsitePersonalizer` API for regression testing.
3. **`public/WebsitePersonalizer/style.css`**:
   - Added styles for `.disabled-feature`, `.export-drawer`, `.export-textarea`, and `.nav-actions`.
   - Added CSS `@supports not (color: color-mix(in srgb, red, blue))` fallback surface styles.
   - Added CSS `@supports not (backdrop-filter: blur(12px))` fallback background styles.
4. **`public/WebsitePersonalizer/README.md`**:
   - Documented the feature-support fallback architecture and automated testing commands.
5. **`tests/course/r60-t016.mjs`**:
   - Built Playwright regression suite testing:
     - Anchor presence and valid initial states (`#quiz-phase`, `#progress-fill`, `#progress-label`, `#card-stack`).
     - Feature-present path (auto-option enabled, direct clipboard copy).
     - Feature-absent path with stubbed absent `matchMedia` (disabled control, fallback text, supported choices still advance quiz).
     - Feature-absent path with stubbed absent `navigator.clipboard` (export drawer displayed with manual guidance).
     - CSS `@supports not` fallback rules verification.
     - Zero uncaught runtime page errors or console errors.
     - README documentation verification.
6. **`work/R60-T016/`**:
   - Saved test results (`results-latest.json`) and task records (`baseline.json`).

## Screenshots/Recordings
N/A — Visual appearance is fully preserved. The changes focus on browser feature detection, disabled control states for unsupported APIs, and manual export fallbacks.

## Testing
- **Test Framework**: Playwright (Chromium headless) on Node.js v26.13.1 (macOS).
- **Execution Command**:
  ```bash
  node tests/course/r60-t016.mjs
  ```
- **Results**:
  - Source anchors check: **PASS**
  - Feature-present path check: **PASS**
  - Feature-absent matchMedia check: **PASS**
  - Feature-absent clipboard check: **PASS**
  - CSS `@supports` fallback check: **PASS**
  - Page & console errors check: **PASS** (0 errors)
  - README documentation check: **PASS**
  - Exit Code: **0**

## Checklist
- [x] My code follows the repository's coding style guidelines.
- [x] I have tested the changes locally and verified all checks pass with exit code 0.
- [x] I have documented the changes and test instructions in `README.md`.
- [x] Unsupported features produce useful fallback text or disabled controls while supported paths continue to work.
- [x] No unrelated or extraneous files are included in this commit.
- [x] Work is committed to the designated branch `student/e26b07f0564/R60-T016` (not `Main`).
