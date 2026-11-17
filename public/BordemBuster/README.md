# ✨ Boredom Buster

> Beat the block. Discover your next adventure — instantly.

A zero-dependency, single-page web app that suggests activities to cure boredom, with smart local library fallback, persistent favourites, session history, milestone badges, and full dark/light mode.

---

## Features

- 🌙☀️ **Dark / Light Mode** — toggle anytime with `#themeBtn`, preference persists via localStorage & CSS variables
- 🎯 **Multi-Criteria Filtering** — filter by `#category`, `#participants`, and `#budget`
- 📚 **Local Activity Library** — curated activities across all 9 categories, zero external dependencies required
- 🧡 **Favourites** — save activities and re-visit them; stored safely with fallback
- 🕓 **History** — tracks the last 20 activities found in the session
- 🏆 **Milestone Progress** — track completed activities and unlock explorer badges
- 📋 **Copy to Clipboard** — one-click copy of the activity text
- 🔔 **Toast Notifications** — non-intrusive feedback with debounced timer management
- 🔀 **Shuffle** — find another activity with current filters instantly
- 🛡️ **DOM Lifecycle & Repeat Initialization Protection**:
  - Exposes `window.BoredomBuster.init()` and `window.BoredomBuster.cleanup()`
  - Safe against repeated initialization calls (idempotent setup, no duplicate listeners)
  - Strict event listener cleanup via `AbortController`
  - Active timer tracking ensuring zero dangling handles on unmount or repeated actions
  - Node count stability ensuring duplicate elements are never appended to the DOM

---

## How to Run

No build step, no external dependencies, no server needed.

1. Clone or download the repository.
2. Open `public/BordemBuster/index.html` directly in any modern browser.
3. Everything functions offline thanks to the self-contained activity library and storage fallbacks.

---

## File Structure

```
BordemBuster/
├── index.html   — App markup, semantic HTML5, source anchors
├── style.css    — Glassmorphism styles, CSS variables, dark/light theme
├── script.js    — App logic, DOM lifecycle, state management, timer guards
└── README.md    — Documentation and verification guide
```

---

## DOM Lifecycle & Idempotency Architecture

Boredom Buster implements robust lifecycle protection to prevent memory leaks and duplicate handler execution:

- **Idempotent Initialization**: Calling `window.BoredomBuster.init()` multiple times tears down previous listener bindings cleanly before attaching fresh ones, keeping exactly 1 handler per element.
- **AbortController Teardown**: All listeners are bound using `{ signal: abortController.signal }`, allowing instantaneous detachment during `cleanup()`.
- **Timer Lifecycle**: Timeouts for toast notifications and simulated fetching are tracked in an active timer set and cleared when superseded or torn down.
- **Safe Storage**: LocalStorage operations are wrapped in safe try-catch blocks with memory fallbacks to prevent errors in restricted or sandboxed environments.

---

## Automated Verification

To run the Playwright browser regression test covering repeat initialization, duplicate handler prevention, rapid interaction, timer cleanup, and DOM stability:

```bash
node tests/course/r60-t014.mjs
```

---

## API Credit

Activities are designed based on the schema of the **[Bored API by Le Wagon](https://bored.api.lewagon.com)** — a free, open API for finding random activities.

- Supports categories: `education`, `recreational`, `social`, `diy`, `charity`, `cooking`, `relaxation`, `music`, `busywork`
- Supports parameters: `participants`, `budget` (free, cheap, expensive)

---

## License

MIT — free to use, modify, and distribute.
