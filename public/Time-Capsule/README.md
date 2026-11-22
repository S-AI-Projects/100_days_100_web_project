# ⏳ Time Capsule

A simple and interactive web application that allows users to write messages to their future selves and reveal them after a chosen amount of time. Messages are securely stored in the browser using `localStorage` and automatically revealed when their countdown expires.

---

## 📖 Overview

Time Capsule lets users:

* Write a personal message.
* Set a custom reveal timer using hours, minutes, and seconds.
* Seal the message inside a virtual time capsule.
* Automatically reveal the message once the timer expires.
* Store multiple capsules simultaneously.
* Preserve capsules even after page refreshes using browser storage.

---

## ✨ Features

### 📝 Create a Time Capsule

Write a letter or note to your future self and seal it for a chosen duration.

### ⏰ Custom Countdown

Set the reveal time using:

* Hours
* Minutes
* Seconds

### 💾 Persistent Storage

Capsules are saved in the browser's `localStorage`, ensuring they remain available even if the page is refreshed or reopened.

### 📩 Automatic Reveal

The application continuously checks for expired capsules and reveals them automatically when their countdown ends.

### 📱 Responsive Design

Modern glassmorphism-inspired UI that works across desktop and mobile devices.

### ♿ Accessibility

Includes:

* ARIA labels
* Live regions for updates
* Semantic form controls

---

## 🛠️ Technologies Used

* **HTML5**
* **CSS3**
* **Vanilla JavaScript**
* **Local Storage API**

No external frameworks or libraries are required.

---

## 📂 Project Structure

```text
time-capsule/
│
├── index.html      # Main application interface
├── style.css       # Styling and layout
├── script.js       # Application logic
├── preview.png
├── favicon_time_capsule.png
└── README.md       # Project documentation
```

---

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/dhairyagothi/100_days_100_web_project.git
```

### 2. Navigate to the Project Folder

```bash
cd time-capsule
```

### 3. Open the Application

Simply open:

```text
index.html
```

in your preferred web browser.

No build process or installation is required.

---

## 🎯 How It Works

1. Enter a message in the text area.
2. Select a reveal duration.
3. Click **"Seal the Capsule"**.
4. The message is stored in `localStorage`.
5. A countdown timer runs in the background.
6. Once the reveal time is reached:

   * The capsule is unlocked.
   * The stored message is displayed.
   * The capsule is removed from storage.

---

## 📦 Data Storage Format

Capsules are stored in `localStorage` as an array of objects:

```javascript
[
  {
    message: "Future me, keep going!",
    revealAt: 1712345678901
  }
]
```

Where:

* `message` = User's text
* `revealAt` = Timestamp indicating when the message should be revealed

---

## 🔒 Validation Rules

* Messages cannot be empty.
* Reveal duration must be at least **5 seconds**.
* Minutes and seconds are limited to **0–59**.
* Negative values are prevented.

---

## 🎨 UI Highlights

* Glassmorphism container design
* Gradient background
* Smooth fade-in animation
* Real-time duration preview
* Responsive timer inputs
* Clean and minimal layout

---

## 🔮 Future Improvements

Potential enhancements include:

* Date-based capsule scheduling
* Email reminders
* Password-protected capsules
* Cloud storage and user accounts
* Capsule categories and tags
* Dark mode support
* Countdown display after sealing
* Export and import capsules

---

## 📄 License

This project is open-source and available under the MIT License.

---

## 👨‍💻 Author

Created as a fun project to help users send messages into the future and rediscover them later.

*"The best way to predict your future is to create it."*

---

## Run and Test

From the repo root, start the dev server:

    npm run dev

Open http://localhost:3000/public/Time-Capsule/ (keep the trailing slash so style.css and script.js load).

Run the browser check (needs Node.js and Playwright with Chromium):

    node tests/course/r60-t046.mjs

The page needs `localStorage` to keep sealed capsules. The check tests both paths: with storage available, a capsule is sealed and stored; with storage stubbed as blocked (SecurityError), the page shows "Storage is not available in this browser, so the capsule cannot be sealed.", does not show the capsule as sealed, keeps the message, and logs no page error. It then restores storage and checks that sealing works on the same page. It exits non-zero on any failed assertion or page error.
