## Description
This pull request implements and verifies empty, fallback, and recovery states for **Stock Market Simulator** (`public/stock-market-simulator`) as specified in task `R60-T033` for [Issue #33](https://github.com/S-AI-Projects/100_days_100_web_project/issues/33).

### Problem Solved
Previously, when market prices were uninitialized or empty, the market table rendered without an informative fallback. Portfolio and history sections rendered plain text strings rather than structured, accessible empty states.

### Changes Made
1. **`public/stock-market-simulator/script.js`**:
   - Added `#market-empty` table row fallback when stock feeds or price fixtures are unavailable.
   - Structured `#portfolio-empty` and `#history-empty` components with clear feedback.
   - Verified clean transition and recovery between empty holdings and active holdings.
2. **`public/stock-market-simulator/README.md`**:
   - Added Testing & Verification documentation with execution command `node tests/course/r60-t033.mjs`.
3. **`tests/course/r60-t033.mjs`**:
   - Automated test suite asserting source anchors (`#themeToggle`, `#balance`, `#portfolioValue`, `#pl`), initial empty states, empty market fallback, state recovery upon purchasing shares, and 0 console errors.
4. **`work/R60-T033/`**:
   - Verification evidence, test report, baseline metrics, and visual artifact screenshot.

## Related Issue
Fixes #33

## Type of Change
- [x] Bug fix (empty and fallback state improvements)
- [x] Documentation update
- [x] Tests (Playwright automated regression suite)

## Testing
- Command: `node tests/course/r60-t033.mjs`
- Result: **PASS** (exit code 0)

## Checklist
- [x] Meaningful empty and fallback states are displayed and recover on valid input.
- [x] No uncaught page or console errors are logged.
- [x] Regression test exits 0 on success, non-zero on failure.
