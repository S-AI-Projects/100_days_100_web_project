# R60-T043 results
Page: public/fake-hacker-terminal/ (open with trailing slash; serve redirects /index.html to the folder URL)
Tools: node v24.16.0, playwright chromium 159.0.8154.6
Baseline (work/R60-T043/baseline.json): empty and whitespace input and unknown commands print "Command not found"; the input clears; no page errors, no failed requests; style.css uses only the system monospace font and no images, so there is no asset fallback to test. Defect: typing "constructor" printed "function Object() { [native code] }" because commands[command] matched Object.prototype names.
Change: script.js, commands[command] replaced with Object.hasOwn(commands, command) (one line).
After (work/R60-T043/after.json, run.txt): constructor and __proto__ now print "Command not found"; test prints PASS (exit 0).
Before-fix run (run-before-fix.txt): test fails on "constructor" (exit 1).
Negative check (negative-run.txt): a deliberately wrong assertion exits 1.
No native feature, permission or hardware is used; nothing needed stubbing.
