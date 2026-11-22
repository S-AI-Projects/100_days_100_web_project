# R60-T046 results
Page: public/Time-Capsule/ (open with trailing slash; serve redirects /index.html to the folder URL)
Feature: localStorage (stores sealed capsules). No @supports in the CSS, so the CSS fallback part does not apply.
Tools: node v24.16.0, playwright chromium 159.0.8154.6
Baseline (work/R60-T046/baseline.json): supported path works. With localStorage blocked (stubbed SecurityError), saveCapsules threw an uncaught SecurityError and the user got no feedback (no error text, capsule not sealed, message left in the box).
Change: script.js, saveCapsules wrapped in try/catch and returns true/false; the submit handler shows "Storage is not available in this browser, so the capsule cannot be sealed." and stops when saving fails.
After (work/R60-T046/after.json, run.txt): supported path unchanged; blocked path shows the message with no page error; the check also restores storage and seals on the same page. Test prints PASS (exit 0).
Before-fix run (run-before-fix.txt): the test fails because no fallback text appears (exit 1).
Negative check (negative-run.txt): a deliberately wrong assertion exits 1.
Stub: window.localStorage getter throws SecurityError while the block flag is set. No real permission or hardware used.
