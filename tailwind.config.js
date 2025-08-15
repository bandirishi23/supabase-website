/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'brand': {
          DEFAULT: '#10b981',
          hover: '#059669',
          light: '#22c55e',
          dark: '#047857'
        },
        'dark': {
          100: '#2a2a2a',
          200: '#262626',
          300: '#1c1c1c',
          400: '#181818',
          500: '#141414',
          600: '#0f0f0f',
          border: '#404040'
        }
      },
      transitionDuration: {
        '250': '250ms',
      }
    },
  },
  plugins: [],
}

