# SVG Path Builder

A lightweight, zero-dependency visual tool for developers to draw and generate SVG `<path>` codes instantly. Skip the heavy design software when you just need a simple, smooth UI curve.

## Features

- **Interactive Canvas**: Click to drop anchor points on a dotted design grid.
- **Drag & Drop**: Easily adjust existing points; the curve updates in real-time.
- **Smooth Interpolation**: Automatically generates fluid curves using quadratic Bezier midpoints.
- **Instant Code Generation**: The raw SVG code is built as you draw.
- **One-Click Copy**: Grab the clean markup directly to your clipboard.
- **Modern UI**: Expressive, minimal, card-based interface with micro-animations.

## Getting Started

Since this is built with vanilla HTML, CSS, and JavaScript, no build step is required. 

1. Clone the repository.
2. Open `index.html` in your web browser.
3. Start clicking on the canvas to generate paths!

## File Structure

- `index.html`: The markup and layout structure, including the drawing canvas, output code viewer, and safe text metadata companion.
- `style.css`: Minimalist, dark-mode CSS with responsive flex/grid layouts.
- `script.js`: Core logic handling DOM events, path calculation, clipboard interaction, and safe text rendering.

## Safe Text Rendering & Security

This project follows safe DOM rendering practices to ensure all user and fixture text remains strictly plain text:
- **No `innerHTML` for Fixture Text**: All user-provided metadata labels and code output are assigned via `.textContent` (or escaped attribute values), preventing arbitrary HTML injection and Cross-Site Scripting (XSS).
- **Injection Resilient**: Hostile payloads such as `<img src="x" onerror="..."/>` or `<script>...</script>` are treated literally as text without DOM node creation or event handler execution.
- **Companion Path Metadata**: An isolated label input allows labeling generated SVG paths with automatic safe text rendering in both the live preview and SVG comment headers.

## Automated Verification & Regression Testing

To run the automated browser test suite (verifying source anchors, safe text rendering, XSS resilience, and drawing workflows):

```bash
node tests/course/r60-t018.mjs
```
