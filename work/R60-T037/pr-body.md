## Description
This pull request documents and automates a verified, step-by-step interaction and layout walkthrough for **Markdown Editor & Analytics** (`public/Markdown_Editor`) as specified in task `R60-T037` for [Issue #37](https://github.com/S-AI-Projects/100_days_100_web_project/issues/37).

Prior to this change:
- `public/Markdown_Editor` had a generic template README referencing incorrect filenames and missing executable walkthrough documentation for its analytics and live preview engine.
- No automated browser regression verified that the key controls (`#word-count`, `#char-count`, `#read-time`, `#theme-toggle`), live parsing, and workspace resizing functioned deterministically.

This PR establishes:
1. Updated documentation in `public/Markdown_Editor/README.md` detailing the entry point (`public/Markdown_Editor/index.html`), setup/test command (`node tests/course/r60-t037.mjs`), and a verified 7-step interaction walkthrough table.
2. An automated Playwright test suite (`tests/course/r60-t037.mjs`) asserting the source anchors, DOM event effects, layout calculations, real-time analytics updates, live preview rendering, theme switching, and capturing a visual artifact (`work/R60-T037/walkthrough.png`).
3. Verification records and baseline evidence stored under `work/R60-T037/`.

## Related Issue
Fixes #37

## Type of Change
- [x] Documentation update (executable walkthrough in README)
- [x] Automated tests (Playwright browser walkthrough regression test suite)
- [x] Code health / Verification evidence (saved walkthrough screenshot and run logs)

## Changes Made
1. **`public/Markdown_Editor/README.md`**:
   - Added a **Tested Walkthrough** section with:
     - Exact entry point: `public/Markdown_Editor/index.html`.
     - Automated test command: `node tests/course/r60-t037.mjs`.
     - Step-by-step walkthrough covering empty state baseline, Markdown input analytics, live preview rendering, formatting toolbar, theme toggle, and pane resizing.
     - Documented visual artifact screenshot reference (`work/R60-T037/walkthrough.png`).
2. **`tests/course/r60-t037.mjs`**:
   - Built Playwright browser regression test executing the complete documented walkthrough:
     - Verified source anchors: `#word-count`, `#char-count`, `#read-time`, `#theme-toggle`.
     - Validated layout dimensions for toolbar, format-toolbar, and dual panes.
     - Verified debounced input updates for word count (23 words), character count (160), and read time (1m).
     - Verified live preview DOM rendering for `h1`, `strong`, `em`, `ul > li`, and `pre > code.language-javascript`.
     - Tested formatting buttons for bold wrapping and H2 prefixing.
     - Tested dark/light mode toggling via `#theme-toggle` with `data-theme` attribute and localStorage verification.
     - Tested workspace pane resizing via mouse drag on `#dragbar`.
     - Captured and validated visual screenshot `work/R60-T037/walkthrough.png`.
     - Verified zero uncaught runtime errors or console errors.
     - Confirmed README documentation agreement with page selectors and outputs.
3. **`work/R60-T037/`**:
   - Recorded test report (`results-latest.json`), baseline metadata (`baseline.json`), walkthrough screenshot (`walkthrough.png`), and PR body (`pr-body.md`).

## Testing
- **Test Framework**: Playwright (Chromium headless) on Node.js v26.12.1.
- **Execution Command**:
  ```bash
  node tests/course/r60-t037.mjs
  ```
- **Results**:
  - Source anchors check: **PASS**
  - Workspace layout check: **PASS**
  - Walkthrough input analytics check: **PASS**
  - Walkthrough preview rendering check: **PASS**
  - Walkthrough toolbar action check: **PASS**
  - Walkthrough theme toggle check: **PASS**
  - Walkthrough dragbar check: **PASS**
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
- [x] Work is committed to the designated branch `student/e26b07f0592/R60-T037`.
