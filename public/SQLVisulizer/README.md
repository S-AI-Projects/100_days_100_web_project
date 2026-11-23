# 🗄️ SQL Visualiser

SQL Visualiser is an interactive web application that helps users understand SQL queries through visual representations. It simplifies database concepts by illustrating how different SQL operations affect tables and datasets, making learning SQL easier for beginners and students.

---

## ✨ Features

- 📊 Visual representation of SQL queries
- 🗃️ Supports common SQL operations
- 🔍 Query execution visualization
- 💡 Beginner-friendly interface
- ⚡ Fast and responsive
- 📱 Responsive design

---

## 🛠️ Technologies Used

- HTML5
- CSS3
- JavaScript (ES6)

---

## 📂 Project Structure

```text
SQLVisualiser/
│
├── index.html
├── style.css
├── script.js
└── README.md
```

---

## 🚀 Installation

Clone the repository

```bash
git clone <repository-url>
```

Navigate to the project

```bash
cd SQLVisualiser
```

Run locally

- Open `index.html`
- OR use Live Server in Visual Studio Code

---

## ▶️ Usage

1. Open the application.
2. Enter or select an SQL query.
3. Execute the query.
4. Observe the visual representation of how the query affects the data.
5. Experiment with different SQL statements to understand their behavior.

---

## 🎯 Supported Concepts

- SELECT
- WHERE
- ORDER BY
- GROUP BY
- JOIN
- INSERT
- UPDATE
- DELETE
- Aggregate Functions

---

## 🔮 Future Enhancements

- Database import support
- Interactive ER diagrams
- Query history
- Syntax highlighting
- Export visualizations
- Dark mode
- More SQL examples

---

## 🤝 Contributing

Contributions are welcome.

1. Fork the repository.
2. Create a feature branch.
3. Commit your changes.
4. Push your branch.
5. Open a Pull Request.

---

## 📄 License

This project is part of the **100 Days 100 Web Projects** repository and is intended for educational purposes.

## R60-T038 browser regression

From the repository root, use Node.js 20 or later:

```sh
npm ci --prefix tests/course
npx --prefix tests/course playwright install chromium
node tests/course/r60-t038.mjs
```

The check starts and waits for its own local Node HTTP server, opens fresh Chromium contexts and closes the server and browser on success or failure. It returns a nonzero exit status for a failed assertion, unexpected page error or console error. Dependencies are locked in `tests/course/package-lock.json`.

Replace one employee name in the local sample-data module with <img src=x onerror="window.__injected=1">. Test literal table preview, editor highlighting, save/load and final query result; assert no img is created and no handler runs. Static engine-authored explanation markup is the separate trusted rich-HTML contract.

Results, tool versions, expected/actual values and screenshots are written to `work/R60-T038/after.json` and PNG files. Use `COURSE_PHASE=baseline` to record the original source before applying the source change. The task-specific GitHub Actions workflow records both phases against the pinned baseline and uploads the complete evidence directory. No Lighthouse score is required. Remove `work/R60-T038/` from a later upstream submission.
