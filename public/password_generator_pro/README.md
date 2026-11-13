# 🔐 Password Generator Pro

Password Generator Pro is a modern web application that helps users generate strong, secure, and customizable passwords instantly. It allows users to create passwords based on selected criteria such as length, uppercase letters, lowercase letters, numbers, and special characters to improve online security.

---

## ✨ Features

- 🔐 Generate secure random passwords
- 🔢 Adjustable password length
- 🔠 Include uppercase letters
- 🔡 Include lowercase letters
- 🔢 Include numbers
- ✨ Include special characters
- 📋 One-click copy to clipboard
- 📱 Responsive and user-friendly interface

---

## 🛠️ Technologies Used

- HTML5
- CSS3
- JavaScript (ES6)

---

## 📂 Project Structure

```text
password_generator_pro/
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
cd password_generator_pro
```

Run locally

- Open `index.html`
- OR use Live Server in Visual Studio Code

---

## ▶️ Usage

1. Open the application.
2. Select the desired password length.
3. Choose character options (uppercase, lowercase, numbers, symbols).
4. Click **Generate Password**.
5. Copy the generated password using the copy button.

---

## 🧪 Deterministic test

The page uses real randomness (`crypto.getRandomValues`) and the clipboard, so a plain browser test would see a different password every run. The regression test replaces those with local fixtures:

| Fixture | What it replaces |
| --- | --- |
| Seeded `crypto.getRandomValues` / `Math.random` (mulberry32, seed `0x5eed1234`) | real randomness, so passwords are known exactly (`kgvqcgoegs` for the default, `2YCYrtkTpjBoY4aN` for upper+lower+numbers at 16) |
| Fixed `Date` (2026-01-01T00:00:00Z) | the clock |
| Blocked non-local requests | the network (the page needs none; the "Inter" font is never loaded, so the local sans-serif fallback is used) |
| `navigator.clipboard.writeText` stub (records text, or rejects as "permission denied") | the clipboard permission |
| Viewport 1280×800, scale 1, dark colour scheme, en-US, UTC | screen and locale differences |

The same session runs in two fresh browser contexts, and their DOM state must match. From the repository root:

```bash
npm --prefix tests/course ci
npx --prefix tests/course playwright install chromium   # first time only
node tests/course/r60-t005.mjs
```

It exits non-zero on any failed check or page error.

The ☀️ / 🌙 button switches between the dark and light themes and remembers the choice. If copying is refused, the 📋 button shows ⚠️ and selects the password so it can be copied by hand.

---

## 🎯 Features Demonstrated

- Random Password Generation
- JavaScript DOM Manipulation
- Clipboard API
- User Input Validation
- Responsive Design

---

## 🔮 Future Enhancements

- Password strength meter
- Password history
- Pronounceable password mode
- Passphrase generator
- Dark mode
- Export generated passwords
- Password breach checking

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