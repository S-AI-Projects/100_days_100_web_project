# 📈 Stock Trading Simulator

A browser-based stock market simulation game that allows users to practice buying and selling stocks in a risk-free environment. The simulator features live price fluctuations, portfolio management, transaction history tracking, market news updates, and profit/loss analysis.

## 🚀 Features

### 💰 Virtual Trading

* Start with ₹100,000 virtual balance
* Buy and sell stocks in real time
* Simulated stock market with dynamic pricing

### 📊 Portfolio Management

* Track owned stocks
* View average purchase price
* Monitor current portfolio value
* Real-time profit/loss calculations

### 📈 Live Market Simulation

* Automatic stock price updates every 3 seconds
* Different volatility levels for each stock
* Market trend indicators
* Price change tracking with percentages

### 📰 Market News Feed

* Simulated market news updates
* Market sentiment tracking
* Dynamic market trend analysis

### 🕒 Transaction History

* Complete record of buy/sell operations
* Timestamped transactions
* Recent activity overview

### 🌙 Dark Mode

* Toggle between light and dark themes
* Theme preference saved in local storage

### 💾 Persistent Storage

* Portfolio data saved automatically
* Balance and transaction history preserved
* Market state restored on reload

---

## 🏢 Available Stocks

| Symbol | Company               |
| ------ | --------------------- |
| AAPL   | Apple Inc.            |
| GOOGL  | Alphabet Inc.         |
| TSLA   | Tesla Inc.            |
| AMZN   | Amazon.com            |
| MSFT   | Microsoft Corporation |
| META   | Meta Platforms        |
| NVDA   | NVIDIA Corporation    |
| NFLX   | Netflix Inc.          |

---

## 🛠️ Technologies Used

* HTML5
* CSS3
* JavaScript (ES6)
* Local Storage API
* Font Awesome Icons

---

## 📂 Project Structure

```text
Stock-Trading-Simulator/
│
├── index.html
├── style.css
├── script.js
├── marketEngine.js
├── favicon.png
└── README.md
```

---

## 🎮 How to Use

1. Open the application in your browser.
2. Start with a virtual balance of ₹100,000.
3. Browse available stocks in the Market Watch section.
4. Click **Buy** to purchase shares.
5. Click **Sell** to sell owned shares.
6. Monitor your portfolio performance.
7. Track profits and losses in real time.
8. Follow market news and trends.

---

## 📸 Key Sections

### Market Watch

Displays:

* Live stock prices
* Price changes
* Buy/Sell actions
* Market trend indicators

### Portfolio

Shows:

* Owned shares
* Average purchase price
* Current market value
* Individual stock performance

### Transaction History

Keeps a log of:

* Stock purchases
* Stock sales
* Transaction timestamps

### Market News

Provides:

* Simulated financial news
* Market sentiment updates
* Trend information

---

## 💡 Future Improvements

* Interactive stock charts
* Watchlist functionality
* Multiple market sectors
* Stock search and filtering
* Dividend simulation
* Leaderboards and achievements
* Export transaction history
* Advanced analytics dashboard

---

## 🔄 Data Persistence

The simulator uses the browser's Local Storage to save:

* Account balance
* Portfolio holdings
* Transaction history
* Market price history
* Theme preference

Your progress remains available even after refreshing the page.

---

## ⚠️ Disclaimer

This project is intended for educational and entertainment purposes only. Stock prices are simulated and do not represent real market data. No actual trading or financial transactions occur.

---

## 📜 License

This project is open source and available under the MIT License.

---

### ⭐ If you found this project useful, consider giving it a star!


## R60-T033 browser regression

From the repository root, use Node.js 20 or later:

```sh
npm ci --prefix tests/course
npx --prefix tests/course playwright install chromium
node tests/course/r60-t033.mjs
```

The check starts and waits for its own local Node HTTP server, opens fresh Chromium contexts and closes the server and browser on success or failure. It returns a nonzero exit status for a failed assertion, unexpected page error or console error. Dependencies are locked in `tests/course/package-lock.json`.

Fresh storage produces readable empty holdings, transactions and news. Buy two AAPL shares at ₹175, reload, sell both and verify recovery to the empty state. Fixed clock and random fixture; no market API.

Results, tool versions, expected/actual values and screenshots are written to `work/R60-T033/after.json` and PNG files. Use `COURSE_PHASE=baseline` to record the original source before applying the source change. The task-specific GitHub Actions workflow records both phases against the pinned baseline and uploads the complete evidence directory. No Lighthouse score is required. Remove `work/R60-T033/` from a later upstream submission.
