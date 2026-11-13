# R60-T007 evidence — tested walkthrough, public/Glassmorphism-Generator

Course evidence only — remove `work/` before any upstream PR.

Command: `node tests/course/r60-t007.mjs --label=<label>`
Tools: Node v22.23.4, Playwright 1.63.0, Chromium 153.0.8010.12, Linux.

Anchors:
- `#preview-card`: the live glass card.
- `#blur`: the Blur slider, with its value label `#blur-val`.
- `#theme-toggle`: the 🌙/☀️ dark-mode button.

The walkthrough source is the table in `public/Glassmorphism-Generator/README.md`, between `<!-- walkthrough:start -->` and `<!-- walkthrough:end -->`. The check parses it and executes every step in a fresh Chromium context: 1280×800, then 390×844, light colour scheme.
The clipboard needs a permission, so `navigator.clipboard.writeText` is stubbed to record text. Non-local requests are blocked (none are needed). No real-device run was done.

## Page behaviour was already correct

The page files (`index.html`, `script.js`, `style.css`) are unchanged by this PR. All 8 documented steps pass against them, and there are no page errors.
The defect was in the documentation:
- The README's install section ended in an unclosed code block with a placeholder link.
- It did not document the entry point or setup command.
- It had no walkthrough with expected results.

## Results

| Run | Result | File |
| --- | --- | --- |
| baseline (original README) | **0/5**, exit 1: no entry point/setup command, unclosed code block (1 fence), no walkthrough, no screenshot, nothing to execute | `results-baseline.json` |
| after (new README) | **13/13**, exit 0: 4 documentation checks + 8 walkthrough steps + no page errors | `results-after.json` |
| sensitivity: wrong doc (step 2 says `25px`) | 12/13, **exit 1**: step 2 fails with "got 24px" | `results-sensitivity-wrong-doc.json` |
| sensitivity: broken page (label without `px`) | 11/13, **exit 1**: steps 1 and 2 fail | `results-sensitivity-broken-page.json` |

The two sensitivity runs were temporary edits, reverted afterwards. They show that the check exits non-zero when the documentation and the page disagree.
The screenshots `step-<n>-after.png` show the page after each walkthrough step. The README screenshot (`docs/walkthrough-step4.png`) is the same view as step 4 and is refreshed with `--update-docs-screenshot`.
