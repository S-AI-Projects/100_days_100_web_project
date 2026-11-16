# 🌐 Personal Website

Personal Website is a modern portfolio website designed to showcase an individual's profile, skills, projects, achievements, and contact information. It provides a clean and responsive interface suitable for developers, designers, students, and professionals to build their online presence.

---

## ✨ Features

- 👤 Professional portfolio homepage
- 📄 About section
- 💻 Skills showcase
- 🚀 Projects section
- 📞 Contact section
- 📱 Fully responsive design
- 🎨 Modern and attractive UI

---

## 🛠️ Technologies Used

- HTML5
- CSS3
- JavaScript (ES6)

---

## 📂 Project Structure

```text
Personal_website/
│
├── index.html
├── style.css
├── script.js
├── assets/
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
cd Personal_website
```

Run locally

- Open `index.html` in your browser
- OR use Live Server in Visual Studio Code

---

## ▶️ Usage

1. Launch the website.
2. Explore the portfolio sections.
3. View projects and skills.
4. Navigate through different sections.
5. Customize the content for your own portfolio.

---

## 🎯 Features Demonstrated

- Responsive Web Design
- Portfolio Layout
- JavaScript Interactivity
- Smooth Navigation
- Modern UI/UX

## 🛡️ Safe Text Rendering Contract

All dynamic insertions, fixture data, and user input (e.g. project card injection into `#projects-container` via `addProjectCard`, contact form feedback) adhere to a strict safe text rendering contract:
- **No `innerHTML` for Dynamic Text**: All dynamic strings are injected exclusively using `textContent` or `document.createTextNode`.
- **XSS Vector Neutralization**: Potential script injection payloads, including `<img src=x onerror=...>`, `<script>`, or malformed markup, are rendered strictly as literal text. They never execute arbitrary JavaScript or spawn unexpected DOM elements.
- **Source Anchors**: Core sections (`#about`, `#experience`, `#projects`, `#projects-container`) remain structured and intact.

---

## 🧪 Testing Instructions

### Manual Testing
1. Open `index.html` in a web browser.
2. Open Browser Developer Tools Console (`F12`).
3. In the console, execute:
   ```javascript
   window.addProjectCard('<img src=x onerror="window.__xss_fired=true">', 'Test Description');
   ```
4. Verify:
   - The card title appears visually as literal text: `<img src=x onerror="window.__xss_fired=true">`.
   - In the console, evaluate `window.__xss_fired`; it must remain `undefined`.
   - Inspect `#projects-container`; confirm that no `<img>` element was spawned.
5. In the contact form, submit a message with an XSS string in the Name field and verify the feedback message renders strictly as text.

### Automated Testing
Run the automated Playwright test suite:
```bash
node tests/course/r60-t028.mjs
```
The test verifies:
- Source anchors (`#about`, `#experience`, `#projects`, `#projects-container`) exist.
- Dynamic card insertion with XSS vector `<img src=x onerror="window.__xss_fired=true">` leaves `window.__xss_fired` undefined.
- Payload is rendered strictly as text (`textContent`) without generating unexpected `<img>` elements.
- Contact form submission with XSS vector renders safely as text.
- Report is saved to `work/R60-T028/results-latest.json`.

---

## 🔮 Future Enhancements

- Dark mode
- Blog section
- Resume download
- Contact form with backend
- Project filtering
- Animations using GSAP
- Visitor analytics

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