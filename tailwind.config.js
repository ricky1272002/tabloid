module.exports = {
  content: [
    "./src/renderer/**/*.{js,jsx,ts,tsx,html}",
    "./src/index.html" // If you have a root HTML file for Electron renderer
  ],
  theme: {
    extend: {},
  },
  plugins: [
    require('tailwind-scrollbar'),
  ],
} 