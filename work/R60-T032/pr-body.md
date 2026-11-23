## Description
This pull request verifies and protects the responsive layout for **Word to PDF Converter** (`public/word-to-pdf`) at mobile (360×800) and desktop (1280×800) viewports as specified in task `R60-T032` for [Issue #32](https://github.com/S-AI-Projects/100_days_100_web_project/issues/32).

### Problem Solved
At 360px mobile viewports, the grid layout and card containers retained fixed paddings and grid item min-content widths, causing unintended horizontal scrolling and content exceeding viewport boundaries.

### Changes Made
1. **`public/word-to-pdf/style.css`**:
   - Added adaptive padding on `.app-wrapper` at `max-width: 600px`.
   - Constrained `.converter-container`, `.workspace-left`, `.workspace-right`, and `.card` with `min-width: 0; max-width: 100%`.
   - Enabled flexible wrapping for `.preview-header` controls on mobile widths.
2. **`public/word-to-pdf/README.md`**:
   - Added Testing & Verification section with test command `node tests/course/r60-t032.mjs`.
3. **`tests/course/r60-t032.mjs`**:
   - Automated regression test suite asserting zero horizontal scroll, visibility of source anchors (`#themeToggle`, `#dropzone`, `#fileInput`, `#btnBrowse`), and full element containment at 360×800 and 1280×800.
4. **`work/R60-T032/`**:
   - Verification evidence, baseline metrics, test report, and screenshots at both viewports.

## Related Issue
Fixes #32

## Type of Change
- [x] Bug fix (non-breaking responsive layout fix)
- [x] Documentation update
- [x] Tests (Playwright automated layout regression suite)

## Testing
- Command: `node tests/course/r60-t032.mjs`
- Result: **PASS** (exit code 0 at both 360×800 and 1280×800)

## Checklist
- [x] Main content is fully usable without unintended horizontal overflow.
- [x] Source anchors verified.
- [x] Browser regression test exits 0 on success, non-zero on failure.
- [x] Tested locally on Google Chrome (Playwright Chromium).
