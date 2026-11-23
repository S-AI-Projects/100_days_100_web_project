# R60-T050 Changed Behaviour and Regression Test

## Test coverage
The Playwright test checks:
- Hover background colours of four buttons.
- Loading of all eight images.
- Presence of href attributes on all 36 anchors.
- Horizontal alignment and order of the two hero buttons.
- Unexpected browser page errors.

## Deliberate mutation
A temporary CSS rule was injected into a second browser page:

`button:hover { background-color: rgb(255, 255, 255) !important; }`

This mutation was applied only inside the browser. No repository source file was changed.

## Expected vs actual

| Test state | Expected | Actual |
|---|---|---|
| Correct page | PASS, exit code 0 | PASS, exit code 0 |
| Mutated hover rule | Assertion failure, exit code 1 | Assertion failed because hover colour did not change |
| Deliberately incorrect expected colour | Assertion failure, exit code 1 | FAIL, exit code 1 |
| Restored test | PASS, exit code 0 | PASS, exit code 0 |

## Conclusion
The regression test distinguishes the correct hover behaviour from a deliberately broken style rule. The temporary mutation and incorrect assertion were restored. No application source changes were required.
