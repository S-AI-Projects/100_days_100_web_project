### Task R60-T040: Catch a plausible UI regression in public/StatisticsDashboard

#### 1. Baseline Summary
- `public/StatisticsDashboard/index.html` provides game statistics tracking with source anchors `#totalGamesInput`, `#xWinsInput`, `#oWinsInput`, and `#drawsInput`.
- Tested baseline behavior: setting total games = 10 and player X wins = 6 correctly calculates player X win rate as 60.0%, updates summary cards, and persists to localStorage on save.

#### 2. Changes & Regression Test
- Enhanced `public/StatisticsDashboard/script.js` to dispatch `input` events when increment and decrement buttons are pressed, ensuring immediate reactive updates.
- Added automated Playwright regression test suite `tests/course/r60-t040.mjs`:
  - Validates correct behavior, storage persistence, and reactive updates on the production application.
  - Tests against a deliberate fixture mutation (intercepting win rate calculation logic) to verify that the assertion strictly catches behavioral regressions and fails with an informative error.
  - Confirms the final repository application contains no mutation.
- Updated `public/StatisticsDashboard/README.md` with documentation and test execution commands.

#### 3. Verification & Evidence
- `node tests/course/r60-t040.mjs` passed with exit code 0.
- Source anchors verified: `#totalGamesInput`, `#xWinsInput`, `#oWinsInput`, `#drawsInput`.
- Deliberate fixture mutation caught and rejected by strict assertion.
- Evidence saved to `work/R60-T040/`.
