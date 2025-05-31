module.exports = {
  content: [
    "./src/renderer/**/*.{js,jsx,ts,tsx,html}",
    "./src/renderer/index.html" // Corrected path
  ],
  theme: {
    extend: {},
  },
  plugins: [
    require('tailwind-scrollbar'),
  ],
} 