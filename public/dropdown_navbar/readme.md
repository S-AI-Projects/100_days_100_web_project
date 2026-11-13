# Premium E-Commerce Dashboard with Dropdown Navigation

This project features a modern, high-performance, and responsive e-commerce homepage with a sophisticated dropdown-based navigation system. Built with HTML5, Tailwind CSS, and Vanilla JavaScript, it demonstrates a premium UI/UX with glassmorphism effects and smooth interactive transitions.

## Features

- **Premium UI/UX**: Modern dashboard-style design with glassmorphism, soft shadows, and vibrant gradients.
- **Advanced Navigation**: Sticky navbar with multi-level dropdowns for categories like Grocery, Mobile, Fashion, etc.
- **Section-Link Integration**: Seamless smooth-scroll navigation that connects navbar items directly to homepage sections.
- **Responsive Layout**: Optimized for all devices with a mobile-friendly hamburger menu.
- **Interactive UI**: Hover states, micro-animations, and active section highlighting during scroll.
- **Real Content**: Structured sections for Hero, Categories, Featured Products, and detailed category previews.

## Technologies Used

- **HTML5**: Semantic structure.
- **Tailwind CSS**: Rapid, modern styling and responsive utilities.
- **Vanilla JavaScript**: Interactive dropdowns, scroll logic, and mobile menu handling.
- **Google Fonts**: "Plus Jakarta Sans" for premium typography.

## Getting Started

Simply open `index.html` in any modern web browser to experience the dashboard. No build steps are required as it uses the Tailwind CDN for immediate evaluation.

Developed as part of the 100 Days 100 Web Projects challenge.

## Fallbacks and test

| Situation | What happens |
| --- | --- |
| Browser supports `backdrop-filter` | Glass navbar and dropdowns, blurred and 80% opaque, as designed. |
| Browser lacks `backdrop-filter` | An `@supports not (...)` rule makes `.glass` panels almost solid (97%), so page content does not show through the menus. |
| Tailwind Play CDN cannot load (offline, blocked, scripts off) | The page no longer throws `tailwind is not defined`. It adds `html.no-tailwind`, shows a notice ("Styles could not load…"), keeps the menus closed until clicked and keeps icons small. |

The page sections now use the ids `grocery-products`, `mobile-products` and `appliances-products`, so `#grocery` and `#mobile` each refer only to their menu button.

Run it with the repo's server (`npm run dev`, then open http://localhost:3000/public/dropdown_navbar/). Run the regression test from the repository root:

```bash
npm --prefix tests/course ci
npx --prefix tests/course playwright install chromium   # first time only
node tests/course/r60-t006.mjs            # offline: uses a local Tailwind fixture
node tests/course/r60-t006.mjs --online   # optional extra run against the real CDN
```

The test checks the supported path, a stubbed "no backdrop-filter" path, a "Tailwind unavailable" path and the mobile menu. It exits non-zero on any failed check or page error.
