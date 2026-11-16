# 📋 Minimalist Visual Kanban Board

A modern, lightweight, and responsive Kanban board built with **HTML, CSS, and Vanilla JavaScript**. This project helps users organize tasks visually by dragging and dropping cards between workflow stages while automatically saving progress using Local Storage.

## 🚀 Features

* 📌 Create new tasks with custom titles
* 🎨 Color-coded task tags
* 🖱️ Drag and drop tasks between columns
* 🗑️ Delete tasks instantly
* 🌙 Light & Dark theme toggle
* 💾 Local Storage support (tasks persist after refresh)
* 📱 Responsive and minimalist UI
* 🔢 Live task counters for each workflow stage
* 🛡️ Safe HTML rendering using input sanitization
* 🔄 Idempotent initialization: protected against duplicate listener registration on repeat script execution via `window.__KANBAN_INITIALIZED__` guard

---

## 🔄 Idempotent Initialization

The board's core logic and event listeners are encapsulated within an idempotent `initKanban` function guarded by `window.__KANBAN_INITIALIZED__`.

### Key Benefits:
- **No Duplicate Listeners**: Re-injecting or re-evaluating `app.js` will not attach duplicate event listeners to `#themeToggleBtn`, preventing the theme from toggling twice in rapid succession (theme flip-flop).
- **Safe Drag & Drop Zones**: Lane dragover, dragleave, and drop event handlers are attached exactly once.
- **Accurate Counter & UI State**: Synchronizes cards and counter state (`#todo-count`, `#progress-count`, `#done-count`) without duplicating cards or re-rendering unnecessarily.
- **Global Safe Invocation**: `window.initKanban()` can be called safely at any time.

---

## 🧪 Testing Instructions

### Manual Verification
1. Open `index.html` in your browser.
2. Open Browser Developer Tools Console (`F12` / `Cmd+Option+I`).
3. Note the current theme (e.g. `dark`).
4. Re-inject or execute `app.js` a second time by evaluating its script or adding a `<script>` tag.
5. Click the theme toggle button (`#themeToggleBtn`) once.
6. **Verify**:
   - The theme switches cleanly once (e.g. from `dark` to `light`) and does **not** flip back immediately.
   - Lane counters remain accurate and cards are not duplicated.
   - Adding a task via the modal creates exactly one card.

### Automated Testing
Run the automated Playwright test suite:
```bash
node tests/course/r60-t024.mjs
```
The test verifies:
- Source anchors (`#themeToggleBtn`, `#addCardBtn`, `#todo-count`, `#todo-lane`) exist.
- Script re-execution / double-injection is guarded by `window.__KANBAN_INITIALIZED__`.
- Clicking `#themeToggleBtn` after second execution toggles theme exactly once.
- Card counts remain accurate and no duplicate elements/listeners exist.
- Results are saved to `work/R60-T024/results-latest.json`.

---

## 📂 Project Structure

```
Minimalist-Visual-Kanban-Board/
│── index.html
│── styles.css
│── app.js
│── image.png
└── README.md
```

---

## 🛠️ Technologies Used

* HTML5
* CSS3
* JavaScript (ES6)
* HTML5 Drag & Drop API
* Local Storage API

---

## 📋 Workflow Columns

The board contains three workflow stages:

* 📝 To Do
* 🚀 In Progress
* ✅ Done

Tasks can be dragged freely between these stages.

---

## 🎨 Task Categories

Each task can be assigned a color identifier:

| Tag        | Purpose      |
| ---------- | ------------ |
| 🔵 Blue    | Feature      |
| 🟣 Purple  | Research     |
| 🟠 Amber   | Urgent       |
| 🟢 Emerald | Optimization |

---

## 🌙 Theme Support

* Light Mode
* Dark Mode
* Automatically follows the system theme on first visit
* User preference is saved using Local Storage

---

## 💾 Local Storage

The application automatically stores:

* All created tasks
* Current workflow stage of each task
* Selected theme preference

No backend or database is required.

---

## ▶️ Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/100_days_100_project.git
```

### 2. Open the project folder
```
cd Minimalist-Kanban-Board
```

### 3. Launch the application

Simply open **index.html** in your preferred web browser.

No installation or external dependencies are required.

---

## ✨ Future Enhancements

* Edit existing tasks
* Due dates and reminders
* Priority levels
* Search and filter functionality
* Multiple Kanban boards
* Export/Import board data
* Team collaboration
* Keyboard shortcuts
* Mobile drag-and-drop improvements

---

## 🤝 Contributing

Contributions are welcome!

1. Fork the repository.
2. Create a new feature branch.
3. Commit your changes.
4. Push the branch.
5. Open a Pull Request.

---

## 📄 License

This project is licensed under the MIT License.

---

## 👨‍💻 Author

If you found this project helpful, consider giving it a ⭐ on GitHub!
