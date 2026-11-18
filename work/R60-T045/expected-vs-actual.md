# R60-T045: expected vs actual

- Menu: expected stats+prefs visible, back/theme/reset hidden. Actual: same (baseline.txt, after.txt).
- Prefs: expected back+theme visible. Actual: same.
- Theme: expected back+reset visible. Actual: same.
- Back from Theme and Prefs: expected Prefs then Menu button sets. Actual: same.
- Two fresh contexts: identical states. No page errors.
- Wrong expectation (fail-check.mjs): expected non-zero exit. Actual: exit code 1 (fail-check.txt).
- Inputs: tests/course/r60-t045.mjs, three 0.95.0 local fixture, viewport 1280x720.
