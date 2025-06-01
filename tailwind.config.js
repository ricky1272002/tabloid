module.exports = {
  content: [
    "./src/renderer/**/*.html",
    "./src/renderer/**/*.tsx",
    "./src/renderer/**/*.ts",
  ],
  theme: {
    extend: {},
  },
  plugins: [
    require('tailwind-scrollbar'),
  ],
} 