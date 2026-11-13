// Same theme as the inline `tailwind.config` in public/dropdown_navbar/index.html.
// Used only to build tailwind.css, the local stand-in for the Tailwind Play CDN
// (https://cdn.tailwindcss.com) in tests/course/r60-t006.mjs. Rebuild with:
//   npx tailwindcss@3.4.17 -c tests/course/fixtures/r60-t006/tailwind.config.cjs \
//     -i tests/course/fixtures/r60-t006/input.css -o tests/course/fixtures/r60-t006/tailwind.css --minify
module.exports = {
  content: ['public/dropdown_navbar/index.html'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f9ff', 100: '#e0f2fe', 200: '#bae6fd', 300: '#7dd3fc', 400: '#38bdf8',
          500: '#0ea5e9', 600: '#0284c7', 700: '#0369a1', 800: '#075985', 900: '#0c4a6e', 950: '#082f49',
        },
      },
      animation: {
        float: 'float 6s ease-in-out infinite',
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        float: { '0%, 100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-20px)' } },
      },
    },
  },
};
