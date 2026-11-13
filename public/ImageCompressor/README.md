# Shrink.io — Image Compressor

Compress JPG, PNG and WEBP images in the browser (Web Worker + `createImageBitmap`), compare before/after with a slider, and download one or all (ZIP).

## Run locally

From the repository root:

```bash
npm run dev    # serves the repo on http://localhost:3000
```

Then open <http://localhost:3000/public/ImageCompressor/index.html>. Serve the repository root, because the worker is loaded from `/public/ImageCompressor/js/worker.js`.

## Safe text rendering

The only text a user puts into this page is the **names of the files they upload**. File names can contain `<`, `>`, quotes and `=`, so they are always inserted as text (`textContent`), never as HTML:

| Where the name appears | How it is inserted |
| --- | --- |
| Queue list (`.item-name`) | `textContent` (+ `title`) |
| Toasts ("Skipped … - Invalid format", "Failed to compress …", "Unable to safely compress …") | `showToast(message)` puts `message` in a `<span>` with `textContent` |
| Comparison modal title (`#modalFilename`) | `textContent` |

Contract for intended rich HTML: only the page's own fixed markup is built as HTML, such as icons (`<i class="ph …">`), the "Saved x%" badge, spinners and thumbnails from `blob:` URLs. A toast is always exactly one icon element plus one text `<span>`.

## Test

```bash
npm --prefix tests/course ci
npx --prefix tests/course playwright install chromium   # first time only
node tests/course/r60-t008.mjs
```

The test uploads a real image named `<img src=x onerror="…">photo.png` and a text file named `<b data-injected="1">notes</b>.txt`. Both names must appear exactly as typed, create no element and run no code. The test also checks `#globalStats`, `#totalSavedStat` and `#themeToggleBtn` / `#themeIcon`. It exits non-zero on any failed check or page error.
