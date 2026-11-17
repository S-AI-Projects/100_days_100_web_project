# CountDown Timer

## 📖 Description

CountDown Timer is a focus timer web app with a styled countdown interface and JavaScript timer controls.

## ✨ Features

- Displays a countdown timer interface
- Uses custom typography and themed styling
- Handles timer interactions through JavaScript

## 🛠️ Technologies Used

- HTML5
- CSS3
- JavaScript

## 🎯 Source Anchors & Interaction Architecture

The application is structured around key source anchors representing the main UI controls and status views:
- `#app`: Root container hosting the timer interface, presets, controls, and statistics.
- `#statsBtn`: Opens the modal session statistics overlay (`#statsOverlay`), rendering completed session metrics and historical records.
- `#fullscreenBtn`: Toggles fullscreen display mode, expanding typography and timer view.
- `#themeBtn`: Toggles color themes between dark mode (`data-theme="dark"`) and light mode (`data-theme="light"`).

## 🧪 Automated Testing & Interaction Regression

To verify that the application and its critical event bindings are functioning properly and to catch regressions:

```bash
node tests/course/r60-t020.mjs
```

The test suite validates:
1. Presence of required source anchors (`#app`, `#statsBtn`, `#fullscreenBtn`, `#themeBtn`).
2. Theme toggle event binding (properly updates `data-theme` attribute and button state).
3. Session stats dialog interaction (reveals `#statsOverlay` and hides upon closing).
4. Fullscreen mode toggle (applies fullscreen styling).
5. Core timer lifecycle (start, pause, reset, preset selection).
6. Regression catching: distinguishes between healthy event bindings and a deliberately mutated fixture, failing predictably when an event binding is severed.

## 📂 Project Structure

```text
CountDown Timer/
├── index.html
├── script.js
└── style.css
```

## 🚀 Getting Started

### Installation

No installation is required.

### Run

Open `index.html` in a browser.

## 🎯 Learning Objectives

This project demonstrates timer logic, time display formatting, UI state updates, and focused productivity-tool design.

## 🔮 Future Enhancements

- Add custom duration presets
- Include pause and reset history
- Add notification or sound alerts
- Store preferred timer settings locally

## 🤝 Contributing

Contributions are welcome. Feel free to fork the project and submit a pull request.
