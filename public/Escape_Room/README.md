# 🚀 Escape Room

**A browser-based sci-fi escape room game where players race against the clock to uncover hidden clues and break out of a futuristic laboratory.**

![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)
![GitHub](https://img.shields.io/badge/GitHub-Repo-181717?style=for-the-badge&logo=github&logoColor=white)

---

## 📖 Table of Contents

- [🧩 Project Overview](#-project-overview)
- [✨ Features](#-features)
- [🛠 Tech Stack](#-tech-stack)
- [📂 Project Structure](#-project-structure)
- [⚙ Installation](#-installation)
- [🎮 Gameplay](#-gameplay)
- [📱 Responsive Design](#-responsive-design)
- [📸 Screenshots](#-screenshots)
- [🚀 Future Enhancements](#-future-enhancements)
- [🤝 Contributing](#-contributing)
- [📄 License](#-license)
- [👨‍💻 Author](#-author)
- [🙏 Acknowledgements](#-acknowledgements)

---

## 🧩 Project Overview

**Escape The Lab** drops the player inside a sealed, high-tech research facility moments after something has gone wrong. A mission countdown has already begun, and the only way out is to think fast, explore the environment, and piece together the story hidden in plain sight.

Scattered around the lab are **interactive hotspots** — consoles, panels, and objects that conceal fragments of information. Players must click through the environment to uncover these fragments, decode their meaning, and feed the correct sequence of codes into the lab's central **terminal**. Solve the puzzle chain before the timer hits zero, and the blast doors open. Run out of time, and the lab stays sealed.

It's a lightweight, single-session browser game built entirely with front-end web technologies — no backend, no installs, just open it and play.

---

## ✨ Features

| Feature | Description |
|---|---|
| 🧪 **Futuristic Laboratory Environment** | A fully styled sci-fi setting that sets the scene for the escape room narrative |
| 🔍 **Interactive Hidden Clue Hotspots** | Clickable elements scattered across the lab reveal clues when discovered |
| ⏳ **Countdown Mission Timer** | A visible, ticking timer creates urgency and drives the win/lose conditions |
| 💻 **Terminal-Based Puzzle Solving** | A dedicated terminal interface where players input codes derived from clues |
| 🔗 **Sequential Clue Progression** | Clues unlock and build on one another, guiding players through a logical path |
| 🏆 **Win & Lose Conditions** | Clear success (escape) and failure (time's up) end states |
| 📱 **Responsive Design** | Playable across desktop, tablet, and mobile screen sizes |
| 🌐 **Modern Neon Cyberpunk UI** | Glowing accents, dark backgrounds, and sci-fi typography for an immersive feel |
| ♿ **Accessibility Improvements** | Semantic structure and readable contrast to support a wider range of players |
| 📲 **Mobile-Friendly Interface** | Touch-friendly hotspots and legible layouts on smaller screens |

---

## 🛠 Tech Stack

- **HTML5** — semantic structure for the lab environment and terminal UI
- **CSS3** — layout, animations, and the neon cyberpunk visual theme
- **JavaScript (Vanilla)** — game logic, timer, clue state, and puzzle validation
- **Google Fonts** — [`Orbitron`](https://fonts.google.com/specimen/Orbitron) for display headings, [`Share Tech Mono`](https://fonts.google.com/specimen/Share+Tech+Mono) for terminal/monospace text

No frameworks, no build tools — just clean, dependency-free front-end code.

---

## 📂 Project Structure

---

## 🧪 Fallbacks and test

| Situation | What the player sees |
| --- | --- |
| `images/image.png` (the lab scene) fails to load | A dark backdrop instead of a white page, the message **"LAB SCENE IMAGE FAILED TO LOAD — EVIDENCE LOCATIONS ARE OUTLINED."**, and dashed, labelled outlines on each unlocked clue spot. The timer and TERMINAL button stay readable. |
| Google Fonts fail to load | The CSS fallbacks (`monospace`, `sans-serif`) are used; the layout still fits. |
| Enter pressed on an empty terminal prompt | `> NO COMMAND ENTERED. TYPE A CODE FROM THE EVIDENCE YOU FOUND.` instead of "access denied". A valid code afterwards works as normal. |

When the image loads, the game looks and plays exactly as before.

Run locally with the repo's server (`npm run dev`, then open
http://localhost:3000/public/Escape_Room/), and run the regression test
(Playwright, pinned in `tests/course/package.json`):

```bash
npm --prefix tests/course ci
npx --prefix tests/course playwright install chromium   # first time only
node tests/course/r60-t003.mjs
```

It runs the game with the scene image returning 404 and fonts failing, then with
the assets restored, and exits non-zero on any failed check or page error.
