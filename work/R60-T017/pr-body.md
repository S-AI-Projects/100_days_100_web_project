## Description
This pull request documents and automates a verified, step-by-step interaction and layout walkthrough for the **Drawing App** (`public/Drawing-Canva`) as specified in task `R60-T017` for [Issue #17](https://github.com/S-AI-Projects/100_days_100_web_project/issues/17).

Prior to this change:
- `public/Drawing-Canva` had general feature descriptions in its README, but lacked an executable, tested walkthrough documenting the actual page entry point, setup commands, and expected layout and interaction results.
- No automated browser regression test verified that the documented selectors, outputs, and canvas pixel modifications functioned deterministically.

This PR establishes:
1. Documentation in `public/Drawing-Canva/README.md` specifying the entry point (`public/Drawing-Canva/index.html`), setup command (`node tests/course/r60-t017.mjs`), and an 8-step verified walkthrough.
2. An automated Playwright test (`tests/course/r60-t017.mjs`) that executes the walkthrough, asserts source anchors (`#app`, `#left`, `#brush`, `#eraser`), validates canvas pixel transformations via `ctx.getImageData`, confirms tool switching and history operations (Undo/Redo), and captures a visual artifact (`work/R60-T017/walkthrough.png`).

## Related Issue
Fixes #17

## Type of Change
- [x] Documentation update (detailed executable walkthrough in README)
- [x] Automated tests (Playwright browser walkthrough regression test suite)
- [x] Code health / Verification evidence (saved walkthrough screenshot and run logs)

## Changes Made
1. **`public/Drawing-Canva/README.md`**:
   - Added a **Tested Walkthrough** section with:
     - Exact entry point: `public/Drawing-Canva/index.html`.
     - Automated test command: `node tests/course/r60-t017.mjs`.
     - Detailed 8-step interaction table covering layout shell, default state, freehand drawing, tool switching, stroke erasing, history undo/redo, and canvas clearing.
     - Documented visual artifact screenshot reference (`work/R60-T017/walkthrough.png`).
2. **`tests/course/r60-t017.mjs`**:
   - Built Playwright browser regression test executing the complete documented walkthrough:
     - Verified source anchors: `#app`, `#left`, `#brush`, `#eraser`.
     - Validated computed layout (`#app` 1280×800px, `#left` 300px width, `#canvas` 980×720px, `#brush` active).
     - Verified freehand drawing with mouse down/move/up events, validating canvas pixel color changes to `#000000` and coordinate updates in `#mousePos`.
     - Tested switching to `#eraser`, updating `#currentTool` text, and erasing the drawn pixel back to `#ffffff`.
     - Tested `#undo` (reverting erase to black) and `#redo` (re-applying erase to white).
     - Tested `.btn.clear` resetting the entire canvas surface to white.
     - Generated and validated visual artifact `work/R60-T017/walkthrough.png`.
     - Confirmed zero uncaught runtime page errors or console errors.
     - Verified README documentation agreement with page selectors and outputs.
3. **`work/R60-T017/`**:
   - Recorded test report (`results-latest.json`), baseline metadata (`baseline.json`), and walkthrough screenshot (`walkthrough.png`).

## Screenshots/Recordings
- Walkthrough screenshot captured by automated test and verified at `work/R60-T017/walkthrough.png` (31 KB).

## Testing
- **Test Framework**: Playwright (Chromium headless) on Node.js v26.13.1 (macOS).
- **Execution Command**:
  ```bash
  node tests/course/r60-t017.mjs
  ```
- **Results**:
  - Source anchors check: **PASS**
  - Initial layout check: **PASS**
  - Walkthrough brush drawing check: **PASS**
  - Walkthrough eraser check: **PASS**
  - Walkthrough undo/redo check: **PASS**
  - Walkthrough clear canvas check: **PASS**
  - Walkthrough screenshot check: **PASS**
  - Page & console errors check: **PASS** (0 errors)
  - README walkthrough documentation check: **PASS**
  - Exit Code: **0**

## Checklist
- [x] My code follows the repository's coding style guidelines.
- [x] I have tested the changes locally and verified all checks pass with exit code 0.
- [x] The walkthrough is executed by the browser check; its selectors, outputs, and screenshot agree with the current page.
- [x] I have documented the changes and test instructions in `README.md`.
- [x] No unrelated or extraneous files are included in this commit.
- [x] Work is committed to the designated branch `student/e26b07f0564/R60-T017` (not `Main`).
