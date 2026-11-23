# Chronosphere

## 📖 Description

Chronosphere is an interactive timeline-style project that loads event data from JSON and presents it with custom visuals.

## ✨ Features

- Uses structured event data from `events.json`
- Includes image assets for timeline presentation
- Provides interactive behavior through JavaScript

## 🛠️ Technologies Used

- HTML5
- CSS3
- JavaScript
- JSON

## 📂 Project Structure

```text
Chronosphere/
├── images/
├── events.json
├── index.html
├── script.js
└── style.css
```

## 🚀 Getting Started

### Installation

No installation is required.

### Run

Open `index.html` in a browser. If JSON loading is restricted by the browser, run the folder with a local static server.

## 🎯 Learning Objectives

This project demonstrates structured data loading, timeline-style UI design, asset organization, and JavaScript-driven rendering.

## 🔮 Future Enhancements

- Add event filtering by era or category
- Include search across timeline entries
- Add animations between events
- Provide editable event data controls

## 🤝 Contributing

Contributions are welcome. Feel free to fork the project and submit a pull request.


## R60-T035 browser regression

From the repository root, use Node.js 20 or later:

```sh
npm ci --prefix tests/course
npx --prefix tests/course playwright install chromium
node tests/course/r60-t035.mjs
```

The check starts and waits for its own local Node HTTP server, opens fresh Chromium contexts and closes the server and browser on success or failure. It returns a nonzero exit status for a failed assertion, unexpected page error or console error. Dependencies are locked in `tests/course/package-lock.json`.

Two isolated contexts use the same two-event JSON fixture, seeded random stream, fixed UTC clock and viewport. Assert event order, image decoding, About open/close and filtering, then compare DOM snapshots.

Results, tool versions, expected/actual values and screenshots are written to `work/R60-T035/after.json` and PNG files. Use `COURSE_PHASE=baseline` to record the original source before applying the source change. The task-specific GitHub Actions workflow records both phases against the pinned baseline and uploads the complete evidence directory. No Lighthouse score is required. Remove `work/R60-T035/` from a later upstream submission.
