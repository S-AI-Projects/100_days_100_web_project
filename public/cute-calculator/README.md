# Cute Calculator

## Description

A themed calculator with button animations, keyboard support, expression preview, percentage handling, and a reusable calculation history panel.

## Features

* Supports arithmetic operations, parentheses, decimals, and percentages.
* Shows a formatted expression preview above the input.
* Provides clear, delete, and equals controls.
* Tracks the last ten calculations in an in-memory and persistent history panel.
* Lets users reuse a previous result by selecting it from history.
* Includes keyboard shortcuts for numbers, operators, Enter, Backspace, and Escape.
* **Browser Compatibility & Fallbacks**:
  * **Backdrop-Filter Fallback**: Uses an `@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px)))` block providing an opaque background fallback (`#ffffff`) so the calculator and modal dialogs do not become transparent or unreadable when backdrop-filter is unsupported.
  * **Storage Permissions & Quota Fallback**: All `localStorage` operations are wrapped in `try/catch`. When `localStorage` throws `SecurityError` (e.g. private browsing, third-party storage restrictions) or `QuotaExceededError`, calculations and history fall back seamlessly to in-memory storage without uncaught exceptions.

## Technologies Used

* HTML5
* CSS3
* JavaScript
* Google Fonts

## Folder Structure

```text
cute-calculator/
|-- index.html
|-- style.css
|-- script.js
`-- preview.png
```

## How to Run

1. Clone the repository.
2. Navigate to `public/cute-calculator`.
3. Open `index.html` in a browser.

## Browser Fallbacks & Testing

### Missing Backdrop-Filter
In browsers without `backdrop-filter` or `-webkit-backdrop-filter` support, `@supports not (...)` automatically sets a solid white background (`#ffffff`) for `.calculator` and `.confirm-dialog`, preventing transparency against the background bubbles.

### Disabled or Restricted Storage
When cookies/localStorage are blocked (e.g. `SecurityError` or `QuotaExceededError`), the calculation history seamlessly operates in-memory for the current session.

### Automated Testing
Run the automated Playwright test suite:
```bash
node tests/course/r60-t026.mjs
```
The test verifies:
1. Normal browser context: arithmetic (e.g., `8*5=40`), history persistence, and dialog operations run without error.
2. Restricted/mocked storage context: `localStorage` throwing `SecurityError`/`QuotaExceededError` falls back to in-memory history and executes calculations and dialogs without uncaught exceptions.
3. CSS `@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px)))` rule is verified.
4. Report saved to `work/R60-T026/results-latest.json`.

## Screenshots

> Screenshots can be added here.

## Future Enhancements

* Persist calculation history in `localStorage`.
* Add scientific calculator functions such as square root and powers.

## Author / Contributor

Developed as part of the GSSoC project collection.
