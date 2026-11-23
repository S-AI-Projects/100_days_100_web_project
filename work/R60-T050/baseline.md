# R60-T050 Baseline

## Test inputs
- Page: `public/Discord project/index.html`
- URL: `http://127.0.0.1:4173/public/Discord%20project/`
- Viewport: 1280 × 800

## Expected vs actual behaviour

| Check | Expected | Actual |
|---|---|---|
| Buttons | 6 total | 6 found |
| Open Discord hover | White → rgb(96, 165, 250) | Matched |
| First Download for Windows hover | White → rgb(96, 165, 250) | Matched |
| Open Discord in your browser hover | Black → rgb(96, 165, 250) | Matched |
| Second Download for Windows hover | White → rgb(29, 78, 216) | Matched |
| Sign up hover | No colour change | Matched |
| Mobile Download | Hidden at desktop width | Hidden |
| Images | 8 loaded | 8 loaded |
| Anchors | 36 with href | 36 with href |

## External resource
The Font Awesome script returned HTTP 403. This is an external resource failure, not a project source-code defect.

## Conclusion
The existing page behaviour matched the expected baseline. No source-code changes were needed.
