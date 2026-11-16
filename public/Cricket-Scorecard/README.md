# Live Cricket Scoreboard 🏏

A web application to track live cricket scores and upcoming fixtures across the globe.

## Features
- **Live Match Tracking:** View current scores and status of ongoing matches.
- **Upcoming Fixtures:** Check the schedule for upcoming international and domestic games.
- **Responsive Design:** Optimized for both desktop and mobile viewing.
- **Empty & Error State Displays:**
  - **Search Empty State:** When filtering matches by team name, if no results match the search query, each matches container renders an accessible empty-state message (`role="status"`, `aria-live="polite"`) reflecting the exact search term instead of leaving a blank area.
  - **Network Error Container:** If network requests fail when fetching scores or fixtures, accessible error cards (`role="alert"`, `aria-live="assertive"`) are displayed with high-contrast styling and an interactive "Try Again" retry action.

## Tech Stack
- HTML
- CSS
- JavaScript

## Setup Instructions
1. Open `index.html` in your web browser.
2. The project currently uses mock data for demonstration.
3. **To use real live data:**
   - Sign up for a free API key at [CricAPI](https://api.cricapi.com/).
   - Open `script.js`.
   - Replace `YOUR_API_KEY_HERE` with your actual key.
   - Set `const USE_MOCK_DATA = false;`.

## Testing Instructions

### Manual Testing
1. **Empty Search State:**
   - Open `index.html` in a web browser.
   - Wait for the initial matches to load.
   - In the search bar (`#searchInput`), enter a query that matches no teams, such as `NO_MATCH_XYZ`.
   - Verify that each match container displays a clear empty state message reflecting the query (e.g. `No matches found for "NO_MATCH_XYZ"`).
   - Clear the search input and verify all match cards return.
2. **Network Error State:**
   - In `script.js`, simulate a network error or call `renderErrorState(document.getElementById('live-matches'), 'Network connection lost')`.
   - Verify that an accessible error banner appears with an alert icon, error message, and a "Try Again" retry button.

### Automated Testing
Run the automated Playwright test suite:
```bash
node tests/course/r60-t023.mjs
```
The test launches a local HTTP server, verifies source anchors (`#toggleTheme`, `#searchInput`, `#live-matches`, `#upcoming-matches`), asserts that typing a non-matching query renders the accessible empty state with the query reflected, verifies clearing the input restores the cards, validates error container rendering, and outputs results to `work/R60-T023/results-latest.json`.

## Author
@madhavcodes25   