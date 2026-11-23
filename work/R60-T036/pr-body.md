## Description
This pull request verifies and validates browser feature detection and fallback handling for **SnapScribe** (`public/SnapScribe`) as specified in task `R60-T036` for [Issue #36](https://github.com/S-AI-Projects/100_days_100_web_project/issues/36).

### Problem Solved
Web applications relying on native hardware APIs (`navigator.mediaDevices.getUserMedia`) risk runtime failures on unsupported browsers or sandboxed environments. This change verifies explicit feature support and graceful fallback without uncaught exceptions.

### Changes Made
1. **`public/SnapScribe/index.html`**:
   - Linked built distribution assets so the application runs directly over local HTTP static servers without requiring an external build step.
2. **`public/SnapScribe/README.md`**:
   - Added Testing & Verification section with execution command `node tests/course/r60-t036.mjs`.
3. **`tests/course/r60-t036.mjs`**:
   - Automated test suite validating source anchor (`#root`), feature-present path (mocked video stream in camera modal), and feature-absent path (missing `getUserMedia` fallback handling without page crash).
4. **`work/R60-T036/`**:
   - Verification logs, test report, baseline records, and visual screenshot artifact.

## Related Issue
Fixes #36

## Type of Change
- [x] Bug fix (entrypoint asset linkage)
- [x] Documentation update
- [x] Tests (Playwright feature-support regression suite)

## Testing
- Command: `node tests/course/r60-t036.mjs`
- Result: **PASS** (exit code 0 on both feature-present and feature-absent paths)

## Checklist
- [x] Tested both feature-present and feature-absent paths.
- [x] Unsupported browser feature produces graceful fallback without uncaught exceptions.
- [x] Automated test exits 0 on success, non-zero on failure.
