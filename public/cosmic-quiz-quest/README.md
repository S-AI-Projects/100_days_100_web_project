# Cosmic Quiz Quest

A space-themed quiz game. Pick a category and difficulty, then answer 10 questions before the timer runs out.

## Reduced motion

If the user has turned on "reduce motion" in their system settings:

- The starfield background is drawn once and stays still.
- All other animations (logo float, glowing buttons, spinning star) play only once and do not repeat.

The setup, quiz and results screens work the same with or without motion.

## Keyboard focus

Every button on the setup screen, and the four answer options on the quiz screen, can be reached with the Tab key and shows a visible outline when focused.

## Run the test

From the repository root, run:

    node tests/course/r60-t049.mjs

The test starts a local server, opens the page in a fresh Chromium browser with reduced motion on, and checks the page at 360px and 1280px wide. It prints `PASS` on success. On any failure it prints `FAIL` and exits with a non-zero code.

Needs Node.js and Playwright with Chromium.
