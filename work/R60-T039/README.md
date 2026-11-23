# R60-T039 evidence

Issue: https://github.com/S-AI-Projects/100_days_100_web_project/issues/39

Baseline source: `038e8b7697e6c424b79219312874797421822f82`.

## Inputs and expected behavior

At 360×800 and 1280×800, emulate both motion preferences. Assert Tab/Enter search activation and computed visible focus, pending spinner and card animation preferences, add/watch/stats/remove. OMDb and poster responses are local fixtures.

## Reproduction and results

Run `node tests/course/r60-t039.mjs` after the setup in the example README.

`baseline.json` and `after.json` record actual values, expected values, Node/Playwright/Chromium versions, errors and exit status. PNG files support the assertions. The workflow runs the same check against the original example first, restores the PR source, runs the changed check, and uploads this directory as an artifact. The test deliberately exits nonzero on assertion failure.

The local macOS sandbox blocks Chromium startup (MachPortRendezvous permission denied), so local browser success is not claimed. See the attached GitHub Actions run for executed browser results. Source syntax checks were run locally.

No real device or permission-dependent feature was exercised. Keep this coursework evidence in the organisation fork only.
