# 🛡️ Complaint Management System (ResolveIt)

**Complaint Management System** is a responsive, accessible dashboard application for submitting, tracking, and administering user complaints with local storage persistence and dark/light theming.

---

## 🚀 Setup & Execution

### Entry Point
- **Path**: `public/Complaint_Management_System/index.html`
- Open `public/Complaint_Management_System/index.html` directly in any modern browser or serve via a local HTTP server.

### Automated Regression Check
Run the Playwright keyboard accessibility regression test suite:
```bash
node tests/course/r60-t031.mjs
```

---

## ⌨️ Keyboard Navigation & Accessibility

This module verifies accessible keyboard operation and focus management under task **R60-T031**.

### Source Anchors
| Selector | Element Type | Description |
| :--- | :--- | :--- |
| `#theme-toggle` | `<button>` | Sidebar toggle button switching between light and dark themes. |
| `#page-title` | `<h1>` | Header element indicating the current active dashboard or form view. |
| `#user-profile` | `<div>` | Header region containing user avatar and account display. |
| `#profile-avatar` | `<img>` | Avatar element displaying the current user's profile image. |

### Keyboard Accessibility Features
1. **Skip to Main Content Link**:
   - A `.skip-link` (`Skip to main content`) is available at the start of the DOM.
   - It remains off-screen for mouse users and becomes clearly visible when receiving initial Tab focus, allowing keyboard users to bypass sidebar navigation directly to `#main-content`.
2. **Tab Traversal Sequence**:
   - Natural sequential Tab navigation through all interactive controls (`.skip-link` → Dashboard → Submit Complaint → View Complaints → Admin Panel → Theme Toggle).
   - Strict adherence to standard tab order without introducing any positive `tabindex` values.
3. **Focus Visibility**:
   - High-contrast 2px solid outline indicators (`:focus-visible`) ensure clear visual feedback across all actionable buttons, form inputs, and links.
4. **Keyboard Activation**:
   - All interactive controls fully support activation via both the <kbd>Enter</kbd> and <kbd>Space</kbd> keys.

---

## 📂 Project Structure

```text
public/Complaint_Management_System/
├── index.html     # Accessible semantic structure, skip link, sidebar, header, views
├── style.css      # Design tokens, glassmorphism, responsive grid, focus rings
├── script.js      # ComplaintApp class, state management, modal events, theme controller
├── preview.png    # Preview screenshot
└── README.md      # Documentation and verified keyboard accessibility specification
```

---

## 🛠️ Technologies Used

- **HTML5**: Semantic tags, accessible attributes, skip link navigation.
- **CSS3**: Custom properties, glassmorphism styles, accessible `:focus-visible` styling.
- **JavaScript (ES6+)**: Event handling, DOM manipulation, theme persistence.
- **Playwright**: End-to-end automated keyboard traversal and focus regression testing.

---

## 🤝 Contribution Guidelines

This module follows the coursework specification for **100 Days 100 Web Projects**. Keyboard accessibility regressions must be verifiable via `node tests/course/r60-t031.mjs` with exit code `0`.
