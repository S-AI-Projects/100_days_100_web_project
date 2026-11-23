# R60-T033 evidence

Issue: https://github.com/S-AI-Projects/100_days_100_web_project/issues/33

Baseline source: `038e8b7697e6c424b79219312874797421822f82`.

## Inputs and expected behavior

Fresh storage produces readable empty holdings, transactions and news. Buy two AAPL shares at ₹175, reload, sell both and verify recovery to the empty state. Fixed clock and random fixture; no market API.

## Reproduction and results

Run `node tests/course/r60-t033.mjs` after the setup in the example README.

`baseline.json` and `after.json` record actual values, expected values, Node/Playwright/Chromium versions, errors and exit status. PNG files support the assertions. The workflow runs the same check against the original example first, restores the PR source, runs the changed check, and uploads this directory as an artifact. The test deliberately exits nonzero on assertion failure.

The local macOS sandbox blocks Chromium startup (MachPortRendezvous permission denied), so local browser success is not claimed. See the attached GitHub Actions run for executed browser results. Source syntax checks were run locally.

No real device or permission-dependent feature was exercised. Keep this coursework evidence in the organisation fork only.
