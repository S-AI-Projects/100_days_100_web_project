# 🎬 Procedural Chrono-Grid Video Director

A browser-based procedural video frame synthesizer that generates animated pixel matrices in real time using mathematical functions and the HTML5 Canvas API. Experiment with interpolation algorithms, motion frequencies, and procedural noise to create unique animated visual effects directly in your browser.

---

## ✨ Features

* 🎥 Real-time procedural video frame generation
* 🧮 Mathematical pixel synthesis using trigonometric functions
* 🎨 Dynamic RGB color matrix rendering
* 📈 Live render latency monitoring
* 🎞️ Frame counter for performance tracking
* 🔄 Multiple interpolation algorithms

  * Linear Interpolation (Lerp)
  * Step Function
  * Sinusoidal Interpolation
* 🌊 Adjustable motion vector frequency
* 🎲 Configurable procedural noise density
* ⏯️ Interactive timeline scrubbing
* ⚡ High-performance rendering using `requestAnimationFrame`
* 📱 Responsive browser-based interface

---

## 📸 Preview

The application features:

* Real-time animated pixel synthesis
* Interactive control dashboard
* Live performance metrics
* Adjustable mathematical rendering parameters
* Smooth procedural animation pipeline

---

## 🚀 Getting Started & Executable Walkthrough

### 1. Launch from Repository Root
Run a local static HTTP server directly from the root of the repository:
```bash
npx serve .
```
Then navigate your browser to:
```text
http://localhost:3000/public/video-synthesis-engine/index.html
```

### 2. Executable Walkthrough & Expected Baseline Observations

Follow these structured steps to verify the synthesis pipeline:

1. **Dashboard Layout Verification (`#dashboard-layout`)**:
   - Confirm that `#dashboard-layout` renders a balanced two-column flex container:
     - **Left Column**: Hosts the procedural canvas viewport (`#synthesisCanvas`) and live HUD telemetry (`.metrics-hud`).
     - **Right Column**: Hosts the parameter Control Console (Interpolation Mode, Motion Frequency, Noise Density, Timeline Scrub).

2. **Canvas Mounting & Pixel Matrix Synthesis (`#synthesisCanvas`)**:
   - Verify that `#synthesisCanvas` is mounted with explicit dimensions (480×360 px).
   - Observe real-time dynamic pixel updates computed from time-variable trigonometric wave equations and procedural noise directly injected into the raw `ImageData` byte buffer.

3. **Metrics Telemetry (`#metric-latency` & `#metric-frame`)**:
   - **Render Latency (`#metric-latency`)**: Displays per-frame execution profiling in milliseconds formatted to two decimal places (e.g., `0.00` to `5.00` ms).
   - **Active Frame Index (`#metric-frame`)**: Starts with baseline counter `0` on initial load and increments monotonically over time as subsequent frames are rendered via `requestAnimationFrame`.

4. **Interactive Parameter Manipulation**:
   - Switch **Timeline Interpolation Mode** (`#interpolationMode`) between `Linear (Lerp)`, `Step Function`, and `Sinusoidal Transform`.
   - Adjust **Motion Vector Frequency** (`#motionFrequency`) and **Render Noise Density** (`#noiseDensity`) to observe immediate alterations in wave curvature and granularity.
   - Drag the **Timeline Scrub** (`#timelineScrub`) slider to pause continuous playback and manually scrub through animation time slices.

### 3. Automated Validation
Run the automated Playwright test suite from the repository root:
```bash
node tests/course/r60-t027.mjs
```
The test verifies:
- `#dashboard-layout` is rendered with two functional panels.
- `#synthesisCanvas` is mounted with 480×360 dimensions and active 2D rendering.
- Initial frame counter starts at `0` and `#metric-frame` increments monotonically over time.
- `#metric-latency` is non-negative and properly formatted.
- Test execution outputs a structured report to `work/R60-T027/results-latest.json`.

---

## 🎮 How to Use

1. Open the application.
2. Watch the procedural animation render automatically.
3. Adjust the available controls to modify the synthesized output.
4. Experiment with different interpolation modes.
5. Change motion frequency and noise density for unique visual effects.
6. Use the timeline scrubber to inspect animation states manually.

---

## 🎛️ Control Panel

### Timeline Interpolation Modes

Choose how values transition over time:

* **Linear Interpolation (Lerp)** – Smooth linear transitions.
* **Procedural Step Function** – Instant value changes.
* **Sinusoidal Transform** – Smooth wave-based interpolation.

### Motion Vector Frequency

Controls the frequency of the trigonometric wave functions, affecting animation complexity and movement speed.

### Render Noise Density

Adds configurable procedural noise to the generated pixel matrix, creating more organic and randomized visual effects.

### Timeline Scrubbing

Move through the animation timeline manually to inspect individual synthesized frames.

---

## 📊 Live Metrics

The dashboard displays real-time rendering statistics:

| Metric                 | Description                                                |
| ---------------------- | ---------------------------------------------------------- |
| ⚡ Render Latency       | Time required to generate the current frame (milliseconds) |
| 🎞️ Active Frame Index | Total number of frames rendered since startup              |

---

## 🛠️ Built With

* HTML5
* CSS3
* JavaScript (ES6+)
* HTML5 Canvas API
* Performance API
* requestAnimationFrame()

---

## 📂 Project Structure

```text
Procedural-Chrono-Grid-Video-Director/
│
├── index.html
├── Style.css
├── synthesis-core.js
├── image.png
└── README.md
```

---

## ⚙️ Core Technologies

### HTML5 Canvas API

* Direct pixel manipulation
* ImageData buffer generation
* High-performance rendering

### JavaScript

* Procedural animation engine
* Mathematical interpolation algorithms
* Performance monitoring
* Interactive event handling

### Mathematical Rendering

The animation is generated using:

* Sine wave functions
* Cosine wave functions
* Linear interpolation
* Step interpolation
* Sinusoidal interpolation
* Procedural random noise

---

## 🌟 Highlights

* Pixel-perfect procedural rendering
* Mathematical animation engine
* Interactive visualization controls
* Smooth timeline scrubbing
* Live rendering performance metrics
* Efficient animation loop using `requestAnimationFrame`
* No external libraries or frameworks
* Lightweight and fully browser-based

---

## 💡 Future Improvements

* Export generated animations as GIF or MP4
* Additional interpolation algorithms
* Custom color palettes
* Fullscreen rendering mode
* Adjustable canvas resolution
* Shader-inspired rendering effects
* Recording and playback controls
* Frame capture functionality
* Preset animation configurations
* GPU acceleration using WebGL

---

## 🌐 Browser Support

Compatible with modern browsers including:

* ✅ Google Chrome
* ✅ Microsoft Edge
* ✅ Mozilla Firefox
* ✅ Safari

---

## 🤝 Contributing

Contributions are welcome!

If you'd like to improve the rendering engine, add new procedural algorithms, or enhance the user interface:

1. Fork the repository.
2. Create a feature branch.
3. Commit your changes.
4. Open a Pull Request.

---

## 📄 License

This project is licensed under the **MIT License**.

---

## ⭐ Support

If you found this project interesting or useful, consider giving it a **⭐ Star** on GitHub!

Happy Experimenting! 🎬✨
