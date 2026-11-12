# Luxe — E-Commerce Demo

A single-page storefront demo (HTML, CSS and vanilla JS) with hash routing, search,
cart, wishlist, quick view, checkout and a light/dark theme.

## Run locally

From the repository root:

```bash
npm run dev            # serves the repo on http://localhost:3000
# open http://localhost:3000/public/ecommerce-website/
```

## Keyboard support

| Control | Keys |
| --- | --- |
| Logo, nav links, category cards | `Tab` to reach, `Enter` to open |
| Search | `Tab` to reach, type to filter the Shop view |
| Theme, Wishlist, Cart, hero buttons | `Enter` or `Space` |
| Mobile menu (≤ 768px) | `Enter` opens it and moves focus to the first link; `Escape` closes it and returns focus to the button |
| Cart / wishlist / modals | `Escape` closes |

Every control shows a 3px accent focus ring when reached with the keyboard
(`:focus-visible`), so mouse clicks look the same as before.

## Test

The keyboard regression check uses Playwright (pinned in `tests/course/package.json`):

```bash
npm --prefix tests/course ci
npx --prefix tests/course playwright install chromium   # first time only
node tests/course/r60-t001.mjs
```

It starts its own local server, runs in a fresh Chromium context with remote
fonts/icons/images stubbed, and exits non-zero if any check fails or the page
throws an error.
