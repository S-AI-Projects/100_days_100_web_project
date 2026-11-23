# <p align="center">SnapScribe</p>

An AI-powered social media caption generator. Upload an image, snap a photo, or type a prompt and get scroll-stopping captions tailored for Instagram, Twitter / X, Facebook, and LinkedIn.

## Features
- 📷 Drag & drop image upload or in-app camera capture
- 🎭 11 caption tones (Fun, Romantic, Aesthetic, Witty, Luxury, and more)
- 🌐 Platform-aware captions (Instagram, Twitter / X, Facebook, LinkedIn)
- 📋 One-click copy for every generated caption
- 🔑 User-provided Mistral API key which is stored locally, no backend needed
- 📱 Fully responsive UI

## Technologies Used
- React + Vite
- JavaScript
- Mistral AI API (`mistral-small-latest`)
- TanStack Query
- react-dropzone 
- react-toastify

## How to Run
1. Open the live demo: [SnapScribe](https://ai-caption-generator-eeux.onrender.com/)
2. Click **⚙️ Settings** and enter your [Mistral API key](https://console.mistral.ai/api-keys)
3. Upload an image or type a prompt and hit **Generate Caption** 🚀

## Run Locally
1. Clone the repo and `cd` into the `SnapScribe` folder
2. Run `npm install`
3. Run `npm run dev` and open `http://localhost:5173`

## Screenshots
![alt text](image.png)

## Author
gc_MayankPun — [GitHub](https://github.com/gc-MayankPun)

## R60-T036 browser regression

From the repository root, use Node.js 20 or later:

```sh
npm ci --prefix tests/course
npx --prefix tests/course playwright install chromium
npm ci --prefix public/SnapScribe
node tests/course/r60-t036.mjs
```

The check starts and waits for its own Vite dev server, opens fresh Chromium contexts and closes the server and browser on success or failure. It returns a nonzero exit status for a failed assertion, unexpected page error or console error. Dependencies are locked in `tests/course/package-lock.json`.

Vite serves the real React source. Seed one saved caption. Stub Clipboard as present, absent and rejecting. Assert exact feedback and writes, keep caption text available for manual copying, reject uncaught errors. No real clipboard, camera or Mistral request.

Results, tool versions, expected/actual values and screenshots are written to `work/R60-T036/after.json` and PNG files. Use `COURSE_PHASE=baseline` to record the original source before applying the source change. The task-specific GitHub Actions workflow records both phases against the pinned baseline and uploads the complete evidence directory. No Lighthouse score is required. Remove `work/R60-T036/` from a later upstream submission.
