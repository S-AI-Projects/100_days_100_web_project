# 🎨 Website Personalizer

An interactive front-end experience that transforms a website in real time based on user preferences.

Users answer five quick questions about their design taste, and the application dynamically rebuilds the site's visual identity—changing aesthetics, colors, typography, motion, and interface style without any page reloads or backend services.

Built entirely with **HTML, CSS, and Vanilla JavaScript**.

---

## ✨ Features

### Interactive Personalization Quiz

* Animated card-by-card questionnaire
* Smooth progress tracking
* Instant preference collection

### Terminal Brewing Experience

* Simulated personalization engine
* Terminal-style loading sequence
* Dynamic typewriter-inspired output

### Real-Time Website Transformation

* Live theme generation using CSS custom properties
* No refreshes required
* Instant visual feedback

### Multiple Design Personalities

#### Minimal

Clean layouts, refined typography, and restrained design choices.

#### Cyberpunk

Neon-inspired visuals, futuristic interfaces, and developer-focused aesthetics.

#### Aesthetic

Soft gradients, elegant spacing, and artistic presentation.

#### Bold

High-impact visuals, strong typography, and attention-grabbing layouts.

### Personalization Controls

* **Theme Mode**

  * Light
  * Dark

* **Color Palette**

  * Electric Violet
  * Crimson Rose
  * Deep Emerald
  * Warm Amber

* **Motion Preferences**

  * Fluid
  * Subtle
  * Cinematic
  * Reduced Motion

* **Typography Styles**

  * Compact
  * Default
  * Relaxed
  * Wide

### Additional Features

* Repersonalize button for unlimited theme regeneration
* Responsive layout
* Pure client-side implementation
* Zero dependencies

---

## 🛠 Technologies Used

* HTML5
* CSS3

  * CSS Custom Properties
  * CSS Animations
  * Backdrop Filters
  * Color Mixing
  * Responsive Layout Techniques
* JavaScript (ES6+)

  * DOM Manipulation
  * Dynamic Theme Application
  * Async UI Sequencing
  * Event-Driven Interactions

---

## 📂 Project Structure

```text
website-personalizer/
│
├── index.html
├── style.css
├── script.js
├── favicon_website_personalizer.ico
├── README.md
│
└── assets/
    └── (optional future assets)
```

---

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/dhairyagothi/100_days_100_web_project.git
```

### 2. Open the Project

Simply open:

```text
index.html
```

in any modern browser.

No installation, build process, or package manager required.

---

## 🎯 Personalization Flow

```text
Quiz
  ↓
Preference Collection
  ↓
Theme Compilation
  ↓
Terminal Brewing Sequence
  ↓
Dynamic Website Generation
```

---

## 📋 Quiz Categories

| Step | Category        | Choices                             |
| ---- | --------------- | ----------------------------------- |
| 1    | Aesthetic Vibe  | Minimal, Cyberpunk, Aesthetic, Bold |
| 2    | Interface Mode  | Light, Dark                         |
| 3    | Signature Color | Violet, Rose, Emerald, Amber        |
| 4    | Motion Style    | Fluid, Subtle, Slow, None           |
| 5    | Reading Style   | Compact, Default, Relaxed, Wide     |

---

## 💡 Why This Project?

This project explores how user-driven preferences can instantly influence:

* Branding
* Visual Identity
* Typography
* Motion Design
* User Experience

It demonstrates how far personalization can go using only front-end technologies.

---

## 🛡️ Browser Feature Support & Explicit Fallbacks

The application demonstrates graceful degradation across modern and legacy browser environments:

- **System Preference Detection (`matchMedia`)**:
  - **Supported Path**: The "Auto — match system preference" quiz option queries `prefers-color-scheme` to align with the OS theme.
  - **Unsupported Path**: If `window.matchMedia` is unavailable, the option is explicitly disabled with fallback text (`Auto — (Unsupported)`) and a helpful title, leaving the standard manual choices fully functional.
- **Clipboard API (`navigator.clipboard`)**:
  - **Supported Path**: One-click "Export CSS" copies generated tokens to the clipboard.
  - **Unsupported Path**: If `navigator.clipboard` is unavailable, an accessible export drawer opens containing the CSS tokens in a selectable textarea with explicit fallback guidance.
- **CSS Color Mixing & Backdrop Filters**:
  - Uses CSS `@supports not (color: color-mix(in srgb, red, blue))` and `@supports not (backdrop-filter: blur(12px))` rules to provide robust opaque/rgba fallbacks without layout breakdown.

---

## 🧪 Automated Testing

Run the automated Playwright regression test validating feature-present and feature-absent execution paths:

```bash
node tests/course/r60-t016.mjs
```

---
## 📜 License

This project is open-source and available under the MIT License.

## Author

Navneet Parashar — [GitHub](https://github.com/SilverMenace)
