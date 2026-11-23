## Description
This pull request verifies and protects the initialization lifecycle and DOM idempotency for **Snake & Ladder Game** (`public/snakeladder`) as specified in task `R60-T034` for [Issue #34](https://github.com/S-AI-Projects/100_days_100_web_project/issues/34).

### Problem Solved
Repeated game restarts or consecutive `startGame()` invocations previously risked setting overlapping timeout timers and creating duplicate event triggers.

### Changes Made
1. **`public/snakeladder/script.js`**:
   - Added tracked timer references (`startTimer`, `restartTimer`, `confettiTimer`) that cancel prior timeouts before creating new ones.
   - Cleared screen states and DOM tokens cleanly upon `newGame()` and `restartGame()`.
   - Exposed `window.snakeLadder` lifecycle controls for automated verification.
2. **`public/snakeladder/README.md`**:
   - Added Testing & Verification documentation with execution command `node tests/course/r60-t034.mjs`.
3. **`tests/course/r60-t034.mjs`**:
   - Automated regression test validating source anchors (`#confetti-container`, `#setup-screen`, `#p1-name`, `#p2-name`), single and repeated initializations, token node counts, restart idempotency, theme toggling, and 0 console errors.
4. **`work/R60-T034/`**:
   - Verification evidence, test report, baseline records, and visual artifact screenshot.

## Related Issue
Fixes #34

## Type of Change
- [x] Bug fix (lifecycle and timer management)
- [x] Documentation update
- [x] Tests (Playwright automated regression suite)

## Testing
- Command: `node tests/course/r60-t034.mjs`
- Result: **PASS** (exit code 0)

## Checklist
- [x] Repeated initialization or interaction produces exactly one intended update.
- [x] No active orphaned timers or duplicated DOM nodes remain.
- [x] No uncaught page or console errors are logged.
