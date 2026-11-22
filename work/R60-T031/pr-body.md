## Description
This pull request verifies and improves keyboard navigation and focus accessibility for **Complaint Management System** (`public/Complaint_Management_System`) as specified in task `R60-T031` for [Issue #31](https://github.com/S-AI-Projects/100_days_100_web_project/issues/31).

Prior to this change:
- `public/Complaint_Management_System` lacked an accessible skip-to-content bypass link for keyboard users.
- Interactive controls relied on default browser outlines that lacked explicit, high-contrast focus rings.
- No automated regression test asserted sequential Tab key navigation, non-positive tabindex constraints, and keyboard activation (Enter/Space) of interactive controls.

This PR establishes:
1. Addition of an accessible `.skip-link` targeting `#main-content`, visually positioned off-screen and visible on keyboard focus.
2. High-contrast visible focus indicators (`:focus-visible`) for interactive buttons and links.
3. Updated documentation in `public/Complaint_Management_System/README.md` detailing the entry point (`public/Complaint_Management_System/index.html`), setup/test command (`node tests/course/r60-t031.mjs`), and keyboard navigation verification.
4. An automated Playwright test suite (`tests/course/r60-t031.mjs`) asserting the source anchors (`#theme-toggle`, `#page-title`, `#user-profile`, `#profile-avatar`), Tab traversal sequence, focus visibility, Enter/Space activation, and capturing a visual artifact (`work/R60-T031/keyboard-check.png`).
5. Verification records and baseline evidence stored under `work/R60-T031/`.

## Related Issue
Fixes #31

## Type of Change
- [x] Accessibility improvement (skip-to-content link and high-contrast focus outline)
- [x] Documentation update (keyboard navigation guide in README)
- [x] Automated tests (Playwright keyboard regression test suite)
- [x] Code health / Verification evidence (saved visual artifact and run logs)

## Changes Made
1. **`public/Complaint_Management_System/index.html`**:
   - Added accessible skip link: `<a href="#main-content" class="skip-link">Skip to main content</a>`.
   - Added `id="main-content"` and `tabindex="-1"` to `<main class="main-content">`.
2. **`public/Complaint_Management_System/style.css`**:
   - Added CSS for `.skip-link` (smooth transition into viewport when focused).
   - Added high-contrast visible focus styling for `:focus-visible` on interactive elements.
3. **`public/Complaint_Management_System/README.md`**:
   - Added a **Keyboard Navigation & Accessibility** section documenting test commands, source anchors, and Tab sequence.
4. **`tests/course/r60-t031.mjs`**:
   - Automated regression check verifying source anchors, zero positive tabindices, skip-link functionality, Tab navigation sequence, Enter/Space keyboard activation, and capturing screenshot evidence.
5. **`work/R60-T031/`**:
   - Recorded test report (`results-latest.json`), baseline metadata (`baseline.json`), visual screenshot (`keyboard-check.png`), and PR body (`pr-body.md`).

## Testing
- **Test Framework**: Playwright (Chromium headless) on Node.js v26.12.1.
- **Execution Command**:
  ```bash
  node tests/course/r60-t031.mjs
  ```
- **Results**:
  - Source anchors check: **PASS**
  - No positive tabindex check: **PASS**
  - Skip link check: **PASS**
  - Tab traversal check: **PASS**
  - Keyboard activation check: **PASS**
  - Visual focus artifact screenshot: **PASS**
  - Page & console errors check: **PASS** (0 errors)
  - README documentation check: **PASS**
  - Exit Code: **0**

## Checklist
- [x] My code follows the repository's coding style guidelines.
- [x] I have tested the changes locally and verified all checks pass with exit code 0.
- [x] The keyboard can reach and operate each relevant control; focus is visible and no positive tabindex is introduced.
- [x] I have documented the changes and test instructions in `README.md`.
- [x] No unrelated or extraneous files are included in this commit.
- [x] Work is committed to the designated branch `student/e26b07f0592/R60-T031`.
