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

## 🧪 Testing & Verification (R60-T035)

Automated deterministic regression test asserting identical DOM rendering, modal states, and timeline structures across fresh browser contexts without external network dependencies:

```bash
node tests/course/r60-t035.mjs
```

### Verified Checks
- **Source Anchors**: Verifies `#aboutLink`, `#aboutModal`, `#aboutClose`, and `#aboutTitle`.
- **Deterministic Fixtures**: Stubs external requests and seeds math randomness to guarantee 100% reproducible execution across isolated contexts.
- **Modal Lifecycle**: Validates open, close, and ARIA state transitions.
- **Cross-Context Determinism**: Asserts identical card counts, categories, and DOM states in multiple fresh browser contexts with zero errors.
- **Evidence**: Generates test records, baseline data, and visual artifact in `work/R60-T035/`.

---

## 🔮 Future Enhancements

- Add event filtering by era or category
- Include search across timeline entries
- Add animations between events
- Provide editable event data controls

## 🤝 Contributing

Contributions are welcome. Feel free to fork the project and submit a pull request.
