# 📝 Advanced Markdown Editor & Analytics (MarkCraft)

**MarkCraft** is an interactive, browser-based Markdown editor featuring live preview rendering, real-time analytics (word count, character count, estimated reading time), a formatting toolbar, split-screen workspace resizing, and theme switching (dark/light mode).

---

## 🚀 Setup & Execution

### Entry Point
- **Path**: `public/Markdown_Editor/index.html`
- Open `public/Markdown_Editor/index.html` directly in any modern browser or serve via a local HTTP server.

### Automated Regression Check
Run the Playwright browser regression test suite:
```bash
node tests/course/r60-t037.mjs
```

---

## 🧪 Tested Walkthrough

This walkthrough verifies the core controls, live Markdown parsing engine, and dynamic workspace layout under task **R60-T037**.

### Source Anchors
| Selector | Element Type | Description |
| :--- | :--- | :--- |
| `#word-count` | `<span>` | Displays total words in the Markdown input (updates debounced). |
| `#char-count` | `<span>` | Displays total character length of the input. |
| `#read-time` | `<span>` | Estimates reading duration (words / 200 wpm, minimum 1m). |
| `#theme-toggle` | `<button>` | Toggles between dark mode and light mode, persisting preference in `localStorage`. |

### Walkthrough Steps & Expected Results

| Step | Action | Target / Control | Expected Observation & Result |
| :---: | :--- | :--- | :--- |
| **1** | **Initial Baseline** | Page load | Dual-pane layout initializes. `#word-count` displays `0`, `#char-count` displays `0`, `#read-time` displays `1m`. Body theme defaults to dark mode. |
| **2** | **Markdown Input** | `#markdown-input` | Enter headings, paragraphs, bullet lists, and code blocks. Debounce triggers `processWorkspaceUpdate`. |
| **3** | **Analytics Verification** | `#word-count`, `#char-count`, `#read-time` | Word and character counters reflect exact inputs in real time; estimated reading time updates accordingly. |
| **4** | **Live Preview Rendering** | `#preview-output` | Validates rendered HTML elements: `<h1>`, `<strong>`, `<em>`, `<ul><li>`, and fenced code blocks (`<pre><code class="language-*">`). |
| **5** | **Formatting Toolbar** | `.fmt-btn[data-action="bold"]`, `h2` | Clicking toolbar buttons wraps selection or inserts Markdown tokens (`**bold text**`, `## `) without losing focus. |
| **6** | **Theme Toggle** | `#theme-toggle` | Clicking toggles `data-theme="light"` on `<body>`, switches toggle icon/text, and persists state in `localStorage('markcraft_theme')`. Toggling again restores dark mode. |
| **7** | **Workspace Resizing** | `#dragbar` | Dragging the resizer bar recalculates percentage widths dynamically for `.editor-pane` and `.preview-pane`. |
| **8** | **Visual Artifact** | Full page screenshot | Automated test captures rendered UI state to `work/R60-T037/walkthrough.png`. |

---

## 📂 Project Structure

```text
public/Markdown_Editor/
├── index.html     # Semantic structure, toolbar, analytics bar, editor & preview panes
├── style.css      # Dark/light theme custom properties, flex layout, scrollbars, responsive rules
├── app.js         # Markdown parser, analytics engine, toolbar events, resizer logic, theme manager
└── README.md      # Documentation and verified walkthrough specification
```

---

## 🛠️ Technologies Used

- **HTML5**: Semantic tags, accessible attributes, and clean layout structure.
- **CSS3**: Custom CSS properties for instant dark/light theming, flexbox split panes.
- **JavaScript (ES6+)**: Custom regular expression Markdown parser, debounced input listener, DOM manipulation.
- **Playwright**: End-to-end browser walkthrough regression testing.

---

## 🤝 Contribution Guidelines

This module follows the coursework specification for **100 Days 100 Web Projects**. Regressions and tested walkthroughs must be verifiable via `node tests/course/r60-t037.mjs` with exit code `0`.
