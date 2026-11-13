# 🛡️ PhishGuard AI Terminal (CyberPulse-AI)

A terminal-style web page that checks a URL against simple, rule-based phishing heuristics. It looks at suspicious keywords, `@` tricks, HTTP instead of HTTPS, excessive subdomains, hyphenated domains and raw IP hosts, then explains its verdict.

> Educational tool only: rule-based heuristics, not a guaranteed phishing detector.

## What you see

| Region | Behaviour |
| --- | --- |
| `#matrix-canvas` | Full-window "matrix rain" background, redrawn on a timer (slower with `prefers-reduced-motion`). |
| `#bootLog` | Four boot lines on load, ending with `> PhishGuard AI Terminal ready.` |
| `#scanPanel` / `#scanForm` | Enter a URL and press **RUN ANALYSIS** or Enter. A five-line live log runs, then the result grid shows the verdict (🟢 SAFE SIGNAL / 🟡 SUSPICIOUS ACTIVITY / 🔴 THREAT DETECTED), threat score /100, AI confidence and the reasons. |

Before any scan, only the "awaiting input…" message is shown. The result grid stays hidden: `.result-grid[hidden] { display: none }` is needed because `.result-grid { display: grid }` would otherwise override the `hidden` attribute.

Example: `http://secure-login.bank-verify.example.com@192.168.0.1` gives **THREAT DETECTED**, score 100, confidence 95%, with 5 reasons. `https://example.com` gives **SAFE SIGNAL**, score 0, confidence 95%.

## Run locally

From the repository root:

```bash
npm run dev    # serves the repo on http://localhost:3000
```

Then open <http://localhost:3000/public/CyberPulse-AI/>. Opening `index.html` directly also works, because the page has no build step or dependencies.

## Test

```bash
npm --prefix tests/course ci
npx --prefix tests/course playwright install chromium   # first time only
node tests/course/r60-t010.mjs
```

The test runs its behavioural assertions three times:
- against the real page, which must pass;
- against a temporary fixture with the `submit` binding broken, which must fail with "submit was not handled";
- against a temporary fixture without the `.result-grid[hidden]` rule, which must fail with "a verdict is shown before any scan".

The fixtures change only what the test's server sends to the browser, never the files. The test exits non-zero if the real page fails, a fixture goes unnoticed, or the files on disk contain a mutation.

## Files

```text
CyberPulse-AI/
├── index.html   # markup: canvas, boot log, scan panel, result grid
├── style.css    # terminal theme, result cards, responsive grid
└── script.js    # matrix rain, boot log, analyzeUrl() rules, UI wiring
```

Built by [Sapna Jha](https://github.com/sapnajha757).
