# R60-T001 evidence — keyboard use, public/ecommerce-website

Course evidence only — remove `work/` before any upstream PR.

Command: `node tests/course/r60-t001.mjs --label=<baseline|after>`
Tools: Node v22.23.4, Playwright 1.63.0, Chromium 153.0.8010.12, Linux. Viewports 1280×800 and 390×844, `prefers-reduced-motion: reduce`.
Inputs: Tab, Enter, Space, Escape, typed text "watch". Remote hosts stubbed: fonts.googleapis.com, unpkg.com, images.unsplash.com.
No permission-gated or hardware feature is used by this page, so nothing else is stubbed; no optional real-device run was done.

| Check | Expected | Baseline (original page) | After |
| --- | --- | --- | --- |
| no-positive-tabindex | none | pass | pass |
| desktop-header-tab-order | logo → 4 links → search → theme → wishlist → cart | **fail** – logo (`div`) skipped | pass |
| desktop-header-visible-focus | ring on every stop | **fail** – search, theme, wishlist, cart, Shop Now had none (`outline: none` reset) | pass |
| accessible-names | every control named | **fail** – search input and mobile menu button unnamed; product icon buttons unnamed | pass |
| logo-enter-goes-home | `#home` | **fail** – not focusable | pass |
| nav-link-enter-* (4) | view switches | pass | pass |
| search-typing-filters-shop | Shop filtered to "watch" | pass | pass |
| theme-toggle-enter-and-space | dark then light | pass | pass |
| wishlist / cart Enter opens, Escape closes (2) | open then closed | pass | pass |
| hero-view-trending-enter-scrolls | #featured near top | **fail** – `scrollToFeatured is not defined` | pass |
| category-cards-in-tab-order-with-visible-focus | 4 | **fail** – 0 (`div onclick`) | pass |
| category-card-enter-filters-shop | Shop, filter = electronics | **fail** – not focusable; `filterByCategory` undefined | pass |
| mobile-menu-keyboard | named, expands, focus moves in, Escape returns | **fail** – no name, no aria-expanded, menu never shown (no `.nav-links.active` CSS) | pass |
| no-page-errors | none | **fail** – ReferenceError | pass |

Baseline 9/18, after 18/18 (exit 1 → exit 0). Full expected-vs-actual in `results-baseline.json` / `results-after.json`.
Screenshots `focus-*-baseline.png` / `focus-*-after.png` support review only.
