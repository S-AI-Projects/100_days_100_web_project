# Drawing App

A simple browser-based drawing application built with HTML, CSS, and JavaScript. It provides a collection of drawing tools and canvas controls for creating, editing, importing, and downloading drawings directly in the browser.

## Features

### Drawing Tools

- **Brush** — Draw freehand strokes with an adjustable size.
- **Eraser** — Erase parts of the drawing using an adjustable size.
- **Line** — Draw straight lines.
- **Rectangle** — Draw rectangular outlines.
- **Circle** — Draw circular outlines.
- **Color Picker** — Pick a color directly from the canvas and use it for subsequent drawing.

### Canvas Controls

- Adjustable brush size from **1–50 px**
- Primary color selection
- Canvas background color selection
- Fill the entire canvas with the selected primary color
- Clear the canvas using the selected background color
- Canvas dimensions displayed in the status bar
- Current mouse coordinates displayed while drawing

### History

- **Undo** drawing actions
- **Redo** undone actions
- Maintains up to **30 canvas states** in the undo history

### Image & File Operations

- Open an image from your local device
- Automatically scale and center imported images while preserving their proportions
- Download the current canvas as a PNG image
- Keyboard shortcut for downloading the drawing

### Keyboard Shortcuts

| Shortcut | Action |
| --- | --- |
| `Ctrl + Z` | Undo |
| `Ctrl + Y` | Redo |
| `Ctrl + S` | Download drawing |

## Tech Stack

### Core Technologies

- **HTML5** — Provides the structure of the application and its user interface.
- **CSS3** — Handles the layout, styling, controls, and visual appearance.
- **JavaScript** — Implements the drawing tools, canvas operations, history management, image handling, downloads, and keyboard shortcuts.
- **HTML5 Canvas API** — Used for drawing and manipulating canvas content.

### External Resources

- **Font Awesome** — Provides icons used throughout the interface.
- **Google Fonts (Open Sans)** — Used for typography.

## Folder Structure

```text
Drawing-Canva/
├── index.html    # Application structure and UI
├── index.js      # Drawing functionality and application logic
├── style.css     # Styling and layout
└── README.md     # Project documentation
```

## How to Run Locally

### Prerequisites

A modern web browser such as Google Chrome, Microsoft Edge, or Mozilla Firefox.

### Steps

1. Clone the repository:

   ```bash
   git clone https://github.com/dhairyagothi/100_days_100_web_project.git
   ```

2. Navigate to the project directory:

   ```bash
   cd 100_days_100_web_project/public/Drawing-Canva
   ```

3. Open `index.html` in a web browser.

   Alternatively, you can use a local development server such as the **Live Server** extension in VS Code.

No additional dependencies or package installation are required.

## Usage

1. Open `index.html` in a web browser.
2. Select a drawing tool from the toolbar.
3. Use the **Brush Size** slider to adjust the stroke thickness.
4. Choose a **Primary Color** for drawing.
5. Use the **Canvas Background** color control for the canvas background used when clearing the canvas.
6. Draw directly on the canvas using your mouse.
7. Use **Undo** and **Redo** to manage previous drawing states.
8. Select **Color Picker** and click on an existing part of the canvas to pick its color.
9. Select **Open Image** to import an image from your device.
10. Use **Download** or press `Ctrl + S` to save the current drawing as a PNG image.

## Screenshots

![Drawing App interface](./screenshot.png)

---

## 📖 Tested Walkthrough

This section provides a verified, reproducible walkthrough of the application's layout and core user interaction, executed and verified by automated browser checks.

### 1. Page Entry Point & Setup
- **Page Entry Point**: `public/Drawing-Canva/index.html`
- **Automated Test / Setup Command**:
  ```bash
  node tests/course/r60-t017.mjs
  ```
- **Local Dev Server** (optional for manual verification):
  ```bash
  npx serve .
  # Open http://localhost:3000/public/Drawing-Canva/index.html
  ```

### 2. Verified Interaction Walkthrough

| Step | Action | Target Selector | Expected Result |
| --- | --- | --- | --- |
| **1. Layout Shell** | Load `index.html` at `1280×800` viewport | `#app`, `#left` | `#app` renders flex container; `#left` toolbar displays with width `300px` |
| **2. Default State** | Observe active tool and status bar | `#brush`, `#currentTool`, `#canvasSize` | `#brush` has `.active` class; `#currentTool` shows `"Brush"`; `#canvasSize` shows canvas dimensions (`980 × 720 px`) |
| **3. Brush Draw** | Drag mouse on canvas from `(150, 150)` to `(350, 250)` | `#canvas`, `#mousePos` | `#mousePos` displays current coordinates; canvas pixel at `(250, 200)` changes to black (`#000000`) |
| **4. Switch Tool** | Click Eraser button in toolbar | `#eraser`, `#brush`, `#currentTool` | `#eraser` gains `.active`; `#brush` loses `.active`; `#currentTool` updates to `"Eraser"` |
| **5. Erase Stroke** | Drag mouse over previous stroke at `(240, 195)` to `(260, 205)` | `#canvas` | Pixel at `(250, 200)` is restored to canvas background color (`#ffffff`) |
| **6. History Undo** | Click Undo button in toolbar | `#undo` | Previous erased stroke is undone; pixel at `(250, 200)` reverts to black (`#000000`) |
| **7. History Redo** | Click Redo button in toolbar | `#redo` | Re-applies erasure; pixel at `(250, 200)` returns to background white (`#ffffff`) |
| **8. Clear Canvas** | Click Clear Canvas button | `.btn.clear` | Canvas is completely reset to background fill (`#ffffff`) |

### 3. Visual Artifacts
The automated walkthrough saves an execution screenshot for review:
- Screenshot artifact path: `work/R60-T017/walkthrough.png`

## Notes

- The application runs entirely in the browser.
- No backend or database is required.
- No additional packages or dependencies need to be installed.