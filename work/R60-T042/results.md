# R60-T042 results
Page: public/boardgame-companion/ (open with trailing slash; serve redirects /index.html to the folder URL)
Widths: 360x800, 1280x800
Tools: node v24.16.0, playwright 1.65.1, chromium 159.0.8154.6
Baseline (before any edit): no horizontal overflow, nothing clipped, Player 1 left of Player 2, no page errors (work/R60-T042/baseline.json)
Expected vs actual: all assertions pass at both widths (work/R60-T042/run.txt)
Change: none to page files, already correct; added regression test tests/course/r60-t042.mjs
Failure check: a deliberately wrong assertion exits non-zero (work/R60-T042/negative-run.txt)
Stubbed: opentdb.com trivia request
