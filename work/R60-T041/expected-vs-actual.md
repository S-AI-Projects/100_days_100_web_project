# R60-T041: expected vs actual

Page: public/Travel_booking_website/ (served at /public/Travel_booking_website/)
Check: node tests/course/r60-t041.mjs
Inputs: keyboard only (Tab, Shift+Tab, Enter, Space) on #chat-toggle, #close-chat, #export-chat

| Check | Expected | Actual |
|---|---|---|
| Chat box on load | hidden | hidden (display: none) |
| Tab reaches #chat-toggle, #close-chat, #export-chat | yes | yes |
| Focus visible on each | yes | yes |
| Enter / Space on #chat-toggle | opens / closes chat | as expected |
| Enter on #close-chat | closes chat | as expected |
| Space on #export-chat | downloads travel-chat.txt | as expected |
| Positive tabindex on page | none | none |
| Unexpected page errors | none | none |

Baseline: the controls are native <button> elements and already behave correctly.
Changed behavior: none. No source change was needed; a regression test and README section were added.
Result: PASS, exit code 0 (see run-output.txt, tool-versions.txt, baseline-output.txt).
