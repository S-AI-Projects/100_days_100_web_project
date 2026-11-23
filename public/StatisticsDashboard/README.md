# 📊 Statistics Dashboard

A modern and responsive **Statistics Dashboard** built using **HTML, CSS, and JavaScript**. The application allows users to **view, edit, manage, and reset** game statistics while automatically saving the data in the browser using **localStorage**.

---

## ✨ Features

- 📈 View game statistics in an organized dashboard
- ✏️ Edit statistics manually using number inputs
- ➕ Increment values using the "+" buttons
- ➖ Decrement values using the "−" buttons
- 💾 Save updated statistics to localStorage
- 🗑 Reset all statistics with a confirmation dialog
- 📊 Automatically calculate Player X Win Rate
- ⚡ Live summary updates while editing
- 💬 Success and error notifications
- 📱 Fully responsive design
- 💾 Persistent storage using localStorage

---

## 🛠️ Technologies Used

- HTML5
- CSS3
- JavaScript (ES6)
- Browser localStorage API

---

## 📂 Project Structure

```
Statistics-Dashboard/
│
├── index.html      # Dashboard structure and UI
├── style.css       # Styling and responsive layout
├── script.js       # Statistics management logic
└── README.md       # Project documentation
```

---

## 🚀 Getting Started

### Clone the repository

```bash
git clone <repository-url>
```

### Navigate to the project folder

```bash
cd Statistics-Dashboard
```

### Run the project

Simply open the **index.html** file in your preferred web browser.

No additional setup or dependencies are required.

---

## 📖 How to Use

### View Statistics

The dashboard displays:

- Total Games
- Player X Wins
- Player O Wins
- Total Draws
- Player X Win Rate

### Manage Statistics

You can manage the statistics in multiple ways:

- Type values directly into the input fields.
- Increase values using the "+" buttons.
- Decrease values using the "−" buttons.
- Click **Save Statistics** to store the updated values in localStorage.

### Reset Statistics

Click the **Reset Statistics** button to clear all saved statistics.

A confirmation dialog is displayed before deleting the stored data.

---

## 💾 Data Persistence

All statistics are stored locally using the browser's **localStorage**.

This means:

- Data remains available after refreshing the page.
- Statistics persist until they are reset or browser storage is cleared.

---

## ✅ Validation

The application includes built-in validation to maintain valid statistics.

- Negative values are not allowed.
- Total Games cannot be less than:
  - Player X Wins
  - Player O Wins
  - Draws combined.
- Invalid values display an error message without saving.

---

## 🎨 UI Improvements

The updated interface includes:

- Modern glassmorphism-inspired design
- Responsive card layout
- Interactive hover animations
- Better spacing and typography
- Accessible buttons and input controls
- Clear statistics summary section
- Notification messages for user actions

---

## 🔮 Future Improvements

Some ideas for future enhancements include:

- Export statistics as JSON
- Import previously saved statistics
- Dark/Light mode toggle
- Statistics charts using Chart.js
- Multiple player profiles
- Match history
- Average wins and performance analytics

---

## 👩‍💻 Author

**Shikha Kumari**


## R60-T040 browser regression

From the repository root, use Node.js 20 or later:

```sh
npm ci --prefix tests/course
npx --prefix tests/course playwright install chromium
node tests/course/r60-t040.mjs
```

The check starts and waits for its own local Node HTTP server, opens fresh Chromium contexts and closes the server and browser on success or failure. It returns a nonzero exit status for a failed assertion, unexpected page error or console error. Dependencies are locked in `tests/course/package-lock.json`.

Fill total=10, X=6, O=3, draws=1; assert live 60.0% summary, save/reload and reset. In an isolated response fixture rename only the input event binding; the same live-summary assertion must reject the stale 0% display. No application mutation is saved.

Results, tool versions, expected/actual values and screenshots are written to `work/R60-T040/after.json` and PNG files. Use `COURSE_PHASE=baseline` to record the original source before applying the source change. The task-specific GitHub Actions workflow records both phases against the pinned baseline and uploads the complete evidence directory. No Lighthouse score is required. Remove `work/R60-T040/` from a later upstream submission.
