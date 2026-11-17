# AI Tools Hub

A modern, polished AI tools directory website featuring a curated collection of the best AI tools available today.

## Project Overview

AI Tools Hub is a beautiful, responsive SaaS-style website that showcases AI tools across multiple categories. Built with modern web technologies and glassmorphism design, it provides an elegant user experience for discovering AI tools.

## Features

✅ Hero section with animated background elements  
✅ Statistics section highlighting key metrics  
✅ Categories section with 6 tool categories  
✅ **My Favorites Section** to bookmark your favorite tools  
✅ Featured tools section with **18 AI tool cards**  
✅ "Why Use AI" benefits section  
✅ Future AI trends section  
✅ Footer with quick links  
✅ Glassmorphism design  
✅ Beautiful gradient colors and effects  
✅ Hover animations and smooth transitions  
✅ Fully responsive design (mobile, tablet, desktop)  
✅ Accessibility features (semantic HTML, ARIA labels, keyboard-friendly)  
✅ Smooth scroll behavior  
✅ Intersection Observer animations  
✅ **Favorites/Bookmark System** with localStorage persistence  
✅ **Toast notifications** for user feedback

## Creator

Created by **Maria S Patani**  
GitHub: [@mariaspatani](https://github.com/mariaspatani)

## Technologies Used

- **HTML5**: Semantic markup for accessibility and SEO
- **CSS3**: Modern styling with glassmorphism, gradients, and animations
- **JavaScript (ES6+)**: Interactive features and animations
- **Google Fonts**: Inter font family for clean typography
- **No Frameworks**: Pure vanilla HTML, CSS, and JavaScript - lightweight and fast!

## Folder Structure

```
public/AI-Tools-Hub/
├── index.html      # Main HTML file with all sections
├── style.css       # Complete styling with glassmorphism design
├── script.js       # JavaScript for interactivity and animations
└── README.md       # This file - project documentation
```

## Categories Included

1. Coding & Development
2. Design & Images
3. Writing & Content
4. Presentation & Slides
5. Productivity & Office
6. Video, Voice & Media

## Getting Started

1. Navigate to the `public/AI-Tools-Hub` folder
2. Open `index.html` in a web browser
3. Explore the AI Tools Hub!

## Browser Support

All modern browsers are supported:
- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Motion & Keyboard Focus Accessibility

This project respects user system accessibility preferences:
- **`prefers-reduced-motion` Support**:
  - Automatically respects user OS motion settings.
  - When reduced motion is preferred, continuous floating background animations, gradient shifting, pulse micro-animations, and entrance translation transitions are neutralized.
  - Smooth scrolling transitions (`scrollIntoView` and CSS `scroll-behavior`) instantly switch to `auto`, preventing motion disorientation.
  - All information, tool collections, and controls remain fully visible, accessible, and functional.
- **Visible Keyboard Focus**:
  - High-contrast focus indicators (`outline: 3px solid #06b6d4` with `outline-offset: 2px` and dark backing contrast) are provided across all interactive elements (`#searchBox`, `#categoryFilter`, links, buttons, theme toggles, and collection triggers).
  - Tested and fully visible across both desktop (1280px) and mobile (375px) viewports.

## Automated Verification & Regression Testing

To run the automated Playwright test suite verifying source anchors, motion preferences, focus indicator visibility, and layout responsiveness:

```bash
node tests/course/r60-t019.mjs
```

## License

MIT License - Feel free to use this project for personal or commercial purposes.
