# 📚 StudySync

StudySync is a modern and responsive educational landing page designed to provide a seamless learning experience for students and educators. The project features a clean UI, responsive design, interactive sections, and a professional layout built using HTML and CSS.

---

## ✨ Features

* 🎓 Modern educational landing page
* 📱 Fully responsive design
* 🌈 Clean and professional UI
* ⚡ Smooth hover animations and transitions
* 🧩 Feature cards section
* 💬 Testimonials section
* 📧 Newsletter subscription section
* 🔗 Social media integration
* 🖼️ Modern hero section with CTA buttons
* 📌 Sticky navigation bar

---

## 🛠️ Technologies Used

* HTML5
* CSS3
* Font Awesome Icons
* Google Fonts (Inter)

---

## 📂 Project Structure

```bash id="4m2pz8"
├── index.html
├── style.css
├── favicon.png
├── README.md
```

---

## 🚀 Getting Started

### 1️⃣ Clone the Repository

```bash id="pjc9y2"
git clone https://github.com/dhairyagothi/100_days_100_web_project/tree/Main/public/Stydy-Sync.git
```

### 2️⃣ Open the Project

Open the `index.html` file in your browser.

---

## 🎨 Design Highlights

* Glassmorphism-inspired sticky navbar
* Professional color palette
* Reusable CSS variables
* Interactive hover effects
* Elegant card layouts
* Responsive grid system

---

## 📱 Responsive Design

The website is optimized for:

* Desktop 💻
* Tablet 📱
* Mobile Devices 📲

---

## 📸 Sections Included

* Hero Section
* Trusted Brands Section
* Competitive Advantages
* Testimonials
* Newsletter Subscription
* Footer with Quick Links

---

## 🌟 Future Improvements

* Add JavaScript functionality
* Mobile navigation menu
* Dark mode support
* Backend integration for newsletter
* Authentication system
* Dynamic blog section

---

## ⚠️ Notes

* Ensure all image assets are placed correctly in the project directory.
* Font Awesome CDN is required for icons to display properly.

---

## ♿ Motion, focus and test

**Motion on this page:** there are no keyframe animations. Motion comes from smooth scrolling (`html { scroll-behavior: smooth }`), 0.25–0.5s transitions, and hover lifts (cards and reviews 6px, buttons 1–3px, hero image zoom 1.03).

| Preference | Behaviour |
| --- | --- |
| No preference | Unchanged: smooth scroll, transitions and hover lifts. |
| `prefers-reduced-motion: reduce` | No smooth scrolling, near-instant transitions, no hover movement. All text, links and the newsletter form stay visible and usable. |

**Keyboard focus:** every link, the email field and the Submit button show a visible focus indicator. The email field gets a 3px ring, because its old 10% glow was almost invisible. `scroll-padding-top` keeps focused elements below the sticky header when tabbing backwards.

Run with the repo's server (`npm run dev`, then open <http://localhost:3000/public/Stydy-Sync/>). Test from the repository root:

```bash
npm --prefix tests/course ci
npx --prefix tests/course playwright install chromium   # first time only
node tests/course/r60-t009.mjs
```

The test checks reduced and normal motion, Tab and Shift+Tab focus at 1280px and 390px, and the layout of the hero text (`#p1`–`#p4`). It exits non-zero on any failure or page error.

---

## 📄 License

This project is open-source and available under the MIT License.

---

## 👨‍💻 Author

Developed with ❤️ for modern web learning experiences.
