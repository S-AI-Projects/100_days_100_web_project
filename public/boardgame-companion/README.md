# Dice & Trivia Companion

Two-player dice and trivia board game companion.

## Run

From the repo root:

    npm run dev

Open http://localhost:3000/public/boardgame-companion/ (keep the trailing slash so style.css and script.js load).

## Test

Needs Node.js and Playwright with Chromium.

    node tests/course/r60-t042.mjs

The check starts its own local server, tests the page at 360x800 and 1280x800 (overflow, clipping, content order, roll/reveal/score flow), stubs the opentdb.com trivia request, and exits non-zero on any failed assertion or page error.
