## Description
This pull request introduces deterministic browser fixtures and automated regression testing for the **"What to Watch" Movie Selector** (`public/movie-selector`), resolving [Issue #15](https://github.com/S-AI-Projects/100_days_100_web_project/issues/15) in task `R60-T015`.

Prior to this change:
- Browser testing of `public/movie-selector` was non-deterministic because recommendations relied on external network requests to the TMDb API, unconstrained `Math.random` page and index selections, and remote poster image downloads.
- When run without a valid `TMDB_API_KEY` (or in an offline/sandboxed test environment), the application would attempt to fetch `"null&with_genres=..."`, throwing an invalid URL / network error and popping a blocking alert modal.
- In addition, an invalid `import.meta` reference in classic script mode produced a parsing syntax error in standard browser execution.

This PR replaces external network requests, image assets, and randomness in test runs with deterministic local fixtures. It also hardens `public/movie-selector/app.js` with dynamic API key discovery, safe storage access, and a curated offline fallback dataset, ensuring that two fresh browser contexts produce the exact same asserted DOM state without depending on external public APIs.

## Related Issue
Fixes #15

## Type of Change
- [x] Bug fix (syntax error resolution in script mode, safe storage and offline fallback)
- [x] Code health / Deterministic fixtures (reproducible test state across fresh browser contexts)
- [x] Automated tests (Playwright browser regression test suite)
- [x] Documentation update (README with deterministic testing instructions)

## Changes Made
1. **`public/movie-selector/app.js`**:
   - Fixed script-mode syntax error by removing invalid `import.meta` access in classic `<script>`.
   - Added dynamic `getApiKey()` and `getMovieDiscoverApi()` resolving `window.TMDB_API_KEY` at call time.
   - Added `LOCAL_FALLBACK_MOVIES` offline library providing curated recommendations across all 12 genres when no external API key is configured.
   - Wrapped `localStorage` access in safe try-catch wrapper with memory fallback to protect against sandboxed storage exceptions.
   - Added accessibility attributes (`aria-expanded`, `aria-haspopup`) to `#genreTrigger`.
2. **`public/movie-selector/README.md`**:
   - Documented the deterministic browser testing architecture, route interception, media fixtures, and test command (`node tests/course/r60-t015.mjs`).
3. **`tests/course/r60-t015.mjs`**:
   - Built Playwright regression suite validating:
     - Target anchors presence and valid configuration (`#genreDropdownWrapper`, `#genreTrigger`, `#genreTriggerLabel`, `#genreMenu`).
     - Dropdown toggle, outside-click auto-close, and accessible attributes.
     - Deterministic network interception of TMDb Discover API returning mock JSON fixture.
     - Deterministic media interception of poster images returning 1x1 SVG fixture.
     - Seeded PRNG (`Math.random`) and stubbed native features (`window.open`, `window.alert`).
     - Cross-context state identity: verifying two fresh browser contexts produce byte-for-byte identical asserted DOM and layout state.
     - Offline fallback resilience when no API key is set.
     - Zero uncaught runtime page errors or console errors.
4. **`work/R60-T015/`**:
   - Saved test results (`results-latest.json`) and task records (`baseline.json`).

## Screenshots/Recordings
N/A — Visual appearance is fully preserved. The changes focus on deterministic testing fixtures, offline fallback robustness, and script compatibility.

## Testing
- **Test Framework**: Playwright (Chromium headless) on Node.js v26.13.1 (macOS).
- **Execution Command**:
  ```bash
  node tests/course/r60-t015.mjs
  ```
- **Results**:
  - Source anchors check: **PASS**
  - Dropdown toggle check: **PASS**
  - Context 1 scenario check: **PASS**
  - Context 2 scenario check (fresh context): **PASS**
  - Cross-context state identity check: **PASS**
  - Offline fallback check: **PASS**
  - Page & console errors check: **PASS** (0 errors)
  - README documentation check: **PASS**
  - Exit Code: **0**

## Checklist
- [x] My code follows the repository's coding style guidelines.
- [x] I have tested the changes locally and verified all checks pass with exit code 0.
- [x] I have documented the changes and test instructions in `README.md`.
- [x] Two fresh browser contexts produce the same asserted DOM state independent of public APIs.
- [x] No unrelated or extraneous files are included in this commit.
- [x] Work is committed to the designated branch `student/e26b07f0564/R60-T015` (not `Main`).
