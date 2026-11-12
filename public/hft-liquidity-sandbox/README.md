# 📈 HFT Liquidity Sandbox

HFT Liquidity Sandbox is an interactive web-based simulation that demonstrates how High-Frequency Trading (HFT) and market liquidity behave in a simplified trading environment. The project helps users visualize order flow, liquidity changes, and market dynamics through real-time simulations.

---

## ✨ Features

- 📊 High-Frequency Trading simulation
- 💹 Liquidity visualization
- ⚡ Real-time market updates
- 📈 Dynamic order flow simulation
- 🎛️ Adjustable simulation parameters
- 🔄 Start, Pause, and Reset controls
- 📉 Interactive charts and indicators
- 📱 Responsive interface

---

## 🛠️ Technologies Used

- HTML5
- CSS3
- JavaScript (ES6)
- Canvas API / SVG (if applicable)

---

## 📂 Project Structure

```text
hft-liquidity-sandbox/
│
├── index.html
├── styles.css
├── app.js
└── README.md
```

---

## 🚀 Installation

Clone the repository

```bash
git clone <repository-url>
```

Navigate into the project

```bash
cd hft-liquidity-sandbox
```

Run locally

- Open `index.html`
- OR use Live Server in Visual Studio Code

---

## 📐 Layout and test

| Width | Layout |
| --- | --- |
| Wider than 700px (e.g. 1280×800) | Metrics sidebar on the left, depth chart fills the rest. The sidebar scrolls on its own if the window is short. |
| 700px or narrower (e.g. 360×800) | Metrics and controls stacked on top, chart below (70% of the screen high); the page scrolls down. |

There is no sideways scrolling at either width. The canvas drawing size follows its
on-screen size, so clicks on the upper/lower half land where you expect.

Run it with the repo's server (`npm run dev`, then open
http://localhost:3000/public/hft-liquidity-sandbox/) and check the layout with the
regression test (Playwright, pinned in `tests/course/package.json`):

```bash
npm --prefix tests/course ci
npx --prefix tests/course playwright install chromium   # first time only
node tests/course/r60-t002.mjs
```

It checks both 360×800 and 1280×800 and exits non-zero on any failed check or page error.

---

## ▶️ Usage

1. Launch the application.
2. Configure the simulation parameters.
3. Start the simulation.
4. Observe liquidity movement and order execution.
5. Pause or reset the simulation whenever needed.

---

## 🎛️ Simulation Controls

| Control | Description |
|---------|-------------|
| Start | Begins the simulation |
| Pause | Temporarily pauses execution |
| Reset | Restores the initial simulation state |
| Speed | Adjusts simulation speed |
| Liquidity | Changes available market liquidity |

---

## 📊 Features Demonstrated

- High-Frequency Trading Concepts
- Market Liquidity Simulation
- Real-Time Data Visualization
- Interactive UI
- JavaScript Animation
- Responsive Design

---

## 🔮 Future Enhancements

- Multiple trading algorithms
- Order book visualization
- Historical market replay
- Performance metrics dashboard
- Risk analysis module
- Dark mode
- Export simulation results
- Multi-asset support

---

## 🤝 Contributing

Contributions are welcome.

1. Fork the repository.
2. Create a new branch.
3. Commit your changes.
4. Push your branch.
5. Submit a Pull Request.

---

## 📄 License

This project is part of the **100 Days 100 Web Projects** repository and is intended for educational purposes.